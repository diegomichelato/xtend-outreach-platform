import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import XLSX from "xlsx";
import { storage } from "../storage";
import { z } from "zod";
import { insertContactSchema } from "@shared/schema";

const router = express.Router();

// Configure multer for handling file uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage_config = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function(req, file, cb) {
    // Use a timestamp to ensure unique filenames
    const timestamp = Date.now();
    cb(null, `${timestamp}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage_config,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
  },
  fileFilter: function(req, file, cb) {
    // Allow xlsx and csv files
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel and CSV files are allowed'));
    }
  }
});

// Helper function to normalize contact field keys
function normalizeContactKeys(contact: Record<string, any>): Record<string, any> {
  const normalizedContact = {
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    role: '',
    industry: '',
    phone: '',
    linkedin: '',
    type: 'Brand',
    status: 'active',
    source: 'STEM List',
    tags: ['STEM'],
    notes: ''
  };
  
  // Map source fields to normalized fields
  for (const [key, value] of Object.entries(contact)) {
    const lowerKey = key.toLowerCase();
    
    if (['first name', 'firstname', 'first_name', 'name'].includes(lowerKey)) {
      normalizedContact.firstName = value || '';
    } else if (['last name', 'lastname', 'last_name'].includes(lowerKey)) {
      normalizedContact.lastName = value || '';
    } else if (['email', 'email address', 'e-mail', 'e_mail'].includes(lowerKey)) {
      normalizedContact.email = value || '';
    } else if (['company', 'organization', 'org', 'company name'].includes(lowerKey)) {
      normalizedContact.company = value || '';
    } else if (['title', 'role', 'position', 'job title', 'jobtitle'].includes(lowerKey)) {
      normalizedContact.role = value || '';
    } else if (['industry', 'vertical', 'sector'].includes(lowerKey)) {
      normalizedContact.industry = value || '';
    } else if (['phone', 'phone number', 'phonenumber', 'telephone'].includes(lowerKey)) {
      normalizedContact.phone = value || '';
    } else if (['linkedin', 'linkedin url', 'linkedinurl'].includes(lowerKey)) {
      normalizedContact.linkedin = value || '';
    } else if (['notes', 'comment', 'comments'].includes(lowerKey)) {
      normalizedContact.notes = value || '';
    }
  }
  
  // Set defaults for required fields if missing
  if (!normalizedContact.firstName && !normalizedContact.company) {
    return null; // Skip if we don't have at least a name or company
  }
  
  normalizedContact.firstName = normalizedContact.firstName || 'Unknown';
  normalizedContact.company = normalizedContact.company || 'Unknown Company';
  normalizedContact.industry = normalizedContact.industry || 'Technology';
  
  // Generate an email if missing (needed for database constraints)
  if (!normalizedContact.email) {
    const simplifiedName = normalizedContact.firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const simplifiedCompany = normalizedContact.company.toLowerCase().replace(/[^a-z0-9]/g, '');
    normalizedContact.email = `${simplifiedName}@${simplifiedCompany}.example`;
  }
  
  return normalizedContact;
}

// Route to handle STEM excel file upload
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    
    // Read the file (Excel or CSV)
    let contacts = [];
    if (['.xlsx', '.xls'].includes(fileExtension)) {
      // Read Excel file
      const workbook = XLSX.read(fs.readFileSync(filePath), { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      contacts = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: null });
    } else if (fileExtension === '.csv') {
      // Read CSV file
      const csvData = fs.readFileSync(filePath, 'utf8');
      // Use XLSX to parse CSV
      const workbook = XLSX.read(csvData, { type: 'string' });
      const sheetName = workbook.SheetNames[0];
      contacts = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false, defval: null });
    }
    
    // Process each contact
    const results = {
      total: contacts.length,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };
    
    for (const rawContact of contacts) {
      try {
        // Normalize contact data
        const contactData = normalizeContactKeys(rawContact);
        
        if (!contactData) {
          results.skipped++;
          continue;
        }
        
        // Check if contact with this email already exists
        const existingContacts = await storage.getContactsByEmail(contactData.email);
        
        if (existingContacts && existingContacts.length > 0) {
          // Update existing contact
          const existingContact = existingContacts[0];
          await storage.updateContact(existingContact.id, contactData);
          results.updated++;
        } else {
          // Create new contact
          try {
            // First validate with Zod schema
            const validatedData = insertContactSchema.parse(contactData);
            await storage.createContact(validatedData);
            results.imported++;
          } catch (validationError) {
            console.error('Validation error:', validationError);
            results.errors.push({
              email: contactData.email,
              error: 'Validation error',
              details: validationError.message
            });
            results.skipped++;
          }
        }
      } catch (error) {
        console.error('Error processing contact:', error);
        results.errors.push({
          contact: rawContact,
          error: error.message
        });
        results.skipped++;
      }
    }
    
    // Clean up the uploaded file
    fs.unlinkSync(filePath);
    
    res.json({
      message: 'STEM contacts import completed',
      results
    });
  } catch (error) {
    console.error('Error importing contacts:', error);
    res.status(500).json({
      message: 'Failed to import contacts',
      error: error.message
    });
  }
});

// Route to get a sample record from the uploaded file
router.post('/preview', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    
    // Read the file (Excel or CSV)
    let contacts = [];
    if (['.xlsx', '.xls'].includes(fileExtension)) {
      // Read Excel file
      const workbook = XLSX.read(fs.readFileSync(filePath), { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      contacts = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: null, header: 1 });
    } else if (fileExtension === '.csv') {
      // Read CSV file
      const csvData = fs.readFileSync(filePath, 'utf8');
      // Use XLSX to parse CSV
      const workbook = XLSX.read(csvData, { type: 'string' });
      const sheetName = workbook.SheetNames[0];
      contacts = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false, defval: null, header: 1 });
    }
    
    // Clean up the uploaded file
    fs.unlinkSync(filePath);
    
    // Return headers and first few rows
    const headers = contacts[0] || [];
    const previewRows = contacts.slice(1, 6); // Get up to 5 rows for preview
    
    res.json({
      headers,
      previewRows,
      totalRows: contacts.length - 1 // Exclude header row from count
    });
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({
      message: 'Failed to generate preview',
      error: error.message
    });
  }
});

export default router;