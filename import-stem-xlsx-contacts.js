/**
 * Import STEM XLSX Contacts Script
 * This script imports contacts from the STEM List Contacts 2025.xlsx file into the database.
 */
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { Pool } = require('@neondatabase/serverless');
require('dotenv').config();

// Connect to the database
const pool = process.env.DATABASE_URL 
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

if (!pool) {
  console.error('DATABASE_URL not set. Please set it in the environment variables.');
  process.exit(1);
}

async function importStemContacts() {
  try {
    // Path to the XLSX file
    const filePath = path.join(__dirname, 'attached_assets', 'Stem List Contacts 2025.xlsx');
    
    // Read the XLSX file
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Get the first sheet
    const sheet = workbook.Sheets[sheetName];
    
    // Convert sheet to JSON
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: null });
    
    console.log(`Found ${rows.length} contacts in the XLSX file.`);
    
    // Process each row and insert into the contacts table
    for (const row of rows) {
      // Map fields from the Excel file to the database schema
      // Adjust these mappings based on your actual column names in the Excel file
      const contact = {
        firstName: row.first_name || row.firstName || row['First Name'] || row.Name || '',
        lastName: row.last_name || row.lastName || row['Last Name'] || '',
        email: row.email || row.Email || row['Email Address'] || '',
        company: row.company || row.Company || row.organization || row.Organization || '',
        role: row.role || row.Role || row.title || row.Title || row.position || row.Position || '',
        phone: row.phone || row.Phone || row['Phone Number'] || '',
        linkedin: row.linkedin || row.LinkedIn || row['LinkedIn URL'] || '',
        industry: row.industry || row.Industry || row.vertical || row.Vertical || 'Tech',
        status: 'active',
        type: 'lead',
        source: 'STEM List 2025',
        notes: row.notes || row.Notes || 'Imported from STEM List Contacts 2025.xlsx',
        tags: row.tags ? JSON.stringify(row.tags.split(',').map(tag => tag.trim())) : JSON.stringify(['STEM']),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Check if we have the minimum required fields
      if (!contact.email || !contact.firstName) {
        console.log(`Skipping row with insufficient data: ${JSON.stringify(row)}`);
        continue;
      }

      // Check if contact already exists
      const existingContact = await pool.query(
        'SELECT id FROM contacts WHERE email = $1',
        [contact.email]
      );

      if (existingContact.rows.length > 0) {
        console.log(`Contact with email ${contact.email} already exists. Updating...`);
        
        // Update existing contact
        await pool.query(
          `UPDATE contacts SET 
            first_name = $1, 
            last_name = $2, 
            company = $3, 
            role = $4, 
            phone = $5, 
            linkedin = $6, 
            industry = $7, 
            status = $8, 
            type = $9, 
            source = $10, 
            notes = $11, 
            tags = $12, 
            updated_at = $13
          WHERE email = $14`,
          [
            contact.firstName,
            contact.lastName,
            contact.company,
            contact.role,
            contact.phone,
            contact.linkedin,
            contact.industry,
            contact.status,
            contact.type,
            contact.source,
            contact.notes,
            contact.tags,
            new Date(),
            contact.email
          ]
        );
      } else {
        // Insert new contact
        await pool.query(
          `INSERT INTO contacts (
            first_name, last_name, email, company, role, phone, linkedin, 
            industry, status, type, source, notes, tags, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            contact.firstName,
            contact.lastName,
            contact.email,
            contact.company,
            contact.role,
            contact.phone,
            contact.linkedin,
            contact.industry,
            contact.status,
            contact.type,
            contact.source,
            contact.notes,
            contact.tags,
            new Date(),
            new Date()
          ]
        );
      }
    }
    
    console.log('Successfully imported STEM XLSX contacts.');
  } catch (error) {
    console.error('Error importing STEM XLSX contacts:', error);
  } finally {
    await pool.end();
  }
}

// Run the import function
importStemContacts().then(() => {
  console.log('Import completed.');
}).catch(err => {
  console.error('Import failed:', err);
});