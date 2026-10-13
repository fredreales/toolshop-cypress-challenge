import BasePage, { money } from './BasePage';

const selectors = {
  searchInput: '[data-test="product-search-query"]',
  searchButton: '[data-test="product-search-submit"]',
  rows: 'table tbody tr',
  editButton: (id) => `[data-test="product-edit-${id}"]`,
  deleteButton: (id) => `[data-test="product-delete-${id}"]`,
  toast: '#toast-container',
};

export default class AdminProductsPage extends BasePage {
  constructor() {
    super('/admin/products');
  }

  get rows() {
    return cy.get(selectors.rows);
  }

  get toast() {
    return cy.get(selectors.toast);
  }

  rowFor(id) {
    return cy.get(selectors.editButton(id)).parents('tr');
  }

  search(term) {
    cy.intercept({ method: 'QUERY', pathname: '/products/search' }).as('adminSearch');
    this.fillField(() => cy.get(selectors.searchInput), term);
    cy.get(selectors.searchButton).click();
    cy.wait('@adminSearch');
    return this;
  }

  edit(id) {
    cy.get(selectors.editButton(id)).click();
    return this;
  }

  delete(id) {
    cy.intercept('DELETE', `**/products/${id}`).as('deleteProduct');
    cy.get(selectors.deleteButton(id)).click();
    cy.wait('@deleteProduct').its('response.statusCode').should('eq', 204);
    return this;
  }

  shouldShowProduct(id, product) {
    this.rows.should('have.length', 1);
    this.rowFor(id)
      .find('td')
      .should(($cells) => {
        const [cellId, name, stock, price] = [...$cells].map((cell) => cell.innerText.trim());
        expect({ cellId, name, stock, price }).to.deep.equal({
          cellId: id,
          name: product.name,
          stock: String(product.stock),
          price: `$${money(product.price)}`,
        });
      });
    return this;
  }

  shouldHaveNoResults() {
    this.rows.should('have.length', 0);
    return this;
  }
}
