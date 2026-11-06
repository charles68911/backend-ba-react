import {
  pgTable,
  serial,
  varchar,
  integer,
  numeric,
  date,
  timestamp,
} from "drizzle-orm/pg-core";

// CUSTOMERS
export const customers = pgTable("customers", {
  id: integer("id")
    .primaryKey()
    .$defaultFn(() => 0),
  customerName: varchar("customer_name", { length: 150 }).notNull(),
  customerType: varchar("customer_type", { length: 50 }).notNull(),
  location: varchar("location", { length: 150 }).notNull(),
  contactNumber: varchar("contact_number", { length: 30 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// PRODUCTS
export const products = pgTable("products", {
  id: integer("id")
    .primaryKey()
    .$defaultFn(() => 0),
  productName: varchar("product_name", { length: 150 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  unitPrice: numeric("unit_price", {
    precision: 10,
    scale: 2,
  }).notNull(),
  costPrice: numeric("cost_price", {
    precision: 10,
    scale: 2,
  }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// SALES
export const sales = pgTable("sales", {
  id: integer("id")
    .primaryKey()
    .$defaultFn(() => 0),
  customerId: integer("customer_id")
    .references(() => customers.id)
    .notNull(),
  productId: integer("product_id")
    .references(() => products.id)
    .notNull(),
  quantity: integer("quantity").notNull(),
  totalAmount: numeric("total_amount", {
    precision: 12,
    scale: 2,
  }).notNull(),
  saleDate: date("sale_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// TRANSACTIONS
export const transactions = pgTable("transactions", {
  id: integer("id")
    .primaryKey()
    .$defaultFn(() => 0),
  saleId: integer("sale_id")
    .references(() => sales.id)
    .notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
  paymentStatus: varchar("payment_status", { length: 50 }).notNull(),
  amountPaid: numeric("amount_paid", {
    precision: 12,
    scale: 2,
  }).notNull(),
  transactionDate: timestamp("transaction_date").defaultNow().notNull(),
});

// INVENTORY
export const inventory = pgTable("inventory", {
  id: integer("id")
    .primaryKey()
    .$defaultFn(() => 0),
  productId: integer("product_id")
    .references(() => products.id)
    .notNull(),
  currentStock: integer("current_stock").notNull(),
  reorderLevel: integer("reorder_level").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

// ADMINS
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  email: varchar("email", { length: 150 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 })
    .notNull()
    .default("Administrator"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});