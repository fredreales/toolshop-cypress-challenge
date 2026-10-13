import AdminProductsPage from '../../pages/AdminProductsPage';
import ProductFormPage from '../../pages/ProductFormPage';
import HeaderPage from '../../pages/HeaderPage';
import { buildProduct, productPayload, searchTagOf } from '../../support/factories';

const adminProducts = new AdminProductsPage();
const productForm = new ProductFormPage();
const header = new HeaderPage();

describe('Admin permissions', () => {
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

  it('sees only the admin menu', () => {
    cy.loginAs('admin');

    header
      .visit()
      .openMenu()
      .shouldShowMenu([
        'Dashboard',
        'Brands',
        'Categories',
        'Products',
        'Orders',
        'Users',
        'Messages',
        'Settings',
        'Reports',
        'Sign out',
      ])
      .shouldListReports(['Statistics', 'Average sales per month', 'Average sales per week']);
    header.signInLink.should('not.exist');
  });

  it('can open the admin pages', () => {
    cy.loginAs('admin');

    adminProducts.visit();
    cy.location('pathname').should('eq', '/admin/products');

    productForm.visit();
    cy.location('pathname').should('eq', '/admin/products/add');
    productForm.nameInput.should('be.visible');
  });

  it('can create a product (201)', () => {
    const product = buildProduct();

    cy.requestAs('admin', 'POST', '/products', productPayload(product, catalog)).then(
      (response) => {
        createdIds.push(response.body.id);
        expect(response.status).to.eq(201);
      },
    );

    cy.searchProducts(searchTagOf(product)).its('body.total').should('eq', 1);
  });

  it('can update a product (200)', () => {
    const updated = buildProduct();

    cy.createProduct(buildProduct(), catalog).then(({ id }) => {
      createdIds.push(id);

      cy.requestAs('admin', 'PUT', `/products/${id}`, productPayload(updated, catalog)).then(
        (response) => {
          expect(response.status).to.eq(200);
        },
      );

      cy.getProduct(id).its('body.name').should('eq', updated.name);
    });
  });

  it('can delete a product (204)', () => {
    cy.createProduct(buildProduct(), catalog).then(({ id }) => {
      createdIds.push(id);

      cy.requestAs('admin', 'DELETE', `/products/${id}`).then((response) => {
        expect(response.status).to.eq(204);
      });

      cy.getProduct(id).its('status').should('eq', 404);
    });
  });
});
