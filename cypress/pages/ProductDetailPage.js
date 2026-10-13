import BasePage, { money, trimmed } from './BasePage';

const selectors = {
  name: '[data-test="product-name"]',
  description: '[data-test="product-description"]',
  price: '[data-test="unit-price"]',
  category: '[aria-label="category"]',
  brand: '[aria-label="brand"]',
};

export default class ProductDetailPage extends BasePage {
  get name() {
    return cy.get(selectors.name);
  }

  get description() {
    return cy.get(selectors.description);
  }

  get price() {
    return cy.get(selectors.price);
  }

  get category() {
    return cy.get(selectors.category);
  }

  get brand() {
    return cy.get(selectors.brand);
  }

  shouldShowProduct(id, product, catalog) {
    cy.location('pathname').should('eq', `/product/${id}`);
    trimmed(this.name).should('eq', product.name);
    trimmed(this.description).should('eq', product.description);
    this.price.should('have.text', money(product.price));
    trimmed(this.category).should('eq', catalog.category.name);
    trimmed(this.brand).should('eq', catalog.brand.name);
    return this;
  }
}
