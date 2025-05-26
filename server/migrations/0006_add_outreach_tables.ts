import { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Create email_campaigns table
  await db.schema
    .createTable("email_campaigns")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("userId", "integer", (col) => 
      col.references("users.id").onDelete("cascade").notNull()
    )
    .addColumn("fromAccount", "varchar", (col) => col.notNull())
    .addColumn("subject", "varchar", (col) => col.notNull())
    .addColumn("body", "text", (col) => col.notNull())
    .addColumn("scheduledTime", "timestamp")
    .addColumn("status", "varchar", (col) => col.notNull())
    .addColumn("createdAt", "timestamp", (col) => 
      col.defaultTo(db.fn.now()).notNull()
    )
    .addColumn("updatedAt", "timestamp", (col) => 
      col.defaultTo(db.fn.now()).notNull()
    )
    .execute();

  // Create email_sequences table
  await db.schema
    .createTable("email_sequences")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("userId", "integer", (col) => 
      col.references("users.id").onDelete("cascade").notNull()
    )
    .addColumn("name", "varchar", (col) => col.notNull())
    .addColumn("createdAt", "timestamp", (col) => 
      col.defaultTo(db.fn.now()).notNull()
    )
    .addColumn("updatedAt", "timestamp", (col) => 
      col.defaultTo(db.fn.now()).notNull()
    )
    .execute();

  // Create email_sequence_steps table
  await db.schema
    .createTable("email_sequence_steps")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("sequenceId", "integer", (col) => 
      col.references("email_sequences.id").onDelete("cascade").notNull()
    )
    .addColumn("subject", "varchar", (col) => col.notNull())
    .addColumn("body", "text", (col) => col.notNull())
    .addColumn("delay", "integer", (col) => col.notNull())
    .addColumn("delayUnit", "varchar", (col) => col.notNull())
    .addColumn("order", "integer", (col) => col.notNull())
    .addColumn("createdAt", "timestamp", (col) => 
      col.defaultTo(db.fn.now()).notNull()
    )
    .addColumn("updatedAt", "timestamp", (col) => 
      col.defaultTo(db.fn.now()).notNull()
    )
    .execute();

  // Create email_tracking table
  await db.schema
    .createTable("email_tracking")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("campaignId", "integer", (col) => 
      col.references("email_campaigns.id").onDelete("cascade").notNull()
    )
    .addColumn("recipientEmail", "varchar", (col) => col.notNull())
    .addColumn("status", "varchar", (col) => col.notNull())
    .addColumn("openedAt", "timestamp")
    .addColumn("clickedAt", "timestamp")
    .addColumn("repliedAt", "timestamp")
    .addColumn("bouncedAt", "timestamp")
    .addColumn("createdAt", "timestamp", (col) => 
      col.defaultTo(db.fn.now()).notNull()
    )
    .addColumn("updatedAt", "timestamp", (col) => 
      col.defaultTo(db.fn.now()).notNull()
    )
    .execute();

  // Create indexes
  await db.schema
    .createIndex("email_campaigns_user_id_idx")
    .on("email_campaigns")
    .column("userId")
    .execute();

  await db.schema
    .createIndex("email_sequences_user_id_idx")
    .on("email_sequences")
    .column("userId")
    .execute();

  await db.schema
    .createIndex("email_sequence_steps_sequence_id_idx")
    .on("email_sequence_steps")
    .column("sequenceId")
    .execute();

  await db.schema
    .createIndex("email_tracking_campaign_id_idx")
    .on("email_tracking")
    .column("campaignId")
    .execute();

  await db.schema
    .createIndex("email_tracking_recipient_idx")
    .on("email_tracking")
    .column("recipientEmail")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("email_tracking").execute();
  await db.schema.dropTable("email_sequence_steps").execute();
  await db.schema.dropTable("email_sequences").execute();
  await db.schema.dropTable("email_campaigns").execute();
} 