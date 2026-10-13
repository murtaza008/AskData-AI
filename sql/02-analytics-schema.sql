-- -----------------------------------------------------------------------------
-- AskData AI - demo e-commerce dataset (schema `analytics`)
--
-- Applied by `npm run db:seed`, which then fills the tables.
-- The COMMENTs are not decoration: the agent's getSchema tool reads them, so
-- they are where business rules ("what counts as revenue") are taught.
-- -----------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS analytics;

DROP TABLE IF EXISTS analytics.refunds;
DROP TABLE IF EXISTS analytics.order_items;
DROP TABLE IF EXISTS analytics.orders;
DROP TABLE IF EXISTS analytics.products;
DROP TABLE IF EXISTS analytics.customers;

CREATE TABLE analytics.customers (
  id          integer PRIMARY KEY,
  name        text NOT NULL,
  email       text NOT NULL UNIQUE,
  segment     text NOT NULL,
  region      text NOT NULL,
  country     text NOT NULL,
  city        text NOT NULL,
  signup_date date NOT NULL
);

CREATE TABLE analytics.products (
  id          integer PRIMARY KEY,
  name        text NOT NULL,
  category    text NOT NULL,
  price       numeric(10, 2) NOT NULL,
  cost        numeric(10, 2) NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  launched_at date NOT NULL
);

CREATE TABLE analytics.orders (
  id           integer PRIMARY KEY,
  customer_id  integer NOT NULL REFERENCES analytics.customers (id),
  order_date   timestamptz NOT NULL,
  status       text NOT NULL,
  channel      text NOT NULL,
  total_amount numeric(12, 2) NOT NULL
);

CREATE TABLE analytics.order_items (
  id         integer PRIMARY KEY,
  order_id   integer NOT NULL REFERENCES analytics.orders (id),
  product_id integer NOT NULL REFERENCES analytics.products (id),
  quantity   integer NOT NULL,
  unit_price numeric(10, 2) NOT NULL
);

CREATE TABLE analytics.refunds (
  id          integer PRIMARY KEY,
  order_id    integer NOT NULL REFERENCES analytics.orders (id),
  amount      numeric(12, 2) NOT NULL,
  reason      text NOT NULL,
  refunded_at timestamptz NOT NULL
);

CREATE INDEX orders_customer_id_idx ON analytics.orders (customer_id);
CREATE INDEX orders_order_date_idx ON analytics.orders (order_date);
CREATE INDEX order_items_order_id_idx ON analytics.order_items (order_id);
CREATE INDEX order_items_product_id_idx ON analytics.order_items (product_id);
CREATE INDEX refunds_order_id_idx ON analytics.refunds (order_id);

COMMENT ON TABLE analytics.customers IS 'One row per customer of the online store.';
COMMENT ON COLUMN analytics.customers.segment IS 'consumer or business.';
COMMENT ON COLUMN analytics.customers.region IS 'Sales region. A region contains several countries.';
COMMENT ON COLUMN analytics.customers.signup_date IS 'Date the customer created their account.';

COMMENT ON TABLE analytics.products IS 'Product catalog.';
COMMENT ON COLUMN analytics.products.price IS 'Current list price in USD.';
COMMENT ON COLUMN analytics.products.cost IS 'Unit cost in USD. Margin = price - cost.';
COMMENT ON COLUMN analytics.products.launched_at IS 'Date the product went on sale.';

COMMENT ON TABLE analytics.orders IS 'One row per order. All amounts are in USD.';
COMMENT ON COLUMN analytics.orders.order_date IS 'When the order was placed (UTC).';
COMMENT ON COLUMN analytics.orders.status IS 'processing, shipped, completed, cancelled or refunded. Revenue and sales figures must EXCLUDE cancelled and refunded orders unless the user asks otherwise.';
COMMENT ON COLUMN analytics.orders.channel IS 'Where the order was placed: web, mobile or marketplace.';
COMMENT ON COLUMN analytics.orders.total_amount IS 'Order total in USD = sum of quantity * unit_price over its order_items.';

COMMENT ON TABLE analytics.order_items IS 'Line items of an order: one row per product per order.';
COMMENT ON COLUMN analytics.order_items.unit_price IS 'Price actually paid per unit in USD (after any discount). Line revenue = quantity * unit_price.';

COMMENT ON TABLE analytics.refunds IS 'Refunds issued against orders. A full refund sets orders.status to refunded; a partial refund leaves it completed.';
COMMENT ON COLUMN analytics.refunds.amount IS 'Refunded amount in USD.';
COMMENT ON COLUMN analytics.refunds.reason IS 'Reason given by the customer.';
