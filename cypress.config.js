require('dotenv').config({ quiet: true });
const { defineConfig } = require('cypress');
const { plugin: grepPlugin } = require('@cypress/grep/plugin');

const CREDENTIALS = ['ADMIN_EMAIL', 'ADMIN_PASSWORD', 'CUSTOMER_EMAIL', 'CUSTOMER_PASSWORD'];

const isLocal = (url) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(url);

module.exports = defineConfig({
  env: Object.fromEntries(CREDENTIALS.map((key) => [key, process.env[key]])),
  expose: {
    apiUrl: process.env.API_URL || 'http://localhost:8091',
    grepFilterSpecs: true,
    grepOmitFiltered: true,
  },
  e2e: {
    baseUrl: process.env.BASE_URL || 'http://localhost:4200',
    specPattern: 'cypress/e2e/**/*.cy.js',
    fixturesFolder: false,
    viewportWidth: 1400,
    viewportHeight: 900,
    defaultCommandTimeout: 8000,
    video: false,
    retries: 0,
    setupNodeEvents(on, config) {
      const missing = CREDENTIALS.filter((key) => !config.env[key]);
      if (missing.length) {
        throw new Error(`Missing ${missing.join(', ')}. Copy .env.example to .env.`);
      }
      const { apiUrl, grepTags } = config.expose;
      const remote = !isLocal(config.baseUrl) || !isLocal(apiUrl);
      if (remote && grepTags !== '@prod-safe') {
        throw new Error(
          `Only @prod-safe tests can run against ${config.baseUrl}. Use npm run test:prod-safe.`,
        );
      }
      grepPlugin(config);
      return config;
    },
  },
});
