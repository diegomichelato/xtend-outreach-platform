import { Router, Request, Response } from 'express';
import { db } from '../db';
import { 
  contacts, 
  creators, 
  emailAccounts, 
  emails, 
  outreachLogs 
} from '@shared/schema';
import { and, desc, eq } from 'drizzle-orm';
import { enhancedEmailService } from '../services/enhancedEmailService';
import { contentQualityService } from '../services/contentQualityService';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * Send a single email with enhanced deliverability features
 */
router.post('/send-enhanced', async (req: Request, res: Response) => {
  try {
    const { 
      to, 
      subject, 
      html, 
      from, 
      fromName, 
      emailAccountId, 
      creatorId, 
      contactId, 
      campaignId,
      skipContentCheck,
      skipRateLimits 
    } = req.body;
    
    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'To, subject, and html are required' });
    }
    
    // Get specific email account if provided
    let emailAccount = null;
    
    if (emailAccountId) {
      const [account] = await db
        .select()
        .from(emailAccounts)
        .where(eq(emailAccounts.id, emailAccountId));
      
      emailAccount = account;
    } else if (creatorId) {
      // Find creator and their linked email accounts
      const [creator] = await db
        .select()
        .from(creators)
        .where(eq(creators.id, creatorId));
      
      if (creator) {
        // Use the specified "from" email or find the primary email account for this creator
        if (from) {
          const [account] = await db
            .select({
              id: emailAccounts.id,
              email: emailAccounts.email,
              name: emailAccounts.name
            })
            .from(emailAccounts)
            .where(eq(emailAccounts.email, from));
          
          emailAccount = account;
        } else {
          // Complex query to find creator's primary email account
          // In a real application, you'd want to optimize this with a proper JOIN
          const creatorEmails = await db.query.creatorEmailAccounts.findMany({
            where: eq(creators.id, creatorId),
            with: {
              emailAccount: true
            }
          });
          
          // Find primary email or use the first one
          const primaryEmail = creatorEmails.find(ce => ce.isPrimary)?.emailAccount ||
                               creatorEmails[0]?.emailAccount;
          
          if (primaryEmail) {
            emailAccount = primaryEmail;
          }
        }
      }
    }
    
    // If we couldn't find a specific account, the service will use a default one
    
    // Get or create contact record if we have contactId
    let contact = null;
    if (contactId) {
      const [contactRecord] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, contactId));
      
      contact = contactRecord;
    }
    
    // Create an email record
    const messageId = `<${uuidv4()}@${emailAccount?.email?.split('@')[1] || 'xtendcreators.com'}>`;
    
    const [emailRecord] = await db
      .insert(emails)
      .values({
        campaignId: campaignId || null,
        contactId: contactId || null,
        emailAccountId: emailAccount?.id || null,
        sequence: 1,
        subject,
        body: html,
        status: 'draft',
        scheduledAt: new Date(),
        messageId
      })
      .returning();
    
    // Check content quality (unless skipped)
    const contentCheck = skipContentCheck ? null : 
      await contentQualityService.checkEmailContent(subject, html);
    
    if (contentCheck && contentCheck.hasCriticalIssues) {
      // If there are critical issues, update the email record and return error
      await db
        .update(emails)
        .set({
          status: 'rejected',
          deliveryStatus: 'rejected',
          spamScore: contentCheck.score,
          spamCheckDetails: contentCheck
        })
        .where(eq(emails.id, emailRecord.id));
      
      return res.status(400).json({
        success: false,
        error: 'Email content has critical deliverability issues that must be fixed',
        contentCheck,
        emailId: emailRecord.id
      });
    }
    
    // If content passed checks or checks were skipped, send the email
    const result = await enhancedEmailService.sendEmail({
      to,
      subject,
      html,
      from: emailAccount?.email,
      fromName: fromName || emailAccount?.name,
      emailAccountId: emailAccount?.id,
      emailId: emailRecord.id,
      campaignId,
      contactId,
      messageId,
      skipContentCheck: true, // Skip duplicate check
      skipRateLimits
    });
    
    // Create an outreach log entry
    if (contact && result.success) {
      await db
        .insert(outreachLogs)
        .values({
          contactId: contact.id,
          userId: null, // We'd normally get this from the auth context
          emailSubject: subject,
          emailBody: html,
          channel: 'email',
          sentAt: new Date(),
          outcome: null // We don't know the outcome yet
        });
    }
    
    // Return the send result
    res.json({
      ...result,
      emailId: emailRecord.id,
      contentCheck
    });
  } catch (error) {
    console.error('Error sending enhanced email:', error);
    res.status(500).json({ error: 'Failed to send enhanced email: ' + error.message });
  }
});

/**
 * Get sender accounts with deliverability metrics
 */
router.get('/senders', async (_req: Request, res: Response) => {
  try {
    const accounts = await db
      .select({
        id: emailAccounts.id,
        email: emailAccounts.email,
        name: emailAccounts.name,
        status: emailAccounts.status,
        provider: emailAccounts.provider,
        dailyLimit: emailAccounts.dailyLimit,
        hourlyLimit: emailAccounts.hourlyLimit,
        warmupEnabled: emailAccounts.warmupEnabled,
        warmupInProgress: emailAccounts.warmupInProgress,
        domainAuthenticated: emailAccounts.domainAuthenticated,
        bounceRate: emailAccounts.bounceRate,
        complaintRate: emailAccounts.complaintRate,
        openRate: emailAccounts.openRate,
        clickRate: emailAccounts.clickRate,
        replyRate: emailAccounts.replyRate,
        lastHealthCheck: emailAccounts.lastHealthCheck
      })
      .from(emailAccounts)
      .orderBy(desc(emailAccounts.status));
    
    // Calculate health score for each account
    const accountsWithHealth = accounts.map(account => {
      let healthScore = 100;
      
      // Deduct points for issues
      if (account.bounceRate > 5) healthScore -= 30;
      else if (account.bounceRate > 2) healthScore -= 15;
      
      if (account.complaintRate > 0.5) healthScore -= 40;
      else if (account.complaintRate > 0.1) healthScore -= 20;
      
      if (!account.domainAuthenticated) healthScore -= 25;
      
      // Status-based adjustment
      if (account.status === 'paused') healthScore = Math.min(healthScore, 60);
      if (account.status === 'suspended') healthScore = Math.min(healthScore, 20);
      
      return {
        ...account,
        healthScore: Math.max(0, Math.min(100, healthScore)),
        healthStatus: healthScore > 80 ? 'good' : 
                     healthScore > 50 ? 'fair' : 
                     healthScore > 30 ? 'poor' : 'critical'
      };
    });
    
    res.json(accountsWithHealth);
  } catch (error) {
    console.error('Error fetching sender accounts:', error);
    res.status(500).json({ error: 'Failed to fetch sender accounts' });
  }
});

/**
 * Get recent email delivery events
 */
router.get('/recent-events', async (_req: Request, res: Response) => {
  try {
    // Complex query to get recent events with email and account details
    // In a real app, you'd optimize this with proper JOINs
    const emailEvents = await db.query.emailDeliveryEvents.findMany({
      orderBy: [desc(emails.sentAt)],
      limit: 50,
      with: {
        email: {
          with: {
            contact: true
          }
        },
        emailAccount: true
      }
    });
    
    res.json(emailEvents);
  } catch (error) {
    console.error('Error fetching recent events:', error);
    res.status(500).json({ error: 'Failed to fetch recent events' });
  }
});

export default router;