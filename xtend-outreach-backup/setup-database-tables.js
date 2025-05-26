/**
 * Setup Database Tables Script
 * ---------------------------
 * This script creates all the necessary database tables for the proposal system to work
 */

import pg from 'pg';
const { Pool } = pg;

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function setupDatabaseTables() {
  console.log('Setting up database tables...');
  
  const client = await pool.connect();
  try {
    // Create proposals table
    await client.query(`
      CREATE TABLE IF NOT EXISTS proposals (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        contact_name TEXT,
        contact_company TEXT,
        contact_email TEXT,
        contact_industry TEXT,
        creators INTEGER[],
        creator_fits JSONB,
        creator_pricing JSONB,
        research_data JSONB,
        objectives TEXT[],
        user_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Proposals table created successfully');
    
    // Create shareable_landing_pages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS shareable_landing_pages (
        id SERIAL PRIMARY KEY,
        unique_id TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        creator_id INTEGER,
        project_id INTEGER,
        status TEXT DEFAULT 'active',
        expires_at TIMESTAMP,
        user_id INTEGER,
        view_count INTEGER DEFAULT 0,
        metadata JSONB,
        is_password_protected BOOLEAN DEFAULT FALSE,
        password TEXT,
        brand_logo TEXT,
        brand_primary_color TEXT DEFAULT '#3B82F6',
        brand_secondary_color TEXT DEFAULT '#1E3A8A',
        brand_footer_text TEXT,
        content JSONB DEFAULT '{}',
        creator_name TEXT,
        type TEXT DEFAULT 'creator-proposal',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        last_visited_at TIMESTAMP
      );
    `);
    console.log('Shareable landing pages table created successfully');
    
    console.log('Database tables setup completed successfully');
  } catch (error) {
    console.error('Error setting up database tables:', error);
  } finally {
    client.release();
  }
}

// Run the function
setupDatabaseTables().catch(console.error);