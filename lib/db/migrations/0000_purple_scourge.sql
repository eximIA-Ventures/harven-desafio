CREATE TABLE "dc_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"label" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"deadline" timestamp NOT NULL,
	"ibov_return" real,
	"liquidated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dc_cycle_month_year" UNIQUE("month","year")
);
--> statement-breakpoint
CREATE TABLE "dc_ibov_composition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" text NOT NULL,
	"company_name" text NOT NULL,
	"weight" real,
	"quarter" text NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dc_monthly_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" text NOT NULL,
	"cycle_id" uuid NOT NULL,
	"open_price" real NOT NULL,
	"close_price" real NOT NULL,
	"variation" real NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dc_price_ticker_cycle" UNIQUE("ticker","cycle_id")
);
--> statement-breakpoint
CREATE TABLE "dc_portfolio_stocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_id" uuid NOT NULL,
	"ticker" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dc_portfolios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"cycle_id" uuid NOT NULL,
	"allocation_model" integer NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"replicated" boolean DEFAULT false NOT NULL,
	"return_month" real,
	"return_accum" real,
	"rank" integer,
	CONSTRAINT "dc_portfolio_user_cycle" UNIQUE("user_id","cycle_id")
);
--> statement-breakpoint
CREATE TABLE "dc_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"cpf" text,
	"turma" text,
	"password_hash" text,
	"type" text DEFAULT 'participant' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dc_users_cpf_unique" UNIQUE("cpf")
);
--> statement-breakpoint
ALTER TABLE "dc_monthly_prices" ADD CONSTRAINT "dc_monthly_prices_cycle_id_dc_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."dc_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dc_portfolio_stocks" ADD CONSTRAINT "dc_portfolio_stocks_portfolio_id_dc_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."dc_portfolios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dc_portfolios" ADD CONSTRAINT "dc_portfolios_user_id_dc_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."dc_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dc_portfolios" ADD CONSTRAINT "dc_portfolios_cycle_id_dc_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."dc_cycles"("id") ON DELETE no action ON UPDATE no action;