/**
 * Setup Pipeline Database Tables Script
 * ------------------------------------
 * This script creates all the necessary database tables for the sales pipeline and company information features
 */

import { db } from './server/db.js';

// We'll use direct SQL execution since we don't have access to the schema objects in this context

async function setupPipelineTables() {
  console.log('Setting up pipeline and company information tables...');
  
  try {
    // Create pipeline cards table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS pipeline_cards (
        id SERIAL PRIMARY KEY,
        vertical TEXT NOT NULL,
        current_stage TEXT NOT NULL,
        company_name TEXT NOT NULL,
        contact_name TEXT,
        contact_email TEXT,
        contact_phone TEXT,
        description TEXT,
        value NUMERIC,
        probability NUMERIC,
        follow_up_date TIMESTAMP,
        notes TEXT,
        creator_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Created pipeline_cards table');

    // Create company information table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS company_information (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        name TEXT,
        description TEXT,
        industry TEXT,
        website TEXT,
        logo_url TEXT,
        campaigns JSONB DEFAULT '[]',
        proposals JSONB DEFAULT '[]',
        engagement_history JSONB DEFAULT '[]',
        notes JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Created company_information table');

    // Create company tasks table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS company_tasks (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending',
        due_date TIMESTAMP,
        priority TEXT,
        created_by INTEGER,
        assigned_to INTEGER,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Created company_tasks table');

    // Create meeting logs table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS meeting_logs (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        meeting_date TIMESTAMP NOT NULL,
        notes TEXT,
        attendees JSONB,
        follow_up_actions JSONB,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Created meeting_logs table');

    // Add some sample data for testing
    await db.execute(`
      INSERT INTO pipeline_cards (vertical, current_stage, company_name, contact_name, contact_email, description, value, probability, follow_up_date, notes)
      VALUES 
      ('Brands', 'lead', 'Acme Corporation', 'John Smith', 'john@acme.com', 'Interested in influencer marketing for Q4 campaign', 5000, 0.25, NOW() + INTERVAL '7 days', 'Initial contact via LinkedIn'),
      ('Agencies', 'contact', 'Big Agency Co', 'Sarah Johnson', 'sarah@bigagency.com', 'Looking for creators in tech niche', 8500, 0.5, NOW() + INTERVAL '3 days', 'Had intro call, sending follow-up materials'),
      ('Partners', 'meeting', 'Collaborative Inc', 'Michael Wong', 'michael@collaborative.com', 'Potential platform integration opportunity', 12000, 0.7, NOW() + INTERVAL '5 days', 'Scheduled technical discussion for next week')
    `);
    console.log('Added sample pipeline cards');

    console.log('Pipeline and company information tables setup complete');
  } catch (error) {
    console.error('Error setting up pipeline tables:', error);
  }
}

// Run the setup
setupPipelineTables()
  .then(() => {
    console.log('Setup complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });