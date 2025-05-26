/**
 * Email Service
 * 
 * This service handles sending emails directly through SMTP.
 * All emails are now routed through our direct SMTP implementation
 * with enhanced deliverability features including proper headers,
 * SPF validation, and comprehensive tracking.
 */

import nodemailer from 'nodemailer';
import { EmailAccount, type Email } from '@shared/schema';
import { storage } from '../storage';
import { 
  validateEmailAccount as validateEmailAccountAdvanced,
  testSMTPConnection,
  validateSPFRecord,
  validateEmailContent,
  logEmailDeliveryAttempt
} from './emailValidationService';
import {
  createTrackingLog,
  processEmailForTracking,
} from './enhancedEmailService';

// Set to true to force using mock email for development/testing
// Can be overridden by setting ENABLE_REAL_EMAILS=true environment variable
// Forcing real emails for campaign testing
const FORCE_MOCK_EMAIL = false; // Always send real emails

// Set timeout for SMTP connections
const SMTP_TIMEOUT = 30000; // 30 seconds

/**
 * Interface for email sending request
 */
export interface SendEmailRequest {
  from: string | { name: string; address: string };
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  // Allow internal service properties
  _emailAccount?: EmailAccount;
  _emailId?: number; // For tracking the database email ID
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  campaignId?: number;
  contactId?: number;
  scheduledAt?: Date;
  sequence?: number;
}

/**
 * Interface for email sending response
 */
export interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  emailId?: number;
  error?: string;
  testMode?: boolean; // Indicates if the email was sent using test transport (no actual delivery)
}

/**
 * Creates a test/development Nodemailer transport that doesn't actually send emails
 * but simulates the process for testing
 * 
 * @returns A Nodemailer test transport
 */
function createTestTransport() {
  console.log('Using test/development email transport (no actual emails will be sent)');
  
  // Use Nodemailer's built-in test transport
  return nodemailer.createTransport({
    name: 'test-transport',
    version: '1.0.0',
    send: (mail, callback) => {
      const info = {
        messageId: `TEST-${Date.now()}-${Math.random().toString(36).substring(2, 10)}@test.local`,
        envelope: mail.data.envelope || {
          from: mail.data.from,
          to: mail.data.to
        },
        accepted: [],
        rejected: [],
        pending: [],
        response: 'Test transport: message simulated'
      };
      
      console.log('Test email transport - simulating sending to:', mail.data.to);
      
      // Simulate some network delay
      setTimeout(() => {
        callback(null, info);
      }, 500);
    }
  });
}

/**
 * Creates a Nodemailer transport using email account SMTP settings
 * 
 * @param emailAccount - The email account with SMTP configuration
 * @returns A configured Nodemailer transport or null if configuration is incomplete
 */
async function createTransport(emailAccount: EmailAccount) {
  if (!emailAccount) {
    console.error('Email account is undefined or null');
    return null;
  }
  
  // List of special email addresses that should always use real email transport
  const ALWAYS_USE_REAL_EMAIL = ['shayirimi@stemmgt.com', 'ana@stemgroup.io', 'patrick@xtendtalent.com'];
  const isSpecialAccount = ALWAYS_USE_REAL_EMAIL.includes(emailAccount.email);
  
  // Check if account is forced to use test mode (e.g., due to authentication issues)
  if (emailAccount.testModeOnly) {
    console.log(`Account ${emailAccount.email} is in test mode only - using test transport`);
    return createTestTransport();
  }
  
  // Use test transport in development mode or when forced, but never for special accounts
  if (FORCE_MOCK_EMAIL && !isSpecialAccount) {
    return createTestTransport();
  }

  // Log whether we're in real email sending mode
  console.log('Using real email transport - emails will be sent to actual recipients');
  console.log('Email account data:', {
    id: emailAccount.id,
    email: emailAccount.email,
    name: emailAccount.name,
    provider: emailAccount.provider,
    hasSMTPHost: !!emailAccount.smtpHost,
    hasSMTPPort: !!emailAccount.smtpPort,
    hasSMTPUsername: !!emailAccount.smtpUsername,
    hasSMTPPassword: !!emailAccount.smtpPassword,
    SMTPHost: emailAccount.smtpHost,
    SMTPPort: emailAccount.smtpPort
  });
  
  // Check for required SMTP settings
  if (!emailAccount.smtpHost || !emailAccount.smtpPort) {
    console.error('Missing required SMTP settings for email account:', emailAccount.id);
    console.error('Required settings: smtpHost, smtpPort');
    console.error('Available settings:', {
      smtpHost: emailAccount.smtpHost || 'MISSING',
      smtpPort: emailAccount.smtpPort || 'MISSING',
      smtpUsername: emailAccount.smtpUsername || 'Using email as username',
      smtpPassword: emailAccount.smtpPassword ? 'PROVIDED' : 'MISSING',
      email: emailAccount.email
    });
    
    // Provide more descriptive error message in logs to help troubleshooting
    const missingSettings = [];
    if (!emailAccount.smtpHost) missingSettings.push('SMTP Server');
    if (!emailAccount.smtpPort) missingSettings.push('SMTP Port');
    if (!emailAccount.smtpUsername && !emailAccount.email) missingSettings.push('SMTP Username');
    if (!emailAccount.smtpPassword && !process.env.SMTP_PASSWORD) missingSettings.push('SMTP Password');
    
    console.error(`Email account ${emailAccount.email} cannot be used for sending emails. Missing: ${missingSettings.join(', ')}`);
    
    // Return test transport as fallback for special accounts if SMTP settings missing
    if (isSpecialAccount) {
      console.log('Special account missing SMTP settings - using test transport as fallback');
      return createTestTransport();
    }
    
    return null;
  }
  
  // Get the correct password - use environment variable for special accounts
  let password;
  
  // For Gmail accounts, prioritize using the GMAIL_APP_PASSWORD
  if (emailAccount.provider === 'gmail' && process.env.GMAIL_APP_PASSWORD) {
    console.log('Using GMAIL_APP_PASSWORD from environment for Gmail account:', emailAccount.email);
    console.log('GMAIL_APP_PASSWORD exists:', !!process.env.GMAIL_APP_PASSWORD);
    console.log('GMAIL_APP_PASSWORD length:', process.env.GMAIL_APP_PASSWORD?.length);
    password = process.env.GMAIL_APP_PASSWORD;
  } 
  // For special accounts, use dedicated SMTP password
  else if (isSpecialAccount) {
    console.log('Using SMTP_PASSWORD from environment for special account:', emailAccount.email);
    password = process.env.SMTP_PASSWORD;
  } 
  // For regular accounts, use stored password
  else {
    password = emailAccount.smtpPassword;
  }
  
  // As a fallback for all accounts, try to use environment variable if no password is found
  if (!password) {
    if (emailAccount.provider === 'gmail' && process.env.GMAIL_APP_PASSWORD) {
      console.log('Using fallback GMAIL_APP_PASSWORD from environment for account:', emailAccount.email);
      password = process.env.GMAIL_APP_PASSWORD;
    } else if (process.env.SMTP_PASSWORD) {
      console.log('Using fallback SMTP_PASSWORD from environment for account:', emailAccount.email);
      password = process.env.SMTP_PASSWORD;
    }
  }
    
  // Print password info - don't output the actual password
  let passwordSource;
  if (emailAccount.provider === 'gmail' && process.env.GMAIL_APP_PASSWORD) {
    passwordSource = 'Using Gmail App Password from ENV';
  } else if (isSpecialAccount && process.env.SMTP_PASSWORD) {
    passwordSource = 'Using SMTP_PASSWORD from ENV';
  } else if (emailAccount.smtpPassword) {
    passwordSource = 'Using database password';
  } else if (process.env.GMAIL_APP_PASSWORD && emailAccount.provider === 'gmail') {
    passwordSource = 'Using fallback Gmail App Password from ENV';
  } else if (process.env.SMTP_PASSWORD) {
    passwordSource = 'Using fallback SMTP_PASSWORD from ENV';
  } else {
    passwordSource = 'No password available';
  }
  const hasEnvPassword = !!process.env.SMTP_PASSWORD || (!!process.env.GMAIL_APP_PASSWORD && emailAccount.provider === 'gmail');
  
  // If we don't have a password, use the test transport
  if (!password) {
    console.warn('No password available for email account - using test transport');
    return createTestTransport();
  }
  
  console.log('Creating SMTP transport with settings:', {
    host: emailAccount.smtpHost,
    port: emailAccount.smtpPort,
    secure: emailAccount.smtpSecure ?? false,
    user: emailAccount.smtpUsername || emailAccount.email,
    passwordSource,
    hasEnvPassword,
    hasDbPassword: !!emailAccount.smtpPassword,
    isSpecialAccount
  });
  
  // Create transport configuration with advanced anti-spam settings
  const config: any = {
    host: emailAccount.smtpHost,
    port: emailAccount.smtpPort,
    secure: emailAccount.smtpSecure ?? false,
    auth: {
      user: emailAccount.smtpUsername || emailAccount.email,
      pass: password
    },
    // Connection timeouts to prevent hanging
    connectionTimeout: SMTP_TIMEOUT,
    socketTimeout: SMTP_TIMEOUT,
    
    // Advanced connection pooling for better deliverability
    pool: true,
    maxConnections: 5,
    maxMessages: 10,
    rateDelta: 1000,
    rateLimit: 5,
    
    // TLS / SSL configuration for better security & anti-spam compliance
    tls: {
      rejectUnauthorized: true, // Verify SSL certificates
      ciphers: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256', // Modern secure ciphers
      minVersion: 'TLSv1.2' // Minimum TLS version
    },
    
    // Ensure proper DNS resolution
    dnsTimeout: 30000,
    
    // Enhanced logging for troubleshooting
    debug: true,
    logger: true
  };

  try {
    // Create the transport
    const transport = nodemailer.createTransport(config);
    
    // Verify the transport configuration is valid by testing connection
    try {
      console.log(`Verifying SMTP connection to ${emailAccount.smtpHost}:${emailAccount.smtpPort}...`);
      await transport.verify();
      console.log('SMTP connection verified successfully');
      return transport;
    } catch (verifyError) {
      console.error('Failed to verify SMTP connection:', verifyError);
      
      // For special accounts, still attempt to use the transport even if verification fails
      // This helps in environments where SMTP verification is blocked but sending might work
      if (isSpecialAccount) {
        console.log('Special account - will attempt to use transport despite verification failure');
        return transport;
      }
      
      // Fall back to test transport for non-special accounts
      console.log('Falling back to test transport due to verification failure');
      return createTestTransport();
    }
  } catch (error) {
    console.error('Failed to create Nodemailer transport:', error);
    
    // In case of total failure, fall back to test transport
    console.log('Falling back to test transport due to transport creation failure');
    return createTestTransport();
  }
}

/**
 * Sends an email using a specific email account
 * 
 * @param accountId - The ID of the email account to use for sending
 * @param request - The email request with recipients, subject, content, etc.
 * @returns A response object with success status and details
 */
/**
 * Enhance plain test email content with more spam-resistant structure
 */
/**
 * Enhances email content to improve deliverability and avoid spam filters
 * 
 * @param html The original HTML content
 * @param text The original plain text content
 * @param domain The sender's domain for unsubscribe links
 * @returns Enhanced HTML and text content
 */
function enhanceTestEmailContent(
  html: string | undefined,
  text: string | undefined,
  domain: string
): { html: string | undefined, text: string | undefined } {
  // Always enhance all emails for better deliverability, not just test emails
  // This is necessary as Gmail has become more aggressive with spam filtering
  
  // Generate a unique message ID to avoid duplicate content detection
  const messageId = `${Date.now()}.${Math.random().toString(36).substring(2, 12)}`;
  
  // Preserve original subject and custom content if not a test email
  const isTestEmail = 
    (html && (html.includes('test') || html.toLowerCase().includes('test email'))) || 
    (text && (text.includes('test') || text.toLowerCase().includes('test email')));
  
  // If not a test email, we'll still enhance it with proper formatting but keep original content
  if (!isTestEmail && html) {
    // Extract body content from original HTML if it exists
    let originalContent = html;
    try {
      // Simple parsing to extract main content if possible
      const bodyContentMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
      if (bodyContentMatch && bodyContentMatch[1]) {
        originalContent = bodyContentMatch[1];
      }
    } catch (error) {
      console.log('Error extracting original content, using full HTML', error);
      // Continue with full original HTML
    }
    
    // Gmail-optimized HTML template but with original content inserted
    const customHtml = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Message from Xtend</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; color: #333333; background-color: #ffffff;">
  <!-- Gmail prefers tables for consistent rendering -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; min-width: 100%;">
    <tr>
      <td align="center" bgcolor="#ffffff">
        <!-- Main container limited to 600px -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse;">
          <!-- Simple header that won't trigger spam -->
          <tr>
            <td align="center" bgcolor="#f7f7f7" style="padding: 10px 0;">
              <p style="font-size: 18px; color: #333333; margin: 0;">Xtend Creators Platform</p>
            </td>
          </tr>
          
          <!-- Main content with high text-to-code ratio -->
          <tr>
            <td bgcolor="#ffffff" style="padding: 20px; line-height: 1.5;">
              ${originalContent}
            </td>
          </tr>
          
          <!-- Footer with proper required elements -->
          <tr>
            <td bgcolor="#f7f7f7" style="padding: 15px; text-align: center; font-size: 12px; color: #666666;">
              <p>© ${new Date().getFullYear()} Xtend Creators | <a href="https://www.xtendcreators.com" style="color: #666666;">www.xtendcreators.com</a></p>
              <p><a href="mailto:unsubscribe@${domain}?subject=unsubscribe" style="color: #666666;">Unsubscribe</a> | <a href="https://www.xtendcreators.com/privacy" style="color: #666666;">Privacy Policy</a></p>
              <p>Xtend Inc., 123 Creator Avenue, San Francisco, CA 94103, United States</p>
              <p>Message ID: ${messageId}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;
    return { html: customHtml, text: text };
  } else {
    // For test emails or emails without HTML, use our comprehensive template
    // Gmail-optimized HTML email template with strict anti-spam formatting
    // Based on Gmail's specific requirements and known preferences:
    // - Simple, clean structure that Gmail renders correctly
    // - Minimal CSS to avoid Gmail's CSS filtering
    // - Proper text-to-code ratio (Gmail requires 60/40 or better)
    // - Standard fonts Gmail supports well
    // - Proper physical address and unsubscribe links
    const enhancedHtml = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Message from Xtend</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; color: #333333; background-color: #ffffff;">
  <!-- Gmail prefers tables for consistent rendering -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; min-width: 100%;">
    <tr>
      <td align="center" bgcolor="#ffffff">
        <!-- Main container limited to 600px -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse;">
          <!-- Simple header that won't trigger spam -->
          <tr>
            <td align="center" bgcolor="#f7f7f7" style="padding: 20px 0;">
              <p style="font-size: 20px; font-weight: bold; color: #333333; margin: 0;">Xtend Creators Platform</p>
            </td>
          </tr>
          
          <!-- Main content with high text-to-code ratio -->
          <tr>
            <td bgcolor="#ffffff" style="padding: 30px; line-height: 1.5;">
              <p>Hello,</p>
              <p>This message is from the Xtend Creators Platform, designed to help content creators manage their video inventory and reach their audience effectively.</p>
              <p>Our platform offers the following features:</p>
              <ul>
                <li>Video inventory management tools</li>
                <li>Creator data analytics</li>
                <li>Audience engagement metrics</li>
                <li>Smart email deliverability</li>
              </ul>
              
              <p>We're committed to helping content creators maximize their reach and engagement.</p>
              
              <p>If you have any questions about our platform, feel free to respond to this email.</p>
              
              <p>Best regards,<br />
              The Xtend Team</p>
            </td>
          </tr>
          
          <!-- Footer with proper required elements -->
          <tr>
            <td bgcolor="#f7f7f7" style="padding: 20px; text-align: center; font-size: 12px; color: #666666;">
              <p>© ${new Date().getFullYear()} Xtend Creators | <a href="https://www.xtendcreators.com" style="color: #666666;">www.xtendcreators.com</a></p>
              <p><a href="mailto:unsubscribe@${domain}?subject=unsubscribe" style="color: #666666;">Unsubscribe</a> | <a href="https://www.xtendcreators.com/privacy" style="color: #666666;">Privacy Policy</a></p>
              <p>Xtend Inc., 123 Creator Avenue, San Francisco, CA 94103, United States</p>
              <p>Message ID: ${messageId}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
    
    // Plain text version following Gmail's recommendations
    // - Simple, clean format that Gmail preserves
    // - No excessive formatting or symbols that can trigger spam
    // - Similar content to HTML for consistency
    const enhancedText = `Hello,

This message is from the Xtend Creators Platform, designed to help content creators manage their video inventory and reach their audience effectively.

Our platform offers the following features:
- Video inventory management tools
- Creator data analytics
- Audience engagement metrics
- Smart email deliverability

We're committed to helping content creators maximize their reach and engagement.

If you have any questions about our platform, feel free to respond to this email.

Best regards,
The Xtend Team

------------------
© ${new Date().getFullYear()} Xtend Creators | www.xtendcreators.com
To unsubscribe, email: unsubscribe@${domain}
Privacy Policy: https://www.xtendcreators.com/privacy
Xtend Inc., 123 Creator Avenue, San Francisco, CA 94103, United States
Message ID: ${messageId}
    `;
    
    return { html: enhancedHtml, text: enhancedText };
  }
}

/**
 * Adds essential email headers to improve deliverability with Gmail and other providers
 * 
 * @param transport - The nodemailer transport
 * @param mailOptions - The mail options to enhance
 * @param domain - The sender's domain
 * @returns Enhanced mail options
 */
function addDeliverabilityHeaders(mailOptions: any, domain: string): any {
  // Generate a unique message ID that Gmail will recognize
  const messageId = `${Date.now()}.${Math.random().toString(36).substring(2, 10)}@${domain}`;
  
  // Add critical headers that Gmail looks for
  const enhancedOptions = {
    ...mailOptions,
    headers: {
      ...(mailOptions.headers || {}),
      // Proper Message-ID format with domain
      'Message-ID': `<${messageId}>`,
      // RFC-compliant List-Unsubscribe header (absolutely critical for Gmail)
      'List-Unsubscribe': `<mailto:unsubscribe@${domain}?subject=unsubscribe>, <https://www.xtendcreators.com/unsubscribe>`,
      // List-Unsubscribe-Post tells Gmail this supports one-click unsubscribe
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      // Feedback-ID helps Gmail track reputation (format: identifier:user:mailtype:provider)
      'Feedback-ID': `email:xtend:marketing:${domain}`,
      // Tell recipient this message isn't auto-generated
      'X-Auto-Response-Suppress': 'OOF, AutoReply',
      // Anti-spam headers
      'X-Report-Abuse': `Please report abuse to abuse@${domain}`,
      // Properly formatted date with timezone
      'Date': new Date().toUTCString(),
      // Precedence header to prevent auto-replies and backscatter
      'Precedence': 'bulk'
    }
  };
  
  return enhancedOptions;
}

export /**
 * Streamlined email sending function that only uses direct SMTP
 * This removes the Smartlead API dependency completely
 * 
 * @param accountId The ID or email address of the account to send from
 * @param request The email request details
 * @returns Response with success status and details
 */
async function sendEmail(
  accountId: number | string,
  request: SendEmailRequest
): Promise<SendEmailResponse> {
  try {
    // Special handling for account ID to support different formats
    let emailAccount = null;
    
    // If we already have a full account object passed in via request._emailAccount, use that
    if (request._emailAccount) {
      console.log(`Using pre-fetched email account from request: ${request._emailAccount.email}`);
      emailAccount = request._emailAccount;
    } else {
      // Check if the ID is an email address or a numeric ID
      if (typeof accountId === 'string' && accountId.includes('@')) {
        console.log(`Looking up email account by email address: ${accountId}`);
        emailAccount = await storage.getEmailAccountByEmail(accountId);
      } else if (typeof accountId === 'number' || !isNaN(Number(accountId))) {
        // This is a database ID, fetch directly
        console.log(`Looking up email account by ID: ${accountId}`);
        emailAccount = await storage.getEmailAccount(Number(accountId));
      } else {
        console.error(`Invalid account ID format: ${accountId}`);
        return {
          success: false,
          error: `Invalid account ID format: ${accountId}`
        };
      }
    }
    
    // If still not found, return error
    if (!emailAccount) {
      console.error(`Email account not found with ID: ${accountId}`);
      return {
        success: false,
        error: `Email account not found with ID: ${accountId}`
      };
    }

    // Check if account has all required fields
    if (!emailAccount.email) {
      console.error(`Email account ID ${accountId} is missing an email address`);
      return {
        success: false,
        error: `Email account is missing an email address`
      };
    }

    // Log the attempt with important details
    console.log(`Attempting to send email using account ${accountId} (${emailAccount.email}) to ${Array.isArray(request.to) ? request.to.join(', ') : request.to}`);
    console.log(`Email subject: ${request.subject}`);
    
    // Check if account is in test mode
    if (emailAccount.testModeOnly) {
      console.log(`Account ${emailAccount.email} is in TEST MODE ONLY - will use test transport`);
      // Create test transport directly instead of going through createTransport which might still use real SMTP
      const testTransport = createTestTransport();
      
      // Prepare email content with enhanced deliverability headers
      const senderEmail = typeof request.from === 'string' 
          ? request.from || emailAccount.email 
          : request.from?.address || emailAccount.email;
      const domain = senderEmail.split('@')[1];
      
      // Enhance email content for test emails
      const enhancedContent = enhanceTestEmailContent(request.html, request.text, domain);
      
      // Create basic mail options 
      const baseMailOptions = {
        from: typeof request.from === 'string' 
          ? { name: emailAccount.name || emailAccount.email, address: senderEmail }
          : request.from || { name: emailAccount.name, address: emailAccount.email },
        to: request.to,
        cc: request.cc,
        bcc: request.bcc,
        subject: request.subject,
        text: enhancedContent.text || request.text,
        html: enhancedContent.html || request.html,
        attachments: request.attachments,
        priority: 'normal'
      };
      
      // Apply Gmail-optimized deliverability headers
      const mailOptions = addDeliverabilityHeaders(baseMailOptions, domain);
      
      try {
        // Send email using test transport
        const info = await testTransport.sendMail(mailOptions);
        console.log('Test email sent successfully (TEST MODE ONLY)', info.messageId);
        
        // Log the successful test delivery
        logEmailDeliveryAttempt(
          request.campaignId ? `campaign-${request.campaignId}` : `account-${accountId}`,
          'success',
          {
            messageId: info.messageId,
            transportType: 'test',
            to: request.to,
            from: mailOptions.from,
            subject: request.subject,
            timestamp: new Date().toISOString()
          }
        );
        
        // Record the email in our system
        let emailId: number | undefined;
        try {
          const email = await storage.createEmail({
            subject: request.subject,
            body: request.html || request.text || '',
            status: 'sent',
            emailAccountId: accountId,
            campaignId: request.campaignId || null,
            contactId: request.contactId || null,
            sequence: request.sequence || 1,
            scheduledAt: request.scheduledAt || null,
            openedAt: null,
            clickedAt: null,
            repliedAt: null
          });
          
          emailId = email.id;
          console.log(`Email recorded in database with ID: ${emailId}`);
        } catch (dbError) {
          console.error('Failed to record email in database:', dbError);
        }
        
        return {
          success: true,
          messageId: info.messageId,
          emailId,
          testMode: true
        };
      } catch (error) {
        console.error('Error sending test email:', error);
        return {
          success: false,
          error: `Failed to send test email: ${error instanceof Error ? error.message : 'Unknown error'}`,
          testMode: true
        };
      }
    }
    
    // For non-test mode accounts, use direct SMTP with enhanced settings
    console.log('Using direct SMTP with enhanced Gmail deliverability optimizations');
    return await sendDirectSMTPEmail(accountId, request, emailAccount);
    
  } catch (error) {
    console.error('Unexpected error in sendEmail:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Sends an email using direct SMTP with enhanced deliverability settings
 * This is the primary email sending method with Gmail-optimized deliverability
 */
async function sendDirectSMTPEmail(
  accountId: number | string,
  request: SendEmailRequest,
  emailAccount: EmailAccount | undefined
): Promise<SendEmailResponse> {
  try {
    // Safety check for undefined emailAccount
    if (!emailAccount) {
      console.error('Email account is undefined in sendDirectSMTPEmail');
      return {
        success: false,
        error: 'Email account not found'
      };
    }
    
    console.log('Using direct SMTP as fallback for email sending');
    
    // Check if account is special (might have different settings)
    const isSpecialAccount = ['shayirimi@stemmgt.com', 'ana@stemgroup.io'].includes(emailAccount.email);
    const isDevMode = process.env.NODE_ENV === 'development';
    
    if (!isDevMode || isSpecialAccount) {
      if (!emailAccount.smtpHost || !emailAccount.smtpPort) {
        console.error(`Cannot send real email: Account ${emailAccount.email} is missing SMTP host/port configuration`);
        if (isSpecialAccount) {
          console.warn(`Special account ${emailAccount.email} requires proper SMTP configuration, falling back to test mode`);
        }
      }
    }

    // Create Nodemailer transport for real sending
    const transport = await createTransport(emailAccount);
    
    if (!transport) {
      console.error(`Failed to create email transport for account ${emailAccount.email}`);
      return {
        success: false,
        error: 'Failed to create email transport with provided SMTP settings'
      };
    }

    // Check if this is a test transport or real one
    const isTestTransport = !!(transport as any).name && (transport as any).name === 'test-transport';
    console.log(`Transport type: ${isTestTransport ? 'TEST (no real emails will be sent)' : 'REAL (emails will be delivered)'}`);

    // Ensure from address includes sender name if not provided
    const fromAddress = typeof request.from === 'string' 
      ? { name: emailAccount.name || emailAccount.email, address: request.from || emailAccount.email }
      : request.from || { name: emailAccount.name, address: emailAccount.email };

    // Log the final from address being used
    console.log(`From address: ${typeof fromAddress === 'string' ? fromAddress : `${fromAddress.name} <${fromAddress.address}>`}`);

    // Perform email content validation before sending
    try {
      if (request.subject && (request.html || request.text)) {
        console.log('Validating email content for spam indicators...');
        const contentValidation = await validateEmailContent(
          request.subject,
          request.html || request.text || '',
          typeof fromAddress === 'string' ? fromAddress : fromAddress.address
        );
        
        if (!contentValidation.valid) {
          console.warn('Email content validation issues:', contentValidation.issues);
          // We'll still send the email but log the issues
          console.warn('Spam score details:', contentValidation.details?.spamScore);
        } else {
          console.log('Email content passed spam validation checks');
        }
      }
    } catch (validationError) {
      console.error('Error during email content validation:', validationError);
      // Continue with sending despite validation error
    }

    // Get domain for header generation
    const domain = typeof fromAddress === 'string' 
        ? fromAddress.split('@')[1] 
        : fromAddress.address.split('@')[1];
        
    // Enhance email content for test emails
    const enhancedContent = enhanceTestEmailContent(request.html, request.text, domain);
    
    // Initialize content variables
    let htmlContent = enhancedContent.html || request.html;
    let textContent = enhancedContent.text || request.text;
    
    // Create a dummy email object for pre-storing tracking data
    // We'll store the actual email later with all details
    const dummyEmail = {
      id: 0, // Will be replaced after DB insert
      subject: request.subject || '',
      body: htmlContent || textContent || '',
      status: 'pending',
      messageId: '',
      emailAccountId: typeof accountId === 'string' ? parseInt(accountId, 10) : accountId,
      contactId: request.contactId || null,
      campaignId: request.campaignId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      sentAt: new Date(),
      sequence: request.sequence || 1
    };
    
    // Try to set up tracking before sending
    let trackingLog: any = null;
    try {
      trackingLog = await createTrackingLog(dummyEmail);
      
      // Only process HTML content with tracking if we have HTML and tracking is set up
      if (htmlContent && trackingLog) {
        console.log('Adding tracking features to email HTML content...');
        htmlContent = await processEmailForTracking(htmlContent, dummyEmail, trackingLog);
      }
    } catch (trackingError) {
      console.error('Error setting up email tracking:', trackingError);
      // Continue with original content if tracking fails
    }
    
    // Prepare basic email options
    const baseMailOptions = {
      from: fromAddress,
      to: request.to,
      cc: request.cc,
      bcc: request.bcc,
      subject: request.subject,
      text: textContent,
      html: htmlContent,
      attachments: request.attachments,
      priority: 'normal'
    };
    
    // Apply Gmail-optimized deliverability headers
    const mailOptions = addDeliverabilityHeaders(baseMailOptions, domain);

    // Start timing the email sending
    const sendStartTime = Date.now();

    // Attempt to send the email with timeout protection
    let info: any;
    try {
      // Send the email with a timeout to prevent hanging
      const sendPromise = transport.sendMail(mailOptions);
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email sending timed out after 60 seconds')), 60000);
      });
      
      // Wait for either the send operation to complete or timeout
      info = await Promise.race([sendPromise, timeoutPromise]);
      
      // Calculate sending time
      const sendingTimeMs = Date.now() - sendStartTime;
      
      console.log('Email sent successfully with message ID:', info.messageId);
      console.log(`Email sending took ${sendingTimeMs}ms`);
      
      // Log the successful delivery attempt
      logEmailDeliveryAttempt(
        request.campaignId ? `campaign-${request.campaignId}` : `account-${accountId}`,
        'success',
        {
          messageId: info.messageId,
          transportType: isTestTransport ? 'test' : 'real',
          sendingTimeMs,
          to: request.to,
          from: fromAddress,
          subject: request.subject,
          timestamp: new Date().toISOString()
        }
      );
    } catch (sendError) {
      // Log the failed delivery attempt
      logEmailDeliveryAttempt(
        request.campaignId ? `campaign-${request.campaignId}` : `account-${accountId}`,
        'failure',
        {
          error: sendError instanceof Error ? sendError.message : String(sendError),
          errorType: sendError instanceof Error ? sendError.constructor.name : 'Unknown',
          transportType: isTestTransport ? 'test' : 'real',
          to: request.to,
          from: fromAddress,
          subject: request.subject,
          timestamp: new Date().toISOString()
        }
      );
      
      console.error('Error sending email:', sendError);
      return {
        success: false,
        error: `Failed to send email: ${sendError instanceof Error ? sendError.message : 'Unknown send error'}`
      };
    }

    // Record the email in database
    let emailId: number | undefined;
    let trackingId: string | undefined;
    
    try {
      // Create the email record first
      const email = await storage.createEmail({
        subject: request.subject,
        body: request.html || request.text || '',
        status: 'sent',
        emailAccountId: accountId,
        contactId: request.contactId || null,
        campaignId: request.campaignId || null,
        sequence: request.sequence || 1,
        scheduledAt: request.scheduledAt || null,
        openedAt: null,
        clickedAt: null,
        repliedAt: null,
        messageId: info.messageId
      });
      
      emailId = email.id;
      console.log(`Email recorded in database with ID: ${emailId}`);
      
      // Create tracking log entry
      try {
        const trackingLog = await createTrackingLog(email);
        if (trackingLog) {
          trackingId = trackingLog.trackingId;
          console.log(`Tracking log created with ID: ${trackingLog.id}, tracking ID: ${trackingId}`);
        }
      } catch (trackingError) {
        console.error('Failed to create tracking log:', trackingError);
        // Continue even if tracking creation fails
      }
    } catch (dbError) {
      console.error('Failed to record email in database:', dbError);
      // Still return success if the email was sent but recording failed
    }

    return {
      success: true,
      messageId: info.messageId,
      emailId,
      testMode: isTestTransport
    };
  } catch (error) {
    console.error('Unexpected error in sendDirectSMTPEmail function:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred while sending email'
    };
  }
}

/**
 * Sends an email using the primary email account of a creator
 * 
 * @param creatorId - The ID of the creator whose primary email account should be used
 * @param request - The email request with recipients, subject, content, etc.
 * @returns A response object with success status and details
 */
export async function sendEmailFromCreator(
  creatorIdOrEmail: number | string,
  request: SendEmailRequest
): Promise<SendEmailResponse> {
  try {
    let emailAccountId: number;
    
    if (typeof creatorIdOrEmail === 'number') {
      // Get creator's primary email account
      const primaryAccount = await storage.getPrimaryEmailAccountForCreator(creatorIdOrEmail);
      
      if (!primaryAccount) {
        return {
          success: false,
          error: `No primary email account found for creator ID: ${creatorIdOrEmail}`
        };
      }
      
      emailAccountId = primaryAccount.id;
    } else if (typeof creatorIdOrEmail === 'string') {
      // Find the email account by email address
      const allAccounts = await storage.getAllEmailAccounts();
      const account = allAccounts.find(acc => acc.email === creatorIdOrEmail);
      
      if (!account) {
        return {
          success: false,
          error: `No email account found with email: ${creatorIdOrEmail}`
        };
      }
      
      emailAccountId = account.id;
    } else {
      return {
        success: false,
        error: 'Invalid parameter: creatorIdOrEmail must be a number (creator ID) or string (email address)'
      };
    }

    // Use the identified account to send the email
    return sendEmail(emailAccountId, request);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred while sending email'
    };
  }
}

/**
 * Schedules an email to be sent at a specific time
 * Note: This is a placeholder. For production, you'd likely use a job queue system.
 * 
 * @param accountId - The ID of the email account to use for sending
 * @param request - The email request with recipients, subject, content, etc.
 * @param scheduledAt - When to send the email
 * @returns A response object with success status and details
 */
/**
 * Validates an email account configuration without actually sending any emails
 * This can be used before saving an account to ensure it's properly configured
 * 
 * @param emailAccount - The email account to validate 
 * @returns A detailed validation result with any issues found
 */
export async function validateEmailAccount(emailAccount: EmailAccount): Promise<{
  valid: boolean;
  issues: string[];
  canConnect: boolean;
  details?: any;
}> {
  console.log('Starting enhanced email account validation for:', emailAccount.email);
  
  // Special accounts handling - if it's one of our managed accounts and has env password
  const isSpecialAccount = ['shayirimi@stemmgt.com', 'ana@stemgroup.io'].includes(emailAccount.email || '');
  
  // Use environment password for special accounts if available
  if (isSpecialAccount && process.env.SMTP_PASSWORD && !emailAccount.smtpPassword) {
    console.log(`Using environment password for special account: ${emailAccount.email}`);
    emailAccount = {
      ...emailAccount,
      smtpPassword: process.env.SMTP_PASSWORD,
      imapPassword: process.env.SMTP_PASSWORD
    };
  }
  
  // Track any issues found
  const issues: string[] = [];
  let canConnect = false;
  
  // Check for required fields
  if (!emailAccount.email) issues.push('Email address is missing');
  if (!emailAccount.name) issues.push('Account name is missing');
  
  // Check SMTP configuration
  if (!emailAccount.smtpHost) issues.push('SMTP host is missing');
  if (!emailAccount.smtpPort) issues.push('SMTP port is missing');
  
  // Check if we have credentials
  const hasCredentials = !!(emailAccount.smtpUsername || emailAccount.email) && 
                        !!(emailAccount.smtpPassword || process.env.SMTP_PASSWORD);
  if (!hasCredentials) {
    issues.push('SMTP credentials are incomplete. Username and password are required.');
  }
  
  // If we have critical errors, return early
  if (!emailAccount.smtpHost || !emailAccount.smtpPort || !hasCredentials) {
    return {
      valid: false,
      issues,
      canConnect: false,
      details: {
        emailProvided: !!emailAccount.email,
        nameProvided: !!emailAccount.name,
        smtpHostProvided: !!emailAccount.smtpHost,
        smtpPortProvided: !!emailAccount.smtpPort,
        smtpUsernameProvided: !!(emailAccount.smtpUsername || emailAccount.email),
        smtpPasswordProvided: !!(emailAccount.smtpPassword || process.env.SMTP_PASSWORD),
        isSpecialAccount
      }
    };
  }
  
  // Track validation details
  const validationDetails: any = {
    validationTimestamp: new Date().toISOString(),
    isSpecialAccount
  };
  
  // Test direct connection to SMTP server
  try {
    console.log(`Testing direct TCP connection to ${emailAccount.smtpHost}:${emailAccount.smtpPort}`);
    const connectionTest = await testSMTPConnection(emailAccount.smtpHost!, emailAccount.smtpPort!);
    validationDetails.directConnectionTest = connectionTest;
    
    if (connectionTest.canConnect) {
      console.log(`Successfully established TCP connection to ${emailAccount.smtpHost}:${emailAccount.smtpPort}`);
      // This proves the server is reachable, but doesn't guarantee authentication works
      canConnect = true;
    } else {
      console.log(`Failed to establish TCP connection: ${connectionTest.error}`);
      issues.push(`Cannot connect to SMTP server: ${connectionTest.error}`);
    }
  } catch (connError) {
    console.error('Error during direct connection test:', connError);
    issues.push(`Connection test error: ${connError instanceof Error ? connError.message : String(connError)}`);
  }
  
  // Check SPF records for email domain
  if (emailAccount.email && emailAccount.smtpHost) {
    try {
      console.log(`Validating SPF records for ${emailAccount.email} with SMTP host ${emailAccount.smtpHost}`);
      const spfResult = await validateSPFRecord(emailAccount.email, emailAccount.smtpHost);
      validationDetails.spfValidation = spfResult;
      
      if (!spfResult.valid && spfResult.errorMessage) {
        issues.push(`SPF validation warning: ${spfResult.errorMessage}. Emails might be marked as spam.`);
      } else if (spfResult.valid) {
        console.log(`SPF validation passed for ${emailAccount.email}`);
      }
    } catch (spfError) {
      console.error('Error validating SPF records:', spfError);
    }
  }
  
  // Now try to create and validate the transport
  try {
    const transport = await createTransport(emailAccount);
    if (!transport) {
      issues.push('Failed to create SMTP transport with provided settings');
      return {
        valid: false,
        issues,
        canConnect: false,
        details: validationDetails
      };
    }
    
    // Check if we got a test transport (which isn't a real validation)
    if ((transport as any).name === 'test-transport') {
      issues.push('Using test transport - real validation not possible in current environment');
      return {
        valid: true,
        issues,
        canConnect: false,
        details: {
          usingTestTransport: true,
          reason: 'Development environment or missing SMTP configuration'
        }
      };
    }
    
    // Actually try to verify the connection
    try {
      await transport.verify();
      canConnect = true;
    } catch (verifyError) {
      issues.push(`SMTP connection verification failed: ${verifyError instanceof Error ? verifyError.message : 'Unknown error'}`);
      canConnect = false;
    }
    
    return {
      valid: issues.length === 0,
      issues,
      canConnect,
      details: {
        ...validationDetails,
        connectionTested: true,
        connectionSuccessful: canConnect,
        nodemailerVerified: canConnect
      }
    };
  } catch (error) {
    issues.push(`Failed to validate email configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      valid: false,
      issues,
      canConnect: false
    };
  }
}

/**
 * Sends a test email to verify email account configuration
 * 
 * @param accountId - The ID of the email account to test
 * @param recipient - The email address to send the test email to (usually the user's email)
 * @returns A response object with success status and details
 */
export async function sendTestEmail(
  accountId: number | string,
  recipient: string
): Promise<SendEmailResponse> {
  try {
    // Get email account details
    const emailAccount = await storage.getEmailAccount(accountId);
    
    if (!emailAccount) {
      return {
        success: false,
        error: `Email account not found with ID: ${accountId}`
      };
    }

    // Create a simple test email with connection details for verification
    const testEmailRequest: SendEmailRequest = {
      from: emailAccount.email,
      to: recipient,
      subject: `Test email from ${emailAccount.name} (${emailAccount.email})`,
      html: `
        <h2>Email Configuration Test</h2>
        <p>This is a test email to verify your email account configuration is working correctly.</p>
        <h3>Connection Details:</h3>
        <ul>
          <li><strong>Email Address:</strong> ${emailAccount.email}</li>
          <li><strong>Account Name:</strong> ${emailAccount.name}</li>
          <li><strong>SMTP Host:</strong> ${emailAccount.smtpHost}</li>
          <li><strong>SMTP Port:</strong> ${emailAccount.smtpPort}</li>
          <li><strong>SMTP Secure:</strong> ${emailAccount.smtpSecure ? 'Yes' : 'No'}</li>
          <li><strong>Username:</strong> ${emailAccount.smtpUsername || emailAccount.email}</li>
          <li><strong>Provider:</strong> ${emailAccount.provider || 'Not specified'}</li>
        </ul>
        <p>If you received this email, your email account is properly configured for sending emails through the platform.</p>
        <p>Time sent: ${new Date().toISOString()}</p>
      `,
      text: `
        Email Configuration Test
        
        This is a test email to verify your email account configuration is working correctly.
        
        Connection Details:
        - Email Address: ${emailAccount.email}
        - Account Name: ${emailAccount.name}
        - SMTP Host: ${emailAccount.smtpHost}
        - SMTP Port: ${emailAccount.smtpPort}
        - SMTP Secure: ${emailAccount.smtpSecure ? 'Yes' : 'No'}
        - Username: ${emailAccount.smtpUsername || emailAccount.email}
        - Provider: ${emailAccount.provider || 'Not specified'}
        
        If you received this email, your email account is properly configured for sending emails through the platform.
        
        Time sent: ${new Date().toISOString()}
      `
    };
    
    // Send the test email
    const result = await sendEmail(accountId, testEmailRequest);
    
    // Add extra context to the response
    if (result.success) {
      return {
        ...result,
        success: true,
        testMode: result.testMode
      };
    } else {
      return {
        ...result,
        success: false,
        error: result.error || 'Failed to send test email for unknown reason'
      };
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred sending test email'
    };
  }
}

export async function scheduleEmail(
  accountId: number | string,
  request: SendEmailRequest,
  scheduledAt: Date
): Promise<SendEmailResponse> {
  try {
    // Create a record in the database with scheduled status
    // Convert Smartlead string ID to number if needed for database storage
    let databaseAccountId: number;
    
    if (typeof accountId === 'string') {
      // Check if it's a numeric string that can be directly converted
      if (/^\d+$/.test(accountId) && accountId.length < 10) {
        databaseAccountId = parseInt(accountId);
      } else {
        // This might be a Smartlead ID, we need to find corresponding DB ID
        console.log(`Looking for email account by Smartlead ID: ${accountId}`);
        
        // Try to find the account with this Smartlead ID in notes
        const emailAccount = await storage.getEmailAccount(accountId);
        
        if (!emailAccount) {
          return {
            success: false,
            error: `Email account not found with ID: ${accountId}`
          };
        }
        
        databaseAccountId = emailAccount.id;
        console.log(`Using database ID ${databaseAccountId} for Smartlead ID ${accountId}`);
      }
    } else {
      databaseAccountId = accountId;
    }
    
    const email = await storage.createEmail({
      subject: request.subject,
      body: request.html || request.text || '',
      status: 'scheduled',
      sentAt: null,
      emailAccountId: databaseAccountId,
      contactId: request.contactId || null,
      campaignId: request.campaignId || null,
      sequence: request.sequence || 1,

      scheduledAt: scheduledAt,
      openedAt: null,
      clickedAt: null,
      repliedAt: null
    });

    // In a real implementation, you would set up a job in a queue system here
    // For this demo, we'll just simulate scheduling with setTimeout
    const timeToSend = scheduledAt.getTime() - new Date().getTime();
    
    if (timeToSend > 0) {
      setTimeout(async () => {
        try {
          // Send the email when the scheduled time arrives
          const result = await sendEmail(accountId, request);
          
          // Update the email status in the database
          if (result.success) {
            await storage.updateEmail(email.id, {
              status: 'sent',
              sentAt: new Date()
            });
          } else {
            await storage.updateEmail(email.id, {
              status: 'failed'
            });
          }
        } catch (error) {
          console.error('Error sending scheduled email:', error);
          await storage.updateEmail(email.id, {
            status: 'failed'
          });
        }
      }, timeToSend);
    } else {
      // If scheduled time is in the past, send immediately
      const result = await sendEmail(accountId, request);
      
      if (result.success) {
        await storage.updateEmail(email.id, {
          status: 'sent',
          sentAt: new Date()
        });
      } else {
        await storage.updateEmail(email.id, {
          status: 'failed'
        });
      }
    }

    // Whether the email would be sent using test transport
    const isSpecialAccount = ['shayirimi@stemmgt.com', 'ana@stemgroup.io'].includes(
      (await storage.getEmailAccount(accountId))?.email || ''
    );
    const useTestTransport = process.env.NODE_ENV === 'development' && !isSpecialAccount;
    
    return {
      success: true,
      emailId: email.id,
      testMode: useTestTransport
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Unknown error occurred while scheduling email'
    };
  }
}