import { scrapeCruzVerde } from '../server/scrapers/cruzVerde.js';
import { scrapeDrSimi } from '../server/scrapers/drSimi.js';

const strategy = {}; // no se usa en las nuevas implementaciones API

console.log('Probando Dr. Simi...');
const drs1 = await scrapeDrSimi(null, 'Losartan', strategy);
console.log('DrSimi Losartan:', drs1);

const drs2 = await scrapeDrSimi(null, 'Metformina', strategy);
console.log('DrSimi Metformina:', drs2);

console.log('\nProbando Cruz Verde...');
const cv1 = await scrapeCruzVerde(null, 'Losartan', strategy);
console.log('CV Losartan:', cv1);

const cv2 = await scrapeCruzVerde(null, 'Atorvastatina', strategy);
console.log('CV Atorvastatina:', cv2);
