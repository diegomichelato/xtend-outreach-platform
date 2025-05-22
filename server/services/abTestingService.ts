/**
 * A/B Testing Service
 * Provides functionality for creating, managing, and analyzing A/B tests for email campaigns
 */

import { db } from '../db';
import { emailDeliveryEvents, emails, campaigns } from '@shared/schema';
import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import { storage } from '../storage';

// Types for A/B testing
export interface AbTestVariant {
  id: number;
  name: string;
  description?: string;
  subjectLine?: string;
  emailBody?: string;
  senderId?: number;
  sendTime?: string;
  content?: any;
}

export interface AbTestDistribution {
  type: 'equal' | 'percentage';
  values?: number[]; // For percentage distribution
}

export interface AbTestResult {
  testId: number;
  testType: string;
  variants: AbTestVariantResult[];
  winningVariantId: number | null;
  winningMetric: string | null;
  confidenceLevel: number | null;
  sampleSize: number;
  testStartDate: Date;
  testEndDate: Date | null;
  analysisDate: Date | null;
  status: string;
}

export interface AbTestVariantResult {
  variantId: number;
  variantName: string;
  deliveryRate: number | null;
  inboxRate: number | null;
  openRate: number | null;
  clickRate: number | null;
  bounceRate: number | null;
  complaintRate: number | null;
  replyRate: number | null;
  conversionRate: number | null;
  sampleSize: number;
  isWinner: boolean;
}

export interface CreateAbTestParams {
  campaignId: number;
  testType: string;
  variantCount: number;
  variants: AbTestVariant[];
  winnerMetric: string;
  distribution: AbTestDistribution;
  sampleSize?: number;
  notes?: string;
}

export class AbTestingService {
  /**
   * Create a new A/B test for a campaign
   */
  async createAbTest(params: CreateAbTestParams): Promise<number> {
    try {
      const campaign = await storage.getCampaign(params.campaignId);
      
      if (!campaign) {
        throw new Error(`Campaign with ID ${params.campaignId} not found`);
      }
      
      // Update the campaign with A/B testing settings
      const updatedCampaign = await storage.updateCampaign(params.campaignId, {
        isAbTest: true,
        abTestType: params.testType,
        abTestVariantCount: params.variantCount,
        abTestWinnerMetric: params.winnerMetric,
        abTestStatus: 'setup',
        abTestVariants: params.variants,
        abTestDistribution: params.distribution,
        abTestSampleSize: params.sampleSize || Math.floor(100 / params.variantCount),
        abTestNotes: params.notes
      });
      
      console.log(`Created A/B test for campaign ${params.campaignId} with ${params.variantCount} variants`);
      
      return params.campaignId;
    } catch (error) {
      console.error('Error creating A/B test:', error);
      throw new Error(`Failed to create A/B test: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get A/B test configuration for a campaign
   */
  async getAbTestConfig(campaignId: number): Promise<any> {
    try {
      const campaign = await storage.getCampaign(campaignId);
      
      if (!campaign) {
        throw new Error(`Campaign with ID ${campaignId} not found`);
      }
      
      if (!campaign.isAbTest) {
        throw new Error(`Campaign with ID ${campaignId} is not an A/B test`);
      }
      
      return {
        campaignId,
        testType: campaign.abTestType,
        variantCount: campaign.abTestVariantCount,
        variants: campaign.abTestVariants,
        winnerMetric: campaign.abTestWinnerMetric,
        distribution: campaign.abTestDistribution,
        sampleSize: campaign.abTestSampleSize,
        status: campaign.abTestStatus,
        winnerVariantId: campaign.abTestWinnerVariantId,
        winnerDecidedAt: campaign.abTestWinnerDecidedAt,
        notes: campaign.abTestNotes
      };
    } catch (error) {
      console.error('Error getting A/B test config:', error);
      throw new Error(`Failed to get A/B test config: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Analyze results of an A/B test
   */
  async analyzeAbTestResults(campaignId: number): Promise<AbTestResult> {
    try {
      // Get the campaign details
      const campaign = await storage.getCampaign(campaignId);
      
      if (!campaign) {
        throw new Error(`Campaign with ID ${campaignId} not found`);
      }
      
      if (!campaign.isAbTest) {
        throw new Error(`Campaign with ID ${campaignId} is not an A/B test`);
      }
      
      if (!campaign.abTestVariants || !Array.isArray(campaign.abTestVariants)) {
        throw new Error(`Campaign ${campaignId} has no test variants configured`);
      }
      
      // Collect metrics for each variant
      const variants: AbTestVariantResult[] = [];
      
      for (const variant of campaign.abTestVariants) {
        // Get emails sent for this variant
        const variantEmails = await db
          .select({
            id: emails.id,
            status: emails.status,
            openedAt: emails.openedAt,
            clickedAt: emails.clickedAt,
            repliedAt: emails.repliedAt,
            bouncedAt: emails.bouncedAt,
            complaintAt: emails.complaintAt
          })
          .from(emails)
          .where(
            and(
              eq(emails.campaignId, campaignId),
              sql`email_metadata->'variantId' = ${variant.id}::text`
            )
          );
          
        const totalCount = variantEmails.length;
        
        if (totalCount === 0) {
          // Skip variants with no data
          continue;
        }
        
        // Calculate metrics
        const openedCount = variantEmails.filter(e => e.openedAt !== null).length;
        const clickedCount = variantEmails.filter(e => e.clickedAt !== null).length;
        const repliedCount = variantEmails.filter(e => e.repliedAt !== null).length;
        const bouncedCount = variantEmails.filter(e => e.bouncedAt !== null).length;
        const complaintCount = variantEmails.filter(e => e.complaintAt !== null).length;
        const deliveredCount = totalCount - bouncedCount;
        
        variants.push({
          variantId: variant.id,
          variantName: variant.name,
          sampleSize: totalCount,
          deliveryRate: totalCount > 0 ? (deliveredCount / totalCount) * 100 : null,
          inboxRate: null, // We don't track this directly
          openRate: deliveredCount > 0 ? (openedCount / deliveredCount) * 100 : null,
          clickRate: deliveredCount > 0 ? (clickedCount / deliveredCount) * 100 : null,
          replyRate: deliveredCount > 0 ? (repliedCount / deliveredCount) * 100 : null,
          bounceRate: totalCount > 0 ? (bouncedCount / totalCount) * 100 : null,
          complaintRate: totalCount > 0 ? (complaintCount / totalCount) * 100 : null,
          conversionRate: null, // We don't track conversions directly yet
          isWinner: false // Will be determined later
        });
      }
      
      if (variants.length === 0) {
        throw new Error(`No data available for any variant in campaign ${campaignId}`);
      }
      
      // Determine the winner based on the chosen metric
      const winnerMetric = campaign.abTestWinnerMetric || 'openRate';
      let winningVariantId: number | null = null;
      let highestMetricValue = -1;
      
      for (const variant of variants) {
        const metricValue = variant[winnerMetric as keyof AbTestVariantResult] as number | null;
        
        if (metricValue !== null && metricValue > highestMetricValue) {
          highestMetricValue = metricValue;
          winningVariantId = variant.variantId;
        }
      }
      
      // Mark the winner
      if (winningVariantId !== null) {
        for (const variant of variants) {
          variant.isWinner = variant.variantId === winningVariantId;
        }
        
        // Update the campaign with the winner
        await storage.updateCampaign(campaignId, {
          abTestWinnerVariantId: winningVariantId,
          abTestStatus: 'completed',
          abTestWinnerDecidedAt: new Date()
        });
      }
      
      // Construct the result
      const result: AbTestResult = {
        testId: campaignId,
        testType: campaign.abTestType || 'unknown',
        variants,
        winningVariantId,
        winningMetric: campaign.abTestWinnerMetric,
        confidenceLevel: 95, // Default confidence level
        sampleSize: variants.reduce((sum, v) => sum + v.sampleSize, 0),
        testStartDate: campaign.startDate || campaign.createdAt,
        testEndDate: null, // Can be updated when the campaign ends
        analysisDate: new Date(),
        status: 'analyzed'
      };
      
      return result;
    } catch (error) {
      console.error('Error analyzing A/B test results:', error);
      throw new Error(`Failed to analyze A/B test results: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Apply A/B test variant to an email
   */
  async applyVariantToEmail(emailId: number, variantId: number): Promise<void> {
    try {
      // Get the email and campaign
      const email = await storage.getEmail(emailId);
      
      if (!email) {
        throw new Error(`Email with ID ${emailId} not found`);
      }
      
      const campaign = await storage.getCampaign(email.campaignId);
      
      if (!campaign) {
        throw new Error(`Campaign with ID ${email.campaignId} not found`);
      }
      
      if (!campaign.isAbTest) {
        throw new Error(`Campaign with ID ${email.campaignId} is not an A/B test`);
      }
      
      // Find the variant
      const variants = campaign.abTestVariants || [];
      const variant = variants.find(v => v.id === variantId);
      
      if (!variant) {
        throw new Error(`Variant with ID ${variantId} not found in campaign ${email.campaignId}`);
      }
      
      // Apply variant changes based on test type
      let updates: any = {
        // Store the variant ID in metadata
        metadata: {
          ...email.metadata,
          variantId
        }
      };
      
      if (campaign.abTestType === 'subject') {
        // Update subject line
        if (variant.subjectLine) {
          updates.subject = variant.subjectLine;
        }
      } else if (campaign.abTestType === 'body') {
        // Update email body
        if (variant.emailBody) {
          updates.body = variant.emailBody;
        }
      } else if (campaign.abTestType === 'sender') {
        // Update sender (email account)
        if (variant.senderId) {
          updates.emailAccountId = variant.senderId;
        }
      } else if (campaign.abTestType === 'time') {
        // Update sending time
        if (variant.sendTime) {
          const baseScheduledTime = email.scheduledAt || new Date();
          const [hours, minutes] = variant.sendTime.split(':').map(Number);
          
          const newScheduledTime = new Date(baseScheduledTime);
          newScheduledTime.setHours(hours, minutes);
          
          updates.scheduledAt = newScheduledTime;
        }
      } else if (campaign.abTestType === 'content') {
        // Update content (could include subject, body, etc.)
        if (variant.content) {
          if (variant.content.subject) {
            updates.subject = variant.content.subject;
          }
          if (variant.content.body) {
            updates.body = variant.content.body;
          }
        }
      }
      
      // Apply the updates
      await storage.updateEmail(emailId, updates);
      
    } catch (error) {
      console.error('Error applying variant to email:', error);
      throw new Error(`Failed to apply variant to email: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get all A/B test campaigns
   */
  async getAbTestCampaigns(): Promise<any[]> {
    try {
      const allCampaigns = await storage.getAllCampaigns();
      
      // Filter to only get A/B test campaigns
      const abTestCampaigns = allCampaigns.filter(campaign => campaign.isAbTest);
      
      return abTestCampaigns.map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        testType: campaign.abTestType,
        variantCount: campaign.abTestVariantCount,
        status: campaign.abTestStatus,
        winnerMetric: campaign.abTestWinnerMetric,
        winnerVariantId: campaign.abTestWinnerVariantId,
        createdAt: campaign.createdAt,
        startDate: campaign.startDate
      }));
    } catch (error) {
      console.error('Error getting A/B test campaigns:', error);
      throw new Error(`Failed to get A/B test campaigns: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export const abTestingService = new AbTestingService();