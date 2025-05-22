import express from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { sendEmailFromCreator } from '../services/emailService';
import { generateEmailContent, generateCustomContent } from '../services/openai';
import { InsertOutreachLog, InsertContactNote } from '@shared/schema';

const router = express.Router();

// Get activity logs for a contact
router.get('/activity/:contactId', async (req, res) => {
  try {
    const contactId = parseInt(req.params.contactId);
    
    if (isNaN(contactId)) {
      return res.status(400).json({ error: 'Invalid contact ID' });
    }
    
    // Check if contact exists
    const contact = await storage.getContact(contactId);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    // Get outreach logs for the contact
    const logs = await storage.getOutreachLogsByContactId(contactId);
    
    // Get contact notes for the contact
    const notes = await storage.getContactNotesByContactId(contactId);
    
    // Combine and sort by date (most recent first)
    const activity = [
      ...logs.map(log => ({
        type: 'log',
        date: new Date(log.sentAt),
        data: log
      })),
      ...notes.map(note => ({
        type: 'note',
        date: note.createdAt ? new Date(note.createdAt) : new Date(),
        data: note
      }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime());
    
    res.json({ activity });
  } catch (error) {
    console.error('Error fetching contact activity:', error);
    res.status(500).json({ error: 'Failed to fetch contact activity' });
  }
});

// Get outreach metrics
router.get('/metrics', async (req, res) => {
  try {
    // Get total emails sent
    const allLogs = await storage.getAllOutreachLogs();
    const emailLogs = allLogs.filter(log => log.channel === 'email');
    
    // Get emails sent in the last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
    const recentEmailLogs = emailLogs.filter(log => new Date(log.sentAt) >= sevenDaysAgo);
    
    const metrics = {
      totalEmails: emailLogs.length,
      recentEmails: recentEmailLogs.length,
      totalActivities: allLogs.length,
      // Add more metrics as needed
    };
    
    res.json({ metrics });
  } catch (error) {
    console.error('Error fetching outreach metrics:', error);
    res.status(500).json({ error: 'Failed to fetch outreach metrics' });
  }
});

// Send a one-off email to a contact
router.post('/send-email', async (req, res) => {
  try {
    const schema = z.object({
      contactId: z.number(),
      fromEmail: z.string().email(),
      subject: z.string().min(1),
      body: z.string().min(1)
    });
    
    const data = schema.parse(req.body);
    
    // Get the contact
    const contact = await storage.getContact(data.contactId);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    // Get the email account
    const emailAccounts = await storage.getAllEmailAccounts();
    const emailAccount = emailAccounts.find(account => account.email === data.fromEmail);
    
    if (!emailAccount) {
      return res.status(404).json({ error: 'Email account not found' });
    }
    
    // Replace template variables
    const personalizedBody = data.body
      .replace(/{{firstName}}/g, contact.firstName || '')
      .replace(/{{lastName}}/g, contact.lastName || '')
      .replace(/{{company}}/g, contact.company || '')
      .replace(/{{role}}/g, contact.role || '');
    
    const personalizedSubject = data.subject
      .replace(/{{firstName}}/g, contact.firstName || '')
      .replace(/{{lastName}}/g, contact.lastName || '')
      .replace(/{{company}}/g, contact.company || '')
      .replace(/{{role}}/g, contact.role || '');
    
    let sendResult;
    
    // For simplicity, let's use direct SMTP to avoid Smartlead API issues
    // We'll still log the attempt for tracking purposes
    console.log(`Using direct SMTP for outreach email to ${contact.email}`);
    
    // Send via direct SMTP
    const result = await sendEmailFromCreator(
      data.fromEmail, // We pass the fromEmail string as the first parameter
      {
        from: {
          name: emailAccount.name,
          address: data.fromEmail
        },
        to: contact.email,
        subject: personalizedSubject,
        text: personalizedBody.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        html: personalizedBody
      }
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to send email');
    }
    
    sendResult = { success: true, provider: 'smtp', response: result };
    
    // Log the email send attempt
    const outreachLog = await storage.createOutreachLog({
      contactId: data.contactId,
      userId: null, // Would be set from authenticated user in a real app
      sentAt: new Date(),
      channel: 'email',
      emailSubject: personalizedSubject,
      emailBody: personalizedBody,
      outcome: 'sent'
    } as InsertOutreachLog);
    
    // Update the contact's lastContacted field
    await storage.updateContact(data.contactId, {
      lastContacted: new Date()
    });
    
    res.json({
      success: true,
      log: outreachLog,
      sendResult
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to send email'
    });
  }
});

// Add a note to a contact
router.post('/add-note', async (req, res) => {
  try {
    const schema = z.object({
      contactId: z.number(),
      noteText: z.string().min(1)
    });
    
    const data = schema.parse(req.body);
    
    // Check if contact exists
    const contact = await storage.getContact(data.contactId);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    // Create the note
    const note = await storage.createContactNote({
      contactId: data.contactId,
      userId: null, // Would be set from authenticated user in a real app
      noteText: data.noteText
    } as InsertContactNote);
    
    res.json({
      success: true,
      note
    });
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to add note'
    });
  }
});

// Add a tag to a contact
router.post('/add-tag', async (req, res) => {
  try {
    const schema = z.object({
      contactId: z.number(),
      tag: z.string().min(1)
    });
    
    const data = schema.parse(req.body);
    
    // Check if contact exists
    const contact = await storage.getContact(data.contactId);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    // Add the tag if it doesn't already exist
    const tags = [...(contact.tags || [])];
    if (!tags.includes(data.tag)) {
      tags.push(data.tag);
    }
    
    // Update the contact
    const updatedContact = await storage.updateContact(data.contactId, { tags });
    
    // Log the tag update as an outreach activity
    await storage.createOutreachLog({
      contactId: data.contactId,
      userId: null, // Would be set from authenticated user in a real app
      sentAt: new Date(),
      channel: 'tag_update',
      emailSubject: null,
      emailBody: `Added tag: ${data.tag}`,
      outcome: 'success'
    } as InsertOutreachLog);
    
    res.json({
      success: true,
      contact: updatedContact
    });
  } catch (error) {
    console.error('Error adding tag:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to add tag'
    });
  }
});

// Update contact status
router.post('/update-status', async (req, res) => {
  try {
    const schema = z.object({
      contactId: z.number(),
      status: z.string().min(1)
    });
    
    const data = schema.parse(req.body);
    
    // Check if contact exists
    const contact = await storage.getContact(data.contactId);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    // Get the old status for logging
    const oldStatus = contact.status;
    
    // Update the contact status
    const updatedContact = await storage.updateContact(data.contactId, { status: data.status });
    
    // Log the status change as an outreach activity
    await storage.createOutreachLog({
      contactId: data.contactId,
      userId: null, // Would be set from authenticated user in a real app
      sentAt: new Date(),
      channel: 'status_change',
      emailSubject: null,
      emailBody: `Status changed from ${oldStatus} to ${data.status}`,
      outcome: 'success'
    } as InsertOutreachLog);
    
    res.json({
      success: true,
      contact: updatedContact
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update status'
    });
  }
});

// Generate email content with AI
router.post('/generate-email', async (req, res) => {
  try {
    const schema = z.object({
      contactId: z.number(),
      senderName: z.string().min(1),
      purpose: z.string().min(1), // cold outreach, follow-up, introduction, etc.
      tone: z.string().optional(), // formal, casual, friendly, professional, etc.
      context: z.string().optional(), // any additional context to inform the AI
    });
    
    const data = schema.parse(req.body);
    
    // Get the contact
    const contact = await storage.getContact(data.contactId);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    // Generate the email content using OpenAI
    const generatedContent = await generateEmailContent({
      recipientName: `${contact.firstName} ${contact.lastName || ''}`.trim(),
      recipientCompany: contact.company,
      recipientRole: contact.role || undefined,
      senderName: data.senderName,
      purpose: data.purpose,
      tone: data.tone,
      context: data.context
    });
    
    res.json({
      success: true,
      emailContent: generatedContent
    });
  } catch (error) {
    console.error('Error generating email content:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate email content'
    });
  }
});

// Generate content with a custom prompt
router.post('/generate-custom', async (req, res) => {
  try {
    const schema = z.object({
      contactId: z.number(),
      customPrompt: z.string().min(10),
      temperature: z.number().min(0).max(1).optional(),
    });
    
    const data = schema.parse(req.body);
    
    // Get the contact for context
    const contact = await storage.getContact(data.contactId);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    // Generate content using the custom prompt
    try {
      const contactInfo = {
        firstName: contact.firstName,
        lastName: contact.lastName || '',
        company: contact.company,
        role: contact.role || '',
        industry: contact.industry,
        email: contact.email,
      };
      
      const generatedContent = await generateCustomContent(data.customPrompt, contactInfo, data.temperature);
      
      res.json({
        success: true,
        emailContent: {
          subject: generatedContent.subject || `Regarding ${contact.company}`,
          body: generatedContent.body || generatedContent.content || ''
        }
      });
    } catch (aiError) {
      console.error('AI content generation error:', aiError);
      throw new Error(`AI service error: ${aiError instanceof Error ? aiError.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error generating custom content:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate custom content',
      success: false
    });
  }
});

export default router;