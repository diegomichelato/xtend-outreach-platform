/**
 * Enhanced Email Service
 * --------------------
 * Service for enhancing emails with tracking capabilities and privacy controls
 */

import crypto from 'crypto';
import { db } from '../db';
import { emailLogs, emails, type Email, type InsertEmailLog } from '../../shared/schema';
import { JSDOM } from 'jsdom';
import { sendEmail as baseEmailSender } from './emailService';
import { truncateIPAddress, anonymizeUserAgent } from '../utils/privacy';

// Base64-encoded 1x1 transparent GIF pixel
const TRACKING_PIXEL = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// Configuration for tracking domains
interface TrackingConfig {
  enabled: boolean;
  trackingDomain: string;
  pixelPath: string;
  clickPath: string;
  unsubscribePath: string;
}

// Default tracking configuration
const defaultTrackingConfig: TrackingConfig = {
  enabled: true,
  trackingDomain: process.env.TRACKING_DOMAIN || '', // Will use current domain if not set
  pixelPath: '/t/open',
  clickPath: '/t/click',
  unsubscribePath: '/t/opt-out'
};

/**
 * Generate a unique tracking ID for an email
 * 
 * @param email Email to generate tracking ID for
 * @returns Unique tracking ID
 */
export function generateTrackingId(email: Email): string {
  const uniqueString = `${email.id}-${email.campaignId || 0}-${email.contactId || 0}-${Date.now()}-${Math.random()}`;
  return crypto.createHash('sha256').update(uniqueString).digest('hex').slice(0, 32);
}

/**
 * Create a tracking log entry for an email
 * 
 * @param email Email to log tracking for
 * @returns The created tracking log or null if creation failed
 */
export async function createTrackingLog(email: Email): Promise<any> {
  try {
    const trackingId = generateTrackingId(email);
    
    const trackingData: InsertEmailLog = {
      emailId: email.id,
      campaignId: email.campaignId,
      contactId: email.contactId,
      emailAccountId: email.emailAccountId,
      trackingId,
      messageId: email.messageId,
      subject: email.subject,
      sentAt: email.sentAt,
      openCount: 0,
      clickCount: 0,
      replyCount: 0,
      trackingOptOut: false
    };
    
    const [trackingLog] = await db.insert(emailLogs).values(trackingData).returning();
    
    return trackingLog;
  } catch (error) {
    console.error('Error creating tracking log:', error);
    return null;
  }
}

/**
 * Add tracking pixel to HTML email
 * 
 * @param html HTML content
 * @param trackingId Unique tracking ID
 * @param config Tracking configuration
 * @returns HTML with tracking pixel
 */
export function addTrackingPixel(html: string, trackingId: string, config: TrackingConfig = defaultTrackingConfig): string {
  if (!config.enabled) {
    return html;
  }
  
  const trackingDomain = config.trackingDomain || '';
  const protocol = trackingDomain.includes('localhost') ? 'http' : 'https';
  const domainPart = trackingDomain ? `${protocol}://${trackingDomain}` : '';
  const trackingUrl = `${domainPart}${config.pixelPath}/${trackingId}`;
  
  const trackingPixel = `<img src="${trackingUrl}" alt="" width="1" height="1" border="0" style="height:1px!important;width:1px!important;border-width:0!important;margin:0!important;padding:0!important;display:block;"/>`;
  
  try {
    // Use JSDOM to properly insert the tracking pixel
    const dom = new JSDOM(html);
    const { document } = dom.window;
    
    // If there's a body tag, append to body
    if (document.body) {
      const pixelElement = document.createElement('div');
      pixelElement.style.display = 'none';
      pixelElement.innerHTML = trackingPixel;
      document.body.appendChild(pixelElement);
      return dom.serialize();
    }
    
    // If no body tag (plain HTML), just append at the end
    return html + trackingPixel;
  } catch (error) {
    console.error('Error adding tracking pixel:', error);
    // Fallback method if JSDOM fails
    if (html.includes('</body>')) {
      return html.replace('</body>', `${trackingPixel}</body>`);
    }
    return html + trackingPixel;
  }
}

/**
 * Rewrite links in HTML to add click tracking
 * 
 * @param html HTML content
 * @param trackingId Unique tracking ID
 * @param config Tracking configuration
 * @returns HTML with tracking links
 */
export function rewriteLinks(html: string, trackingId: string, config: TrackingConfig = defaultTrackingConfig): string {
  if (!config.enabled) {
    return html;
  }
  
  try {
    const trackingDomain = config.trackingDomain || '';
    const protocol = trackingDomain.includes('localhost') ? 'http' : 'https';
    const domainPart = trackingDomain ? `${protocol}://${trackingDomain}` : '';
    
    // Use JSDOM to properly rewrite links
    const dom = new JSDOM(html);
    const { document } = dom.window;
    
    // Find all links
    const links = document.querySelectorAll('a');
    
    for (const link of links) {
      const href = link.getAttribute('href');
      
      // Skip if no href, or it's a mailto: or tel: or anchor link
      if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) {
        continue;
      }
      
      try {
        // Encode the URL (handling special chars)
        const encodedUrl = Buffer.from(href).toString('base64url');
        
        // Create tracking URL
        const trackingUrl = `${domainPart}${config.clickPath}/${trackingId}/${encodedUrl}`;
        
        // Update the link
        link.setAttribute('href', trackingUrl);
        
        // Optional: add data attributes for tracking
        link.setAttribute('data-tracking', 'true');
      } catch (error) {
        console.error(`Error encoding URL ${href}:`, error);
      }
    }
    
    return dom.serialize();
  } catch (error) {
    console.error('Error rewriting links:', error);
    return html;
  }
}

/**
 * Add an unsubscribe link to the email
 * 
 * @param html HTML content
 * @param trackingId Unique tracking ID
 * @param config Tracking configuration
 * @returns HTML with unsubscribe link
 */
export function addUnsubscribeLink(html: string, trackingId: string, config: TrackingConfig = defaultTrackingConfig): string {
  if (!config.enabled) {
    return html;
  }
  
  const trackingDomain = config.trackingDomain || '';
  const protocol = trackingDomain.includes('localhost') ? 'http' : 'https';
  const domainPart = trackingDomain ? `${protocol}://${trackingDomain}` : '';
  const unsubscribeUrl = `${domainPart}${config.unsubscribePath}/${trackingId}`;
  
  const unsubscribeHtml = `
    <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; color: #666; font-size: 12px; font-family: Arial, sans-serif;">
      <p>If you'd prefer to stop receiving these emails, you can 
        <a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">unsubscribe here</a>.
      </p>
      <p>We respect your privacy - view our <a href="/privacy-policy" style="color: #666; text-decoration: underline;">privacy policy</a>.</p>
    </div>
  `;
  
  try {
    // Use JSDOM to properly add the unsubscribe link
    const dom = new JSDOM(html);
    const { document } = dom.window;
    
    // If there's a body tag, append to body
    if (document.body) {
      const div = document.createElement('div');
      div.innerHTML = unsubscribeHtml;
      document.body.appendChild(div);
      return dom.serialize();
    }
    
    // If no body tag, just append at the end
    return html + unsubscribeHtml;
  } catch (error) {
    console.error('Error adding unsubscribe link:', error);
    // Fallback: just append to the end
    return html + unsubscribeHtml;
  }
}

/**
 * Add privacy notice to email
 * 
 * @param html HTML content 
 * @returns HTML with privacy notice
 */
export function addPrivacyNotice(html: string): string {
  const privacyHtml = `
    <div style="margin-top: 10px; color: #999; font-size: 10px; font-family: Arial, sans-serif;">
      <p>This email may use tracking to measure engagement. IP addresses are anonymized.</p>
    </div>
  `;
  
  try {
    // Use JSDOM to properly add the privacy notice
    const dom = new JSDOM(html);
    const { document } = dom.window;
    
    // Find the unsubscribe div we added earlier (if any)
    const unsubscribeDiv = document.querySelector('div[style*="margin-top: 20px; padding-top: 10px; border-top"]');
    
    if (unsubscribeDiv) {
      // If we found the unsubscribe div, insert before it
      const div = document.createElement('div');
      div.innerHTML = privacyHtml;
      unsubscribeDiv.insertAdjacentElement('beforebegin', div);
      return dom.serialize();
    }
    
    // If no unsubscribe div, just append to the body
    if (document.body) {
      const div = document.createElement('div');
      div.innerHTML = privacyHtml;
      document.body.appendChild(div);
      return dom.serialize();
    }
    
    // Last resort, just append to the HTML
    return html + privacyHtml;
  } catch (error) {
    console.error('Error adding privacy notice:', error);
    // Fallback: just append to the end
    return html + privacyHtml;
  }
}

/**
 * Process HTML email to add all tracking features
 * 
 * @param html Original HTML email content
 * @param email Email object
 * @param trackingLog Tracking log entry 
 * @param config Tracking configuration
 * @returns Processed HTML with tracking
 */
export async function processEmailForTracking(
  html: string,
  email: Email,
  trackingLog: any,
  config: TrackingConfig = defaultTrackingConfig
): Promise<string> {
  try {
    const trackingId = trackingLog.trackingId;
    
    let processedHtml = html;
    
    // Add tracking pixel
    processedHtml = addTrackingPixel(processedHtml, trackingId, config);
    
    // Rewrite links for click tracking
    processedHtml = rewriteLinks(processedHtml, trackingId, config);
    
    // Add unsubscribe link
    processedHtml = addUnsubscribeLink(processedHtml, trackingId, config);
    
    // Add privacy notice
    processedHtml = addPrivacyNotice(processedHtml);
    
    return processedHtml;
  } catch (error) {
    console.error('Error processing email for tracking:', error);
    // If processing fails, return original HTML
    return html;
  }
}

/**
 * Interface for sending enhanced emails
 */
interface SendEnhancedEmailParams {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  fromName?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: any[];
  campaignId?: number;
  contactId?: number;
  sequence?: number;
  emailAccountId: string | number;
  scheduledAt?: Date;
  metadata?: Record<string, any>;
  isTest?: boolean;
  skipRateLimits?: boolean;
  skipContentCheck?: boolean;
  trackingEnabled?: boolean;
}

/**
 * Enhanced Email Service
 * This service extends the basic email service with tracking and analytic features
 */
class EnhancedEmailService {
  /**
   * Send an email with enhanced tracking features
   * 
   * @param params Enhanced email sending parameters
   * @returns Result of the email sending operation
   */
  async sendEmail(params: SendEnhancedEmailParams) {
    try {
      // Use the tracking configuration (enabled by default)
      const trackingEnabled = params.trackingEnabled !== false;
      
      // Call the base email sender with the enhanced content
      const result = await baseEmailSender(
        params.emailAccountId, 
        {
          to: params.to,
          subject: params.subject,
          html: params.html,
          text: params.text,
          from: params.from,
          fromName: params.fromName,
          cc: params.cc,
          bcc: params.bcc,
          attachments: params.attachments,
          campaignId: params.campaignId,
          contactId: params.contactId,
          sequence: params.sequence,
          scheduledAt: params.scheduledAt,
          metadata: {
            ...params.metadata,
            trackingEnabled,
            isTest: params.isTest || false,
          }
        }
      );
      
      return result;
    } catch (error) {
      console.error('Error in enhanced email service:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in enhanced email service'
      };
    }
  }
  
  /**
   * Record email tracking events
   * 
   * @param type Event type (open, click, unsubscribe)
   * @param trackingId Tracking ID from the URL
   * @param req Express request object (for IP, user-agent, etc.)
   * @returns Result of the tracking operation
   */
  async recordTrackingEvent(type: 'open' | 'click' | 'unsubscribe', trackingId: string, req: any) {
    try {
      // Get the tracking log
      const [trackingLog] = await db
        .select()
        .from(emailLogs)
        .where(eq(emailLogs.trackingId, trackingId));
      
      if (!trackingLog) {
        return {
          success: false,
          error: 'Invalid tracking ID'
        };
      }
      
      // Check if user has opted out of tracking
      if (trackingLog.trackingOptOut) {
        return {
          success: false,
          error: 'User has opted out of tracking'
        };
      }
      
      // Get IP and user agent with privacy enhancements
      const ip = truncateIPAddress(req.ip || req.connection.remoteAddress || '');
      const userAgent = anonymizeUserAgent(req.headers['user-agent'] || '');
      
      // Record the event based on type
      const updates: any = {
        updatedAt: new Date(),
      };
      
      if (type === 'open') {
        updates.openCount = (trackingLog.openCount || 0) + 1;
        updates.lastOpenedAt = new Date();
        if (!trackingLog.firstOpenedAt) {
          updates.firstOpenedAt = new Date();
        }
      } else if (type === 'click') {
        updates.clickCount = (trackingLog.clickCount || 0) + 1;
        updates.lastClickedAt = new Date();
        if (!trackingLog.firstClickedAt) {
          updates.firstClickedAt = new Date();
        }
      } else if (type === 'unsubscribe') {
        updates.trackingOptOut = true;
        updates.unsubscribedAt = new Date();
      }
      
      // Update the tracking log
      const [updated] = await db
        .update(emailLogs)
        .set(updates)
        .where(eq(emailLogs.trackingId, trackingId))
        .returning();
      
      return {
        success: true,
        trackingLog: updated
      };
    } catch (error) {
      console.error('Error recording tracking event:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error recording tracking event'
      };
    }
  }
}

// Export the enhanced email service instance
export const enhancedEmailService = new EnhancedEmailService();