import BasePage from './BasePage';

const selectors = {
  title: '[data-test="page-title"]',
  navMenu: '[data-test="nav-menu"]',
};

export default class AccountPage extends BasePage {
  constructor() {
    super('/account');
  }

  get title() {
    return cy.get(selectors.title);
  }

  get navMenu() {
    return cy.get(selectors.navMenu);
  }
}
