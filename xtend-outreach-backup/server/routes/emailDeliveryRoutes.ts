import { Router, Request, Response } from 'express';
import { db } from '../db';
import { 
  domainVerifications, 
  emailAccounts, 
  emailDeliveryEvents, 
  spamWords,
  emails
} from '@shared/schema';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { domainVerificationService } from '../services/domainVerificationService';
import { contentQualityService } from '../services/contentQualityService';
import { emailDeliveryService } from '../services/emailDeliveryService';
import { enhancedEmailService } from '../services/enhancedEmailService';

const router = Router();

/**
 * Get email deliverability settings and status
 */
router.get('/delivery-settings', async (_req: Request, res: Response) => {
  try {
    // Get all email accounts with their deliverability metrics
    const accountMetrics = await emailDeliveryService.getAccountHealthMetrics();
    
    // Get all domain verifications
    const domains = await db
      .select()
      .from(domainVerifications)
      .orderBy(desc(domainVerifications.updatedAt));
    
    // Calculate overall system metrics
    const overallMetrics = {
      accounts: {
        total: accountMetrics.length,
        active: accountMetrics.filter(a => a.status === 'active').length,
        paused: accountMetrics.filter(a => a.status === 'paused').length,
        suspended: accountMetrics.filter(a => a.status === 'suspended').length,
        healthScore: accountMetrics.length > 0 ? 
          Math.round(accountMetrics.reduce((sum, a) => sum + a.healthScore, 0) / accountMetrics.length) : 0
      },
      domains: {
        total: domains.length,
        verified: domains.filter(d => 
          d.spfStatus === 'valid' && 
          d.dkimStatus === 'valid' && 
          d.dmarcStatus === 'valid'
        ).length,
        partiallyVerified: domains.filter(d => 
          (d.spfStatus === 'valid' || d.dkimStatus === 'valid' || d.dmarcStatus === 'valid') &&
          (d.spfStatus !== 'valid' || d.dkimStatus !== 'valid' || d.dmarcStatus !== 'valid')
        ).length,
        issues: domains.filter(d => 
          d.spfStatus === 'invalid' || 
          d.dkimStatus === 'invalid' || 
          d.dmarcStatus === 'invalid'
        ).length
      }
    };
    
    res.json({
      accounts: accountMetrics,
      domains,
      overallMetrics
    });
  } catch (error) {
    console.error('Error fetching email deliverability settings:', error);
    res.status(500).json({ error: 'Failed to fetch email deliverability settings' });
  }
});

/**
 * Check domain authentication (SPF, DKIM, DMARC)
 */
router.post('/verify-domain', async (req: Request, res: Response) => {
  try {
    const { domain } = req.body;
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }
    
    const result = await domainVerificationService.verifyDomain(domain);
    res.json(result);
  } catch (error) {
    console.error('Error verifying domain:', error);
    res.status(500).json({ error: 'Failed to verify domain' });
  }
});

/**
 * Check domain from email address
 */
router.post('/verify-email-domain', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }
    
    const domain = email.split('@')[1];
    const result = await domainVerificationService.verifyDomain(domain);
    res.json(result);
  } catch (error) {
    console.error('Error verifying email domain:', error);
    res.status(500).json({ error: 'Failed to verify email domain' });
  }
});

/**
 * Check email content quality
 */
router.post('/check-content', async (req: Request, res: Response) => {
  try {
    const { subject, body } = req.body;
    
    if (!subject || !body) {
      return res.status(400).json({ error: 'Subject and body are required' });
    }
    
    const result = await contentQualityService.checkEmailContent(subject, body);
    res.json(result);
  } catch (error) {
    console.error('Error checking email content:', error);
    res.status(500).json({ error: 'Failed to check email content' });
  }
});

/**
 * Test email send with deliverability checks
 */
router.post('/test-send', async (req: Request, res: Response) => {
  try {
    const { to, subject, html, from, fromName, emailAccountId } = req.body;
    
    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'To, subject, and html are required' });
    }
    
    // Check content quality first
    const contentCheck = await contentQualityService.checkEmailContent(subject, html);
    
    // Send test email
    const result = await enhancedEmailService.sendEmail({
      to,
      subject,
      html,
      from,
      fromName,
      emailAccountId,
      isTest: true,
      skipRateLimits: true, // Skip rate limits for test sends
      skipContentCheck: true // Skip duplicate content check since we already did it
    });
    
    // Return combined results
    res.json({
      ...result,
      contentCheck
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

/**
 * Get email account sending limits
 */
router.get('/sending-limits/:accountId', async (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.accountId);
    
    if (isNaN(accountId)) {
      return res.status(400).json({ error: 'Valid account ID is required' });
    }
    
    const limits = await emailDeliveryService.getSendingLimits(accountId);
    
    if (!limits) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    res.json(limits);
  } catch (error) {
    console.error('Error fetching sending limits:', error);
    res.status(500).json({ error: 'Failed to fetch sending limits' });
  }
});

/**
 * Get delivery events for an email
 */
router.get('/events/:emailId', async (req: Request, res: Response) => {
  try {
    const emailId = parseInt(req.params.emailId);
    
    if (isNaN(emailId)) {
      return res.status(400).json({ error: 'Valid email ID is required' });
    }
    
    const events = await db
      .select()
      .from(emailDeliveryEvents)
      .where(eq(emailDeliveryEvents.emailId, emailId))
      .orderBy(desc(emailDeliveryEvents.timestamp));
    
    res.json(events);
  } catch (error) {
    console.error('Error fetching email events:', error);
    res.status(500).json({ error: 'Failed to fetch email events' });
  }
});

/**
 * Get spam word dictionary
 */
router.get('/spam-words', async (_req: Request, res: Response) => {
  try {
    const words = await db
      .select()
      .from(spamWords)
      .where(eq(spamWords.active, true))
      .orderBy(desc(spamWords.score));
    
    res.json(words);
  } catch (error) {
    console.error('Error fetching spam words:', error);
    res.status(500).json({ error: 'Failed to fetch spam words' });
  }
});

/**
 * Add a new spam word
 */
router.post('/spam-words', async (req: Request, res: Response) => {
  try {
    const { word, category, score } = req.body;
    
    if (!word || !category || typeof score !== 'number') {
      return res.status(400).json({ error: 'Word, category, and score are required' });
    }
    
    // Check if word already exists
    const [existing] = await db
      .select()
      .from(spamWords)
      .where(eq(spamWords.word, word));
    
    if (existing) {
      return res.status(409).json({ error: 'Spam word already exists' });
    }
    
    // Insert new word
    const [newWord] = await db
      .insert(spamWords)
      .values({
        word,
        category,
        score,
        active: true
      })
      .returning();
    
    res.status(201).json(newWord);
  } catch (error) {
    console.error('Error adding spam word:', error);
    res.status(500).json({ error: 'Failed to add spam word' });
  }
});

/**
 * Toggle a spam word's active status
 */
router.patch('/spam-words/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { active } = req.body;
    
    if (isNaN(id) || typeof active !== 'boolean') {
      return res.status(400).json({ error: 'Valid ID and active status are required' });
    }
    
    const [updated] = await db
      .update(spamWords)
      .set({ active })
      .where(eq(spamWords.id, id))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ error: 'Spam word not found' });
    }
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating spam word:', error);
    res.status(500).json({ error: 'Failed to update spam word' });
  }
});

/**
 * Manual webhook receiver for email events (bounces, complaints, etc.)
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { event, messageId, recipient, timestamp, metadata } = req.body;
    
    if (!event || !messageId) {
      return res.status(400).json({ error: 'Event type and messageId are required' });
    }
    
    // Find the email by messageId
    const [emailRecord] = await db
      .select()
      .from(emails)
      .where(eq(emails.messageId, messageId));
    
    // Find the account by recipient address (if provided)
    let emailAccountId = emailRecord?.emailAccountId;
    
    if (!emailAccountId && recipient) {
      const [account] = await db
        .select()
        .from(emailAccounts)
        .where(eq(emailAccounts.email, recipient));
      
      if (account) {
        emailAccountId = account.id;
      }
    }
    
    if (!emailAccountId) {
      return res.status(404).json({ error: 'Cannot find associated email account' });
    }
    
    // Record the delivery event
    const eventRecord = await emailDeliveryService.recordDeliveryEvent({
      emailId: emailRecord?.id,
      emailAccountId,
      eventType: event,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      messageId,
      metadata: metadata || {},
      eventSource: 'webhook'
    });
    
    res.json({
      success: true,
      event: eventRecord
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

export default router;