import {
  pgTable,
  text,
  timestamp,
  integer,
  real,
  boolean,
  uuid,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// =============================================================================
// Prefixo "dc_" (Desafio Carteiras) para não conflitar com harven-evaluate
// =============================================================================

// --- Usuários ---

export const users = pgTable("dc_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  cpf: text("cpf").unique(),
  curso: text("curso"), // ex: "Administração", "Engenharia de Produção", "Direito"
  anoIngresso: integer("ano_ingresso"), // ex: 2024
  semestre: integer("semestre"), // 1-10
  sala: text("sala"), // ex: "A1", "B2"
  phone: text("phone").unique(), // ex: "11999998888" (digits only)
  passwordHash: text("password_hash"),
  type: text("type", { enum: ["participant", "admin"] })
    .notNull()
    .default("participant"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  portfolios: many(portfolios),
}));

// --- Ciclos mensais ---

export const cycles = pgTable("dc_cycles", {
  id: uuid("id").defaultRandom().primaryKey(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  label: text("label").notNull(),
  status: text("status", { enum: ["open", "closed", "liquidated"] })
    .notNull()
    .default("open"),
  deadline: timestamp("deadline").notNull(),
  ibovReturn: real("ibov_return"),
  liquidatedAt: timestamp("liquidated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  unique("dc_cycle_month_year").on(t.month, t.year),
]);

export const cyclesRelations = relations(cycles, ({ many }) => ({
  portfolios: many(portfolios),
  monthlyPrices: many(monthlyPrices),
}));

// --- Carteiras ---

export const portfolios = pgTable("dc_portfolios", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  cycleId: uuid("cycle_id").notNull().references(() => cycles.id),
  allocationModel: integer("allocation_model").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  replicated: boolean("replicated").notNull().default(false),
  returnMonth: real("return_month"),
  returnAccum: real("return_accum"),
  rank: integer("rank"),
}, (t) => [
  unique("dc_portfolio_user_cycle").on(t.userId, t.cycleId),
]);

export const portfoliosRelations = relations(portfolios, ({ one, many }) => ({
  user: one(users, { fields: [portfolios.userId], references: [users.id] }),
  cycle: one(cycles, { fields: [portfolios.cycleId], references: [cycles.id] }),
  stocks: many(portfolioStocks),
}));

// --- Ações de cada carteira ---

export const portfolioStocks = pgTable("dc_portfolio_stocks", {
  id: uuid("id").defaultRandom().primaryKey(),
  portfolioId: uuid("portfolio_id").notNull().references(() => portfolios.id, { onDelete: "cascade" }),
  ticker: text("ticker").notNull(),
  position: integer("position").notNull(),
});

export const portfolioStocksRelations = relations(portfolioStocks, ({ one }) => ({
  portfolio: one(portfolios, { fields: [portfolioStocks.portfolioId], references: [portfolios.id] }),
}));

// --- Cotações mensais ---

export const monthlyPrices = pgTable("dc_monthly_prices", {
  id: uuid("id").defaultRandom().primaryKey(),
  ticker: text("ticker").notNull(),
  cycleId: uuid("cycle_id").notNull().references(() => cycles.id),
  openPrice: real("open_price").notNull(),
  closePrice: real("close_price").notNull(),
  variation: real("variation").notNull(),
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
}, (t) => [
  unique("dc_price_ticker_cycle").on(t.ticker, t.cycleId),
]);

export const monthlyPricesRelations = relations(monthlyPrices, ({ one }) => ({
  cycle: one(cycles, { fields: [monthlyPrices.cycleId], references: [cycles.id] }),
}));

// --- Eventos de analytics ---

export const events = pgTable("dc_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  event: text("event").notNull(), // page_view, login, portfolio_submit, stock_select, model_select, etc.
  page: text("page"),
  metadata: text("metadata"), // JSON string for extra data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Composição do Ibovespa ---

export const ibovComposition = pgTable("dc_ibov_composition", {
  id: uuid("id").defaultRandom().primaryKey(),
  ticker: text("ticker").notNull(),
  companyName: text("company_name").notNull(),
  weight: real("weight"),
  quarter: text("quarter").notNull(),
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
});
