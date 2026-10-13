import { buildProduct, productPayload, searchTagOf } from '../../support/factories';
import productSchema from '../../support/schemas/product.schema.json';
import productsPageSchema from '../../support/schemas/products-page.schema.json';
import updateResultSchema from '../../support/schemas/update-result.schema.json';
import messageSchema from '../../support/schemas/message.schema.json';
import validationErrorSchema from '../../support/schemas/validation-error.schema.json';

const apiUrl = (path) => `${Cypress.expose('apiUrl')}${path}`;

describe('Products API', () => {
  it('returns a page of products in the expected format', { tags: '@prod-safe' }, () => {
    cy.request(apiUrl('/products?page=1'))
      .validateSchema(productsPageSchema)
      .then(({ status, body }) => {
        expect(status).to.eq(200);
        expect(body.current_page).to.eq(1);
        expect(body.data).to.have.length.greaterThan(0);
      });
  });

  it('rejects a product with a missing name and an invalid price', { tags: '@prod-safe' }, () => {
    const withoutName = Cypress._.omit(buildProduct(), 'name');

    cy.adminRequest(
      'POST',
      '/products',
      { ...withoutName, price: 'not-a-number' },
      { failOnStatusCode: false },
    )
      .validateSchema(validationErrorSchema)
      .then(({ status, body }) => {
        expect(status).to.eq(422);
        expect(body.name).to.deep.equal(['The name field is required.']);
        expect(body.price).to.deep.equal(['The price field must be a number.']);
      });
  });

  context('with a seeded catalog', () => {
    let catalog;
    const createdIds = [];

    before(() => {
      cy.seedCatalog().then((seeded) => {
        catalog = seeded;
      });
    });

    afterEach(() => {
      createdIds.splice(0).forEach((id) => cy.deleteProduct(id));
    });

    after(() => {
      cy.cleanupCatalog(catalog);
    });

    it('runs the full product lifecycle', { tags: '@smoke' }, () => {
      const product = buildProduct();
      const updated = {
        ...product,
        name: buildProduct().name,
        price: Number((product.price + 10).toFixed(2)),
      };

      cy.adminRequest('POST', '/products', productPayload(product, catalog))
        .then(({ body }) => {
          createdIds.push(body.id);
        })
        .validateSchema(productSchema)
        .then(({ status, body }) => {
          expect(status).to.eq(201);
          expect(body).to.include({ name: product.name, price: product.price });
          const { id } = body;

          cy.getProduct(id)
            .validateSchema(productSchema)
            .then((response) => {
              expect(response.status).to.eq(200);
              expect(response.body).to.include({
                id,
                name: product.name,
                description: product.description,
                price: product.price,
              });
              expect(response.body.brand.name).to.eq(catalog.brand.name);
              expect(response.body.category.name).to.eq(catalog.category.name);
            });

          cy.searchProducts(searchTagOf(product))
            .validateSchema(productsPageSchema)
            .its('body.data')
            .should('have.length', 1)
            .its('0.id')
            .should('eq', id);

          cy.adminRequest('PUT', `/products/${id}`, productPayload(updated, catalog))
            .validateSchema(updateResultSchema)
            .its('status')
            .should('eq', 200);
          cy.getProduct(id)
            .its('body')
            .should('include', { name: updated.name, price: updated.price });

          cy.adminRequest('DELETE', `/products/${id}`).its('status').should('eq', 204);
          cy.getProduct(id)
            .validateSchema(messageSchema)
            .then(({ status, body }) => {
              expect(status).to.eq(404);
              expect(body.message).to.eq('Requested item not found');
            });
        });
    });
  });
});
