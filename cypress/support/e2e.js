import { register } from '@cypress/grep';
import 'cypress-ajv-schema-validator';
import './commands';

register();

beforeEach(() => {
  cy.intercept({ method: 'GET', url: `${Cypress.expose('apiUrl')}/**` }, (req) => {
    req.on('response', (res) => {
      res.headers['cache-control'] = 'no-store';
    });
  });
});
