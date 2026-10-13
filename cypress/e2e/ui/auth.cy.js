import LoginPage from '../../pages/LoginPage';
import AccountPage from '../../pages/AccountPage';
import { buildUser } from '../../support/factories';

const loginPage = new LoginPage();
const accountPage = new AccountPage();

const authToken = () => cy.window().its('localStorage').invoke('getItem', 'auth-token');

describe('Authentication', () => {
  it('logs in a customer and shows their account page', { tags: ['@smoke', '@prod-safe'] }, () => {
    cy.credentialsFor('customer').then(({ email, password }) => {
      loginPage.visit().login(email, password);
    });

    cy.location('pathname').should('eq', '/account');
    accountPage.title.should('have.text', 'My account');
    authToken()
      .should('be.a', 'string')
      .and('not.be.empty')
      .then((token) => cy.currentUser(token))
      .then(({ first_name, last_name }) => {
        accountPage.navMenu.should('contain.text', `${first_name} ${last_name}`);
      });
  });

  context('with a disposable customer', () => {
    let user;

    beforeEach(() => {
      const data = buildUser();
      cy.registerUser(data).then(({ id }) => {
        user = { ...data, id };
      });
    });

    afterEach(() => {
      cy.deleteUser(user.id);
    });

    it('rejects a wrong password and keeps the user logged out', () => {
      cy.intercept('POST', '**/users/login').as('login');

      loginPage.visit().login(user.email, `${user.password}x`);

      cy.wait('@login').its('response.statusCode').should('eq', 401);
      loginPage.errorMessage.should('contain.text', 'Invalid email or password');
      cy.location('pathname').should('eq', '/auth/login');
      authToken().should('be.null');
    });

    it('locks the account after three failed attempts', () => {
      cy.intercept('POST', '**/users/login').as('login');
      loginPage.visit();

      Cypress._.times(3, () => {
        loginPage.login(user.email, `${user.password}x`);
        cy.wait('@login').its('response.statusCode').should('eq', 401);
      });

      loginPage.login(user.email, user.password);

      cy.wait('@login').its('response.statusCode').should('eq', 423);
      loginPage.errorMessage.should('contain.text', 'Account locked');
      authToken().should('be.null');
    });
  });
});
