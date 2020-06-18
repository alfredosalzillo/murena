const puppeteer = require('puppeteer');
const fs = require('fs');

const baseUrl = 'https://www.tripadvisor.it';

const links = JSON.parse(fs.readFileSync('./data/links.json'));
const output = `./data/data-${ Date.now() }.json`;

const getFirst = ([first]) => first;
const getName = (page) => page.evaluate(() => document.querySelector('h1').textContent);
const getWebsite = (page) => page.evaluate(() => Array
  .from(document.querySelectorAll('a'))
  .filter(a => a.text === 'Sito web')
  .map(a => a.href))
  .then(getFirst)
const getAddress = (page) => page.evaluate(() => Array.from(document
  .querySelectorAll('[href="#MAPVIEW"]'))
  .map(a => a.text))
  .then(getFirst)
const getContacts = (page) => page.evaluate(() => Array
  .from(document.querySelectorAll('[class*=restaurants-detail-overview-cards-LocationOverviewCard] a'))
  .map(a => a.href))
  .then((links) => {
    const [email] = links.filter(link => link.startsWith('mailto:')).map(link => link.replace('mailto:', '').replace('?subject=?', ''))
    const [cellphone] = links.filter(link => link.startsWith('tel:')).map(link => link.replace('tel:', ''))
    const [maps] = links.filter(link => link.startsWith('https://maps.google.com'))
    return {
      email,
      cellphone,
      maps,
    };
  });
const getMenu = (page) => page.evaluate(() => Array
  .from(document.querySelectorAll('a'))
  .filter(a => a.text === 'Menù')
  .map(a => a.href))
  .then(getFirst);
const getDetails = (page) => page.evaluate(() => Array
  .from(document.querySelectorAll('[class*=restaurants-detail-overview-cards-DetailsSectionOverviewCard__detailsSummary] > div'))
  .map(detail => {
    const [name] = Array
      .from(detail.querySelectorAll('[class*=restaurants-detail-overview-cards-DetailsSectionOverviewCard__categoryTitle]'))
      .map(e => e.textContent)
    const [values] = Array
      .from(detail.querySelectorAll('[class*=restaurants-detail-overview-cards-DetailsSectionOverviewCard__tagText]'))
      .map(e => e.textContent.split(','))
    return {
      name, values,
    }
  }));

(async () => {
  const datas = [];
  const browser = await puppeteer.launch({
    headless: true,
  });
  try {
    for await (const current of links) {
      const url = `${ baseUrl }${ current.link }`;
      console.time(url);
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "load" });
      await page.waitFor(1000);
      const [
        name,
        website,
        address,
        {
          email,
          cellphone,
          maps,
        },
        menu,
        details,
      ] = await Promise.all([
        getName(page),
        getWebsite(page),
        getAddress(page),
        getContacts(page),
        getMenu(page),
        getDetails(page),
      ])
      const data = {
        name,
        address,
        website,
        menu,
        email,
        cellphone,
        maps,
        details,
        providerData: current,
      };
      console.log(data);
      await page.close();
      console.timeEnd(url);
      datas.push(data)
    }
  }
  catch (e) {
    console.error(e);
  }
  await browser.close();
  fs.writeFileSync(output, JSON.stringify(datas));
})();
