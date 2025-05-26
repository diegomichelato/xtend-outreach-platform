/**
 * Setup Pipeline Database Tables Script (Fixed Version)
 * ------------------------------------------------
 * This script creates all the necessary database tables for the sales pipeline
 * and company information features, ensuring no duplicate tables are created
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();

// Configure neon to use ws as the WebSocket constructor
neonConfig.webSocketConstructor = ws;

// Function to execute SQL queries against our database
async function executeQuery(query, params = []) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const result = await pool.query(query, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Check if a table exists
async function tableExists(tableName) {
  const query = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name = $1
    );
  `;
  const result = await executeQuery(query, [tableName]);
  return result.rows[0].exists;
}

// Drop tables if they exist (for clean setup)
async function dropExistingTables() {
  console.log('Checking for existing pipeline tables...');
  
  // List of tables to check and potentially drop
  const tables = [
    'pipeline_cards',
    'company_information',
    'company_tasks',
    'meeting_logs'
  ];
  
  for (const table of tables) {
    if (await tableExists(table)) {
      console.log(`Dropping existing table: ${table}`);
      await executeQuery(`DROP TABLE IF EXISTS ${table} CASCADE;`);
    } else {
      console.log(`Table ${table} does not exist, no need to drop.`);
    }
  }
}

// Create the pipeline_cards table
async function createPipelineCardsTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS pipeline_cards (
      id SERIAL PRIMARY KEY,
      company_name TEXT NOT NULL,
      contact_name TEXT,
      contact_email TEXT,
      description TEXT,
      value NUMERIC,
      creator_name TEXT,
      follow_up_date TIMESTAMP,
      vertical TEXT NOT NULL,
      current_stage TEXT NOT NULL DEFAULT 'Warm Leads',
      user_id INTEGER REFERENCES users(id),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;
  
  await executeQuery(query);
  console.log('Pipeline cards table created successfully');
}

// Create the company_information table
async function createCompanyInformationTable() {
  const query = `
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
    );
  `;
  
  await executeQuery(query);
  console.log('Company information table created successfully');
}

// Create the company_tasks table
async function createCompanyTasksTable() {
  const query = `
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
    );
  `;
  
  await executeQuery(query);
  console.log('Company tasks table created successfully');
}

// Create the meeting_logs table
async function createMeetingLogsTable() {
  const query = `
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
    );
  `;
  
  await executeQuery(query);
  console.log('Meeting logs table created successfully');
}

// Add sample data for testing
async function addSampleData() {
  // Sample pipeline card data
  const pipelineCardsSql = `
    INSERT INTO pipeline_cards (
      vertical, current_stage, company_name, contact_name, contact_email, description, value, creator_name, notes
    ) VALUES 
    ('brands', '1', 'Acme Corporation', 'John Doe', 'john@acmecorp.com', 'Interested in video sponsorship', 5000, 'Tyler Blanchard', 'Initial contact made via email'),
    ('agencies', '5', 'MediaMax', 'Sarah Smith', 'sarah@mediamax.co', 'Looking for multiple creators', 25000, 'Tyler Blanchard', 'Follow up with proposal details'),
    ('partners', '4', 'TechVision', 'Mike Johnson', 'mike@techvision.io', 'Long-term partnership potential', 15000, 'Tyler Blanchard', 'Scheduled meeting for next week');
  `;
  
  await executeQuery(pipelineCardsSql);
  console.log('Sample pipeline cards added');
}

// Main setup function
async function setupPipelineTables() {
  try {
    console.log('Starting pipeline tables setup...');
    
    // First clean up any existing tables to avoid conflicts
    await dropExistingTables();
    
    // Create all the necessary tables
    await createPipelineCardsTable();
    await createCompanyInformationTable();
    await createCompanyTasksTable();
    await createMeetingLogsTable();
    
    // Add sample data for testing
    await addSampleData();
    
    console.log('Pipeline tables setup completed successfully!');
  } catch (error) {
    console.error('Failed to set up pipeline tables:', error);
  }
}

// Run the setup
setupPipelineTables();