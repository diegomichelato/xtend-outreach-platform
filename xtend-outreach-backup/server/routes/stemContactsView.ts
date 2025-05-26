/**
 * STEM Contacts View Route
 * This route provides access to STEM list contacts.
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';

const router = Router();

// Get STEM contacts (simplified approach to avoid parameter issues)
router.get('/', async (req: Request, res: Response) => {
  try {
    // Directly use the list ID for STEM contacts
    const stemListId = 5; // ID of the STEM list
    
    // Get basic information from the list
    const listResult = await db.execute(`
      SELECT name, description
      FROM contact_lists
      WHERE id = ${stemListId}
    `);
    const listInfo = listResult.rows[0] || { name: 'STEM List', description: 'STEM Contacts' };
    
    // Get the contacts with a simple JOIN query - including all columns needed for STEM list
    const query = `
      SELECT 
        c.id, 
        c.first_name, 
        c.last_name, 
        c.email, 
        c.business_email,
        c.phone,
        c.company, 
        c.industry,
        c.niche,
        c.role,
        c.country, 
        c.website,
        c.linkedin,
        c.business_linkedin,
        c.status,
        c.tags,
        c.notes,
        c.created_at
      FROM contacts c
      JOIN contact_list_entries cle ON c.id = cle.contact_id
      WHERE cle.contact_list_id = ${stemListId}
      ORDER BY c.created_at DESC
      LIMIT 200
    `;
    
    const result = await db.execute(query);
    const contacts = result.rows;
    
    console.log(`Fetched ${contacts.length} STEM contacts`);
    
    return res.json({
      message: 'Successfully fetched STEM contacts',
      listName: listInfo.name,
      listDescription: listInfo.description,
      contacts,
      count: contacts.length
    });
  } catch (error) {
    console.error('Error fetching STEM contacts:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch STEM contacts',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;