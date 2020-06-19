const puppeteer = require('puppeteer');

module.exports = () => puppeteer.launch({
  headless: true,
  args: ['--no-sandbox'],
  executablePath: 'chromium',
});
