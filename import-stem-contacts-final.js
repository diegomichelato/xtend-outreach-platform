/**
 * Import STEM Excel Contacts Directly
 * This script adds the contacts from STEM List Contacts 2025.xlsx permanently to the database
 */

import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure WebSocket for Neon database
neonConfig.webSocketConstructor = ws;

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Process and import contacts
const importContacts = async () => {
  try {
    console.log('Starting permanent import of STEM Excel contacts...');
    
    // Path to Excel file
    const excelPath = path.join(__dirname, 'attached_assets', 'Stem List Contacts 2025.xlsx');
    
    // Verify file exists
    if (!fs.existsSync(excelPath)) {
      console.error(`Excel file not found: ${excelPath}`);
      return;
    }
    
    // Read the Excel file
    console.log(`Reading Excel file: ${excelPath}`);
    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    console.log(`Found ${data.length} contacts in Excel file`);
    
    // Get existing contacts to avoid duplicates
    const existingResult = await pool.query('SELECT email FROM contacts');
    const existingEmails = new Set(existingResult.rows.map(c => c.email?.toLowerCase()));
    console.log(`Found ${existingEmails.size} existing contacts in database`);
    
    // Get user ID for ownership (needed for contacts)
    const userResult = await pool.query('SELECT id FROM users LIMIT 1');
    if (userResult.rows.length === 0) {
      console.error('No users found in database');
      return;
    }
    const userId = userResult.rows[0].id;
    
    // Stats
    let added = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process each contact
    for (const row of data) {
      try {
        // Helper function to find field with different possible names
        const findField = (fieldNames) => {
          for (const name of fieldNames) {
            for (const [key, value] of Object.entries(row)) {
              if (key.toLowerCase() === name.toLowerCase()) {
                return value;
              }
            }
          }
          return '';
        };
        
        // Extract fields with various possible names
        const email = findField(['email', 'e_mail', 'e-mail', 'EMAIL', 'E_MAIL']);
        
        // Skip if no email
        if (!email) {
          console.log('Skipping contact: missing email');
          skipped++;
          continue;
        }
        
        // Skip if already exists
        if (existingEmails.has(email.toLowerCase())) {
          console.log(`Contact already exists: ${email}`);
          skipped++;
          continue;
        }
        
        // Get remaining fields
        const firstName = findField(['firstName', 'first_name', 'firstname', 'FIRST_NAME', 'FirstName']);
        const lastName = findField(['lastName', 'last_name', 'lastname', 'LAST_NAME', 'LastName']);
        const company = findField(['company', 'COMPANY', 'Company']);
        const role = findField(['role', 'title', 'job_title', 'ROLE', 'Title']);
        const industry = findField(['industry', 'INDUSTRY', 'Industry']);
        const phone = findField(['phone', 'PHONE', 'Phone']);
        const linkedin = findField(['linkedin', 'LINKEDIN', 'LinkedIn']);
        const website = findField(['website', 'WEBSITE', 'Website']);
        const country = findField(['country', 'COUNTRY', 'Country']);
        
        // Insert the contact directly
        const result = await pool.query(
          `INSERT INTO contacts (
            first_name, last_name, email, company, role, industry, 
            phone, linkedin, website, country, status, created_at, updated_at, user_id, tags
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW(), $12, $13) RETURNING id`,
          [
            firstName || '',
            lastName || '',
            email,
            company || '',
            role || '',
            industry || '',
            phone || '',
            linkedin || '',
            website || '',
            country || '',
            'Active',
            userId,
            ['STEM List'] // Tag these contacts for easy identification
          ]
        );
        
        // Add to existing emails set to prevent duplicates in same batch
        existingEmails.add(email.toLowerCase());
        
        console.log(`Added contact: ${firstName || ''} ${lastName || ''} (${email})`);
        added++;
        
      } catch (error) {
        console.error('Error adding contact:', error);
        errors++;
      }
    }
    
    // Show summary
    console.log('\n=== IMPORT SUMMARY ===');
    console.log(`Total contacts in file: ${data.length}`);
    console.log(`Successfully added: ${added}`);
    console.log(`Skipped (duplicates or missing email): ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log('=====================\n');
    
    if (added > 0) {
      console.log('✅ Successfully added contacts permanently to your database!');
      console.log('These contacts are tagged with "STEM List" for easy identification.');
    } else {
      console.log('No new contacts were added. All contacts might already exist in the database.');
    }
    
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    // Close database connection
    await pool.end();
  }
};

// Run the import
importContacts();