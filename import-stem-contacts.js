/**
 * Import STEM Contacts Script
 * This script imports contacts from the STEM list CSV file directly into the database.
 */

import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure WebSocket for Neon database
neonConfig.webSocketConstructor = ws;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Parse the CSV file
const processCSV = async (filePath) => {
  try {
    // Read the file content
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Parse CSV to records with headers
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`Found ${records.length} records in the CSV file`);
    
    // Get the first user ID (for contact ownership)
    const userResult = await pool.query('SELECT id FROM users LIMIT 1');
    if (userResult.rows.length === 0) {
      console.error('No users found in the database');
      return;
    }
    const userId = userResult.rows[0].id;
    console.log(`Using user ID: ${userId} for contact ownership`);
    
    // Create a contact list for these contacts
    const listResult = await pool.query(
      'INSERT INTO contact_lists (name, description, user_id, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
      [`STEM List Import ${new Date().toISOString().slice(0, 10)}`, 'Imported from STEM list CSV', userId]
    );
    const contactListId = listResult.rows[0].id;
    console.log(`Created contact list with ID: ${contactListId}`);
    
    // Process each record
    let successCount = 0;
    let errorCount = 0;
    
    for (const record of records) {
      try {
        // Check for required fields
        if (!record.INDUSTRY || !record.COMPANY || !record.FIRST_NAME || !record.E_MAIL) {
          // Skip records without required fields, but check if we can fix it
          if (record.INDUSTRY && record.COMPANY && record['BUSINESS E-MAIL'] && record.FIRST_NAME) {
            record.E_MAIL = record['BUSINESS E-MAIL']; // Use business email as a fallback
            console.log(`Fixed missing E_MAIL with BUSINESS E-MAIL for ${record.FIRST_NAME} at ${record.COMPANY}`);
          } else {
            console.log(`Skipping record with missing required fields: ${JSON.stringify(record)}`);
            errorCount++;
            continue;
          }
        }
        
        // Insert the contact
        const contactResult = await pool.query(
          `INSERT INTO contacts 
          (type, industry, first_name, last_name, company, email, role, phone, 
           linkedin, niche, country, business_linkedin, website, business_email, 
           status, created_at, updated_at, user_id) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW(), $16) 
          RETURNING id`,
          [
            record.NICHE || 'BRAND',
            record.INDUSTRY,
            record.FIRST_NAME,
            record.LAST_NAME || '',
            record.COMPANY,
            record.E_MAIL,
            record.ROLE || '',
            record.PHONE || '',
            record.LINKEDIN || '',
            record.NICHE || '',
            record.COUNTRY || '',
            record['BUSINESS LINKEDIN'] || '',
            record.WEBSITE || '',
            record['BUSINESS E-MAIL'] || '',
            'active',
            userId
          ]
        );
        
        const contactId = contactResult.rows[0].id;
        
        // Add the contact to the list
        await pool.query(
          'INSERT INTO contact_list_entries (contact_list_id, contact_id) VALUES ($1, $2)',
          [contactListId, contactId]
        );
        
        successCount++;
        if (successCount % 10 === 0) {
          console.log(`Imported ${successCount} contacts so far...`);
        }
      } catch (error) {
        console.error(`Error importing contact ${record.FIRST_NAME} ${record.LAST_NAME || ''} (${record.E_MAIL || record['BUSINESS E-MAIL'] || 'no email'}):`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\nImport complete: ${successCount} contacts imported successfully, ${errorCount} errors`);
    console.log(`Contact list ID: ${contactListId}`);
    
    // Update the industries list for the UI
    console.log('Updating unique industries...');
    const industries = [...new Set(records.map(r => r.INDUSTRY).filter(i => i))];
    console.log(`Found ${industries.length} unique industries`);
    
  } catch (error) {
    console.error('Error processing CSV file:', error);
  } finally {
    await pool.end();
  }
};

const filePath = process.argv[2] || './attached_assets/STEM LIST - Sheet4 (1).csv';

console.log(`Processing file: ${filePath}`);
processCSV(filePath)
  .then(() => console.log('Done!'))
  .catch(err => console.error('Failed:', err));