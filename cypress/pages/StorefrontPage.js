import BasePage, { money, trimmed } from './BasePage';

const selectors = {
  searchInput: '[data-test="search-query"]',
  searchButton: '[data-test="search-submit"]',
  searchTerm: '[data-test="search-term"]',
  card: (id) => `[data-test="product-${id}"]`,
  cardName: '[data-test="product-name"]',
  cardPrice: '[data-test="product-price"]',
  noResults: '[data-test="no-results"]',
};

export default class StorefrontPage extends BasePage {
  constructor() {
    super('/');
  }

  get searchTerm() {
    return cy.get(selectors.searchTerm);
  }

  get noResults() {
    return cy.get(selectors.noResults);
  }

  card(id) {
    return cy.get(selectors.card(id));
  }

  cardName(id) {
    return this.card(id).find(selectors.cardName);
  }

  cardPrice(id) {
    return this.card(id).find(selectors.cardPrice);
  }

  search(term) {
    cy.intercept({ method: 'QUERY', pathname: '/products/search' }).as('storefrontSearch');
    this.fillField(() => cy.get(selectors.searchInput), term);
    cy.get(selectors.searchButton).click();
    cy.wait('@storefrontSearch');
    this.searchTerm.should('have.text', term);
    return this;
  }

  openProduct(id) {
    this.card(id).click();
    return this;
  }

  shouldShowProduct(id, product) {
    trimmed(this.cardName(id)).should('eq', product.name);
    this.cardPrice(id).should('have.text', `$${money(product.price)}`);
    return this;
  }

  shouldHaveNoResults() {
    this.noResults.should('be.visible');
    return this;
  }
}
