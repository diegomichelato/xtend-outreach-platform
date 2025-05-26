/**
 * AI Email Monitoring Service
 * 
 * This service uses AI to analyze email content and deliverability metrics to provide
 * intelligent insights and recommendations for improving email deliverability.
 */

import OpenAI from 'openai';
import { db } from '../db';
import { 
  emails, 
  emailAccounts, 
  emailContentAnalysis, 
  accountHealthAnalysis,
  inboxPlacementPredictions,
  deliverabilityTests,
  deliverabilityTestVariants,
  reputationAlerts,
  domainVerifications,
  spamWords,
  emailDeliveryEvents
} from '@shared/schema';
import { eq, and, desc, like, or, sql, gt, lt, isNull, asc } from 'drizzle-orm';

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Types for analysis responses
interface ContentAnalysisResult {
  score: number; // 0-100 score
  spamRisk: number; // 0-100 risk level
  improvementSuggestions: string[];
  spamTriggers: string[];
  deliverabilityRating: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  imageToTextRatio?: string;
  linkCount?: number;
  textLength?: number;
  hasAttachment?: boolean;
  excessiveCapitals?: boolean;
  excessivePunctuation?: boolean;
  isPhishy?: boolean;
}

interface AccountAnalysisResult {
  healthScore: number;
  recommendations: string[];
  riskFactors: string[];
  priorityActions: string[];
  overallRating: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  bounceRateAnalysis?: string;
  complaintRateAnalysis?: string;
  openRateAnalysis?: string;
  clickRateAnalysis?: string;
  replyRateAnalysis?: string;
  authenticationAnalysis?: string;
  sendingPatternAnalysis?: string;
}

// Inbox Placement Prediction Result
interface InboxPlacementPredictionResult {
  inboxPlacementScore: number; // 0-100 score
  gmailInboxProbability?: number; // 0-100 percentage
  outlookInboxProbability?: number; // 0-100 percentage
  yahooInboxProbability?: number; // 0-100 percentage
  otherInboxProbability?: number; // 0-100 percentage
  blockingFactors: string[]; // Factors that may cause blocking
  filteringFactors: string[]; // Factors that may cause filtering
  improvementSuggestions: string[];
}

// A/B Test Configuration
interface ABTestConfig {
  name: string;
  emailAccountId: number;
  testVariables: string[]; // subject_line, from_name, send_time, content
  sampleSize?: number;
  variants: {
    variantName: string;
    subjectLine?: string;
    fromName?: string;
    sendTime?: Date;
    content?: string;
  }[];
}

// A/B Test Results
interface ABTestResults {
  testId: number;
  winningVariantId?: number;
  winningVariantName?: string;
  metrics: {
    variantId: number;
    variantName: string;
    deliveryRate?: number;
    inboxRate?: number;
    openRate?: number;
    clickRate?: number;
    bounceRate?: number;
    complaintRate?: number;
    isWinner: boolean;
  }[];
  recommendations: string[];
}

// Reputation Alert
interface ReputationAlertInfo {
  emailAccountId: number;
  alertType: string; // bounce_rate, complaint_rate, blacklist, etc.
  severity: 'info' | 'warning' | 'critical';
  message: string;
  detectedValue?: string; // e.g., "10%" for bounce rate
  threshold?: string; // e.g., "5%" for bounce rate
}

// Domain Verification Status
interface DomainVerificationStatus {
  domain: string;
  spfStatus: string;
  dkimStatus: string;
  dmarcStatus: string;
  spfRecord?: string;
  recommendedSpfRecord?: string;
  dkimRecord?: string;
  recommendedDkimRecord?: string;
  dmarcRecord?: string;
  recommendedDmarcRecord?: string;
  lastChecked?: Date;
  errors?: string[];
}

/**
 * Service for analyzing email content and account health using AI
 */
export class AiEmailMonitoringService {
  /**
   * Analyze email content for deliverability issues
   * @param subject - Email subject
   * @param content - Email HTML content
   * @param userId - ID of user requesting the analysis (optional)
   * @returns Analysis result with score and recommendations
   */
  async analyzeEmailContent(
    subject: string,
    content: string,
    userId?: number
  ): Promise<ContentAnalysisResult> {
    try {
      // Check if there's already a recent analysis for this content
      if (userId) {
        const existingAnalysis = await db
          .select()
          .from(emailContentAnalysis)
          .where(
            and(
              eq(emailContentAnalysis.subject, subject),
              eq(emailContentAnalysis.createdById, userId)
            )
          )
          .orderBy(desc(emailContentAnalysis.analysisDate))
          .limit(1);

        // If we have a recent analysis (within the last 24 hours), return it
        if (existingAnalysis.length > 0) {
          const analysis = existingAnalysis[0];
          const analysisDate = new Date(analysis.analysisDate);
          const now = new Date();
          const hoursSinceAnalysis = (now.getTime() - analysisDate.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceAnalysis < 24) {
            return {
              score: analysis.score,
              spamRisk: analysis.spamRisk,
              improvementSuggestions: analysis.improvementSuggestions || [],
              spamTriggers: analysis.spamTriggers || [],
              deliverabilityRating: analysis.deliverabilityRating,
              imageToTextRatio: analysis.imageToTextRatio || undefined,
              linkCount: analysis.linkCount || undefined,
              textLength: analysis.textLength || undefined,
              hasAttachment: analysis.hasAttachment || undefined,
              excessiveCapitals: analysis.excessiveCapitals || undefined,
              excessivePunctuation: analysis.excessivePunctuation || undefined, 
              isPhishy: analysis.isPhishy || undefined
            };
          }
        }
      }
      
      // Extract text from HTML
      const textContent = this.extractTextFromHtml(content);
      
      // Calculate some basic metrics
      const hasExcessiveCapitals = this.detectExcessiveCapitals(textContent);
      const hasExcessivePunctuation = this.detectExcessivePunctuation(textContent);
      const linkCount = this.countLinks(content);
      const textLength = textContent.length;
      const imageToTextRatio = this.calculateImageTextRatio(content);
      const hasAttachment = content.includes('attachment') || content.includes('data:application');
      
      // Check for spam words in our dictionary
      const spamWords = await this.detectSpamWords(subject, textContent);
      
      // Prepare the prompt for OpenAI with enhanced analysis requirements
      const prompt = `
You are an email deliverability expert analyzing an email for potential deliverability issues.
You need to provide a comprehensive analysis focusing on:

1. Content Analysis:
   - A deliverability score from 0-100 (higher is better)
   - A spam risk score from 0-100 (higher means more likely to be flagged as spam)
   - Identify any spam trigger words or patterns
   - Detect excessive use of ALL CAPS or punctuation!!!
   - Check for phishing indicators (urgent requests, suspicious links, etc.)
   - Analyze text-to-image ratio

2. Structure Assessment:
   - Assess link density (${linkCount} links found)
   - Content length appropriateness (${textLength} characters)
   - Proper formatting and readability
   - Image-to-text ratio (${imageToTextRatio || 'Unknown'})
   - ${hasAttachment ? 'Contains attachments or embedded files' : 'No attachments detected'}

3. Deliverability Impact:
   - Specific improvement suggestions (at least 5)
   - Overall deliverability rating (excellent, good, fair, poor, critical)
   - Technical recommendations for improving inbox placement

SUBJECT: ${subject}

CONTENT SAMPLE:
${textContent.substring(0, 2500)} ${textContent.length > 2500 ? '... (truncated)' : ''}

DETECTED ISSUES:
${hasExcessiveCapitals ? '- Excessive use of ALL CAPS detected' : '- No excessive capitalization'}
${hasExcessivePunctuation ? '- Excessive punctuation detected' : '- No excessive punctuation'}
${spamWords.length > 0 ? `- ${spamWords.length} potential spam trigger words found: ${spamWords.join(', ')}` : '- No known spam words found in our database'}

Respond in JSON format with these keys:
score, spamRisk, improvementSuggestions (array), spamTriggers (array), deliverabilityRating, imageToTextRatio, linkCount, hasExcessiveCapitals, hasExcessivePunctuation, isPhishy
`;

      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3, // More deterministic results
      });

      // Parse the response
      const responseText = response.choices[0].message.content;
      if (!responseText) {
        throw new Error('Empty response from AI');
      }

      const analysis = JSON.parse(responseText);
      
      // Combine our detection with AI detection
      const result = {
        score: analysis.score || 0,
        spamRisk: analysis.spamRisk || 0,
        improvementSuggestions: analysis.improvementSuggestions || [],
        spamTriggers: analysis.spamTriggers || spamWords || [],
        deliverabilityRating: analysis.deliverabilityRating || 'fair',
        imageToTextRatio: analysis.imageToTextRatio || imageToTextRatio,
        linkCount: analysis.linkCount || linkCount,
        textLength,
        hasAttachment,
        excessiveCapitals: analysis.hasExcessiveCapitals || hasExcessiveCapitals,
        excessivePunctuation: analysis.hasExcessivePunctuation || hasExcessivePunctuation,
        isPhishy: analysis.isPhishy || false
      };
      
      // Store the analysis in the database if user is provided
      if (userId) {
        await db.insert(emailContentAnalysis).values({
          subject,
          content: content.substring(0, 10000), // Truncate long content
          score: result.score,
          spamRisk: result.spamRisk,
          deliverabilityRating: result.deliverabilityRating,
          spamTriggers: result.spamTriggers,
          imageToTextRatio: result.imageToTextRatio,
          linkCount: result.linkCount,
          textLength: result.textLength,
          hasAttachment: result.hasAttachment,
          excessiveCapitals: result.excessiveCapitals,
          excessivePunctuation: result.excessivePunctuation,
          improvementSuggestions: result.improvementSuggestions,
          isPhishy: result.isPhishy,
          analysisDate: new Date(),
          createdById: userId,
          aiModel: "gpt-4o",
          aiVersion: "20240513",
          metadata: { source: 'enhanced-content-analysis' }
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error analyzing email content with AI:', error);
      return {
        score: 50, // Default middle score
        spamRisk: 50,
        improvementSuggestions: ['Could not perform AI analysis. Please try again later.'],
        spamTriggers: [],
        deliverabilityRating: 'fair',
        textLength: this.extractTextFromHtml(content).length,
        linkCount: this.countLinks(content),
        imageToTextRatio: this.calculateImageTextRatio(content),
        hasAttachment: content.includes('attachment') || content.includes('data:application'),
        excessiveCapitals: this.detectExcessiveCapitals(this.extractTextFromHtml(content)),
        excessivePunctuation: this.detectExcessivePunctuation(this.extractTextFromHtml(content)),
        isPhishy: false
      };
    }
  }
  
  /**
   * Detect spam words in text using our database of known spam triggers
   */
  private async detectSpamWords(subject: string, content: string): Promise<string[]> {
    try {
      // Get all active spam words from the database
      const spamWordList = await db
        .select()
        .from(spamWords)
        .where(eq(spamWords.active, true));
      
      if (spamWordList.length === 0) {
        return [];
      }
      
      // Combine subject and content for checking
      const textToCheck = (subject + " " + content).toLowerCase();
      
      // Find matching spam words
      const foundSpamWords = spamWordList
        .filter(word => textToCheck.includes(word.word.toLowerCase()))
        .map(word => word.word);
      
      return foundSpamWords;
    } catch (error) {
      console.error('Error detecting spam words:', error);
      return [];
    }
  }
  
  /**
   * Detect excessive capitals in text (more than 20% of text in ALL CAPS)
   */
  private detectExcessiveCapitals(text: string): boolean {
    // Count uppercase words (words with 3+ characters that are all uppercase)
    const words = text.split(/\s+/);
    const upperCaseWords = words.filter(word => 
      word.length >= 3 && 
      word === word.toUpperCase() && 
      /[A-Z]/.test(word) // Ensure it has at least one letter
    );
    
    // If more than 10% of words with 3+ chars are ALL CAPS, flag it
    const significantWords = words.filter(word => word.length >= 3);
    const upperCaseRatio = significantWords.length > 0 ? 
      upperCaseWords.length / significantWords.length : 0;
    
    return upperCaseRatio > 0.1; // More than 10% of words are ALL CAPS
  }
  
  /**
   * Detect excessive punctuation in text
   */
  private detectExcessivePunctuation(text: string): boolean {
    // Count exclamation marks and question marks
    const exclamationCount = (text.match(/!/g) || []).length;
    const questionCount = (text.match(/\?{2,}/g) || []).length; // 2+ question marks together
    
    // Count repeated punctuation (e.g., "!!!", "???", "!?!?")
    const repeatedPunctCount = (text.match(/([!?])\1{1,}/g) || []).length;
    
    // Calculate ratio of punctuation to text length
    const punctRatio = (exclamationCount + questionCount) / text.length;
    
    return punctRatio > 0.01 || repeatedPunctCount > 2; // More than 1% of chars are !/? or multiple repeated sequences
  }
  
  /**
   * Count links in HTML content
   */
  private countLinks(html: string): number {
    const hrefMatches = html.match(/<a\s+(?:[^>]*?\s+)?href=(["])(.*?)\1/g) || [];
    return hrefMatches.length;
  }
  
  /**
   * Calculate approximate image to text ratio
   */
  private calculateImageTextRatio(html: string): string | undefined {
    try {
      // Count image tags
      const imageMatches = html.match(/<img[^>]+>/g) || [];
      const imageCount = imageMatches.length;
      
      // Estimate text content size
      const textContent = this.extractTextFromHtml(html);
      const textSize = textContent.length;
      
      // Simple ratio calculation - just a rough estimate
      if (imageCount === 0 && textSize === 0) {
        return "0:0";
      }
      
      if (imageCount === 0) {
        return "0:100"; // No images, all text
      }
      
      if (textSize === 0) {
        return "100:0"; // All images, no text
      }
      
      // Estimate image size influence (very rough approximation)
      // Assuming average image takes up equivalent space as 500 characters
      const estimatedImageInfluence = imageCount * 500;
      const totalSize = estimatedImageInfluence + textSize;
      
      const imagePercentage = Math.round((estimatedImageInfluence / totalSize) * 100);
      const textPercentage = 100 - imagePercentage;
      
      return `${imagePercentage}:${textPercentage}`;
    } catch (error) {
      console.error('Error calculating image-text ratio:', error);
      return undefined;
    }
  }

  /**
   * Analyze an email account's health and provide recommendations
   * @param accountId - Email account ID to analyze
   * @returns Analysis with recommendations for improving account health
   */
  async analyzeAccountHealth(accountId: number): Promise<AccountAnalysisResult> {
    try {
      // Get account details
      const [account] = await db
        .select({
          email: emailAccounts.email,
          name: emailAccounts.name,
          status: emailAccounts.status,
          provider: emailAccounts.provider,
          openRate: emailAccounts.openRate,
          clickRate: emailAccounts.clickRate,
          replyRate: emailAccounts.replyRate,
          bounceRate: emailAccounts.bounceRate,
          complaintRate: emailAccounts.complaintRate,
          warmupEnabled: emailAccounts.warmupEnabled,
          dailyLimit: emailAccounts.dailyLimit,
          notes: emailAccounts.notes
        })
        .from(emailAccounts)
        .where(eq(emailAccounts.id, accountId));

      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }

      // Get recent email records
      const recentEmails = await db
        .select({
          subject: emails.subject,
          status: emails.status,
          sentAt: emails.sentAt,
          openedAt: emails.openedAt,
          clickedAt: emails.clickedAt,
          repliedAt: emails.repliedAt,
          bouncedAt: emails.bouncedAt,
          complaintAt: emails.complaintAt,
          deliveryStatus: emails.deliveryStatus
        })
        .from(emails)
        .where(eq(emails.emailAccountId, accountId))
        .orderBy(desc(emails.sentAt))
        .limit(50);

      // Consolidate metrics
      const emailStats = {
        total: recentEmails.length,
        sent: recentEmails.filter(e => e.status === 'sent' || e.status === 'delivered').length,
        opened: recentEmails.filter(e => e.openedAt !== null).length,
        clicked: recentEmails.filter(e => e.clickedAt !== null).length,
        replied: recentEmails.filter(e => e.repliedAt !== null).length,
        bounced: recentEmails.filter(e => e.bouncedAt !== null).length,
        complained: recentEmails.filter(e => e.complaintAt !== null).length,
      };

      // Calculate rates
      const getRate = (count: number) => recentEmails.length > 0 ? (count / recentEmails.length) * 100 : 0;
      
      const metrics = {
        openRate: account.openRate || getRate(emailStats.opened),
        clickRate: account.clickRate || getRate(emailStats.clicked),
        replyRate: account.replyRate || getRate(emailStats.replied),
        bounceRate: account.bounceRate || getRate(emailStats.bounced),
        complaintRate: account.complaintRate || getRate(emailStats.complained),
      };

      // Prepare prompt for OpenAI
      const prompt = `
You are an email deliverability expert analyzing an email account's health metrics.
Based on the following data, provide:
1. An overall health score from 0-100 (higher is better)
2. 3-5 specific recommendations to improve deliverability
3. Key risk factors affecting this account
4. Priority actions the user should take immediately
5. An overall rating (excellent, good, fair, poor, critical)

ACCOUNT DATA:
Email: ${account.email}
Provider: ${account.provider || 'Unknown'}
Status: ${account.status}
Open Rate: ${metrics.openRate.toFixed(2)}%
Click Rate: ${metrics.clickRate.toFixed(2)}%
Reply Rate: ${metrics.replyRate.toFixed(2)}%
Bounce Rate: ${metrics.bounceRate.toFixed(2)}%
Complaint Rate: ${metrics.complaintRate.toFixed(2)}%
Warmup Enabled: ${account.warmupEnabled ? 'Yes' : 'No'}
Daily Sending Limit: ${account.dailyLimit || 'Not set'}
Recent Emails Analyzed: ${recentEmails.length}

EMAIL PERFORMANCE SUMMARY:
Total Emails: ${emailStats.total}
Sent/Delivered: ${emailStats.sent}
Opened: ${emailStats.opened}
Clicked: ${emailStats.clicked}
Replied: ${emailStats.replied}
Bounced: ${emailStats.bounced}
Complained: ${emailStats.complained}

Respond in JSON format with these keys:
healthScore, recommendations (array), riskFactors (array), priorityActions (array), overallRating
`;

      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3, // More deterministic results
      });

      // Parse the response
      const responseText = response.choices[0].message.content;
      if (!responseText) {
        throw new Error('Empty response from AI');
      }

      const analysis = JSON.parse(responseText);
      
      // Update the account with the new health score and status
      await db
        .update(emailAccounts)
        .set({
          healthScore: analysis.healthScore || 0,
          healthStatus: analysis.overallRating || 'fair',
          lastHealthCheck: new Date()
        })
        .where(eq(emailAccounts.id, accountId));

      return {
        healthScore: analysis.healthScore || 0,
        recommendations: analysis.recommendations || [],
        riskFactors: analysis.riskFactors || [],
        priorityActions: analysis.priorityActions || [],
        overallRating: analysis.overallRating || 'fair'
      };
    } catch (error) {
      console.error(`Error analyzing account health for ID ${accountId}:`, error);
      return {
        healthScore: 50, // Default middle score
        recommendations: ['Could not perform AI analysis. Please try again later.'],
        riskFactors: [],
        priorityActions: [],
        overallRating: 'fair'
      };
    }
  }

  /**
   * Extract text content from HTML
   * @param html - HTML content to extract text from
   * @returns Plain text content
   */
  private extractTextFromHtml(html: string): string {
    // Simple HTML tag removal (a more sophisticated library could be used)
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  
  /**
   * Predict inbox placement for an email across different providers
   * @param emailAccountId - Email account ID to use for sending the email
   * @param subject - Email subject
   * @param content - Email HTML content
   * @param recipientDomains - Array of recipient domain names to analyze (e.g., gmail.com, outlook.com)
   * @param userId - ID of user requesting the prediction (optional)
   * @returns Prediction result with probabilities for different email providers
   */
  async predictInboxPlacement(
    emailAccountId: number,
    subject: string, 
    content: string,
    recipientDomains: string[] = ['gmail.com', 'outlook.com', 'yahoo.com', 'aol.com'],
    userId?: number
  ): Promise<InboxPlacementPredictionResult> {
    try {
      // Check if there's already a recent prediction for this combination
      if (userId) {
        const existingPrediction = await db
          .select()
          .from(inboxPlacementPredictions)
          .where(
            and(
              eq(inboxPlacementPredictions.emailAccountId, emailAccountId),
              eq(inboxPlacementPredictions.subject, subject),
              eq(inboxPlacementPredictions.createdById, userId)
            )
          )
          .orderBy(desc(inboxPlacementPredictions.predictionDate))
          .limit(1);

        // If we have a recent prediction (within the last 24 hours), return it
        if (existingPrediction.length > 0) {
          const prediction = existingPrediction[0];
          const predictionDate = new Date(prediction.predictionDate);
          const now = new Date();
          const hoursSincePrediction = (now.getTime() - predictionDate.getTime()) / (1000 * 60 * 60);
          
          if (hoursSincePrediction < 24) {
            return {
              inboxPlacementScore: prediction.inboxPlacementScore,
              gmailInboxProbability: prediction.gmailInboxProbability || undefined,
              outlookInboxProbability: prediction.outlookInboxProbability || undefined,
              yahooInboxProbability: prediction.yahooInboxProbability || undefined,
              otherInboxProbability: prediction.otherInboxProbability || undefined,
              blockingFactors: prediction.blockingFactors || [],
              filteringFactors: prediction.filteringFactors || [],
              improvementSuggestions: prediction.improvementSuggestions || []
            };
          }
        }
      }
      
      // Get information about the email account
      const [account] = await db
        .select({
          email: emailAccounts.email,
          domain: sql<string>`split_part(${emailAccounts.email}, '@', 2)`,
          provider: emailAccounts.provider,
          bounceRate: emailAccounts.bounceRate,
          complaintRate: emailAccounts.complaintRate,
          warmupEnabled: emailAccounts.warmupEnabled,
          domainAuthenticated: emailAccounts.domainAuthenticated,
          dkimConfigured: emailAccounts.dkimConfigured,
          spfConfigured: emailAccounts.spfConfigured,
          dmarcConfigured: emailAccounts.dmarcConfigured
        })
        .from(emailAccounts)
        .where(eq(emailAccounts.id, emailAccountId));
      
      if (!account) {
        throw new Error(`Email account not found: ${emailAccountId}`);
      }
      
      // Get domain verification status if available
      let domainStatus = null;
      if (account.domain) {
        const [domain] = await db
          .select()
          .from(domainVerifications)
          .where(eq(domainVerifications.domain, account.domain));
          
        if (domain) {
          domainStatus = domain;
        }
      }
      
      // Check delivery events for this account to analyze reputation
      const recentEvents = await db
        .select({
          eventType: emailDeliveryEvents.eventType,
          timestamp: emailDeliveryEvents.timestamp
        })
        .from(emailDeliveryEvents)
        .where(eq(emailDeliveryEvents.emailAccountId, emailAccountId))
        .orderBy(desc(emailDeliveryEvents.timestamp))
        .limit(100);
        
      // Calculate event counts
      const bouncesCount = recentEvents.filter(e => e.eventType === 'bounce').length;
      const complaintsCount = recentEvents.filter(e => e.eventType === 'complaint').length;
      const deliveredCount = recentEvents.filter(e => e.eventType === 'delivered').length;
      
      // Run content analysis first to get spam triggers and content issues
      const contentAnalysis = await this.analyzeEmailContent(subject, content);
      
      // Prepare the prompt for AI prediction
      const prompt = `
You are an email deliverability expert predicting the inbox placement likelihood across major email providers.
Based on the following data, provide a detailed prediction using your expertise on email deliverability algorithms.

EMAIL SENDING ACCOUNT:
Email: ${account.email}
Domain: ${account.domain || 'Unknown'}
Domain Authentication Status:
- SPF Configured: ${account.spfConfigured ? 'Yes' : 'No'}
- DKIM Configured: ${account.dkimConfigured ? 'Yes' : 'No'}
- DMARC Configured: ${account.dmarcConfigured ? 'Yes' : 'No'}
- Overall Domain Authentication: ${account.domainAuthenticated ? 'Authenticated' : 'Not Authenticated'}
${domainStatus ? `
SPF Status: ${domainStatus.spfStatus}
DKIM Status: ${domainStatus.dkimStatus}
DMARC Status: ${domainStatus.dmarcStatus}` : ''}

ACCOUNT REPUTATION METRICS:
Bounce Rate: ${account.bounceRate ? `${account.bounceRate}%` : 'Unknown'}
Complaint Rate: ${account.complaintRate ? `${account.complaintRate}%` : 'Unknown'}
Recent Delivery Events: ${recentEvents.length} events analyzed
- Bounces: ${bouncesCount} (${recentEvents.length > 0 ? ((bouncesCount / recentEvents.length) * 100).toFixed(2) : 0}%)
- Complaints: ${complaintsCount} (${recentEvents.length > 0 ? ((complaintsCount / recentEvents.length) * 100).toFixed(2) : 0}%)
- Successfully Delivered: ${deliveredCount} (${recentEvents.length > 0 ? ((deliveredCount / recentEvents.length) * 100).toFixed(2) : 0}%)

EMAIL CONTENT ANALYSIS:
Subject: ${subject}
Content Score: ${contentAnalysis.score}/100
Spam Risk Score: ${contentAnalysis.spamRisk}/100
Detected Spam Triggers: ${contentAnalysis.spamTriggers.length > 0 ? contentAnalysis.spamTriggers.join(', ') : 'None detected'}
${contentAnalysis.excessiveCapitals ? '- Contains excessive capitalization (ALL CAPS)' : ''}
${contentAnalysis.excessivePunctuation ? '- Contains excessive punctuation' : ''}
${contentAnalysis.isPhishy ? '- Contains potential phishing indicators' : ''}
Links: ${contentAnalysis.linkCount || 0} links found
Text Length: ${contentAnalysis.textLength || 0} characters
Image-to-Text Ratio: ${contentAnalysis.imageToTextRatio || 'Unknown'}

TARGET RECIPIENTS:
Domains to analyze: ${recipientDomains.join(', ')}

Based on this information, predict:
1. Overall inbox placement score (0-100)
2. Probability of landing in inbox for Gmail (0-100%)
3. Probability of landing in inbox for Outlook (0-100%)
4. Probability of landing in inbox for Yahoo (0-100%)
5. Probability of landing in inbox for other providers (0-100%)
6. Key blocking factors that could cause the email to be blocked entirely
7. Key filtering factors that could cause the email to be filtered to spam
8. Specific recommendations to improve inbox placement

Respond in JSON format with these keys:
inboxPlacementScore, gmailInboxProbability, outlookInboxProbability, yahooInboxProbability, otherInboxProbability, blockingFactors (array), filteringFactors (array), improvementSuggestions (array)
`;

      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2, // More deterministic results
      });

      // Parse the response
      const responseText = response.choices[0].message.content;
      if (!responseText) {
        throw new Error('Empty response from AI');
      }

      const prediction = JSON.parse(responseText);
      
      // Create the result object
      const result: InboxPlacementPredictionResult = {
        inboxPlacementScore: prediction.inboxPlacementScore || 50,
        gmailInboxProbability: prediction.gmailInboxProbability,
        outlookInboxProbability: prediction.outlookInboxProbability,
        yahooInboxProbability: prediction.yahooInboxProbability,
        otherInboxProbability: prediction.otherInboxProbability,
        blockingFactors: prediction.blockingFactors || [],
        filteringFactors: prediction.filteringFactors || [],
        improvementSuggestions: prediction.improvementSuggestions || []
      };
      
      // Store the prediction in the database if user is provided
      if (userId) {
        await db.insert(inboxPlacementPredictions).values({
          emailAccountId,
          subject,
          content: content.substring(0, 10000), // Truncate long content
          recipientDomains,
          inboxPlacementScore: result.inboxPlacementScore,
          gmailInboxProbability: result.gmailInboxProbability,
          outlookInboxProbability: result.outlookInboxProbability,
          yahooInboxProbability: result.yahooInboxProbability,
          otherInboxProbability: result.otherInboxProbability,
          blockingFactors: result.blockingFactors,
          filteringFactors: result.filteringFactors,
          improvementSuggestions: result.improvementSuggestions,
          predictionDate: new Date(),
          createdById: userId,
          aiModel: "gpt-4o",
          aiVersion: "20240513",
          metadata: { contentAnalysisScore: contentAnalysis.score, spamRisk: contentAnalysis.spamRisk }
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error predicting inbox placement:', error);
      return {
        inboxPlacementScore: 50, // Default middle score
        improvementSuggestions: ['Could not perform AI prediction. Please try again later.'],
        blockingFactors: [],
        filteringFactors: []
      };
    }
  }
  
  /**
   * Create and manage an A/B test for email deliverability
   * @param config - A/B test configuration
   * @param userId - ID of user creating the test
   * @returns The created test ID
   */
  async createDeliverabilityTest(config: ABTestConfig, userId: number): Promise<number> {
    try {
      // Validate input
      if (!config.name || !config.emailAccountId || config.variants.length < 2) {
        throw new Error('Invalid test configuration: need name, email account ID, and at least 2 variants');
      }
      
      // Create the test
      const [test] = await db.insert(deliverabilityTests).values({
        name: config.name,
        emailAccountId: config.emailAccountId,
        status: 'draft',
        testVariables: config.testVariables,
        sampleSize: config.sampleSize || 100,
        createdById: userId,
        createdAt: new Date(),
        metadata: { createdVia: 'ai-monitoring-service' }
      }).returning({ id: deliverabilityTests.id });
      
      if (!test || !test.id) {
        throw new Error('Failed to create test');
      }
      
      // Create the variants
      for (const variant of config.variants) {
        await db.insert(deliverabilityTestVariants).values({
          testId: test.id,
          variantName: variant.variantName,
          subjectLine: variant.subjectLine,
          fromName: variant.fromName,
          sendTime: variant.sendTime,
          content: variant.content,
          isWinner: false,
          metadata: {}
        });
      }
      
      return test.id;
    } catch (error) {
      console.error('Error creating deliverability test:', error);
      throw new Error('Failed to create deliverability test');
    }
  }
  
  /**
   * Get results of a deliverability A/B test
   * @param testId - ID of the test to retrieve
   * @returns Test results with metrics and recommendations
   */
  async getDeliverabilityTestResults(testId: number): Promise<ABTestResults> {
    try {
      // Get the test details
      const [test] = await db
        .select()
        .from(deliverabilityTests)
        .where(eq(deliverabilityTests.id, testId));
        
      if (!test) {
        throw new Error(`Test not found: ${testId}`);
      }
      
      // Get the variants with metrics
      const variants = await db
        .select()
        .from(deliverabilityTestVariants)
        .where(eq(deliverabilityTestVariants.testId, testId));
        
      if (variants.length === 0) {
        throw new Error(`No variants found for test: ${testId}`);
      }
      
      // Format metrics for each variant
      const metrics = variants.map(v => ({
        variantId: v.id,
        variantName: v.variantName,
        deliveryRate: v.deliveryRate,
        inboxRate: v.inboxRate,
        openRate: v.openRate,
        clickRate: v.clickRate,
        bounceRate: v.bounceRate,
        complaintRate: v.complaintRate,
        isWinner: v.isWinner
      }));
      
      // Find the winner if there is one
      const winner = variants.find(v => v.isWinner);
      
      // If test is completed but no winner is marked, use AI to determine winner and generate recommendations
      let recommendations: string[] = [];
      if (test.status === 'completed' && !winner) {
        const aiResults = await this.analyzeTestResults(test, variants);
        recommendations = aiResults.recommendations;
        
        // Update the winner based on AI analysis if one was determined
        if (aiResults.winningVariantId) {
          await db
            .update(deliverabilityTestVariants)
            .set({ isWinner: true })
            .where(eq(deliverabilityTestVariants.id, aiResults.winningVariantId));
        }
      }
      
      return {
        testId,
        winningVariantId: winner?.id,
        winningVariantName: winner?.variantName,
        metrics,
        recommendations
      };
    } catch (error) {
      console.error(`Error getting deliverability test results for test ${testId}:`, error);
      return {
        testId,
        metrics: [],
        recommendations: ['Error retrieving test results']
      };
    }
  }
  
  /**
   * Use AI to analyze A/B test results and determine the winner
   * @param test - Test data
   * @param variants - Test variants with metrics
   * @returns Analysis with winning variant and recommendations
   */
  private async analyzeTestResults(
    test: typeof deliverabilityTests.$inferSelect,
    variants: (typeof deliverabilityTestVariants.$inferSelect)[]
  ): Promise<{ winningVariantId?: number; recommendations: string[] }> {
    try {
      // Prepare variants data for the prompt
      const variantsText = variants.map(v => {
        return `
Variant: ${v.variantName}
${v.subjectLine ? `Subject Line: ${v.subjectLine}` : ''}
${v.fromName ? `From Name: ${v.fromName}` : ''}
${v.sendTime ? `Send Time: ${new Date(v.sendTime).toISOString()}` : ''}
Metrics:
- Delivery Rate: ${v.deliveryRate !== null ? `${v.deliveryRate}%` : 'N/A'}
- Inbox Placement: ${v.inboxRate !== null ? `${v.inboxRate}%` : 'N/A'}
- Open Rate: ${v.openRate !== null ? `${v.openRate}%` : 'N/A'}
- Click Rate: ${v.clickRate !== null ? `${v.clickRate}%` : 'N/A'}
- Bounce Rate: ${v.bounceRate !== null ? `${v.bounceRate}%` : 'N/A'}
- Complaint Rate: ${v.complaintRate !== null ? `${v.complaintRate}%` : 'N/A'}
`;
      }).join('\n');
      
      // Prompt for the analysis
      const prompt = `
You are an email deliverability expert analyzing the results of an A/B test for email deliverability.
Based on these results, determine the winning variant and provide recommendations for future emails.

TEST DETAILS:
Name: ${test.name}
Variables Tested: ${test.testVariables.join(', ')}
Sample Size: ${test.sampleSize || 'Not specified'}

VARIANTS:
${variantsText}

Please:
1. Determine the winning variant (if there's enough data to make a determination)
2. Explain why this variant performed better
3. Provide 3-5 specific recommendations based on the test results
4. Suggest follow-up tests if appropriate

Respond in JSON format with these keys:
winningVariant (string - name of winning variant, or null if inconclusive),
winningReason (string - explanation),
recommendations (array of strings)
`;

      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });

      const responseText = response.choices[0].message.content;
      if (!responseText) {
        throw new Error('Empty response from AI');
      }

      const analysis = JSON.parse(responseText);
      
      // Find the winning variant ID if a winner was determined
      let winningVariantId: number | undefined;
      if (analysis.winningVariant) {
        const winner = variants.find(v => v.variantName === analysis.winningVariant);
        if (winner) {
          winningVariantId = winner.id;
        }
      }
      
      // Prepare recommendations
      let recommendations = analysis.recommendations || [];
      if (analysis.winningReason) {
        recommendations.unshift(`Winner: ${analysis.winningVariant || 'Inconclusive'} - ${analysis.winningReason}`);
      }
      
      return {
        winningVariantId,
        recommendations
      };
    } catch (error) {
      console.error('Error analyzing test results with AI:', error);
      return {
        recommendations: ['Could not analyze test results with AI. Please try again later.']
      };
    }
  }
  
  /**
   * Monitor account reputation and create alerts for potential issues
   * @param emailAccountId - Email account ID to monitor
   * @returns Array of alerts for the account
   */
  async monitorAccountReputation(emailAccountId: number): Promise<ReputationAlertInfo[]> {
    try {
      // Get the account details
      const [account] = await db
        .select({
          email: emailAccounts.email,
          bounceRate: emailAccounts.bounceRate,
          complaintRate: emailAccounts.complaintRate,
          openRate: emailAccounts.openRate,
          clickRate: emailAccounts.clickRate,
          replyRate: emailAccounts.replyRate,
          healthScore: emailAccounts.healthScore
        })
        .from(emailAccounts)
        .where(eq(emailAccounts.id, emailAccountId));
        
      if (!account) {
        throw new Error(`Account not found: ${emailAccountId}`);
      }
      
      const alerts: ReputationAlertInfo[] = [];
      
      // Check bounce rate (over 5% is problematic)
      if (account.bounceRate && account.bounceRate > 5) {
        alerts.push({
          emailAccountId,
          alertType: 'bounce_rate',
          severity: account.bounceRate > 10 ? 'critical' : 'warning',
          message: `High bounce rate detected: ${account.bounceRate.toFixed(2)}%`,
          detectedValue: `${account.bounceRate.toFixed(2)}%`,
          threshold: '5%'
        });
      }
      
      // Check complaint rate (over 0.1% is problematic)
      if (account.complaintRate && account.complaintRate > 0.1) {
        alerts.push({
          emailAccountId,
          alertType: 'complaint_rate',
          severity: account.complaintRate > 0.5 ? 'critical' : 'warning',
          message: `High complaint rate detected: ${account.complaintRate.toFixed(2)}%`,
          detectedValue: `${account.complaintRate.toFixed(2)}%`,
          threshold: '0.1%'
        });
      }
      
      // Check open rate (under 10% might indicate deliverability issues)
      if (account.openRate !== null && account.openRate < 10) {
        alerts.push({
          emailAccountId,
          alertType: 'low_engagement',
          severity: 'warning',
          message: `Low open rate detected: ${account.openRate.toFixed(2)}%`,
          detectedValue: `${account.openRate.toFixed(2)}%`,
          threshold: '10%'
        });
      }
      
      // Check health score (under 50 indicates problems)
      if (account.healthScore !== null && account.healthScore < 50) {
        alerts.push({
          emailAccountId,
          alertType: 'overall_health',
          severity: account.healthScore < 30 ? 'critical' : 'warning',
          message: `Low sending reputation score: ${account.healthScore}/100`,
          detectedValue: `${account.healthScore}/100`,
          threshold: '50/100'
        });
      }
      
      // Look for recent delivery events that might indicate issues
      const recentIssues = await db
        .select({
          eventType: emailDeliveryEvents.eventType,
          timestamp: emailDeliveryEvents.timestamp,
          count: sql<number>`count(*)::integer`
        })
        .from(emailDeliveryEvents)
        .where(
          and(
            eq(emailDeliveryEvents.emailAccountId, emailAccountId),
            or(
              eq(emailDeliveryEvents.eventType, 'bounce'),
              eq(emailDeliveryEvents.eventType, 'complaint'),
              eq(emailDeliveryEvents.eventType, 'blocklisted'),
              eq(emailDeliveryEvents.eventType, 'rejected')
            ),
            gt(emailDeliveryEvents.timestamp, sql`now() - interval '24 hours'`)
          )
        )
        .groupBy(emailDeliveryEvents.eventType, emailDeliveryEvents.timestamp)
        .having(sql`count(*) > 3`) // More than 3 of the same issue in 24h
        .orderBy(desc(emailDeliveryEvents.timestamp));
      
      // Add alerts for recent delivery issues
      for (const issue of recentIssues) {
        alerts.push({
          emailAccountId,
          alertType: `recent_${issue.eventType}s`,
          severity: 'warning',
          message: `${issue.count} ${issue.eventType} events in the last 24 hours`,
          detectedValue: `${issue.count} events`,
          threshold: '3 events/24h'
        });
      }
      
      // Store new alerts in the database
      for (const alert of alerts) {
        // Check if a similar unresolved alert already exists
        const existingAlerts = await db
          .select({ id: reputationAlerts.id })
          .from(reputationAlerts)
          .where(
            and(
              eq(reputationAlerts.emailAccountId, alert.emailAccountId),
              eq(reputationAlerts.alertType, alert.alertType),
              eq(reputationAlerts.isResolved, false)
            )
          )
          .limit(1);
          
        // Only create a new alert if no similar unresolved alert exists
        if (existingAlerts.length === 0) {
          await db.insert(reputationAlerts).values({
            emailAccountId: alert.emailAccountId,
            alertType: alert.alertType,
            severity: alert.severity,
            message: alert.message,
            detectedValue: alert.detectedValue,
            threshold: alert.threshold,
            timestamp: new Date(),
            isResolved: false,
            metadata: {}
          });
        }
      }
      
      return alerts;
    } catch (error) {
      console.error(`Error monitoring account reputation for ID ${emailAccountId}:`, error);
      return [];
    }
  }
}

export const aiEmailMonitoringService = new AiEmailMonitoringService();