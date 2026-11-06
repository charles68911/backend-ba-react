CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_name" varchar(150) NOT NULL,
	"customer_type" varchar(50) NOT NULL,
	"location" varchar(150) NOT NULL,
	"contact_number" varchar(30),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"current_stock" integer NOT NULL,
	"reorder_level" integer NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_name" varchar(150) NOT NULL,
	"marketing_channel" varchar(100) NOT NULL,
	"advertising_cost" numeric(10, 2) NOT NULL,
	"revenue_generated" numeric(12, 2) NOT NULL,
	"campaign_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_name" varchar(150) NOT NULL,
	"category" varchar(100) NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"cost_price" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"campaign_id" integer,
	"quantity" integer NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"sale_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" integer NOT NULL,
	"payment_method" varchar(50) NOT NULL,
	"payment_status" varchar(50) NOT NULL,
	"amount_paid" numeric(12, 2) NOT NULL,
	"transaction_date" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_campaign_id_marketing_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."marketing"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;