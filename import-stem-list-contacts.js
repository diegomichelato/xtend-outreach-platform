/**
 * Import STEM List Contacts to All Contacts
 * This script will import the STEM list contacts directly into the All Contacts system
 */
import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { Pool } from '@neondatabase/serverless';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import 'dotenv/config';

// Get current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Connect to the database
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function importStemContacts() {
  console.log("Starting STEM List Contacts import to All Contacts...");

  try {
    // Path to the STEM List Excel file
    const filePath = path.join(__dirname, 'attached_assets', 'Stem List Contacts 2025.xlsx');
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return;
    }

    console.log(`Reading Excel file: ${filePath}`);
    
    // Read Excel file
    const workbook = XLSX.read(fs.readFileSync(filePath), { type: 'buffer' });
    
    // Get first worksheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const rawContacts = XLSX.utils.sheet_to_json(worksheet, { 
      raw: false,
      defval: null
    });
    
    console.log(`Found ${rawContacts.length} raw contacts`);
    
    // Process and normalize contacts
    let importedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const rawContact of rawContacts) {
      try {
        // Normalize and map fields from Excel to our database schema
        const contact = {
          firstName: extractValue(rawContact, ['First Name', 'FirstName', 'first_name', 'FIRST_NAME', 'Name']),
          lastName: extractValue(rawContact, ['Last Name', 'LastName', 'last_name', 'LAST_NAME']),
          email: extractValue(rawContact, ['Email', 'E-mail', 'email', 'EMAIL', 'E_MAIL']),
          company: extractValue(rawContact, ['Company', 'COMPANY', 'company', 'Organization', 'Org', 'ORGANIZATION']),
          role: extractValue(rawContact, ['Title', 'TITLE', 'title', 'Role', 'ROLE', 'role', 'Position', 'POSITION', 'JobTitle']),
          industry: extractValue(rawContact, ['Industry', 'INDUSTRY', 'industry', 'Vertical', 'VERTICAL']),
          phone: extractValue(rawContact, ['Phone', 'PHONE', 'phone', 'PhoneNumber', 'Phone Number']),
          linkedin: extractValue(rawContact, ['LinkedIn', 'LINKEDIN', 'linkedin', 'LinkedInURL', 'LinkedIn URL']),
        };
        
        // Set defaults for missing values
        if (!contact.firstName && !contact.company) {
          console.log(`Skipping row with insufficient data: ${JSON.stringify(rawContact)}`);
          errorCount++;
          continue;
        }
        
        contact.firstName = contact.firstName || 'Unknown';
        contact.lastName = contact.lastName || '';
        contact.company = contact.company || 'Unknown Company';
        contact.industry = contact.industry || 'Technology';
        contact.type = 'Brand';
        contact.status = 'active';
        contact.source = 'STEM List 2025';
        
        // Generate an email if missing (needed for database constraints)
        if (!contact.email) {
          const simplifiedName = contact.firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
          const simplifiedCompany = contact.company.toLowerCase().replace(/[^a-z0-9]/g, '');
          contact.email = `${simplifiedName}@${simplifiedCompany}.example`;
        }
        
        // Check if contact already exists
        const checkResult = await pool.query(
          'SELECT id FROM contacts WHERE email = $1',
          [contact.email]
        );
        
        if (checkResult.rows.length > 0) {
          // Update existing contact
          const contactId = checkResult.rows[0].id;
          await pool.query(`
            UPDATE contacts SET
              first_name = $1,
              last_name = $2,
              company = $3,
              role = $4,
              industry = $5,
              phone = $6,
              linkedin = $7,
              type = $8,
              source = $9,
              updated_at = NOW(),
              tags = ARRAY['STEM']::text[]
            WHERE id = $10
          `, [
            contact.firstName,
            contact.lastName,
            contact.company,
            contact.role,
            contact.industry,
            contact.phone,
            contact.linkedin,
            contact.type,
            contact.source,
            contactId
          ]);
          
          updatedCount++;
        } else {
          // Insert new contact
          await pool.query(`
            INSERT INTO contacts (
              first_name, last_name, email, company, role, industry, phone, linkedin,
              status, type, source, created_at, updated_at, tags
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW(), ARRAY['STEM']::text[]
            )
          `, [
            contact.firstName,
            contact.lastName,
            contact.email,
            contact.company,
            contact.role,
            contact.industry,
            contact.phone,
            contact.linkedin,
            contact.status,
            contact.type,
            contact.source
          ]);
          
          importedCount++;
        }
      } catch (error) {
        console.error(`Error processing contact: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log(`
      Import completed:
      - Imported: ${importedCount} new contacts
      - Updated: ${updatedCount} existing contacts
      - Errors: ${errorCount} contacts
      - Total processed: ${rawContacts.length} contacts
    `);
    
  } catch (error) {
    console.error(`Failed to import STEM contacts: ${error.message}`);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Helper function to extract values from different possible column names
function extractValue(obj, possibleKeys) {
  for (const key of possibleKeys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      return obj[key];
    }
  }
  
  // Try case-insensitive matching if exact matches failed
  const lowerObj = {};
  Object.keys(obj).forEach(k => {
    lowerObj[k.toLowerCase()] = obj[k];
  });
  
  for (const key of possibleKeys) {
    const lowerKey = key.toLowerCase();
    if (lowerObj[lowerKey] !== undefined && lowerObj[lowerKey] !== null && lowerObj[lowerKey] !== '') {
      return lowerObj[lowerKey];
    }
  }
  
  return null;
}

// Run the import as a self-executing async function
(async () => {
  try {
    await importStemContacts();
    console.log('Import script completed');
  } catch (err) {
    console.error('Import script failed:', err);
  }
})();