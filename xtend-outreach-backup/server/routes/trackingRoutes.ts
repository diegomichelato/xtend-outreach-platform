/**
 * Email Tracking Routes
 * 
 * This module handles all the tracking endpoints for email engagement:
 * - Open tracking (via tracking pixel)
 * - Click tracking (via link redirection)
 * - Unsubscribe handling
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { emailLogs, emails } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { truncateIPAddress, anonymizeUserAgent, detectDeviceType, detectBrowserFamily, detectOSFamily, isDoNotTrackEnabled } from '../utils/privacy';
import { enhancedEmailService } from '../services/enhancedEmailService';

const router = Router();

// Transparent 1x1 GIF for tracking pixel
const TRACKING_PIXEL_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

/**
 * Handle email open events via tracking pixel
 */
router.get('/open/:trackingId', async (req: Request, res: Response) => {
  try {
    const { trackingId } = req.params;
    
    if (!trackingId) {
      return res.status(400).send(TRACKING_PIXEL_GIF);
    }
    
    // Handle DNT (Do Not Track) headers
    if (isDoNotTrackEnabled(req.headers)) {
      console.log('Respecting Do Not Track header for tracking ID:', trackingId);
      return res.status(200).send(TRACKING_PIXEL_GIF);
    }
    
    // Get privacy-enhanced data from request
    const ip = truncateIPAddress(req.ip || req.socket.remoteAddress || '');
    const userAgent = req.headers['user-agent'] || '';
    const device = detectDeviceType(userAgent);
    const browser = detectBrowserFamily(userAgent);
    const os = detectOSFamily(userAgent);
    
    // Record the open event
    await enhancedEmailService.recordTrackingEvent('open', trackingId, req);
    
    // Log the open event
    console.log(`Email open recorded: ${trackingId} | Device: ${device} | Browser: ${browser} | OS: ${os} | IP: ${ip}`);
    
    // Return tracking pixel GIF
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.status(200).send(TRACKING_PIXEL_GIF);
  } catch (error) {
    console.error('Error recording email open:', error);
    // Still return the pixel to prevent visual errors
    res.setHeader('Content-Type', 'image/gif');
    return res.status(200).send(TRACKING_PIXEL_GIF);
  }
});

/**
 * Handle email click events via link redirection
 */
router.get('/click/:trackingId/:encodedUrl', async (req: Request, res: Response) => {
  try {
    const { trackingId, encodedUrl } = req.params;
    
    if (!trackingId || !encodedUrl) {
      return res.status(400).send('Invalid tracking parameters');
    }
    
    // Get original URL from base64url encoding
    let originalUrl: string;
    try {
      originalUrl = Buffer.from(encodedUrl, 'base64url').toString('utf8');
    } catch (decodeError) {
      console.error('Failed to decode URL:', decodeError);
      return res.status(400).send('Invalid URL encoding');
    }
    
    // Check if URL has a protocol, if not add https://
    if (!originalUrl.startsWith('http://') && !originalUrl.startsWith('https://')) {
      originalUrl = 'https://' + originalUrl;
    }
    
    // Record the click event
    if (!isDoNotTrackEnabled(req.headers)) {
      // Get privacy-enhanced data from request
      const ip = truncateIPAddress(req.ip || req.socket.remoteAddress || '');
      const userAgent = req.headers['user-agent'] || '';
      const device = detectDeviceType(userAgent);
      const browser = detectBrowserFamily(userAgent);
      const os = detectOSFamily(userAgent);
      
      // Record the click event
      await enhancedEmailService.recordTrackingEvent('click', trackingId, req);
      
      // Log the click event
      console.log(`Email link click recorded: ${trackingId} | Device: ${device} | Browser: ${browser} | OS: ${os} | IP: ${ip} | URL: ${originalUrl}`);
    }
    
    // Redirect to the original URL
    return res.redirect(originalUrl);
  } catch (error) {
    console.error('Error recording email click:', error);
    return res.status(500).send('Error processing link');
  }
});

/**
 * Handle email unsubscribe requests
 */
router.get('/opt-out/:trackingId', async (req: Request, res: Response) => {
  try {
    const { trackingId } = req.params;
    
    if (!trackingId) {
      return res.status(400).send('Invalid tracking ID');
    }
    
    // Find the tracking log
    const [trackingLog] = await db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.trackingId, trackingId));
    
    if (!trackingLog) {
      return res.status(404).send('Tracking ID not found');
    }
    
    // Record unsubscribe
    await enhancedEmailService.recordTrackingEvent('unsubscribe', trackingId, req);
    
    // If we found a campaign ID, try to get the creator info for a nicer confirmation page
    let campaignName = 'this campaign';
    let creatorName = 'the sender';
    
    if (trackingLog.campaignId) {
      try {
        const [campaign] = await db
          .select({
            name: emails.subject,
          })
          .from(emails)
          .where(eq(emails.campaignId, trackingLog.campaignId))
          .limit(1);
        
        if (campaign) {
          campaignName = campaign.name;
        }
      } catch (error) {
        console.error('Error getting campaign details:', error);
      }
    }
    
    // Return a simple confirmation page
    const confirmationHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Unsubscribe Confirmation</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background-color: #f9f9f9;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
          color: #2c3e50;
          font-size: 24px;
          margin-top: 0;
        }
        .success-icon {
          color: #27ae60;
          font-size: 48px;
          margin-bottom: 20px;
        }
        .btn {
          display: inline-block;
          background-color: #3498db;
          color: white;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 4px;
          margin-top: 20px;
        }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          color: #7f8c8d;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="success-icon">✓</div>
        <h1>Successfully Unsubscribed</h1>
        <p>You have been unsubscribed from "${campaignName}" from ${creatorName}.</p>
        <p>You will no longer receive emails from this campaign and we will not track your engagement with previous emails.</p>
        <p>If you unsubscribed by mistake, please contact the sender directly.</p>
      </div>
      <div class="footer">
        <p>This unsubscribe request was processed on ${new Date().toLocaleDateString()}.</p>
      </div>
    </body>
    </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    return res.send(confirmationHtml);
  } catch (error) {
    console.error('Error processing unsubscribe request:', error);
    return res.status(500).send('Error processing unsubscribe request');
  }
});

/**
 * Get the tracking log for an email - for internal API use
 */
router.get('/log/:emailId', async (req: Request, res: Response) => {
  try {
    const emailId = parseInt(req.params.emailId);
    
    if (isNaN(emailId)) {
      return res.status(400).json({ error: 'Invalid email ID' });
    }
    
    const [trackingLog] = await db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.emailId, emailId));
    
    if (!trackingLog) {
      return res.status(404).json({ error: 'Tracking log not found' });
    }
    
    return res.json(trackingLog);
  } catch (error) {
    console.error('Error getting tracking log:', error);
    return res.status(500).json({ error: 'Failed to get tracking log' });
  }
});

export default router;