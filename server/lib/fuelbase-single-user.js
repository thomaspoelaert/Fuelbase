import bcrypt from 'bcryptjs';
import db from '../db.js';

/**
 * Optional personal-hosting bootstrap.
 *
 * Set both FUELBASE_USERNAME and FUELBASE_PASSWORD as host secrets. On a fresh
 * database this creates the sole admin before the server starts accepting
 * requests, avoiding the public "first registration wins" window. On later
 * boots the password in the host secret is authoritative for that same user.
 *
 * Nothing is enabled by default, so upstream/self-hosted NutriTrace behavior
 * is unchanged unless the FuelBase env vars are deliberately configured.
 */
export function bootstrapFuelBaseUser() {
  const rawUsername = process.env.FUELBASE_USERNAME;
  const rawPassword = process.env.FUELBASE_PASSWORD;
  const configured = !!rawUsername || !!rawPassword;
  if (!configured) return { enabled: false };

  if (!rawUsername || !rawPassword) {
    throw new Error('FUELBASE_USERNAME and FUELBASE_PASSWORD must both be set');
  }

  const username = String(rawUsername).trim().toLowerCase();
  const password = String(rawPassword);
  if (!username || username.length > 80) throw new Error('FUELBASE_USERNAME is invalid');
  if (password.length < 12) throw new Error('FUELBASE_PASSWORD must be at least 12 characters');

  const users = db.prepare('SELECT id, username, password_hash, role FROM users ORDER BY id').all();
  const fullName = String(process.env.FUELBASE_FULL_NAME || '').trim() || null;

  if (users.length === 0) {
    const hash = bcrypt.hashSync(password, 12);
    const result = db.prepare(
      `INSERT INTO users (username, password_hash, full_name, role)
       VALUES (?, ?, ?, 'admin')`
    ).run(username, hash, fullName);
    console.log(`[fuelbase] bootstrapped personal account '${username}'`);
    return { enabled: true, created: true, userId: Number(result.lastInsertRowid) };
  }

  if (users.length > 1) {
    throw new Error('FUELBASE fixed-login mode expects exactly one existing user');
  }

  const user = users[0];
  if (String(user.username).toLowerCase() !== username) {
    throw new Error(`FUELBASE_USERNAME does not match the existing account '${user.username}'`);
  }

  const passwordMatches = user.password_hash && bcrypt.compareSync(password, user.password_hash);
  if (!passwordMatches) {
    db.prepare('UPDATE users SET password_hash = ?, role = ? WHERE id = ?')
      .run(bcrypt.hashSync(password, 12), 'admin', user.id);
    console.log(`[fuelbase] refreshed password from host secret for '${username}'`);
  } else if (user.role !== 'admin') {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', user.id);
  }

  if (fullName) {
    db.prepare('UPDATE users SET full_name = ? WHERE id = ?').run(fullName, user.id);
  }

  return { enabled: true, created: false, userId: Number(user.id) };
}
