import { buildBrand, buildCategory, productPayload } from './factories';

const apiUrl = (path) => `${Cypress.expose('apiUrl')}${path}`;

const cleanupRequest = (path, expected = [204]) =>
  cy
    .adminRequest('DELETE', path, null, { failOnStatusCode: false })
    .its('status')
    .should('be.oneOf', expected);

Cypress.Commands.add('credentialsFor', (role) => {
  const keys = [`${role.toUpperCase()}_EMAIL`, `${role.toUpperCase()}_PASSWORD`];
  return cy
    .env(keys, { log: false })
    .then((env) => ({ email: env[keys[0]], password: env[keys[1]] }));
});

Cypress.Commands.add('apiLogin', (role) =>
  cy.credentialsFor(role).then(({ email, password }) =>
    cy
      .request({
        method: 'POST',
        url: apiUrl('/users/login'),
        body: { email, password },
        log: false,
      })
      .its('body.access_token'),
  ),
);

Cypress.Commands.add('currentUser', (token) =>
  cy
    .request({
      url: apiUrl('/users/me'),
      headers: { Authorization: `Bearer ${token}` },
      log: false,
    })
    .its('body'),
);

Cypress.Commands.add('adminRequest', (method, path, body, options = {}) =>
  cy.apiLogin('admin').then((token) =>
    cy.request({
      method,
      url: apiUrl(path),
      body,
      headers: { Authorization: `Bearer ${token}` },
      ...options,
    }),
  ),
);

const bearerFor = (role) =>
  cy.apiLogin(role).then((token) => ({ Authorization: `Bearer ${token}` }));

const headersFor = {
  guest: () => cy.wrap({}),
  customer: () => bearerFor('customer'),
  admin: () => bearerFor('admin'),
};

Cypress.Commands.add('requestAs', (role, method, path, body) =>
  headersFor[role]().then((headers) =>
    cy.request({ method, url: apiUrl(path), body, headers, failOnStatusCode: false }),
  ),
);

Cypress.Commands.add('loginAs', (role) => {
  cy.session(
    ['ui-login', role],
    () => {
      cy.apiLogin(role).then((token) => window.localStorage.setItem('auth-token', token));
    },
    {
      cacheAcrossSpecs: true,
      validate() {
        cy.currentUser(window.localStorage.getItem('auth-token'));
      },
    },
  );
});

Cypress.Commands.add('seedCatalog', () => {
  const catalog = {};
  cy.request(apiUrl('/images')).then(({ body }) => {
    catalog.image = body[0];
  });
  cy.adminRequest('POST', '/brands', buildBrand()).then(({ body }) => {
    catalog.brand = body;
  });
  cy.adminRequest('POST', '/categories', buildCategory()).then(({ body }) => {
    catalog.category = body;
  });
  return cy.wrap(catalog);
});

Cypress.Commands.add('cleanupCatalog', (catalog) => {
  cleanupRequest(`/brands/${catalog.brand.id}`);
  cleanupRequest(`/categories/${catalog.category.id}`);
});

Cypress.Commands.add('createProduct', (product, catalog) =>
  cy.adminRequest('POST', '/products', productPayload(product, catalog)).its('body'),
);

Cypress.Commands.add('deleteProduct', (id) => cleanupRequest(`/products/${id}`, [204, 404]));

Cypress.Commands.add('searchProducts', (term) =>
  cy.request({ url: apiUrl('/products/search'), qs: { q: term } }),
);

Cypress.Commands.add('getProduct', (id) =>
  cy.request({ url: apiUrl(`/products/${id}`), failOnStatusCode: false }),
);

Cypress.Commands.add('registerUser', (user) =>
  cy.request('POST', apiUrl('/users/register'), user).its('body'),
);

Cypress.Commands.add('deleteUser', (id) => cleanupRequest(`/users/${id}`));
