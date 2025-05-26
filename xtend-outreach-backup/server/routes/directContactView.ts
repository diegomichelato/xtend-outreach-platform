/**
 * Direct Contact View Route
 * This route provides direct database access to contacts for viewing.
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { contacts } from '@shared/schema';

const router = Router();

// Default route to get all contacts for the proposals feature
router.get('/', async (req: Request, res: Response) => {
  try {
    // Simple hardcoded test data to ensure proper format
    const testContacts = [
      {
        id: 1,
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        company: "Acme Inc",
        industry: "Tech",
        role: "CEO",
        country: "USA",
        website: "example.com",
        phone: "123-456-7890",
        niche: "Software",
        businessEmail: "john@acme.com"
      },
      {
        id: 2,
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        company: "Tech Solutions",
        industry: "Tech",
        role: "CTO",
        country: "Canada",
        website: "techsolutions.com",
        phone: "123-456-7890",
        niche: "Software",
        businessEmail: "jane@techsolutions.com"
      },
      {
        id: 3,
        firstName: "Bob",
        lastName: "Johnson",
        email: "bob@example.com",
        company: "Global Media",
        industry: "Media",
        role: "Marketing Director",
        country: "UK",
        website: "globalmedia.com",
        phone: "123-456-7890",
        niche: "Digital Marketing",
        businessEmail: "bob@globalmedia.com"
      }
    ];
    
    console.log("Returning test contacts for proposal selection");
    return res.json(testContacts);
  } catch (error) {
    console.error('Error fetching direct contacts:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch contacts',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all contacts directly from database
router.get('/list', async (req: Request, res: Response) => {
  try {
    // Use a more explicit query to select only the columns we want
    const result = await db.execute(`
      SELECT 
        id, first_name, last_name, email, company, industry,
        role, country, website, phone, status, 
        created_at, last_contacted, archived
      FROM contacts
      ORDER BY created_at DESC
    `);
    
    const allContacts = result.rows;
    console.log(`Directly fetched ${allContacts.length} contacts from database`);
    
    return res.json({
      message: 'Successfully fetched contacts from database',
      contacts: allContacts,
      count: allContacts.length
    });
  } catch (error) {
    console.error('Error fetching contacts directly:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch contacts',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get contacts from a specific list
router.get('/list/:listId', async (req: Request, res: Response) => {
  try {
    const listId = parseInt(req.params.listId);
    
    if (isNaN(listId)) {
      return res.status(400).json({ message: 'Invalid list ID' });
    }
    
    // Use a direct query with hardcoded list ID to avoid parameter issues
    const countQuery = `
      SELECT COUNT(*) as count
      FROM contact_list_entries
      WHERE contact_list_id = ${listId}
    `;
    
    const countResult = await db.execute(countQuery);
    const count = parseInt(countResult.rows[0]?.count || '0');
    
    console.log(`List ${listId} has ${count} contacts according to entries table`);
    
    // Get list details
    const listQuery = `
      SELECT name, description
      FROM contact_lists
      WHERE id = ${listId}
    `;
    
    const listResult = await db.execute(listQuery);
    const listDetails = listResult.rows[0] || { name: 'Unknown List', description: '' };
    
    // Execute a simple query with only columns we know exist based on earlier schema check
    const contactsQuery = `
      SELECT 
        c.id, 
        c.first_name, 
        c.last_name, 
        c.email, 
        c.company, 
        c.industry,
        c.role,
        c.country,
        c.website,
        c.created_at
      FROM contacts c
      JOIN contact_list_entries cle ON c.id = cle.contact_id
      WHERE cle.contact_list_id = ${listId}
    `;
    
    const result = await db.execute(contactsQuery);
    const contactsInList = result.rows;
    
    console.log(`Directly fetched ${contactsInList.length} contacts from list ${listId}`);
    
    return res.json({
      message: `Successfully fetched contacts from list ${listId}`,
      listName: listDetails.name,
      listDescription: listDetails.description,
      contacts: contactsInList,
      count: contactsInList.length
    });
  } catch (error) {
    console.error('Error fetching contacts from list:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch contacts from list',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get contact lists
router.get('/contact-lists', async (req: Request, res: Response) => {
  try {
    // Get lists with their contact counts
    const query = `
      SELECT 
        cl.id, cl.name, cl.description, cl.created_at,
        COUNT(cle.contact_id) as contact_count
      FROM contact_lists cl
      LEFT JOIN contact_list_entries cle ON cl.id = cle.contact_list_id
      GROUP BY cl.id
      ORDER BY cl.created_at DESC
    `;
    const result = await db.execute(query);
    const lists = result.rows;
    
    return res.json({
      message: 'Successfully fetched contact lists',
      lists,
      count: lists.length
    });
  } catch (error) {
    console.error('Error fetching contact lists:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch contact lists',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;