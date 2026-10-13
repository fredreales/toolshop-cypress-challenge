# Bugs

Found while exploring and automating Toolshop (sprint5, commit `ae7caecb`) on a local Docker instance.

| ID      | Title                                                                           | Severity |
| ------- | ------------------------------------------------------------------------------- | -------- |
| BUG-001 | Products and catalog data can be created and edited without a login             | High     |
| BUG-002 | Edit Product form loads without stock, brand, category and image                | High     |
| BUG-003 | Search cannot find products whose name has a word of 1 or 2 characters          | Medium   |
| BUG-004 | Storefront search silently ignores queries longer than 40 characters            | Low      |
| BUG-005 | Product API returns `in_stock` with different types and omits `stock`           | Low      |
| BUG-006 | New brands and categories are missing from the product form for up to 2 minutes | Medium   |
| BUG-007 | Admin Reports submenu can't be opened with the keyboard or by touch             | Low      |

---

## BUG-001: Products and catalog data can be created and edited without a login

**Description:** `POST /products`, `PUT /products/{id}`, `POST /brands` and `POST /categories` accept requests with no `Authorization` header, and from logged-in customers. Only `DELETE` checks for the admin role. Anyone who can reach the API can add or change products in the catalog.

**Steps to reproduce:**

1. Send `POST http://localhost:8091/products` with a valid product body and no token.
2. Send `PUT http://localhost:8091/products/{id}` for that product with a new name and no token.
3. Repeat both with a customer token (`customer@practicesoftwaretesting.com`).

**Actual:** `201 Created` and `200 OK` every time. The product is created and updated.

**Expected:** `401 Unauthorized` without a token, and `403 Forbidden` for non-admin users, the same as `DELETE`.

**Caught by:** the guest and customer permission specs: creating or updating a product (4 tests).

**Scope:** the UI does not expose this. The admin pages sit behind a route guard (`AdminAuthGuard`) that redirects any non-admin to the login page, so a normal user clicking through the app never reaches the create or edit form. The gap is in the API: that guard runs only in the browser and decides what to show, not what the server allows, so the missing server-side check is still reachable by calling the API directly. This lowers the day-to-day exposure but not the underlying risk, since a client-side guard is trivial to bypass.

**Related:** the account lockout after 3 failed logins skips admin accounts (`role != "admin"` in `UserService::login`), so the most privileged account is the only one that can be brute-forced.

---

## BUG-002: Edit Product form loads without stock, brand, category and image

**Description:** Opening any product in **Admin > Products > Edit** fills name, description and price, but leaves Stock, Brand, Category and Image empty. All four are required, so the admin has to re-enter them to save any change.

**Steps to reproduce:**

1. Log in as `admin@practicesoftwaretesting.com`.
2. Go to Admin > Products and click Edit on any product (for example "Thor Hammer").
3. Without changing anything, click Save.

**Actual:** Stock, Brand, Category and Image are empty. Save shows only "Quantity is required". The empty Brand, Category and Image make the form invalid too, but show no message.

**Expected:** The form loads with every saved value, and saving an unchanged product succeeds.

**Notes:** `GET /products/{id}` returns `brand` and `category` as nested objects and has no `stock` field, so `form.patchValue()` has nothing to put in `brand_id`, `category_id`, `product_image_id` and `stock`. Caught by the Update test, which edits only the name and price like an admin would.

---

## BUG-003: Search cannot find products whose name has a word of 1 or 2 characters

**Description:** Product search (storefront and admin) has two modes. Queries shorter than 4 characters use a plain "contains" match, which works. Queries of 4 or more characters use a MariaDB FULLTEXT search where every word is required (`+word*`). MariaDB only indexes words of 3 or more characters (`innodb_ft_min_token_size = 3`), so a word of 1 or 2 characters can never match, and the whole search returns nothing.

**Steps to reproduce** (seeded data, nothing to create):

1. Open the storefront.
2. Search for `M4 Nuts`, the exact name of a seeded product.

**Actual:** 0 results. Searching `Nuts` or `M4` alone finds the product, and `Cordless Drill 18V` (a 3-character word) works. `Tape Measure 7.5m` also returns 0, because the dot splits off `7` and `5m`.

**Expected:** Searching a product's exact name always finds it. Words too short for the index should be dropped from the required terms or matched with `LIKE`.

**Notes:** Product names with sizes or models (`M4`, `5m`, `XL`, `3 in 1`) can't be found by their full name, and typing more of the name makes the search worse. The suite first prefixed test data with `QA-` and hit this bug, so the prefix is now `Cypress-`.

---

## BUG-004: Storefront search silently ignores queries longer than 40 characters

**Description:** The storefront search field has `maxLength(40)`. A longer query is invalid, so clicking Search does nothing: no request, no results, no message. Product names can be up to 120 characters.

**Steps to reproduce:**

1. Open the storefront home page.
2. Type a query longer than 40 characters, such as a long product name, and click Search.

**Actual:** Nothing happens and the page keeps showing the previous results.

**Expected:** Either the search runs, or the field limits input to 40 characters and tells the user why.

---

## BUG-005: Product API returns `in_stock` with different types and omits `stock`

**Description:** `POST /products` returns `in_stock` as the stock count (`"in_stock": 7`). `GET /products/{id}` returns `in_stock` as a boolean (`true`) and no `stock` field at all, so a client cannot read back the stock it just saved.

**Steps to reproduce:**

1. `POST /products` with `"stock": 7` and check `in_stock` in the response.
2. `GET /products/{id}` for the same product.

**Actual:** `7` in the first response, `true` and no `stock` in the second.

**Expected:** The same field has the same type in every response, and the stock count can be read back.

**Notes:** The OpenAPI document doesn't match the API either: it documents `POST /products` as returning `200` (it returns `201`) and `in_stock` as a boolean. Caught by the API lifecycle test, which checks the `POST` response against the product schema.

---

## BUG-006: New brands and categories are missing from the product form for up to 2 minutes

**Description:** `GET /brands` and `GET /categories` respond with `Cache-Control: public, max-age=120`, and the Add/Edit Product form loads them with a plain GET. The browser keeps serving the list it already has, so a brand or category created in the last 2 minutes doesn't show in the dropdowns, even after navigating away and back. The API's own cache is cleared correctly; the stale copy is in the browser.

**Steps to reproduce:**

1. Log in as admin and open Admin > Products > Add Product.
2. Create a new brand (Admin > Brands, or `POST /brands`).
3. Go back to Add Product (navigate away and back, or open it again from the menu).

**Actual:** The new brand is not in the Brand dropdown. The `/brands` request is served from the browser cache (0 bytes transferred). It only appears after the 2 minutes run out.

**Expected:** Dropdowns show the current brands and categories. Lists that change through the admin should not be cached by the browser (`no-cache` with the existing ETag, or a short `private` cache that the app busts after a change).

**Notes:** This made the suite flaky once a test opened the product form before its brand was created. Tests now tell the browser not to cache API responses (see the README), so they check product data rather than this caching behavior.

---

## BUG-007: Admin Reports submenu can't be opened with the keyboard or by touch

**Description:** In the admin user menu, the **Reports** submenu (Statistics, Average sales per month, Average sales per week) only opens on mouse hover, through a CSS `:hover` rule. Activating Reports by keyboard, or tapping it on a touchscreen, closes the whole user menu instead, so the report links are never shown.

**Steps to reproduce:**

1. Log in as `admin@practicesoftwaretesting.com`.
2. Open the **John Doe** user menu.
3. Move focus to **Reports** with Tab and press Enter (or tap it on a touch device).

**Actual:** The user menu closes and the Reports links never appear. With a mouse, hovering Reports shows them.

**Expected:** The submenu opens with the keyboard and by touch, as well as on hover. Menus need to be keyboard operable (WCAG 2.1.1).

**Scope:** Mouse users are not affected, and admins can still reach the report pages by URL (`/admin/reports/...`). Keyboard-only and touch users can't reach them from the menu.

**Notes:** The submenu is shown by `.reports.nav-item.dropdown:hover .dropdown-menu { display: block; }` in `header.component.css`. Activating the Reports toggle marks its submenu as open but also closes the parent menu. The admin menu test checks that the three report links are present with the right labels, since a mouse hover can't be simulated in plain Cypress.
