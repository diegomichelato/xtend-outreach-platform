/**
 * Setup Persistent Contacts Script
 * -------------------------------
 * This script ensures the contacts table exists and adds sample contacts
 * so they persist across server restarts.
 */

import pg from 'pg';
const { Pool } = pg;

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Sample contacts data - Change this to your preferred contact data
const sampleContacts = [
  {
    firstName: "Steven",
    lastName: "Pham",
    company: "GoNoodle",
    email: "steven@gonoodle.com",
    role: "CEO",
    industry: "Tech",
    type: "Brand",
    notes: "Interested in creator partnerships"
  },
  {
    firstName: "Robert",
    lastName: "Rakowitz",
    company: "VidMob",
    email: "rob.rakowitz@vidmob.com",
    role: "CMO",
    industry: "Tech",
    type: "Brand",
    notes: "Looking for YouTube creators"
  },
  {
    firstName: "Katie",
    lastName: "Jaris",
    company: "Jaris Financial",
    email: "katie@jaris.io",
    role: "CEO",
    industry: "Finance",
    type: "Brand",
    notes: "Seeking finance content creators"
  },
  {
    firstName: "Mark",
    lastName: "Hernandez",
    company: "Atomic Golf",
    email: "mark@atomicgolf.com",
    role: "Marketing Director",
    industry: "Games",
    type: "Brand",
    notes: "Interested in sports influencers"
  },
  {
    firstName: "Alex",
    lastName: "Gallagher",
    company: "Atomic Golf",
    email: "sgallagher@level99.com",
    role: "Content Manager",
    industry: "Games",
    type: "Brand",
    notes: "Looking for golf content creators"
  }
];

async function setupContactsTable() {
  console.log('Setting up persistent contacts database...');
  
  const client = await pool.connect();
  try {
    // Create contacts table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT,
        company TEXT,
        email TEXT NOT NULL,
        role TEXT,
        phone TEXT,
        linkedin TEXT,
        instagram TEXT,
        twitter TEXT,
        status TEXT DEFAULT 'active',
        type TEXT,
        industry TEXT,
        tags TEXT[],
        notes TEXT,
        user_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        last_contacted TIMESTAMP,
        archived_at TIMESTAMP
      );
    `);
    console.log('Contacts table created successfully');
    
    // Check if contacts already exist
    const existingContacts = await client.query('SELECT COUNT(*) FROM contacts');
    const contactCount = parseInt(existingContacts.rows[0].count);
    
    if (contactCount > 0) {
      console.log(`${contactCount} contacts already exist in the database. Skipping import.`);
    } else {
      // Insert sample contacts
      console.log('Adding sample contacts to database...');
      
      for (const contact of sampleContacts) {
        await client.query(`
          INSERT INTO contacts (
            first_name, 
            last_name, 
            company, 
            email, 
            role, 
            industry, 
            type,
            notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          contact.firstName,
          contact.lastName,
          contact.company,
          contact.email,
          contact.role,
          contact.industry,
          contact.type,
          contact.notes
        ]);
      }
      
      console.log(`Added ${sampleContacts.length} sample contacts to the database`);
    }
    
    // Create contact lists table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS contact_lists (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        user_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Contact lists table created successfully');
    
    // Create contact_list_members junction table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS contact_list_members (
        id SERIAL PRIMARY KEY,
        contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
        contact_list_id INTEGER REFERENCES contact_lists(id) ON DELETE CASCADE
      );
    `);
    console.log('Contact list members table created successfully');
    
    // Check if any contact lists exist
    const existingLists = await client.query('SELECT COUNT(*) FROM contact_lists');
    const listCount = parseInt(existingLists.rows[0].count);
    
    if (listCount === 0) {
      // Create a sample contact list
      const listResult = await client.query(`
        INSERT INTO contact_lists (name, description)
        VALUES ('Stem List Contacts 2025', 'Imported contacts from STEM list')
        RETURNING id;
      `);
      
      const listId = listResult.rows[0].id;
      
      // Add all contacts to the list
      const allContacts = await client.query('SELECT id FROM contacts');
      
      for (const contact of allContacts.rows) {
        await client.query(`
          INSERT INTO contact_list_members (contact_id, contact_list_id)
          VALUES ($1, $2);
        `, [contact.id, listId]);
      }
      
      console.log(`Created contact list "Stem List Contacts 2025" with ${allContacts.rows.length} members`);
    } else {
      console.log(`${listCount} contact lists already exist in the database. Skipping creation.`);
    }
    
    console.log('Persistent contacts setup completed successfully');
  } catch (error) {
    console.error('Error setting up persistent contacts:', error);
  } finally {
    client.release();
  }
}

// Run the function
setupContactsTable().catch(console.error);