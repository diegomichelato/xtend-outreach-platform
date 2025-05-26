import express from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { sendEmailFromCreator } from '../services/emailService';
import { generateEmailContent, generateCustomContent } from '../services/openai';
import { InsertOutreachLog, InsertContactNote } from '@shared/schema';
import { Router } from "express";
import { db } from "../db";
import { validateRequest } from "../middleware/validateRequest";
import { isAuthenticated } from "../middleware/auth";
import { createBullQueue } from "../queues";

const router = express.Router();

// Create email queue for processing
const emailQueue = createBullQueue("email-queue");

// Schema definitions
const SendEmailSchema = z.object({
  fromAccount: z.string(),
  subject: z.string(),
  body: z.string(),
  scheduledTime: z.string().optional(),
  recipients: z.array(z.string()),
});

const SequenceSchema = z.object({
  name: z.string(),
  steps: z.array(
    z.object({
      id: z.string(),
      subject: z.string(),
      body: z.string(),
      delay: z.number(),
      delayUnit: z.enum(["hours", "days"]),
    })
  ),
});

const DomainCheckSchema = z.object({
  domain: z.string(),
});

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

// Routes
router.post(
  "/send-email",
  isAuthenticated,
  validateRequest(SendEmailSchema),
  async (req, res) => {
    try {
      const { fromAccount, subject, body, scheduledTime, recipients } = req.body;

      // Add email to queue
      await emailQueue.add(
        "send-email",
        {
          fromAccount,
          subject,
          body,
          recipients,
          userId: req.user.id,
        },
        {
          delay: scheduledTime ? new Date(scheduledTime).getTime() - Date.now() : 0,
        }
      );

      // Store in database
      await db.emailCampaign.create({
        data: {
          userId: req.user.id,
          fromAccount,
          subject,
          body,
          scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
          status: "scheduled",
        },
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to send email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  }
);

router.post(
  "/sequences",
  isAuthenticated,
  validateRequest(SequenceSchema),
  async (req, res) => {
    try {
      const { name, steps } = req.body;

      // Store sequence in database
      const sequence = await db.emailSequence.create({
        data: {
          userId: req.user.id,
          name,
          steps: {
            create: steps.map((step) => ({
              subject: step.subject,
              body: step.body,
              delay: step.delay,
              delayUnit: step.delayUnit,
            })),
          },
        },
        include: {
          steps: true,
        },
      });

      res.json(sequence);
    } catch (error) {
      console.error("Failed to create sequence:", error);
      res.status(500).json({ error: "Failed to create sequence" });
    }
  }
);

router.get("/sequences", isAuthenticated, async (req, res) => {
  try {
    const sequences = await db.emailSequence.findMany({
      where: {
        userId: req.user.id,
      },
      include: {
        steps: true,
      },
    });

    res.json(sequences);
  } catch (error) {
    console.error("Failed to fetch sequences:", error);
    res.status(500).json({ error: "Failed to fetch sequences" });
  }
});

router.post(
  "/check-domain",
  isAuthenticated,
  validateRequest(DomainCheckSchema),
  async (req, res) => {
    try {
      const { domain } = req.body;

      // Implement domain health checks here
      // This would typically involve:
      // 1. SPF record check
      // 2. DKIM verification
      // 3. DMARC policy check
      // 4. MX records verification
      // 5. Reverse DNS lookup
      // 6. Spam score calculation

      // Mock response for now
      res.json({
        health: {
          spf: {
            status: "success",
            message: "SPF record is properly configured",
          },
          dkim: {
            status: "warning",
            message: "DKIM signature not found for all sending domains",
          },
          dmarc: {
            status: "success",
            message: "DMARC policy is properly configured",
          },
          mxRecords: {
            status: "success",
            message: "MX records are properly configured",
          },
          reverseDNS: {
            status: "error",
            message: "Reverse DNS lookup failed for some IP addresses",
          },
        },
        spamScore: 3.5,
      });
    } catch (error) {
      console.error("Failed to check domain:", error);
      res.status(500).json({ error: "Failed to check domain" });
    }
  }
);

router.get("/metrics", isAuthenticated, async (req, res) => {
  try {
    const { timeRange = "30d" } = req.query;

    // Implement metrics calculation here
    // This would typically involve:
    // 1. Email send counts
    // 2. Open rates
    // 3. Click rates
    // 4. Reply rates
    // 5. Bounce rates
    // 6. Time-based analytics

    // Mock response for now
    res.json({
      overview: [
        {
          title: "Sent",
          value: "2,543",
          change: 12.5,
        },
        {
          title: "Opens",
          value: "1,872",
          change: 8.2,
        },
        {
          title: "Clicks",
          value: "432",
          change: -2.1,
        },
        {
          title: "Replies",
          value: "187",
          change: 15.3,
        },
        {
          title: "Bounces",
          value: "23",
          change: -5.4,
        },
      ],
      timeData: [
        { date: "2024-01", sent: 450, opens: 380, replies: 42 },
        { date: "2024-02", sent: 520, opens: 425, replies: 55 },
        { date: "2024-03", sent: 610, opens: 490, replies: 48 },
        { date: "2024-04", sent: 680, opens: 545, replies: 62 },
      ],
    });
  } catch (error) {
    console.error("Failed to fetch metrics:", error);
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

export default router;