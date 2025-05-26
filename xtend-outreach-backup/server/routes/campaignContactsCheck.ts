/**
 * Campaign Contacts Check Script
 * ------------------------------
 * This script checks if all contacts from a list were properly
 * associated with the campaign emails when it was launched.
 */

import { Router, Request, Response } from 'express';
import { storage } from '../storage';

const router = Router();

// Check if all contacts in a list have corresponding emails in a campaign
router.get('/campaign-contacts-check/:campaignId', async (req: Request, res: Response) => {
  try {
    const campaignId = parseInt(req.params.campaignId);
    
    if (isNaN(campaignId)) {
      return res.status(400).json({ message: 'Invalid campaign ID' });
    }
    
    // Get the campaign
    const campaign = await storage.getCampaign(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    
    // Get the contact list
    if (campaign.contactListId === null) {
      return res.status(404).json({ message: 'Campaign has no associated contact list' });
    }
    
    const contactList = await storage.getContactList(campaign.contactListId);
    if (!contactList) {
      return res.status(404).json({ message: 'Contact list not found' });
    }
    
    // Get all contacts from the list
    const contacts = await storage.getContactsInList(campaign.contactListId);
    if (!contacts || contacts.length === 0) {
      return res.status(400).json({ message: 'No contacts found in the contact list' });
    }
    
    // Get all emails for the campaign
    const emails = await storage.getEmailsByCampaign(campaignId);
    
    // Group emails by contact ID to handle sequence emails
    const emailsByContact = new Map();
    for (const email of emails) {
      if (!emailsByContact.has(email.contactId)) {
        emailsByContact.set(email.contactId, []);
      }
      emailsByContact.get(email.contactId).push(email);
    }
    
    // Check which contacts have emails
    const contactResults = contacts.map(contact => {
      const contactEmails = emailsByContact.get(contact.id) || [];
      return {
        contactId: contact.id,
        contactEmail: contact.email,
        hasEmails: contactEmails.length > 0,
        emailCount: contactEmails.length,
        expectedEmailCount: campaign.sequenceCount,
        complete: contactEmails.length === campaign.sequenceCount
      };
    });
    
    // Calculate summary stats
    const totalContacts = contacts.length;
    const contactsWithEmails = contactResults.filter(r => r.hasEmails).length;
    const contactsWithAllEmails = contactResults.filter(r => r.complete).length;
    
    return res.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        sequenceCount: campaign.sequenceCount
      },
      contactList: {
        id: contactList.id,
        name: contactList.name
      },
      summary: {
        totalContacts,
        contactsWithEmails,
        contactsWithAllEmails,
        percentComplete: totalContacts > 0 ? Math.round((contactsWithAllEmails / totalContacts) * 100) : 0
      },
      contactDetails: contactResults
    });
  } catch (error) {
    console.error('Error checking campaign contacts:', error);
    return res.status(500).json({
      message: 'Error checking campaign contacts',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;