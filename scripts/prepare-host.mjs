import { cp, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const dist = path.join(root, 'dist');
const serverDist = path.join(root, 'server', 'dist');

try {
  const info = await stat(dist);
  if (!info.isDirectory()) throw new Error('dist is not a directory');
} catch {
  console.error('[host-build] dist/ not found. Run the frontend build first.');
  process.exit(1);
}

await rm(serverDist, { recursive: true, force: true });
await mkdir(serverDist, { recursive: true });
await cp(dist, serverDist, { recursive: true });

console.log('[host-build] copied frontend dist/ -> server/dist/');
