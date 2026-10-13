export const SECRET_TYPING = { log: false, parseSpecialCharSequences: false };

export const money = (price) => price.toFixed(2);

export const trimmed = (subject) => subject.invoke('text').invoke('trim');

export default class BasePage {
  constructor(path) {
    this.path = path;
  }

  visit() {
    cy.visit(this.path);
    return this;
  }

  fillField(getField, value, options = {}) {
    getField().clear();
    getField().type(String(value), options);
    return this;
  }
}
