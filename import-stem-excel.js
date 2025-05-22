/**
 * Import STEM Contacts From Excel File
 * Permanently adds contacts from the Excel file to the database
 */

import fs from 'fs';
import xlsx from 'xlsx';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure WebSocket for Neon database
neonConfig.webSocketConstructor = ws;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Helper to normalize field names
const normalizeField = (fieldName) => {
  const lower = String(fieldName).toLowerCase().trim();
  if (lower.includes('first') && lower.includes('name')) return 'firstName';
  if (lower === 'firstname' || lower === 'first_name') return 'firstName';
  if (lower.includes('last') && lower.includes('name')) return 'lastName';
  if (lower === 'lastname' || lower === 'last_name') return 'lastName';
  if (lower === 'email' || lower === 'e-mail' || lower === 'e_mail') return 'email';
  if (lower === 'company') return 'company';
  if (lower === 'role' || lower === 'title' || lower === 'job_title') return 'role';
  if (lower === 'industry') return 'industry';
  if (lower === 'type' || lower === 'niche') return 'type';
  if (lower === 'phone') return 'phone';
  if (lower === 'linkedin') return 'linkedin';
  if (lower === 'website') return 'website';
  if (lower === 'country') return 'country';
  return lower;
};

// Normalize type field for consistent values
const normalizeType = (type) => {
  if (!type) return 'Brand';
  
  const typeStr = String(type).trim().toUpperCase();
  if (typeStr === 'BRAND' || typeStr === 'BRANDS') return 'Brand';
  if (typeStr === 'AGENCY' || typeStr === 'AGENCIES') return 'Agency';
  if (typeStr === 'PARTNER' || typeStr === 'PARTNERS') return 'Partner';
  
  // Default to Brand if unknown
  return 'Brand';
};

// Process Excel file and import contacts
const processExcelFile = async () => {
  try {
    console.log('Starting permanent import of STEM contacts from Excel...');
    
    // Path to the Excel file
    const excelPath = path.join(__dirname, 'attached_assets', 'Stem List Contacts 2025.xlsx');
    
    if (!fs.existsSync(excelPath)) {
      console.error(`Excel file not found: ${excelPath}`);
      return;
    }
    
    // Read the Excel file
    console.log(`Reading Excel file: ${excelPath}`);
    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(worksheet);
    
    console.log(`Found ${rawData.length} contacts in the Excel file`);
    
    // Get the first user ID for contact ownership
    const userResult = await pool.query('SELECT id FROM users LIMIT 1');
    if (userResult.rows.length === 0) {
      console.error('No users found in database');
      return;
    }
    const userId = userResult.rows[0].id;
    console.log(`Using user ID: ${userId} for contact ownership`);
    
    // Create a contact list for these contacts
    const listName = `STEM List Import (Permanent) ${new Date().toISOString().slice(0, 10)}`;
    const listResult = await pool.query(
      'INSERT INTO contact_lists (name, description, user_id, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
      [listName, 'Permanently imported from STEM List Excel file', userId]
    );
    const contactListId = listResult.rows[0].id;
    console.log(`Created contact list with ID: ${contactListId}`);
    
    // Get existing contacts to avoid duplicates
    const existingContacts = await pool.query('SELECT email FROM contacts');
    const existingEmails = new Set(existingContacts.rows.map(c => c.email.toLowerCase()));
    console.log(`Found ${existingEmails.size} existing contacts in database`);
    
    // Stats
    let addedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Process each contact
    for (const row of rawData) {
      try {
        // Extract and normalize fields from the row
        const normalizedRow = {};
        for (const [key, value] of Object.entries(row)) {
          const normalizedKey = normalizeField(key);
          normalizedRow[normalizedKey] = value;
        }
        
        // Extract essential fields
        const contact = {
          firstName: normalizedRow.firstName || '',
          lastName: normalizedRow.lastName || '',
          email: normalizedRow.email || '',
          company: normalizedRow.company || '',
          role: normalizedRow.role || '',
          industry: normalizedRow.industry || '',
          type: normalizeType(normalizedRow.type),
          phone: normalizedRow.phone || '',
          linkedin: normalizedRow.linkedin || '',
          website: normalizedRow.website || '',
          country: normalizedRow.country || ''
        };
        
        // Skip if email is missing
        if (!contact.email) {
          console.log('Skipping contact: missing email');
          skippedCount++;
          continue;
        }
        
        // Skip if already exists
        if (existingEmails.has(contact.email.toLowerCase())) {
          console.log(`Skipping duplicate contact: ${contact.email}`);
          skippedCount++;
          continue;
        }
        
        // Insert the contact
        const result = await pool.query(
          `INSERT INTO contacts (
            first_name, last_name, email, company, role, industry, 
            phone, linkedin, website, country, status, created_at, updated_at, user_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW(), $12) RETURNING id`,
          [
            contact.firstName,
            contact.lastName,
            contact.email,
            contact.company,
            contact.role,
            contact.industry,
            contact.phone,
            contact.linkedin,
            contact.website,
            contact.country,
            'Active',
            userId
          ]
        );
        
        const contactId = result.rows[0].id;
        
        // Add to contact list
        await pool.query(
          'INSERT INTO contact_list_contacts (contact_list_id, contact_id) VALUES ($1, $2)',
          [contactListId, contactId]
        );
        
        // Add to set of existing emails to prevent duplicates in same batch
        existingEmails.add(contact.email.toLowerCase());
        
        console.log(`Added contact: ${contact.firstName} ${contact.lastName} (${contact.email})`);
        addedCount++;
        
      } catch (error) {
        console.error(`Error processing contact:`, error);
        errorCount++;
      }
    }
    
    // Print summary
    console.log('\n=== IMPORT SUMMARY ===');
    console.log(`Total contacts in file: ${rawData.length}`);
    console.log(`Successfully added: ${addedCount}`);
    console.log(`Skipped (duplicates or missing email): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Contact list ID: ${contactListId} (${listName})`);
    console.log('=====================\n');
    
    if (addedCount > 0) {
      console.log('✅ Successfully added contacts permanently to your database!');
      console.log(`The contacts were also added to a contact list named "${listName}"`);
    } else {
      console.log('No new contacts were added. All contacts might already exist in the database.');
    }
    
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await pool.end();
  }
};

// Run the import
processExcelFile();