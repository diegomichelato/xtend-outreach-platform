/**
 * Scheduled Email Processor
 * ------------------------
 * Service for processing and sending scheduled emails
 */

import { db } from '../db';
import { eq, lte, and, isNull, asc } from 'drizzle-orm';
import { emails } from '@shared/schema';
import { sendEmail } from './emailService';
import { storage } from '../storage';

/**
 * Processes scheduled emails that are due to be sent
 * @returns Object with count of processed emails
 */
export async function processScheduledEmails() {
  const now = new Date();
  console.log(`Processing scheduled emails due before: ${now.toISOString()}`);
  
  try {
    // Find emails that are scheduled for now or earlier and haven't been sent
    const dueEmails = await db.select()
      .from(emails)
      .where(
        and(
          eq(emails.status, 'scheduled'),
          lte(emails.scheduledAt, now),
          isNull(emails.sentAt)
        )
      )
      .orderBy(asc(emails.scheduledAt));
    
    console.log(`Found ${dueEmails.length} due emails that need to be sent`);
    
    let sentCount = 0;
    let failedCount = 0;
    
    // Process each email
    for (const email of dueEmails) {
      console.log(`Processing email ID: ${email.id}, scheduled for: ${email.scheduledAt?.toISOString()}`);
      
      try {
        // Get related data
        const [contact, campaign] = await Promise.all([
          email.contactId ? storage.getContact(email.contactId) : null,
          email.campaignId ? storage.getCampaign(email.campaignId) : null
        ]);
        
        if (!contact) {
          console.error(`Contact not found for email ID: ${email.id}`);
          await markEmailFailed(email.id, 'Contact not found');
          failedCount++;
          continue;
        }
        
        // Send the email
        const result = await sendEmail(
          email.emailAccountId || 0, // Ensure we don't pass null
          {
            to: contact.email,
            subject: email.subject,
            html: email.body,
            text: '', // Plain text version not stored separately
            campaignId: email.campaignId || undefined,
            contactId: email.contactId || undefined,
            // Extended metadata - access inside email service
            _emailId: email.id
          }
        );
        
        if (result.success) {
          console.log(`Successfully sent email ID: ${email.id} to ${contact.email}`);
          sentCount++;
          
          // Always update the email status to be sure
          await db.update(emails)
            .set({
              status: 'sent',
              sentAt: new Date(),
              messageId: result.messageId || undefined
            })
            .where(eq(emails.id, email.id));
        } else {
          console.error(`Failed to send email ID: ${email.id}: ${result.error}`);
          await markEmailFailed(email.id, result.error || 'Unknown error');
          failedCount++;
        }
      } catch (error) {
        console.error(`Error processing email ID: ${email.id}:`, error);
        await markEmailFailed(email.id, error instanceof Error ? error.message : 'Unknown error');
        failedCount++;
      }
      
      // Add a small delay between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`Completed processing scheduled emails. Sent: ${sentCount}, Failed: ${failedCount}`);
    
    return {
      processed: dueEmails.length,
      sent: sentCount,
      failed: failedCount
    };
  } catch (error) {
    console.error('Error in processScheduledEmails:', error);
    throw error;
  }
}

/**
 * Marks an email as failed with the given reason
 */
async function markEmailFailed(emailId: number, reason: string) {
  await db.update(emails)
    .set({
      status: 'failed',
      deliveryStatus: 'failed',
      bounceReason: reason.substring(0, 255) // Truncate to fit in database field
    })
    .where(eq(emails.id, emailId));
}