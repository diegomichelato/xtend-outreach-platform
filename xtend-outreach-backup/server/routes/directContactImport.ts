/**
 * Direct Contact Import Route
 * This route provides a way to directly import contacts to the database
 * without going through the CSV upload process.
 */

import { Router, Request, Response } from 'express';
import { storage } from '../storage';

const router = Router();

// Import contacts directly via API
router.post('/import-contacts', async (req: Request, res: Response) => {
  try {
    const { contacts } = req.body;
    
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ 
        message: 'Invalid request - contacts must be a non-empty array' 
      });
    }
    
    const user = await storage.getFirstUser();
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Track imported contacts
    const importedContacts = [];
    const failedContacts = [];
    
    // Process each contact
    for (const contact of contacts) {
      try {
        // Validate required fields
        if (!contact.firstName || !contact.email || !contact.company || !contact.industry) {
          console.log('Missing required fields:', contact);
          failedContacts.push({
            data: contact,
            reason: 'Missing required fields (firstName, email, company, or industry)'
          });
          continue;
        }
        
        // Create contact in database
        const newContact = await storage.createContact({
          firstName: contact.firstName,
          lastName: contact.lastName || '',
          email: contact.email,
          company: contact.company,
          industry: contact.industry,
          type: contact.type || 'Brand',
          role: contact.role || '',
          phone: contact.phone || '',
          linkedin: contact.linkedin || '',
          niche: contact.niche || '',
          country: contact.country || '',
          businessLinkedin: contact.businessLinkedin || '',
          website: contact.website || '',
          businessEmail: contact.businessEmail || '',
          userId: user.id
        });
        
        importedContacts.push(newContact);
      } catch (error) {
        console.error('Error importing contact:', error);
        failedContacts.push({
          data: contact,
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // Create a contact list for these contacts if any were successfully imported
    let contactList = null;
    if (importedContacts.length > 0) {
      contactList = await storage.createContactList({
        name: `Imported Contacts ${new Date().toISOString().slice(0, 10)}`,
        description: `Contacts imported via API on ${new Date().toLocaleString()}`,
        userId: user.id
      });
      
      // Add all imported contacts to the list
      for (const contact of importedContacts) {
        await storage.addContactToList(contactList.id, contact.id);
      }
    }
    
    return res.status(200).json({
      message: `Successfully imported ${importedContacts.length} contacts`,
      importedCount: importedContacts.length,
      failedCount: failedContacts.length,
      contactList,
      failedContacts: failedContacts.length > 0 ? failedContacts : undefined
    });
  } catch (error) {
    console.error('Error in direct contact import:', error);
    return res.status(500).json({
      message: 'Error importing contacts',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;