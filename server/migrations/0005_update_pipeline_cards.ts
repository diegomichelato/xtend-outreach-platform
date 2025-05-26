import { sql } from "drizzle-orm";
import { pgTable, serial, text, timestamp, integer, decimal, jsonb } from "drizzle-orm/pg-core";

export async function up(db: any) {
  await sql`
    -- Drop existing columns
    ALTER TABLE pipeline_cards
    DROP COLUMN IF EXISTS creator_name,
    DROP COLUMN IF EXISTS follow_up_date,
    DROP COLUMN IF EXISTS vertical,
    DROP COLUMN IF EXISTS current_stage,
    DROP COLUMN IF EXISTS user_id,
    DROP COLUMN IF EXISTS notes;

    -- Add new columns
    ALTER TABLE pipeline_cards
    ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD',
    ADD COLUMN IF NOT EXISTS probability integer NOT NULL DEFAULT 20,
    ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'lead',
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS source text,
    ADD COLUMN IF NOT EXISTS product text,
    ADD COLUMN IF NOT EXISTS assigned_to integer REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS expected_close_date timestamp,
    ADD COLUMN IF NOT EXISTS last_activity_at timestamp,
    ADD COLUMN IF NOT EXISTS next_step text,
    ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS created_by integer REFERENCES users(id);

    -- Update last_activity_at for existing records
    UPDATE pipeline_cards
    SET last_activity_at = updated_at
    WHERE last_activity_at IS NULL;

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_pipeline_cards_stage ON pipeline_cards(stage);
    CREATE INDEX IF NOT EXISTS idx_pipeline_cards_status ON pipeline_cards(status);
    CREATE INDEX IF NOT EXISTS idx_pipeline_cards_assigned_to ON pipeline_cards(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_pipeline_cards_created_by ON pipeline_cards(created_by);
    CREATE INDEX IF NOT EXISTS idx_pipeline_cards_last_activity_at ON pipeline_cards(last_activity_at);
  `;
}

export async function down(db: any) {
  await sql`
    -- Remove indexes
    DROP INDEX IF EXISTS idx_pipeline_cards_stage;
    DROP INDEX IF EXISTS idx_pipeline_cards_status;
    DROP INDEX IF EXISTS idx_pipeline_cards_assigned_to;
    DROP INDEX IF EXISTS idx_pipeline_cards_created_by;
    DROP INDEX IF EXISTS idx_pipeline_cards_last_activity_at;

    -- Remove new columns
    ALTER TABLE pipeline_cards
    DROP COLUMN IF EXISTS currency,
    DROP COLUMN IF EXISTS probability,
    DROP COLUMN IF EXISTS stage,
    DROP COLUMN IF EXISTS status,
    DROP COLUMN IF EXISTS source,
    DROP COLUMN IF EXISTS product,
    DROP COLUMN IF EXISTS assigned_to,
    DROP COLUMN IF EXISTS expected_close_date,
    DROP COLUMN IF EXISTS last_activity_at,
    DROP COLUMN IF EXISTS next_step,
    DROP COLUMN IF EXISTS tags,
    DROP COLUMN IF EXISTS metadata,
    DROP COLUMN IF EXISTS created_by;

    -- Restore original columns
    ALTER TABLE pipeline_cards
    ADD COLUMN IF NOT EXISTS creator_name text,
    ADD COLUMN IF NOT EXISTS follow_up_date timestamp,
    ADD COLUMN IF NOT EXISTS vertical text NOT NULL DEFAULT 'brands',
    ADD COLUMN IF NOT EXISTS current_stage text NOT NULL DEFAULT '1',
    ADD COLUMN IF NOT EXISTS user_id integer REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS notes text;
  `;
} 