import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AnonymizeUAPlugin from 'puppeteer-extra-plugin-anonymize-ua';

puppeteerExtra.use(StealthPlugin());
puppeteerExtra.use(AnonymizeUAPlugin({ makeWindows: true }));

const browser = await puppeteerExtra.launch({
  headless: 'new',
  args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-blink-features=AutomationControlled','--window-size=1366,768'],
  ignoreDefaultArgs: ['--enable-automation'],
});

// Knop — esperar más tiempo para renderizado JS
let page = await browser.newPage();
await page.setViewport({ width: 1366, height: 768 });
const KNOP_SEARCH = 'https://www.farmaciasknop.com/search?fields=title%2Cvariants.title%2Cvariants.sku%2Cproduct_type.name%2Cvendor.name&q=Paracetamol';
await page.goto(KNOP_SEARCH, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
await new Promise(r => setTimeout(r, 4000));

const knop = await page.evaluate(() => {
  // Ver qué [class*="product"] hay
  const prods = Array.from(document.querySelectorAll('[class*="product"]')).slice(0, 5);
  const allHtml = document.body?.innerHTML;
  
  // Buscar precio en todo el body
  const priceMatches = allHtml?.match(/\$[\d\.]+/g)?.filter(p => {
    const n = parseInt(p.replace(/[^0-9]/g, ''));
    return n > 100 && n < 100000;
  }).slice(0, 10) || [];
  
  return {
    productEls: prods.map(el => ({ class: el.className.slice(0, 80), text: el.innerText?.slice(0, 100) })),
    pricesInPage: priceMatches,
    bodySlice2: allHtml?.slice(2000, 3000),
  };
});
console.log('KNOP networkidle0:', JSON.stringify(knop, null, 2));
await page.close();
await browser.close();
