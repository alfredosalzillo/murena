const fs = require('fs');
const yargs = require('yargs');
const fg = require('fast-glob');
const createBrowser = require('./lib/browser');
const {
  search,
  getSearchResults,
  searchCompany,
  getCompany,
} = require("./lib/tripadvisor-adapter");

const locations = {
  formia: 194765,
  gaeta: 187790,
  rimini: 187807,
  roma: 187791,
  genova: 187823,
  alassio: 194663,
  catanzaro: 187775,
  palermo: 187890,
};

const argv = yargs
  .command('collect', '')
  .command('export', '')
  .option('query', {
    alias: 'q',
    description: 'the kind of companies',
    type: 'string',
  })
  .option('location', {
    alias: 'l',
    description: `the location of the companies [${ Object.keys(locations) }]`,
    type: 'string',
  })
  .help()
  .alias('help', 'h')
  .argv;

const collect = async ({ location, query }) => {
  const browser = await createBrowser();
  for (const startAt of [0, 30, 60, 90, 120]) {
    const page = await search(browser, {
      query,
      startAt,
      geo: locations[location],
    });
    const companies = await getSearchResults(page);
    console.log(`find ${ companies.length } companies`)
    const outputFile = `./data/${ query }-${ location }.${ startAt }.json`;
    const outputs = [];
    for await (const current of companies) {
      console.log(`processing ${ current.link }`)
      const page = await searchCompany(browser, current);
      const company = await getCompany(page);
      const data = {
        ...company,
        providerData: current,
      };
      await page.close();
      outputs.push(data)
    }
    fs.writeFileSync(outputFile, JSON.stringify(outputs));
    console.log(`data logged to ${ outputFile }`)
  }
  await browser.close();
}

const parseAddress = (address) => {
  if (!address) return {};
  const [streetAddress, ...rest] = address.split(',');
  const fullCity = rest.join(' ');
  const zip = /(\d{5})/.exec(address)?.[0];
  const state = fullCity.match(/italia/ig) ? 'Italy' : null;
  const city = fullCity.replace('Italia', '').replace(/\d{5}/, '').trim();
  return { zip, city, state, streetAddress };
}
const exportTo = async ({ location, query }) => {
  const outputFile = `./exports/${ query || 'all' }-${ location || 'all' }.csv`;
  const files = await fg([`./data/${ query || '*' }-${ location || '*' }.*.json`]);
  fs.writeFileSync(outputFile, 'Name;Company Domain;Phone Number;Full Address;Street Address;City;State;Postal Code;Email;Website;Digital Menu;Google Maps');
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(file));
    for (const company of data) {
      fs.appendFileSync(outputFile, '\n');
      const { zip, city, state, streetAddress } = parseAddress(company.address);
      fs.appendFileSync(outputFile,
        [company.name, company.name, company.cellphone, company.address, streetAddress, city, state, zip, company.email, company.website, company.menu, company.maps].join(';'),
      );
    }
  }
}

(async () => {
  const [command] = argv._;
  const location = (argv.location || '').trim().toLocaleLowerCase();
  const query = argv.query;
  switch (command) {
    case 'collect':
      return collect({ location, query });
    case 'export':
      return exportTo({ location, query });
  }
  console.log('command not found');
})();
