const fs = require('fs');
const yargs = require('yargs');
const fg = require('fast-glob');
const createBrowser = require('./lib/browser');
const { createEntryRepository, createPackRepository } = require("./lib/dato-ji");
const {
  search,
  getSearchResults,
  searchCompany,
  getCompany,
} = require("./lib/tripadvisor-adapter");

const wait = (ms) => new Promise((resolve => setTimeout(resolve, ms)));

const datoJiConfig = {
  token: 'gk5RuW4_p5pSvkSWS-ayWnxAero6WJkX',
  packId: '2f9b18fb-4cfb-4ea2-95d3-c96f5f1644d5',
}

const locations = {
  benevento: 194690,
  bari: 187874,
  formia: 194765,
  gaeta: 187790,
  rimini: 187807,
  riccione: 194878,
  caserta: 194713,
  napoli: 187785,
  salerno: 187781,
  roma: 187791,
  genova: 187823,
  alassio: 194663,
  catanzaro: 187775,
  palermo: 187890,
};

const argv = yargs
  .command('collect', '')
  .command('export', '')
  .command('synchronize', '')
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

const synchronize = async ({ location, query }) => {
  const { token, packId } = datoJiConfig;
  const packRepository = createPackRepository({ token });
  const entryRepository = createEntryRepository({ token, packId });
  const files = await fg([`./data/${ query || '*' }-${ location || '*' }.*.json`]);
  await packRepository.clearOne(packId);
  for (const file of files) {
    console.log(`processing ${file}`)
    const data = JSON.parse(fs.readFileSync(file));
    const [,ids1, ids2] = await Promise.all([
      wait(1000 * 60 * 5 / 200),
      entryRepository.createMany(data.slice(0, 20)),
      entryRepository.createMany(data.slice(20)),
    ]);
    const ids = ids1.concat(ids2);
    console.log(`ids ${ids.length}`);
    console.group();
    ids.forEach(id => console.log(id))
    console.groupEnd();
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
    case 'synchronize':
      return synchronize({ location, query });
  }
  console.log('command not found');
})();
