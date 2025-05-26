/**
 * Test endpoint to add contacts to a list
 * For testing purposes only
 */

import { Router, Request, Response } from 'express';
import { storage } from '../storage';

const router = Router();

// Add test contacts to a specific list, or create a new list if listId is not provided
router.post('/add-test-contacts/:listId?', async (req: Request, res: Response) => {
  try {
    let list;
    const user = await storage.getFirstUser();
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (req.params.listId) {
      // Try to use existing list
      const listId = parseInt(req.params.listId);
      
      if (isNaN(listId)) {
        return res.status(400).json({ message: 'Invalid list ID' });
      }
      
      // Check if list exists
      list = await storage.getContactList(listId);
      if (!list) {
        return res.status(404).json({ message: 'Contact list not found' });
      }
    } else {
      // Create a new list
      list = await storage.createContactList({
        name: `Test List ${new Date().toISOString().slice(0, 10)}`,
        description: 'Automatically created test contact list',
        userId: user.id
      });
      
      console.log('Created new contact list:', list);
    }
    
    // Add 5 test contacts to the list
    const contacts = [];
    
    for (let i = 1; i <= 5; i++) {
      console.log(`Creating contact ${i} for list ${list.id} (${list.name})`);
      const contact = await storage.createContact({
        firstName: `Test${i}`,
        lastName: `User${i}`,
        email: `test${i}@example.com`,
        company: `Company ${i}`,
        role: `Job Title ${i}`,
        phone: `123-456-789${i}`,
        industry: 'Technology',
        type: 'Brand',
        status: 'active',
        userId: list.userId
      });
      
      // Associate contact with list
      console.log(`Adding contact ${contact.id} (${contact.email}) to list ${list.id}`);
      await storage.addContactToList(list.id, contact.id);
      console.log(`Successfully added contact to list`);
      
      contacts.push(contact);
    }
    
    return res.status(200).json({
      message: `Successfully added 5 test contacts to list ${list.name}`,
      contacts
    });
  } catch (error) {
    console.error('Error adding test contacts:', error);
    return res.status(500).json({
      message: 'Error adding test contacts',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;