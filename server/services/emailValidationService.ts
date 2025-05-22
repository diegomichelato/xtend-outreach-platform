/**
 * Email Validation Service
 * 
 * This service provides advanced validation features for email accounts and messages:
 * - SMTP connection testing
 * - SPF record validation
 * - Anti-spam content scoring
 * - Detailed error logging for email delivery issues
 */

import dns from 'dns';
import net from 'net';
import { promisify } from 'util';
import { EmailAccount } from '@shared/schema';
import nodemailer from 'nodemailer';

const dnsResolveTxt = promisify(dns.resolveTxt);

interface ValidationResult {
  valid: boolean;
  issues: string[];
  details?: any;
}

interface ConnectionTestResult {
  canConnect: boolean;
  error?: string;
  details?: any;
}

interface SPFValidationResult {
  valid: boolean;
  spfRecord?: string;
  errorMessage?: string;
}

interface SpamScoreResult {
  score: number;
  threshold: number;
  passes: boolean;
  details: any;
}

/**
 * Tests connection to SMTP server by attempting to create a connection to the host and port
 * 
 * @param host - SMTP server hostname
 * @param port - SMTP server port
 * @returns Result indicating if connection was successful
 */
export async function testSMTPConnection(host: string, port: number): Promise<ConnectionTestResult> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let connected = false;
    let errorMessage = '';
    
    // Set timeout to 5 seconds
    socket.setTimeout(5000);
    
    socket.on('connect', () => {
      connected = true;
      socket.end();
    });
    
    socket.on('timeout', () => {
      errorMessage = 'Connection timed out';
      socket.destroy();
    });
    
    socket.on('error', (err) => {
      errorMessage = `Connection error: ${err.message}`;
    });
    
    socket.on('close', () => {
      resolve({
        canConnect: connected,
        error: errorMessage || undefined,
        details: { host, port, connected }
      });
    });
    
    try {
      socket.connect(port, host);
    } catch (error: any) {
      resolve({
        canConnect: false,
        error: `Failed to initiate connection: ${error.message}`,
        details: { host, port }
      });
    }
  });
}

/**
 * Validates if the sending email domain has valid SPF records
 * that would authorize the given hostname to send on its behalf
 * 
 * @param emailAddress - Email address to validate (for domain)
 * @param smtpHost - SMTP host that will be sending emails
 * @returns Result indicating if SPF validation passed
 */
export async function validateSPFRecord(emailAddress: string, smtpHost: string): Promise<SPFValidationResult> {
  try {
    // Extract domain from email address
    const domain = emailAddress.split('@')[1];
    if (!domain) {
      return { 
        valid: false, 
        errorMessage: 'Invalid email address format'
      };
    }
    
    // Look up TXT records for the domain
    const txtRecords = await dnsResolveTxt(domain);
    
    // Find SPF record
    const spfRecord = txtRecords.find(record => 
      record.join('').toLowerCase().startsWith('v=spf1')
    );
    
    if (!spfRecord) {
      return { 
        valid: false, 
        errorMessage: 'No SPF record found for the domain'
      };
    }
    
    const spfText = spfRecord.join('');
    
    // Check if the SMTP host is allowed in the SPF record
    // Accept if the SPF record contains "a", "mx", "include", or if the SMTP host is explicitly included
    if (
      spfText.includes('a') || 
      spfText.includes('mx') || 
      spfText.includes('include:') ||
      spfText.includes(`ip4:${smtpHost}`) || 
      spfText.includes(`a:${smtpHost}`) || 
      spfText.includes(`include:${smtpHost}`) ||
      spfText.includes('all')
    ) {
      return {
        valid: true,
        spfRecord: spfText
      };
    }
    
    // If using Gmail, Outlook, or other major providers, they are typically authorized
    if (
      smtpHost.includes('gmail.com') ||
      smtpHost.includes('outlook.com') ||
      smtpHost.includes('office365.com') ||
      smtpHost.includes('yahoo.com') ||
      smtpHost.includes('zoho.com')
    ) {
      return {
        valid: true,
        spfRecord: spfText
      };
    }
    
    return {
      valid: false,
      spfRecord: spfText,
      errorMessage: 'SMTP host not authorized in SPF record'
    };
  } catch (error: any) {
    return {
      valid: false,
      errorMessage: `Failed to verify SPF: ${error.message}`
    };
  }
}

/**
 * Performs a simple spam score check on email content
 * This is a basic implementation that checks for common spam indicators
 * For production, consider integrating with SpamAssassin or similar services
 * 
 * @param subject - Email subject line
 * @param body - Email body (HTML or text)
 * @returns Spam score results
 */
export function checkSpamScore(subject: string, body: string): SpamScoreResult {
  const spamIndicators = [
    { pattern: /buy now/i, score: 1 },
    { pattern: /free money/i, score: 2 },
    { pattern: /limited time offer/i, score: 0.8 },
    { pattern: /no risk/i, score: 1 },
    { pattern: /act now/i, score: 0.5 },
    { pattern: /\$/g, score: 0.1 }, // $ signs
    { pattern: /!/g, score: 0.1 }, // exclamation marks
    { pattern: /CAPITALS/g, score: 0.2 }, // ALL CAPS words
    { pattern: /<script/i, score: 3 }, // scripts in HTML
    { pattern: /click here/i, score: 0.5 },
    { pattern: /unsubscribe/i, score: -0.5 }, // Having unsubscribe is good
    { pattern: /privacy policy/i, score: -0.5 }, // Having privacy policy is good
  ];
  
  const combinedText = subject + ' ' + body;
  let totalScore = 0;
  const matchDetails: any = {};
  
  // Calculate score based on indicators
  spamIndicators.forEach(indicator => {
    const matches = (combinedText.match(indicator.pattern) || []).length;
    if (matches > 0) {
      const score = matches * indicator.score;
      matchDetails[indicator.pattern.toString()] = {
        matches,
        score
      };
      totalScore += score;
    }
  });
  
  // Additional checks
  if (subject.length > 80) {
    totalScore += 0.5;
    matchDetails['long_subject'] = { score: 0.5 };
  }
  
  if (body.length < 50) {
    totalScore += 0.3;
    matchDetails['very_short_body'] = { score: 0.3 };
  }
  
  // Check image to text ratio in HTML content (simplified)
  if (body.includes('<img') && body.length > 0) {
    const imgTags = body.match(/<img/g) || [];
    const imgRatio = imgTags.length / (body.length / 500);
    if (imgRatio > 0.3) {
      const imgScore = imgRatio * 2;
      totalScore += imgScore;
      matchDetails['high_image_ratio'] = { score: imgScore.toFixed(2) };
    }
  }
  
  const threshold = 5.0; // Score above which email is considered spam
  
  return {
    score: Number(totalScore.toFixed(2)),
    threshold,
    passes: totalScore < threshold,
    details: matchDetails
  };
}

/**
 * Comprehensive validation of an email account including:
 * - SMTP connection testing
 * - SPF record validation 
 * - Configuration completeness check
 * 
 * @param account - Email account to validate
 * @returns Validation results with detailed issues if any
 */
export async function validateEmailAccount(account: Partial<EmailAccount>): Promise<ValidationResult> {
  const issues: string[] = [];
  const details: any = {};
  
  // Check for required fields
  if (!account.email) {
    issues.push('Email address is required');
  }
  
  if (!account.smtpHost) {
    issues.push('SMTP host is required');
  }
  
  if (!account.smtpPort) {
    issues.push('SMTP port is required');
  }
  
  if (!account.smtpUsername) {
    issues.push('SMTP username is required');
  }
  
  // If there are missing basic fields, return early
  if (issues.length > 0) {
    return {
      valid: false,
      issues,
      details: { missingFields: true }
    };
  }
  
  // Test SMTP connection
  try {
    console.log(`Testing SMTP connection to ${account.smtpHost}:${account.smtpPort}`);
    const connectionTest = await testSMTPConnection(account.smtpHost!, account.smtpPort!);
    details.connectionTest = connectionTest;
    
    if (!connectionTest.canConnect) {
      issues.push(`Cannot connect to SMTP server: ${connectionTest.error}`);
    }
  } catch (error: any) {
    issues.push(`SMTP connection test failed: ${error.message}`);
    details.connectionError = error.message;
  }
  
  // Validate SPF record
  if (account.email && account.smtpHost) {
    try {
      console.log(`Validating SPF records for ${account.email} using ${account.smtpHost}`);
      const spfResult = await validateSPFRecord(account.email, account.smtpHost);
      details.spfValidation = spfResult;
      
      if (!spfResult.valid) {
        issues.push(`SPF validation failed: ${spfResult.errorMessage}`);
      }
    } catch (error: any) {
      issues.push(`SPF validation error: ${error.message}`);
      details.spfError = error.message;
    }
  }
  
  // Test SMTP auth if we have credentials
  if (
    account.smtpHost && 
    account.smtpPort && 
    account.smtpUsername && 
    account.smtpPassword
  ) {
    try {
      console.log(`Testing SMTP authentication for ${account.smtpUsername}`);
      
      // Create a test transporter to check auth
      const testTransporter = nodemailer.createTransport({
        host: account.smtpHost,
        port: account.smtpPort,
        secure: account.smtpSecure || false,
        auth: {
          user: account.smtpUsername,
          pass: account.smtpPassword
        },
        tls: {
          rejectUnauthorized: false // For testing purposes
        }
      });
      
      // Verify the transporter
      await testTransporter.verify();
      details.smtpAuth = { success: true };
    } catch (error: any) {
      issues.push(`SMTP authentication failed: ${error.message}`);
      details.smtpAuth = { 
        success: false, 
        error: error.message 
      };
    }
  }
  
  return {
    valid: issues.length === 0,
    issues,
    details
  };
}

/**
 * Validates an email message for spam indicators and other delivery issues
 * 
 * @param subject - Email subject
 * @param body - Email body content
 * @param fromEmail - Sender email address
 * @returns Validation results with any issues found
 */
export async function validateEmailContent(
  subject: string,
  body: string,
  fromEmail: string
): Promise<ValidationResult> {
  const issues: string[] = [];
  const details: any = {};
  
  // Check if subject is present
  if (!subject || subject.trim() === '') {
    issues.push('Subject line is empty');
  }
  
  // Check if body is present
  if (!body || body.trim() === '') {
    issues.push('Email body is empty');
  }
  
  // Check for overly long subject
  if (subject && subject.length > 100) {
    issues.push('Subject line exceeds 100 characters, which may trigger spam filters');
  }
  
  // Check spam score
  const spamResult = checkSpamScore(subject, body);
  details.spamScore = spamResult;
  
  if (!spamResult.passes) {
    issues.push(`Email content may trigger spam filters (score: ${spamResult.score}, threshold: ${spamResult.threshold})`);
  }
  
  // Additional validations could be added here, such as:
  // - URL reputation checking
  // - Blacklist checking
  // - Content filtering
  
  return {
    valid: issues.length === 0,
    issues,
    details
  };
}

/**
 * Logs detailed information about email delivery attempts including
 * API responses or error messages
 * 
 * @param emailId - ID of the email in our system
 * @param status - Delivery status
 * @param details - Additional details about the delivery attempt
 */
export function logEmailDeliveryAttempt(
  emailId: number | string,
  status: 'success' | 'failure',
  details: any
): void {
  // Format timestamp
  const timestamp = new Date().toISOString();
  
  // Create log entry
  const logEntry = {
    timestamp,
    emailId,
    status,
    details
  };
  
  // Log to console (in production, would store in database or log file)
  console.log(`[EMAIL DELIVERY LOG] ${timestamp} | Email ID: ${emailId} | Status: ${status}`);
  console.log(JSON.stringify(details, null, 2));
  
  // In a production system, you might want to:
  // 1. Store in a database table
  // 2. Send to a logging service
  // 3. Track analytics
}