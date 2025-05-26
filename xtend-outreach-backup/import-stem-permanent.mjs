// Script to permanently import STEM List contacts to the database
import xlsx from 'xlsx';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to database
console.log("Connecting to database...");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// Import the contacts schema
const { contacts } = await import('./shared/schema.js');

async function importContacts() {
  try {
    console.log("Starting STEM List contacts import process...");
    
    // Path to Excel file
    const excelPath = path.join(__dirname, 'attached_assets', 'Stem List Contacts 2025.xlsx');
    console.log(`Looking for Excel file at: ${excelPath}`);
    
    // Check if file exists
    if (!fs.existsSync(excelPath)) {
      console.error("Excel file not found!");
      process.exit(1);
    }
    
    // Read the Excel file
    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    console.log(`Found ${data.length} contacts in the Excel file.`);
    
    // Statistics
    let added = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process each contact
    for (const row of data) {
      try {
        // Normalize field names
        const contact = {};
        
        // Map case-insensitive fields to the correct properties
        for (const [key, value] of Object.entries(row)) {
          const lowercaseKey = String(key).toLowerCase();
          
          if (lowercaseKey.includes('first') && lowercaseKey.includes('name')) {
            contact.firstName = value;
          } else if (lowercaseKey === 'firstname') {
            contact.firstName = value;
          } else if (lowercaseKey === 'first_name') {
            contact.firstName = value;
          } else if (lowercaseKey.includes('last') && lowercaseKey.includes('name')) {
            contact.lastName = value;
          } else if (lowercaseKey === 'lastname') {
            contact.lastName = value;
          } else if (lowercaseKey === 'last_name') {
            contact.lastName = value;
          } else if (lowercaseKey === 'email' || lowercaseKey === 'e_mail' || lowercaseKey === 'e-mail') {
            contact.email = value;
          } else if (lowercaseKey === 'company') {
            contact.company = value;
          } else if (lowercaseKey === 'role' || lowercaseKey === 'title' || lowercaseKey === 'job_title') {
            contact.role = value;
          } else if (lowercaseKey === 'industry') {
            contact.industry = value;
          } else if (lowercaseKey === 'phone') {
            contact.phone = value;
          } else if (lowercaseKey === 'linkedin') {
            contact.linkedin = value;
          } else if (lowercaseKey === 'type' || lowercaseKey === 'niche') {
            // Normalize the type
            let type = String(value).trim();
            if (type.toUpperCase() === 'BRAND' || type.toUpperCase() === 'BRANDS') {
              contact.type = 'Brand';
            } else if (type.toUpperCase() === 'AGENCY' || type.toUpperCase() === 'AGENCIES') {
              contact.type = 'Agency';
            } else if (type.toUpperCase() === 'PARTNER' || type.toUpperCase() === 'PARTNERS') {
              contact.type = 'Partner';
            } else {
              contact.type = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
            }
          }
        }
        
        // Make sure we have email
        if (!contact.email) {
          console.warn(`Skipping contact: Missing email`);
          skipped++;
          continue;
        }
        
        // Check if contact already exists
        const existingContact = await db.select()
          .from(contacts)
          .where(eq(contacts.email, contact.email))
          .limit(1);
        
        if (existingContact && existingContact.length > 0) {
          console.log(`Skipping duplicate contact: ${contact.email}`);
          skipped++;
          continue;
        }
        
        // Prepare contact data with all necessary fields
        const contactData = {
          firstName: contact.firstName || '',
          lastName: contact.lastName || '',
          email: contact.email,
          company: contact.company || '',
          role: contact.role || '',
          industry: contact.industry || '',
          phone: contact.phone || '',
          linkedin: contact.linkedin || '',
          status: 'Active',
          type: contact.type || 'Brand', // Default to Brand if missing
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Insert the contact
        await db.insert(contacts).values(contactData);
        console.log(`Added contact: ${contactData.firstName} ${contactData.lastName} (${contactData.email})`);
        added++;
        
      } catch (error) {
        console.error(`Error processing contact:`, error);
        errors++;
      }
    }
    
    // Print summary
    console.log("\n=== Import Summary ===");
    console.log(`Total contacts processed: ${data.length}`);
    console.log(`Added: ${added}`);
    console.log(`Skipped (duplicates): ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log("Import completed!");
    
  } catch (error) {
    console.error("Import failed:", error);
  } finally {
    // Close the database connection
    await pool.end();
    console.log("Database connection closed.");
  }
}

// Run the import function
importContacts();