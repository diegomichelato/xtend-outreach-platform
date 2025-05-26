// Script to permanently import contacts from the Stem List Contacts 2025.xlsx file
import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './server/db.js';
import { contacts } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function importContactsFromExcel() {
  try {
    console.log('Starting import of contacts from Stem List 2025 Excel file...');
    
    // Path to the Excel file
    const excelFilePath = path.join(__dirname, 'attached_assets', 'Stem List Contacts 2025.xlsx');
    
    // Check if file exists
    if (!fs.existsSync(excelFilePath)) {
      console.error(`Excel file not found at: ${excelFilePath}`);
      return;
    }
    
    // Read the Excel file
    const workbook = xlsx.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert the worksheet to JSON
    const data = xlsx.utils.sheet_to_json(worksheet);
    console.log(`Found ${data.length} contacts in Excel file`);
    
    // Track import statistics
    let totalContacts = 0;
    let newContacts = 0;
    let duplicates = 0;
    let errors = 0;
    
    // Normalize field names
    const normalizeField = (fieldName) => {
      const lower = fieldName.toLowerCase().trim();
      switch (lower) {
        case 'first_name':
        case 'firstname':
        case 'first name': 
          return 'firstName';
        case 'last_name':
        case 'lastname':
        case 'last name': 
          return 'lastName';
        case 'email':
        case 'e_mail':
        case 'e-mail': 
          return 'email';
        case 'business_email':
        case 'business_e_mail':
        case 'business e-mail': 
          return 'businessEmail';
        case 'linkedin':
        case 'linkedin_url': 
          return 'linkedin';
        case 'type':
        case 'niche':
          return 'type';
        default: 
          return lower;
      }
    };
    
    // Normalize contact types
    const normalizeType = (type) => {
      // Convert all types to title case format
      if (!type) return null;
      
      const typeStr = String(type).trim().toUpperCase();
      
      // Map common types to standard formats
      switch (typeStr) {
        case 'BRAND':
        case 'BRANDS':
          return 'Brand';
        case 'AGENCY':
        case 'AGENCIES':
          return 'Agency';  
        case 'PARTNER':
        case 'PARTNERS':
          return 'Partner';
        default:
          // Convert to title case (first letter uppercase, rest lowercase)
          return typeStr.charAt(0).toUpperCase() + typeStr.slice(1).toLowerCase();
      }
    };
    
    // Process each contact
    for (const row of data) {
      try {
        totalContacts++;
        
        // Normalize field names in the data
        const normalizedRow = {};
        for (const [key, value] of Object.entries(row)) {
          const normalizedKey = normalizeField(key);
          normalizedRow[normalizedKey] = value;
        }
        
        // Extract required and optional fields with fallbacks for missing data
        const contactData = {
          firstName: normalizedRow.firstName || '',
          lastName: normalizedRow.lastName || '',
          email: normalizedRow.email || normalizedRow.businessEmail || '',
          company: normalizedRow.company || '',
          role: normalizedRow.role || normalizedRow.title || '',
          industry: normalizedRow.industry || '',
          phone: normalizedRow.phone || '',
          linkedin: normalizedRow.linkedin || '',
          website: normalizedRow.website || '',
          country: normalizedRow.country || '',
          status: 'Active',
          type: normalizeType(normalizedRow.type || normalizedRow.niche)
        };
        
        // Make sure we have at least email and first name
        if (!contactData.email) {
          console.warn(`Row #${totalContacts}: Missing email, skipping.`);
          errors++;
          continue;
        }
        
        console.log(`Processing contact: ${contactData.firstName} ${contactData.lastName}, ${contactData.email}, ${contactData.company}`);
        
        // Check if contact already exists
        const existingContact = await db.select()
          .from(contacts)
          .where(eq(contacts.email, contactData.email))
          .limit(1);
        
        if (existingContact && existingContact.length > 0) {
          console.log(`Contact already exists: ${contactData.email}`);
          duplicates++;
          continue;
        }
        
        // Insert the new contact
        await db.insert(contacts).values(contactData);
        newContacts++;
        console.log(`Added new contact: ${contactData.firstName} ${contactData.lastName}, ${contactData.email}`);
        
      } catch (error) {
        console.error(`Error processing row ${totalContacts}:`, error);
        errors++;
      }
    }
    
    // Display import summary
    console.log("\n=== Import Summary ===");
    console.log(`Total contacts in file: ${totalContacts}`);
    console.log(`New contacts added: ${newContacts}`);
    console.log(`Duplicate contacts (skipped): ${duplicates}`);
    console.log(`Errors: ${errors}`);
    console.log("===================================");
    
    console.log('Import completed successfully!');
    
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    // Exit the process
    process.exit(0);
  }
}

// Run the import function
importContactsFromExcel();