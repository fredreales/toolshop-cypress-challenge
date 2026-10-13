import BasePage from './BasePage';

const selectors = {
  name: '[data-test="name"]',
  description: '[data-test="description"]',
  stock: '[data-test="stock"]',
  price: '[data-test="price"]',
  brand: '[data-test="brand-id"]',
  category: '[data-test="category-id"]',
  image: '[data-test="product-image-id"]',
  submit: '[data-test="product-submit"]',
  success: '.alert-success',
  validationErrors: '.alert-danger',
};

export default class ProductFormPage extends BasePage {
  constructor() {
    super('/admin/products/add');
  }

  get nameInput() {
    return cy.get(selectors.name);
  }

  get descriptionInput() {
    return cy.get(selectors.description);
  }

  get stockInput() {
    return cy.get(selectors.stock);
  }

  get priceInput() {
    return cy.get(selectors.price);
  }

  get brandSelect() {
    return cy.get(selectors.brand);
  }

  get categorySelect() {
    return cy.get(selectors.category);
  }

  get imageSelect() {
    return cy.get(selectors.image);
  }

  get successAlert() {
    return cy.get(selectors.success);
  }

  get validationErrors() {
    return cy.get(selectors.validationErrors);
  }

  visitEdit(id) {
    cy.visit(`/admin/products/edit/${id}`);
    return this;
  }

  fillName(name) {
    return this.fillField(() => this.nameInput, name);
  }

  fillPrice(price) {
    return this.fillField(() => this.priceInput, price);
  }

  fill(product, catalog) {
    this.fillName(product.name);
    this.fillField(() => this.descriptionInput, product.description);
    this.fillField(() => this.stockInput, product.stock);
    this.fillPrice(product.price);
    this.brandSelect.should('contain', catalog.brand.name).select(catalog.brand.name);
    this.categorySelect.should('contain', catalog.category.name).select(catalog.category.name);
    this.imageSelect.select(catalog.image.id);
    return this;
  }

  submit() {
    cy.get(selectors.submit).click();
    return this;
  }
}
