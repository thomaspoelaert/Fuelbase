import 'dotenv/config';
import { bootstrapFuelBaseUser } from './fuelbase-single-user.js';
import { seedFuelBaseStarterFoods } from './fuelbase-starter-foods.js';

const account = bootstrapFuelBaseUser();
if (account.enabled && account.userId) {
  const seeded = seedFuelBaseStarterFoods(account.userId);
  if (seeded.inserted > 0) {
    console.log(`[fuelbase] seeded ${seeded.inserted} personal starter foods`);
  }
}
