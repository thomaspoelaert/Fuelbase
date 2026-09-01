import db from '../db.js';

const marker = 'FuelBase starter food · 2026-09-01';

function n(calories, carbohydrates, proteins, fat) {
  return { calories, carbohydrates, proteins, fat };
}

const STARTER_FOODS = [
  { name:'Wit brood', nutrition:n(265,49,8.5,3.2), portion:100, unit:'g', category:'Bread & grains', altUnits:[{abbr:'slice',grams:35}], status:'GENERIEK', note:'Voorlopig ~35 g per snee.' },
  { name:'Bruin/volkoren brood', nutrition:n(240,40,9,3.5), portion:100, unit:'g', category:'Bread & grains', altUnits:[{abbr:'slice',grams:35}], status:'GENERIEK', note:'Voorlopig ~35 g per snee.' },
  { name:'Zachte witte sandwich', nutrition:n(300,53,8.5,6), portion:100, unit:'g', category:'Bread & grains', altUnits:[{abbr:'piece',grams:52.5}], status:'GENERIEK', note:'Voorlopig ~50–55 g per stuk.' },
  { name:'Havermout droog', nutrition:n(370,60,13,7), portion:100, unit:'g', category:'Bread & grains', status:'GENERIEK', note:'Ook herkenbaar als oats, haver of oatmeal.' },
  { name:'Kristalsuiker', nutrition:n(400,100,0,0), portion:100, unit:'g', category:'Carbohydrate', status:'VAST' },
  { name:'Aardbeienconfituur', nutrition:n(250,62,0.3,0.1), portion:100, unit:'g', category:'Carbohydrate', status:'GENERIEK', note:'Eerder 40 g totaal op 2 sandwiches gelogd.' },
  { name:'Peperkoek / ontbijtkoek', nutrition:n(305,69,3,1.5), portion:100, unit:'g', category:'Bread & grains', status:'GENERIEK', note:'Merk en gewicht per snee nog te verfijnen.' },

  // Special logging convention from the user's food log: quantity equals
  // grams of carbohydrate, not grams of drink powder. One serving therefore
  // equals exactly 1 g carbohydrate / 4 kcal.
  { name:'Intra-workout koolhydraten', nutrition:n(4,1,0,0), portion:1, unit:'g CHO', category:'Sports nutrition', status:'LOGCONVENTIE', note:'1 unit = 1 g koolhydraat. Gebruik het aantal gram KH als hoeveelheid.' },

  { name:'Banaan, eetbaar deel', nutrition:n(89,22.8,1.1,0.3), portion:100, unit:'g', category:'Fruit', altUnits:[{abbr:'medium',grams:120}], status:'GENERIEK', note:'1 middelgrote banaan ≈ 120 g eetbaar wanneer geen gewicht is opgegeven.' },

  { name:'Jumbo Skyr IJslandse Stijl Vanille', brand:'Jumbo', nutrition:n(73,8.3,9.5,0.2), portion:100, unit:'g', category:'Dairy & protein', altUnits:[{abbr:'logged portion',grams:125}], status:'EXACT/MERK', note:'Bekende logportie 125 g.' },
  { name:'Jumbo Crunchy Muesli 1 kg', brand:'Jumbo', nutrition:n(422,66.3,10.2,11.3), portion:100, unit:'g', category:'Bread & grains', altUnits:[{abbr:'logged portion',grams:50}], status:'EXACT/MERK*', note:'Referentie is de standaard Jumbo Crunchy Muesli 1 kg; variant bij volgend label controleren.' },
  { name:'Whey proteïnepoeder', nutrition:n(390,7,78,6), portion:100, unit:'g', category:'Dairy & protein', status:'GENERIEK — VERVANG BIJ LABEL', note:'Exact merk/label nog niet vastgelegd.' },
  { name:'Préparé / bereide americain', nutrition:n(213,2.1,15,16), portion:100, unit:'g', category:'Dairy & protein', altUnits:[{abbr:'logged portion',grams:150}], status:'MERKREFERENTIE / PRAKTISCH', note:'Bekende logportie 150 g.' },
  { name:'Gouda kaas', nutrition:n(356,0,25,27), portion:100, unit:'g', category:'Dairy & protein', altUnits:[{abbr:'logged portion',grams:40}], status:'GENERIEK', note:'Bekende logportie 40 g.' },
  { name:'Salami', nutrition:n(420,1,22,36), portion:100, unit:'g', category:'Dairy & protein', altUnits:[{abbr:'4 slices',grams:20}], status:'LOG-PORTIE + GENERIEK', note:'4 sneetjes = 20 g totaal (~5 g/snee).' },

  { name:'Coca-Cola Original', brand:'Coca-Cola', nutrition:n(42,10.6,0,0), portion:100, unit:'ml', category:'Drinks', altUnits:[{abbr:'logged glass',grams:200}], status:'MERKREFERENTIE', note:'Waarden per 100 ml. Bekende logportie 200 ml.' },

  { name:'Spaghetti bolognese', nutrition:n(145,17,7,5.5), portion:100, unit:'g', category:'Meals', status:'SCHATTING', note:'Receptafhankelijk; liefst totaal bordgewicht of eigen recept gebruiken.' },
  { name:'Kipschnitzel, gepaneerd', nutrition:n(230,12,18,12), portion:100, unit:'g', category:'Meals', status:'GENERIEK — NOG VAST TE LEGGEN', note:'Merk en gewicht per stuk nog vast te leggen.' },

  { name:'Mora Mmm. Frikandel', brand:'Mora', nutrition:n(218,7.7,13,15), portion:100, unit:'g', category:'Frituur & snacks', altUnits:[{abbr:'piece',grams:100}], status:'EXACT/MERKREFERENTIE', note:'Fabrikantportie 100 g per stuk.' },
  { name:'Frikandel speciaal', nutrition:n(250,10,8.5,19.5), portion:100, unit:'g', category:'Frituur & snacks', altUnits:[{abbr:'piece',grams:155}], status:'SCHATTING', note:'Praktische referentie ~155 g/stuk inclusief mayo, currysaus en ui; saushoeveelheid varieert.' },
  { name:'Bicky Original — volledige burger', brand:'Bicky', nutrition:n(429,37.6,19.8,21.5), portion:1, unit:'burger', category:'Frituur & snacks', status:'EXACT PER PORTIE', note:'Exact per volledige burger; bewust niet naar 100 g omgerekend.' },
  { name:'Bicky Original burgerpatty', brand:'Bicky', nutrition:n(231,7,13.7,16.3), portion:100, unit:'g', category:'Frituur & snacks', altUnits:[{abbr:'piece',grams:100}], status:'EXACT/MERK', note:'Professionele Bicky-patty 100 g per stuk.' },
  { name:'Bitterballen, gefrituurd', nutrition:n(280,25,10,15), portion:100, unit:'g', category:'Frituur & snacks', status:'GENERIEK', note:'Exact merk/stukgewicht nog niet vastgelegd.' },
];

function existingForUser(userId, name) {
  return db.prepare(
    `SELECT id FROM foods WHERE user_id = ? AND lower(name) = lower(?) AND deleted_at IS NULL LIMIT 1`
  ).get(userId, name);
}

export function seedFuelBaseStarterFoods(userId) {
  if (!Number.isFinite(Number(userId))) return { inserted: 0, skipped: 0 };
  const insert = db.prepare(`
    INSERT INTO foods (
      user_id, name, brand, nutrition, portion, unit, notes, category,
      visibility, alt_units, favorite, usage_count, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'private', ?, 0, 0, datetime('now'))
  `);

  let inserted = 0;
  let skipped = 0;
  const tx = db.transaction(() => {
    for (const food of STARTER_FOODS) {
      if (existingForUser(userId, food.name)) {
        skipped += 1;
        continue;
      }
      const noteParts = [marker, food.status ? `Status: ${food.status}` : null, food.note || null].filter(Boolean);
      insert.run(
        Number(userId),
        food.name,
        food.brand || null,
        JSON.stringify(food.nutrition),
        food.portion,
        food.unit,
        noteParts.join(' · '),
        food.category || null,
        food.altUnits ? JSON.stringify(food.altUnits) : null,
      );
      inserted += 1;
    }
  });
  tx();
  return { inserted, skipped, total: STARTER_FOODS.length };
}

export { STARTER_FOODS };
