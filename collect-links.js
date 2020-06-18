const puppeteer = require('puppeteer');
const _eval = require('eval');
const fs = require('fs');

const url = 'https://www.tripadvisor.it/Search?q=ristorante&searchSessionId=E6CECBC3989A8DE726E749142892870C1592464702930ssid&geo=194765&sid=72936EAB949B3276F755E44F40A32C951592465282805&blockRedirect=true&ssrc=a';

(async () => {
  const browser = await puppeteer.launch({
     headless: true,
  });
  const page = await browser.newPage();
  await page.goto(url);
  await page.waitFor(4000);
  const results = (await page.evaluate(() => Array
    .from(document.querySelectorAll('.result-content-columns'))
    .map((e) => e.onclick.toString())
  ))
    .map(fn => fn.replace('function onclick(event) {\n', 'function onclick(event) {\n return '))
    .map(fn => (_eval(`
  const widgetEvCall = (...args) => args;
  module.exports = ${ fn }
  `)()));
  await browser.close();
  fs.writeFileSync('./data/links.json', JSON
    .stringify(results.map(([,,, link, { type, index, section, locationId }]) => ({
      provider: 'tripadvisor',
      link,
      metadata: { type, index, section, locationId },
    }))));
})();
