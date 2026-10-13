import BasePage, { SECRET_TYPING } from './BasePage';

const selectors = {
  email: '[data-test="email"]',
  password: '[data-test="password"]',
  submit: '[data-test="login-submit"]',
  error: '[data-test="login-error"]',
};

export default class LoginPage extends BasePage {
  constructor() {
    super('/auth/login');
  }

  get emailInput() {
    return cy.get(selectors.email);
  }

  get passwordInput() {
    return cy.get(selectors.password);
  }

  get submitButton() {
    return cy.get(selectors.submit);
  }

  get errorMessage() {
    return cy.get(selectors.error);
  }

  login(email, password) {
    this.fillField(() => this.emailInput, email);
    this.fillField(() => this.passwordInput, password, SECRET_TYPING);
    this.submitButton.click();
    return this;
  }
}
