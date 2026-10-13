import { faker } from '@faker-js/faker';

const runId = () => `${Date.now()}${faker.string.numeric(3)}`;

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const buildProduct = (overrides = {}) => ({
  name: `Cypress-${runId()} ${faker.commerce.productName()}`,
  description: faker.commerce.productDescription(),
  price: Number(faker.commerce.price({ min: 5, max: 500 })),
  stock: faker.number.int({ min: 1, max: 100 }),
  ...overrides,
});

export const searchTagOf = (product) => product.name.split(' ')[0];

export const productPayload = (product, catalog) => ({
  ...product,
  brand_id: catalog.brand.id,
  category_id: catalog.category.id,
  product_image_id: catalog.image.id,
  is_location_offer: false,
  is_rental: false,
});

export const buildBrand = () => {
  const name = `Cypress-${runId()} ${faker.company.name()}`;
  return { name, slug: slugify(name) };
};

export const buildCategory = () => {
  const name = `Cypress-${runId()} ${faker.commerce.department()}`;
  return { name, slug: slugify(name) };
};

export const buildUser = (overrides = {}) => ({
  first_name: faker.person.firstName(),
  last_name: faker.person.lastName().slice(0, 20),
  email: `cypress.${runId()}@example.com`,
  password: `${faker.internet.password({ length: 12 })}aA1!`,
  ...overrides,
});
