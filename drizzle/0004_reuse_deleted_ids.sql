
-- Set a temporary default so Drizzle can omit IDs during inserts.
-- The trigger will replace 0 with the smallest available positive ID.

ALTER TABLE public.customers
ALTER COLUMN id SET DEFAULT 0;

--> statement-breakpoint

ALTER TABLE public.products
ALTER COLUMN id SET DEFAULT 0;

--> statement-breakpoint

ALTER TABLE public.sales
ALTER COLUMN id SET DEFAULT 0;

--> statement-breakpoint

ALTER TABLE public.transactions
ALTER COLUMN id SET DEFAULT 0;

--> statement-breakpoint

ALTER TABLE public.inventory
ALTER COLUMN id SET DEFAULT 0;

--> statement-breakpoint

-- Function: Assign the smallest available positive ID.

CREATE OR REPLACE FUNCTION public.assign_reusable_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    next_id INTEGER;
BEGIN
    -- Prevent simultaneous ID assignments in the same table.
    PERFORM pg_advisory_xact_lock(
        1128352844,
        hashtext(TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME)
    );

    -- Find the smallest missing positive ID.
    EXECUTE format(
        'SELECT CASE
            WHEN NOT EXISTS (
                SELECT 1 FROM %I.%I WHERE id = 1
            ) THEN 1
            ELSE COALESCE(
                (
                    SELECT MIN(current_row.id + 1)
                    FROM %I.%I AS current_row
                    WHERE current_row.id > 0
                    AND NOT EXISTS (
                        SELECT 1
                        FROM %I.%I AS next_row
                        WHERE next_row.id = current_row.id + 1
                    )
                ),
                (
                    SELECT COALESCE(MAX(id), 0) + 1
                    FROM %I.%I
                )
            )
        END',
        TG_TABLE_SCHEMA, TG_TABLE_NAME,
        TG_TABLE_SCHEMA, TG_TABLE_NAME,
        TG_TABLE_SCHEMA, TG_TABLE_NAME,
        TG_TABLE_SCHEMA, TG_TABLE_NAME
    )
    INTO next_id;

    NEW.id := next_id;

    RETURN NEW;
END;
$$;

--> statement-breakpoint

-- CUSTOMERS
CREATE TRIGGER customers_reusable_id
BEFORE INSERT ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.assign_reusable_id();

--> statement-breakpoint

-- PRODUCTS
CREATE TRIGGER products_reusable_id
BEFORE INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.assign_reusable_id();

--> statement-breakpoint

-- SALES
CREATE TRIGGER sales_reusable_id
BEFORE INSERT ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.assign_reusable_id();

--> statement-breakpoint

-- TRANSACTIONS
CREATE TRIGGER transactions_reusable_id
BEFORE INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.assign_reusable_id();

--> statement-breakpoint

-- INVENTORY
CREATE TRIGGER inventory_reusable_id
BEFORE INSERT ON public.inventory
FOR EACH ROW
EXECUTE FUNCTION public.assign_reusable_id();
