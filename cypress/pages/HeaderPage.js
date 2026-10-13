import BasePage from './BasePage';

const selectors = {
  signIn: '[data-test="nav-sign-in"]',
  menuToggle: '[data-test="nav-menu"]',
  menuItems: '[aria-labelledby="menu"] > li > .dropdown-item',
  reportsItems: '[aria-labelledby="reportsDropdown"] .dropdown-item',
};

const labelsOf = ($items) => [...$items].map((item) => item.textContent.trim());

export default class HeaderPage extends BasePage {
  constructor() {
    super('/');
  }

  get signInLink() {
    return cy.get(selectors.signIn);
  }

  get menuToggle() {
    return cy.get(selectors.menuToggle);
  }

  openMenu() {
    this.menuToggle.click();
    return this;
  }

  shouldShowMenu(labels) {
    cy.get(selectors.menuItems)
      .should(($items) => expect(labelsOf($items)).to.deep.equal(labels))
      .and('be.visible');
    return this;
  }

  shouldListReports(labels) {
    cy.get(selectors.reportsItems).should(($items) =>
      expect(labelsOf($items)).to.deep.equal(labels),
    );
    return this;
  }

  shouldShowOnlySignIn() {
    this.signInLink.should('be.visible');
    this.menuToggle.should('not.exist');
    return this;
  }
}
