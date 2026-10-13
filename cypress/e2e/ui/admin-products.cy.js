import AdminProductsPage from '../../pages/AdminProductsPage';
import ProductFormPage from '../../pages/ProductFormPage';
import StorefrontPage from '../../pages/StorefrontPage';
import ProductDetailPage from '../../pages/ProductDetailPage';
import { buildProduct, searchTagOf } from '../../support/factories';

const adminProducts = new AdminProductsPage();
const productForm = new ProductFormPage();
const storefront = new StorefrontPage();
const productDetail = new ProductDetailPage();

describe('Admin product management', () => {
  beforeEach(() => {
    cy.loginAs('admin');
  });

  it('does not save a product with empty required fields', { tags: '@prod-safe' }, () => {
    cy.intercept('POST', '**/products', cy.spy().as('createRequest'));

    productForm.visit().submit();

    productForm.validationErrors
      .should('contain.text', 'Name is required')
      .and('contain.text', 'Description is required')
      .and('contain.text', 'Price is required');
    cy.get('@createRequest').should('not.have.been.called');
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

    it('creates a product with all its fields', { tags: '@smoke' }, () => {
      const product = buildProduct();
      cy.intercept('POST', '**/products').as('createProduct');

      productForm.visit().fill(product, catalog).submit();

      cy.wait('@createProduct').then(({ response }) => {
        createdIds.push(response.body.id);
        expect(response.statusCode).to.eq(201);
        productForm.successAlert.should('contain.text', 'Product saved!');

        cy.getProduct(response.body.id)
          .its('body')
          .should((saved) => {
            expect(saved).to.include({
              name: product.name,
              description: product.description,
              price: product.price,
            });
            expect(saved.brand.id).to.eq(catalog.brand.id);
            expect(saved.category.id).to.eq(catalog.category.id);
            expect(saved.product_image.id).to.eq(catalog.image.id);
          });
      });
    });

    it('shows the product in the admin list and on the storefront', () => {
      const product = buildProduct();

      cy.createProduct(product, catalog).then(({ id }) => {
        createdIds.push(id);

        adminProducts.visit().search(searchTagOf(product)).shouldShowProduct(id, product);
        storefront
          .visit()
          .search(searchTagOf(product))
          .shouldShowProduct(id, product)
          .openProduct(id);
        productDetail.shouldShowProduct(id, product, catalog);
      });
    });

    it('updates the product name and price everywhere', () => {
      const product = buildProduct();
      const updated = {
        ...product,
        name: buildProduct().name,
        price: Number((product.price + 10).toFixed(2)),
      };

      cy.createProduct(product, catalog).then(({ id }) => {
        createdIds.push(id);

        cy.intercept('PUT', `**/products/${id}`).as('updateProduct');

        adminProducts.visit().search(searchTagOf(product)).edit(id);
        productForm.nameInput.should('have.value', product.name);
        productForm.fillName(updated.name).fillPrice(updated.price).submit();

        cy.wait('@updateProduct').its('response.statusCode').should('eq', 200);
        productForm.successAlert.should('contain.text', 'Product saved!');

        adminProducts.visit().search(searchTagOf(updated)).shouldShowProduct(id, updated);
        storefront
          .visit()
          .search(searchTagOf(updated))
          .shouldShowProduct(id, updated)
          .openProduct(id);
        productDetail.shouldShowProduct(id, updated, catalog);

        adminProducts.visit().search(searchTagOf(product)).shouldHaveNoResults();
        storefront.visit().search(searchTagOf(product)).shouldHaveNoResults();
      });
    });

    it('deletes the product from the admin list and the storefront', () => {
      const product = buildProduct();

      cy.createProduct(product, catalog).then(({ id }) => {
        createdIds.push(id);

        adminProducts.visit().search(searchTagOf(product)).delete(id);
        adminProducts.toast.should('contain.text', 'Product deleted.');

        adminProducts.search(searchTagOf(product)).shouldHaveNoResults();
        storefront.visit().search(searchTagOf(product)).shouldHaveNoResults();
        cy.getProduct(id).its('status').should('eq', 404);
      });
    });
  });
});
