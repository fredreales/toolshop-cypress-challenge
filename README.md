# Toolshop Cypress Suite

Cypress + JavaScript automation for [Practice Software Testing (Toolshop)](https://github.com/testsmith-io/practice-software-testing), running against a local Docker instance.

| Area                    | Spec                                           | Tests |
| ----------------------- | ---------------------------------------------- | ----- |
| Authentication (UI)     | `cypress/e2e/ui/auth.cy.js`                    | 3     |
| Admin product CRUD (UI) | `cypress/e2e/ui/admin-products.cy.js`          | 5     |
| Products API            | `cypress/e2e/api/products.api.cy.js`           | 3     |
| Guest permissions       | `cypress/e2e/roles-permissions/guest.cy.js`    | 5     |
| Customer permissions    | `cypress/e2e/roles-permissions/customer.cy.js` | 5     |
| Admin permissions       | `cypress/e2e/roles-permissions/admin.cy.js`    | 5     |

Bugs found along the way are written up in [BUGS.md](BUGS.md).

## Expected failures

**6 of the 26 tests fail on purpose.** They are normal tests of the required scenarios, and they fail because the app has a bug. Those tests stay red until the bug is fixed.

| Test                                                 | Fails because of | What happens                                                                      |
| ---------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------- |
| Admin: updates the product name and price everywhere | BUG-002          | Save is blocked: the edit form loaded with stock, brand, category and image empty |
| API: runs the full product lifecycle (`@smoke`)      | BUG-005          | The `POST` response doesn't match the product schema                              |
| Guest permissions: can't create a product (401)      | BUG-001          | The API returns `201` instead of `401`                                            |
| Guest permissions: can't update a product (401)      | BUG-001          | The API returns `200` instead of `401`                                            |
| Customer permissions: can't create a product (403)   | BUG-001          | The API returns `201` instead of `403`                                            |
| Customer permissions: can't update a product (403)   | BUG-001          | The API returns `200` instead of `403`                                            |

The other 20 pass every run. Bugs that only an extra, bug-specific test would catch (BUG-003, BUG-004, BUG-006, BUG-007) are documented in BUGS.md without a test.

## Prerequisites

- Docker Desktop (or Docker Engine + Compose)
- Node.js 20+

## 1. Start Toolshop

```bash
git clone https://github.com/testsmith-io/practice-software-testing.git
cd practice-software-testing
docker compose up -d
docker compose exec laravel-api php artisan migrate:fresh --seed
```

The first start takes a few minutes. When it is ready:

| Service | URL                                     |
| ------- | --------------------------------------- |
| App     | http://localhost:4200                   |
| API     | http://localhost:8091                   |
| Swagger | http://localhost:8091/api/documentation |

If port 3306 is already taken (a local MySQL, for example), MariaDB will not start. The API talks to the database over the Docker network, so you can move the host port in `docker-compose.override.yml`:

```yaml
services:
  mariadb:
    ports: !override
      - 3307:3306
```

## 2. Run the suite

```bash
npm install
cp .env.example .env
npm test
```

`.env` holds the admin and customer credentials and is gitignored. `.env.example` has the public demo accounts from the brief, so copying it is all a local run needs. The suite stops with a clear message if any value is missing.

| Command                    | What it does                               |
| -------------------------- | ------------------------------------------ |
| `npm test`                 | All specs, headless                        |
| `npm run test:smoke`       | `@smoke` tests only                        |
| `npm run test:prod-safe`   | `@prod-safe` tests against the hosted site |
| `npm run test:ui`          | UI specs only                              |
| `npm run test:api`         | API specs only                             |
| `npm run test:permissions` | Role and permission specs only             |
| `npm run open`             | Cypress interactive runner                 |
| `npm run lint`             | ESLint                                     |
| `npm run format`           | Prettier                                   |

The app and API URLs default to localhost and can be changed with `BASE_URL` and `API_URL`.

## Tags

Tests are tagged with [@cypress/grep](https://github.com/cypress-io/cypress/tree/develop/npm/grep). Untagged tests only run in the full suite.

| Tag          | Meaning                                                             | Tests                                                                                                       |
| ------------ | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `@smoke`     | One fast check per area, run first in CI to fail early              | customer login, create a product (UI), product lifecycle (API)                                              |
| `@prod-safe` | Never writes data, so it can run against the hosted production site | customer login, empty product form is blocked, product list format (API), invalid product is rejected (API) |

The hosted Toolshop (`https://practicesoftwaretesting.com`) reports itself as `production`, so `@prod-safe` has a real target. `npm run test:prod-safe` points the suite there. As a guard, `cypress.config.js` refuses to start when the app or API URL is not localhost and the selected tag is anything other than `@prod-safe`, so a full run can't accidentally create data in production.

Tests that create data live in a `with a seeded catalog` block. Hooks run whenever any test in their block runs, so keeping the read-only tests outside that block means a `@prod-safe` run never seeds a brand or category.

Tag expressions also work directly, for example `npx cypress run --expose grepTags=-@smoke` runs everything except smoke.

## Project structure

```
cypress/
  e2e/
    ui/                 auth and admin product specs
    api/                products API spec
    roles-permissions/  one spec per role: guest, customer, admin
  pages/                page objects (selectors, getters, actions, checks)
  support/
    commands.js         login by role, data setup and cleanup
    factories.js        faker builders for products, brands, categories, users
    schemas/            JSON schemas for API responses
.github/workflows/      CI pipeline
.env.example            credential keys with the public demo values
```

## Design decisions

**Every test owns its data.** Each product test creates its product through the API, does the UI step it is about, and an `afterEach` deletes the product by id. Tests don't depend on each other, so any one of them can run alone or in any order. The Create test builds its product through the UI form and reads the new id from the intercepted `POST` response so it can be cleaned up too. The Delete test removes a product that test created, through the UI, and then checks it is gone from the admin list, the storefront and the API (`404`).

**No assumptions about catalog data.** Each spec creates its own brand and category in `before` and removes them in `after`. The only existing data used is a product image, picked from `GET /images`, because images can't be created through the API.

**Unique, labeled names.** Everything the suite creates starts with `Cypress-<timestamp><random>`, so leftovers are easy to spot and runs never collide. Searches use that tag, then the test checks the full name on the result.

**A disposable user for failed logins.** The app locks a customer account after 3 wrong passwords, and once locked even the right password fails. Running the invalid-login test against the seeded customer would lock it after a few runs and break the valid-login test. Those tests register a fresh faker user through the API and delete it afterwards.

**Credentials stay out of the code.** Specs only name a role, like `cy.loginAs('admin')` or `cy.requestAs('customer', ...)`. The commands read that role's email and password from `.env` with `cy.env()`, the Cypress 15 API for secrets, and the login request isn't written to the command log. The valid-login test doesn't hard-code the customer's name either: it asks `GET /users/me` who is logged in and checks that name is shown.

**Fast, stable login.** Admin tests log in through the API and put the token in `localStorage` inside `cy.session`. Tokens only live 5 minutes, so the session is validated against `GET /users/me` and recreated when it expires. The UI login form is still covered by the auth spec.

**Waiting on the app, not the clock.** No `cy.wait(ms)`. Tests wait on intercepted requests (search, create, update, delete) and on assertions that retry. The UI sends searches with the HTTP `QUERY` method, so the intercepts match on that.

**Meaningful assertions.** Create checks the saved product through the API: name, description, price, brand, category and image. Read checks the admin row (id, name, stock, price) and the storefront card and detail page (name, description, price, category, brand). Update checks the new values in both places and that the old name no longer shows up.

**Fresh data in the browser.** The API tells browsers to cache brand, category and product GETs for 2 minutes, so a brand created after the product form first loaded didn't show in its dropdown (BUG-006). A global `beforeEach` sets `Cache-Control: no-store` on API responses the app receives, so every test sees the current data. API calls made with `cy.request` are not affected.

**API responses are checked against JSON schemas.** API tests run every response through [cypress-ajv-schema-validator](https://github.com/sclavijosuero/cypress-ajv-schema-validator): product details, the paginated product list and search, update results, validation errors and the not-found message. The schemas list every required field and reject unknown top-level fields, so a renamed, missing or retyped field fails the test even when the values the test asserts look right. They are written by hand because the API's own OpenAPI document can't be used for this: its `ProductResponse` has no required fields (an empty object would pass), it documents `POST /products` as `200` instead of `201`, and it uses OpenAPI 3.2, which the validator doesn't support.

**Retries are off.** Flaky tests should fail, not get hidden. Over repeated local runs with no retries, the same 20 tests passed and the same 6 failed for the same reasons every time, with no data left behind.

## Role-based access

`cypress/e2e/roles-permissions/` has one spec per role, so each file reads as everything that role can and can't do. Each role is checked against the header menu and the admin pages (UI) and every product action (API). Every request also checks the resulting state: refused requests leave nothing changed (no product created, same name, product still there), and admin requests really create, update and delete.

| Action                    | `guest.cy.js`        | `customer.cy.js`     | `admin.cy.js`   |
| ------------------------- | -------------------- | -------------------- | --------------- |
| Header menu (UI)          | only a Sign in link  | customer menu only   | admin menu only |
| Open the admin pages (UI) | sent to login        | sent to login        | allowed         |
| Create a product (API)    | `401` (fails: `201`) | `403` (fails: `201`) | `201`           |
| Update a product (API)    | `401` (fails: `200`) | `403` (fails: `200`) | `200`           |
| Delete a product (API)    | `401`                | `403`                | `204`           |

The menu tests compare the exact list of items, so an extra item fails too, such as an admin link showing up for a customer. The admin's Reports submenu only opens on mouse hover (BUG-007), so its three links are checked by presence and label.

API calls for a role go through one command, `cy.requestAs(role, method, path, body)`, which logs in as that role (or sends no token for a guest).

## Stretch goals

- **Negative tests:** the admin form blocks saving with empty required fields (no `POST` is sent), and the API rejects a product with no name and a non-numeric price (`422` with field errors).
- **API level:** the full product lifecycle (create, read, search, update, delete) with schema validation on every response, and a list format check that also runs against production. Role-based access is covered above.
- **CI:** [.github/workflows/e2e.yml](.github/workflows/e2e.yml) starts Toolshop with Docker Compose (pinned to the commit this suite was built against), seeds the database, waits for the app and API, runs lint, then the `@smoke` tests, then everything else. The rest of the suite still runs when a smoke test fails, so every run reports the full picture. Starting the workflow by hand from the Actions tab adds a **Tests to run** dropdown: `all` (the same as a push), `@smoke` (only the smoke tests), or `@prod-safe` (only the prod-safe tests, against the hosted site, without starting Docker). Failure screenshots are uploaded as artifacts.

## Assumptions

- The suite targets sprint5, the repo's default version.
- The seeded admin and customer accounts exist with the passwords from the brief. Locally they come from `.env`; in CI they come from the repository secrets `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CUSTOMER_EMAIL` and `CUSTOMER_PASSWORD`.
- The database doesn't need to be reset between runs. The suite cleans up after itself.

## AI use

I used Claude Code throughout. It read the Toolshop source (Angular templates, Laravel controllers and validation rules) to find selectors and API contracts, scaffolded the page objects and specs, and helped dig into failures. I checked everything against the running app, and several of its first assumptions were wrong and had to be corrected. Its first test data prefix (`QA-`) made products unsearchable, which turned out to be a real bug (BUG-003). Its storefront intercept watched the wrong endpoint, and the storefront search silently drops queries over 40 characters (BUG-004). It also cached the admin token for the whole run, until we found tokens expire after 5 minutes. I reviewed every file, ran the suite repeatedly to prove it was stable, and confirmed each bug in BUGS.md by hand before writing it up.

## What I'd add next

- Cover the rest of the admin catalog (brands, categories) and the customer checkout flow.
- Run the suite in parallel across machines in CI and publish an HTML report.
- Visual checks of key pages at desktop and mobile widths.
