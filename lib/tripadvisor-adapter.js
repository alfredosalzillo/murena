const _eval = require('eval');
const baseUrl = 'https://www.tripadvisor.it';

const search = async (browser, { query, geo, startAt }) => {
  const page = await browser.newPage();
  const url = `https://www.tripadvisor.it/Search?q=${query}&geo=${geo}&blockRedirect=true&ssrc=a&o=${startAt}`;
  console.log(`using url ${ url }`)
  await page.goto(url, { waitUntil: "load" });
  await page.waitFor(4000);
  return page;
}

const getSearchResults = (page) => page.evaluate(() => Array
  .from(document.querySelectorAll('.result-content-columns'))
  .map((e) => e.onclick.toString()))
  .then((data) => data
    .map(fn => fn.replace('function onclick(event) {\n', 'function onclick(event) {\n return '))
    .map(fn => (_eval(`
      const widgetEvCall = (...args) => args;
      module.exports = ${ fn }
     `)()))
    .map(([, , , link, { type, index, section, locationId }]) => ({
      provider: 'tripadvisor',
      link,
      metadata: { type, index, section, locationId },
    })));

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

const getCompany = async (page) => {
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
  return {
    name,
    address,
    website,
    menu,
    email,
    cellphone,
    maps,
    details,
  };
}

const searchCompany = async (browser, data) => {
  const page = await browser.newPage();
  const url = `${ baseUrl }${ data.link }`;
  await page.goto(url, { waitUntil: "load" });
  await page.waitFor(1000);
  return page;
}

module.exports = {
  search,
  searchCompany,
  getSearchResults,
  getName,
  getWebsite,
  getAddress,
  getContacts,
  getMenu,
  getDetails,
  getCompany,
}
