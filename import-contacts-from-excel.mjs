// Import STEM List Contacts 2025.xlsx permanently
import { Pool } from '@neondatabase/serverless';
import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ws from 'ws';

// Get directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure database connection (needed for Neon serverless)
import { neonConfig } from '@neondatabase/serverless';
neonConfig.webSocketConstructor = ws;

// Database setup
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL environment variable');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function importStemContacts() {
  try {
    console.log('Starting permanent import of STEM List Contacts...');
    
    // Check if Excel file exists
    const excelPath = path.join(__dirname, 'attached_assets', 'Stem List Contacts 2025.xlsx');
    if (!fs.existsSync(excelPath)) {
      console.error(`Excel file not found at: ${excelPath}`);
      process.exit(1);
    }
    
    console.log(`Reading Excel file: ${excelPath}`);
    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    console.log(`Found ${data.length} contacts in the Excel file`);
    
    // Define table columns using direct SQL
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'contacts'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.error('Contacts table does not exist in the database');
      process.exit(1);
    }
    
    // Get current contacts to avoid duplicates
    const { rows: existingContacts } = await pool.query(
      'SELECT email FROM contacts'
    );
    
    const existingEmails = new Set(existingContacts.map(c => c.email.toLowerCase()));
    console.log(`Found ${existingEmails.size} existing contacts in the database`);
    
    // Process contacts
    let added = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const row of data) {
      try {
        // First, extract data from row (case-insensitive field matching)
        const contactData = {};
        
        // Helper function to find field value with case-insensitive matching
        const findField = (fieldNames) => {
          for (const field of fieldNames) {
            for (const [key, value] of Object.entries(row)) {
              if (key.toLowerCase() === field.toLowerCase()) {
                return value;
              }
            }
          }
          return null;
        };
        
        // Extract data with various possible field names
        const firstName = findField(['firstName', 'first_name', 'first name', 'firstname', 'FIRST_NAME']) || '';
        const lastName = findField(['lastName', 'last_name', 'last name', 'lastname', 'LAST_NAME']) || '';
        const email = findField(['email', 'e_mail', 'e-mail', 'EMAIL', 'E_MAIL']) || '';
        const company = findField(['company', 'COMPANY']) || '';
        const role = findField(['role', 'title', 'job_title', 'ROLE']) || '';
        const industry = findField(['industry', 'INDUSTRY']) || '';
        const type = findField(['type', 'niche', 'TYPE', 'NICHE']) || 'Brand';
        const phone = findField(['phone', 'PHONE']) || '';
        const linkedin = findField(['linkedin', 'LINKEDIN']) || '';
        const website = findField(['website', 'WEBSITE']) || '';
        const country = findField(['country', 'COUNTRY']) || '';
        
        // Skip if no email
        if (!email) {
          console.warn('Skipping contact: missing email');
          skipped++;
          continue;
        }
        
        // Check for duplicates
        if (existingEmails.has(email.toLowerCase())) {
          console.log(`Skipping duplicate: ${email}`);
          skipped++;
          continue;
        }
        
        // Normalize the contact type
        let normalizedType = 'Brand'; // Default
        if (type) {
          const typeStr = String(type).trim().toUpperCase();
          if (typeStr === 'BRAND' || typeStr === 'BRANDS') {
            normalizedType = 'Brand';
          } else if (typeStr === 'AGENCY' || typeStr === 'AGENCIES') {
            normalizedType = 'Agency';
          } else if (typeStr === 'PARTNER' || typeStr === 'PARTNERS') {
            normalizedType = 'Partner';
          } else {
            // Capitalize first letter
            normalizedType = typeStr.charAt(0).toUpperCase() + typeStr.slice(1).toLowerCase();
          }
        }
        
        // Use explicit column names for insert
        await pool.query(`
          INSERT INTO contacts (
            first_name, last_name, email, company, role, industry, type,
            phone, linkedin, website, country, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `, [
          firstName,
          lastName,
          email,
          company,
          role,
          industry,
          normalizedType,
          phone,
          linkedin,
          website,
          country,
          'Active',
          new Date(),
          new Date()
        ]);
        
        // Add to set of existing emails to avoid duplicates in the same batch
        existingEmails.add(email.toLowerCase());
        
        console.log(`Added contact: ${firstName} ${lastName} (${email})`);
        added++;
        
      } catch (error) {
        console.error(`Error processing contact:`, error);
        errors++;
      }
    }
    
    // Display summary
    console.log('\n=== IMPORT SUMMARY ===');
    console.log(`Total contacts in file: ${data.length}`);
    console.log(`Successfully added: ${added}`);
    console.log(`Skipped (duplicates or invalid): ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log('=====================\n');
    
    if (added > 0) {
      console.log('✅ Successfully added contacts permanently to the database!');
    } else {
      console.log('⚠️ No new contacts were added to the database.');
    }
    
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the import
importStemContacts();