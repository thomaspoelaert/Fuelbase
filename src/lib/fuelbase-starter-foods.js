function nutrition(calories, carbohydrates, proteins, fat) {
  return { calories, carbohydrates, proteins, fat };
}

export const FUELBASE_STARTER_FOODS = Object.freeze([
  { name:'Wit brood', nutrition:nutrition(265,49,8.5,3.2), portion:100, unit:'g', category:'Bread & grains', altUnits:[{abbr:'slice',grams:35}], status:'GENERIEK', note:'Voorlopig ~35 g per snee.' },
  { name:'Bruin/volkoren brood', nutrition:nutrition(240,40,9,3.5), portion:100, unit:'g', category:'Bread & grains', altUnits:[{abbr:'slice',grams:35}], status:'GENERIEK', note:'Voorlopig ~35 g per snee.' },
  { name:'Zachte witte sandwich', nutrition:nutrition(300,53,8.5,6), portion:100, unit:'g', category:'Bread & grains', altUnits:[{abbr:'piece',grams:52.5}], status:'GENERIEK', note:'Voorlopig ~50–55 g per stuk.' },
  { name:'Havermout droog', nutrition:nutrition(370,60,13,7), portion:100, unit:'g', category:'Bread & grains', status:'GENERIEK', note:'Ook herkenbaar als oats, haver of oatmeal.' },
  { name:'Kristalsuiker', nutrition:nutrition(400,100,0,0), portion:100, unit:'g', category:'Carbohydrate', status:'VAST' },
  { name:'Aardbeienconfituur', nutrition:nutrition(250,62,0.3,0.1), portion:100, unit:'g', category:'Carbohydrate', status:'GENERIEK', note:'Eerder 40 g totaal op 2 sandwiches gelogd.' },
  { name:'Peperkoek / ontbijtkoek', nutrition:nutrition(305,69,3,1.5), portion:100, unit:'g', category:'Bread & grains', status:'GENERIEK', note:'Merk en gewicht per snee nog te verfijnen.' },
  { name:'Intra-workout koolhydraten', nutrition:nutrition(4,1,0,0), portion:1, unit:'g CHO', category:'Sports nutrition', status:'LOGCONVENTIE', note:'1 unit = 1 g koolhydraat. Gebruik het aantal gram KH als hoeveelheid.' },
  { name:'Banaan, eetbaar deel', nutrition:nutrition(89,22.8,1.1,0.3), portion:100, unit:'g', category:'Fruit', altUnits:[{abbr:'medium',grams:120}], status:'GENERIEK', note:'1 middelgrote banaan ≈ 120 g eetbaar wanneer geen gewicht is opgegeven.' },
  { name:'Jumbo Skyr IJslandse Stijl Vanille', brand:'Jumbo', nutrition:nutrition(73,8.3,9.5,0.2), portion:100, unit:'g', category:'Dairy & protein', altUnits:[{abbr:'logged portion',grams:125}], status:'EXACT/MERK', note:'Bekende logportie 125 g.' },
  { name:'Jumbo Crunchy Muesli 1 kg', brand:'Jumbo', nutrition:nutrition(422,66.3,10.2,11.3), portion:100, unit:'g', category:'Bread & grains', altUnits:[{abbr:'logged portion',grams:50}], status:'EXACT/MERK*', note:'Referentie is de standaard Jumbo Crunchy Muesli 1 kg; variant bij volgend label controleren.' },
  { name:'Whey proteïnepoeder', nutrition:nutrition(390,7,78,6), portion:100, unit:'g', category:'Dairy & protein', status:'GENERIEK — VERVANG BIJ LABEL', note:'Exact merk/label nog niet vastgelegd.' },
  { name:'Préparé / bereide americain', nutrition:nutrition(213,2.1,15,16), portion:100, unit:'g', category:'Dairy & protein', altUnits:[{abbr:'logged portion',grams:150}], status:'MERKREFERENTIE / PRAKTISCH', note:'Bekende logportie 150 g.' },
  { name:'Gouda kaas', nutrition:nutrition(356,0,25,27), portion:100, unit:'g', category:'Dairy & protein', altUnits:[{abbr:'logged portion',grams:40}], status:'GENERIEK', note:'Bekende logportie 40 g.' },
  { name:'Salami', nutrition:nutrition(420,1,22,36), portion:100, unit:'g', category:'Dairy & protein', altUnits:[{abbr:'4 slices',grams:20}], status:'LOG-PORTIE + GENERIEK', note:'4 sneetjes = 20 g totaal (~5 g/snee).' },
  { name:'Coca-Cola Original', brand:'Coca-Cola', nutrition:nutrition(42,10.6,0,0), portion:100, unit:'ml', category:'Drinks', status:'MERKREFERENTIE', note:'Waarden per 100 ml. Bekende logportie 200 ml.' },
  { name:'Spaghetti bolognese', nutrition:nutrition(145,17,7,5.5), portion:100, unit:'g', category:'Meals', status:'SCHATTING', note:'Receptafhankelijk; liefst totaal bordgewicht of eigen recept gebruiken.' },
  { name:'Kipschnitzel, gepaneerd', nutrition:nutrition(230,12,18,12), portion:100, unit:'g', category:'Meals', status:'GENERIEK — NOG VAST TE LEGGEN', note:'Merk en gewicht per stuk nog vast te leggen.' },
  { name:'Mora Mmm. Frikandel', brand:'Mora', nutrition:nutrition(218,7.7,13,15), portion:100, unit:'g', category:'Frituur & snacks', altUnits:[{abbr:'piece',grams:100}], status:'EXACT/MERKREFERENTIE', note:'Fabrikantportie 100 g per stuk.' },
  { name:'Frikandel speciaal', nutrition:nutrition(250,10,8.5,19.5), portion:100, unit:'g', category:'Frituur & snacks', altUnits:[{abbr:'piece',grams:155}], status:'SCHATTING', note:'Praktische referentie ~155 g/stuk inclusief mayo, currysaus en ui; saushoeveelheid varieert.' },
  { name:'Bicky Original — volledige burger', brand:'Bicky', nutrition:nutrition(429,37.6,19.8,21.5), portion:1, unit:'burger', category:'Frituur & snacks', status:'EXACT PER PORTIE', note:'Exact per volledige burger; bewust niet naar 100 g omgerekend.' },
  { name:'Bicky Original burgerpatty', brand:'Bicky', nutrition:nutrition(231,7,13.7,16.3), portion:100, unit:'g', category:'Frituur & snacks', altUnits:[{abbr:'piece',grams:100}], status:'EXACT/MERK', note:'Professionele Bicky-patty 100 g per stuk.' },
  { name:'Bitterballen, gefrituurd', nutrition:nutrition(280,25,10,15), portion:100, unit:'g', category:'Frituur & snacks', status:'GENERIEK', note:'Exact merk/stukgewicht nog niet vastgelegd.' },
]);

export function starterFoodByName(name) {
  return FUELBASE_STARTER_FOODS.find(food => food.name === name) || null;
}
