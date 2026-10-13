import AdminProductsPage from '../../pages/AdminProductsPage';
import ProductFormPage from '../../pages/ProductFormPage';
import HeaderPage from '../../pages/HeaderPage';
import { buildProduct, productPayload, searchTagOf } from '../../support/factories';

const adminProducts = new AdminProductsPage();
const productForm = new ProductFormPage();
const header = new HeaderPage();

describe('Customer permissions', () => {
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

  it('sees only the customer menu', () => {
    cy.loginAs('customer');

    header
      .visit()
      .openMenu()
      .shouldShowMenu([
        'My account',
        'My favorites',
        'My profile',
        'My invoices',
        'My messages',
        'Sign out',
      ]);
    header.signInLink.should('not.exist');
  });

  it("can't open the admin pages", () => {
    cy.loginAs('customer');

    adminProducts.visit();
    cy.location('pathname').should('eq', '/auth/login');

    productForm.visit();
    cy.location('pathname').should('eq', '/auth/login');
    productForm.nameInput.should('not.exist');
  });

  it("can't create a product (403)", () => {
    const product = buildProduct();

    cy.requestAs('customer', 'POST', '/products', productPayload(product, catalog)).then(
      (response) => {
        createdIds.push(response.body.id);
        expect(response.status).to.eq(403);
      },
    );

    cy.searchProducts(searchTagOf(product)).its('body.total').should('eq', 0);
  });

  it("can't update a product (403)", () => {
    const product = buildProduct();

    cy.createProduct(product, catalog).then(({ id }) => {
      createdIds.push(id);

      cy.requestAs(
        'customer',
        'PUT',
        `/products/${id}`,
        productPayload(buildProduct(), catalog),
      ).then((response) => {
        expect(response.status).to.eq(403);
      });

      cy.getProduct(id).its('body.name').should('eq', product.name);
    });
  });

  it("can't delete a product (403)", () => {
    cy.createProduct(buildProduct(), catalog).then(({ id }) => {
      createdIds.push(id);

      cy.requestAs('customer', 'DELETE', `/products/${id}`).then((response) => {
        expect(response.status).to.eq(403);
      });

      cy.getProduct(id).its('status').should('eq', 200);
    });
  });
});
