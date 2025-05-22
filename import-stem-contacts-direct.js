// Direct script to import Stem List contacts
import { Pool } from '@neondatabase/serverless';
import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection
console.log("Connecting to database...");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function importContacts() {
  try {
    // Path to Excel file
    const excelPath = path.join(__dirname, 'attached_assets', 'Stem List Contacts 2025.xlsx');
    console.log(`Reading Excel file from: ${excelPath}`);
    
    if (!fs.existsSync(excelPath)) {
      console.error('Excel file not found!');
      return;
    }
    
    // Read the Excel file
    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    console.log(`Found ${data.length} contacts in Excel file`);
    
    // Stats
    let added = 0;
    let duplicates = 0;
    let errors = 0;
    
    // Process each contact
    for (const row of data) {
      try {
        // Normalize the data
        const contact = {};
        
        // Map fields (case-insensitive)
        Object.entries(row).forEach(([key, value]) => {
          const lowerKey = key.toLowerCase();
          
          if (lowerKey.includes('first') && lowerKey.includes('name') || lowerKey === 'firstname' || lowerKey === 'first_name') {
            contact.firstName = value;
          } else if (lowerKey.includes('last') && lowerKey.includes('name') || lowerKey === 'lastname' || lowerKey === 'last_name') {
            contact.lastName = value;
          } else if (lowerKey === 'email' || lowerKey === 'e_mail' || lowerKey === 'e-mail') {
            contact.email = value;
          } else if (lowerKey === 'company') {
            contact.company = value;
          } else if (lowerKey === 'role' || lowerKey === 'title') {
            contact.role = value;
          } else if (lowerKey === 'industry') {
            contact.industry = value;
          } else if (lowerKey === 'type' || lowerKey === 'niche') {
            // Normalize type values
            const typeValue = String(value).trim().toUpperCase();
            if (typeValue === 'BRAND' || typeValue === 'BRANDS') {
              contact.type = 'Brand';
            } else if (typeValue === 'AGENCY' || typeValue === 'AGENCIES') {
              contact.type = 'Agency';
            } else if (typeValue === 'PARTNER' || typeValue === 'PARTNERS') {
              contact.type = 'Partner';
            } else {
              contact.type = value;
            }
          } else if (lowerKey === 'phone') {
            contact.phone = value;
          } else if (lowerKey === 'linkedin') {
            contact.linkedin = value;
          } else if (lowerKey === 'country') {
            contact.country = value;
          } else if (lowerKey === 'website') {
            contact.website = value;
          }
        });
        
        // Skip if email is missing
        if (!contact.email) {
          console.warn('Skipping contact: no email provided');
          errors++;
          continue;
        }
        
        // Check if contact already exists
        const { rows: existingContacts } = await pool.query(
          'SELECT id FROM contacts WHERE email = $1 LIMIT 1',
          [contact.email]
        );
        
        if (existingContacts.length > 0) {
          console.log(`Contact already exists: ${contact.email}`);
          duplicates++;
          continue;
        }
        
        // Insert the contact using direct SQL
        await pool.query(
          `INSERT INTO contacts (
            first_name, last_name, email, company, role, industry, type, 
            phone, linkedin, country, website, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            contact.firstName || '',
            contact.lastName || '',
            contact.email,
            contact.company || '',
            contact.role || '',
            contact.industry || '',
            contact.type || 'Brand',
            contact.phone || '',
            contact.linkedin || '',
            contact.country || '',
            contact.website || '',
            'Active',
            new Date(),
            new Date()
          ]
        );
        
        console.log(`Added contact: ${contact.firstName} ${contact.lastName} (${contact.email})`);
        added++;
        
      } catch (error) {
        console.error('Error processing contact:', error);
        errors++;
      }
    }
    
    // Print summary
    console.log("\n=== IMPORT SUMMARY ===");
    console.log(`Total contacts in file: ${data.length}`);
    console.log(`Successfully added: ${added}`);
    console.log(`Duplicates (skipped): ${duplicates}`);
    console.log(`Errors: ${errors}`);
    console.log("=====================");
    
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the import
importContacts();