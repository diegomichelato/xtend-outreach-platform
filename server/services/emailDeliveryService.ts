import { db } from '../db';
import { 
  emailDeliveryEvents, 
  emails, 
  emailAccounts, 
  insertEmailDeliveryEventSchema 
} from '@shared/schema';
import { and, eq, gte, sql, count, avg, desc } from 'drizzle-orm';

interface EmailAccountMetrics {
  id: number;
  email: string;
  name?: string;
  provider?: string;
  totalSent: number;
  openRate: number | null;
  clickRate: number | null;
  replyRate: number | null;
  bounceRate: number | null;
  complaintRate: number | null;
  status: string;
  healthScore: number;
  healthStatus?: string;
  dailyLimit?: number | null;
  notes?: string | null;
  lastHealthCheck?: Date | null;
  lastUpdated: Date;


}

interface EmailSendingLimits {
  dailySendingLimit: number;
  hourlySendingLimit: number;
  dailySent: number;
  hourlySent: number;
  canSend: boolean;
  nextAvailableTime?: Date;
  estimatedWaitTimeMinutes?: number;
}

/**
 * EmailDeliveryService tracks email delivery events and maintains account health metrics
 */
export class EmailDeliveryService {
  
  /**
   * Record a new email delivery event
   * @param data - The email delivery event data
   * @returns The created email delivery event
   */
  async recordDeliveryEvent(data: any) {
    try {
      // Clean and validate the input using the schema
      const cleanedData = insertEmailDeliveryEventSchema.parse(data);
      
      // Insert the delivery event
      const [event] = await db
        .insert(emailDeliveryEvents)
        .values(cleanedData)
        .returning();
      
      // Update email status if it exists
      if (event.emailId) {
        await this.updateEmailStatus(event.emailId, event.eventType, new Date());
      }
      
      // If the event requires updating account metrics, do that too
      if (['bounce', 'complaint', 'delivered', 'opened', 'clicked', 'replied'].includes(event.eventType)) {
        await this.updateAccountMetrics(event.emailAccountId);
      }
      
      return event;
    } catch (error) {
      console.error('Error recording delivery event:', error);
      throw new Error(`Failed to record delivery event: ${error.message}`);
    }
  }
  
  /**
   * Update email status based on a delivery event
   * @param emailId - The email ID
   * @param eventType - The type of delivery event
   * @param timestamp - When the event occurred
   */
  private async updateEmailStatus(emailId: number, eventType: string, timestamp: Date) {
    try {
      const statusMapping: { [key: string]: { status: string, field: string } } = {
        delivered: { status: 'sent', field: 'sentAt' },
        opened: { status: 'opened', field: 'openedAt' },
        clicked: { status: 'clicked', field: 'clickedAt' },
        replied: { status: 'replied', field: 'repliedAt' },
        bounce: { status: 'bounced', field: 'bouncedAt' },
        complaint: { status: 'complained', field: 'complaintAt' }
      };
      
      if (statusMapping[eventType]) {
        const { status, field } = statusMapping[eventType];
        
        await db
          .update(emails)
          .set({
            status,
            [field]: timestamp,
            // Update delivery status for bounces
            ...(eventType === 'bounce' ? { deliveryStatus: 'bounced' } : {}),
          })
          .where(eq(emails.id, emailId));
      }
    } catch (error) {
      console.error(`Error updating email status for ID ${emailId}:`, error);
    }
  }
  
  /**
   * Update account metrics by analyzing recent events
   * @param accountId - The email account ID
   */
  async updateAccountMetrics(accountId: number) {
    try {
      // Set the analysis window (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Get total sent
      const [sentResult] = await db
        .select({ count: count() })
        .from(emailDeliveryEvents)
        .where(
          and(
            eq(emailDeliveryEvents.emailAccountId, accountId),
            eq(emailDeliveryEvents.eventType, 'delivered'),
            gte(emailDeliveryEvents.timestamp, thirtyDaysAgo)
          )
        );
      const totalSent = sentResult?.count || 0;
      
      // Skip further calculation if no emails were sent
      if (totalSent === 0) {
        return null;
      }
      
      // Get counts for various event types
      const eventCounts = await Promise.all([
        'opened', 'clicked', 'replied', 'bounce', 'complaint'
      ].map(async (eventType) => {
        const [result] = await db
          .select({ count: count() })
          .from(emailDeliveryEvents)
          .where(
            and(
              eq(emailDeliveryEvents.emailAccountId, accountId),
              eq(emailDeliveryEvents.eventType, eventType),
              gte(emailDeliveryEvents.timestamp, thirtyDaysAgo)
            )
          );
        return { eventType, count: result?.count || 0 };
      }));
      
      // Calculate rates
      const rates = eventCounts.reduce((acc, { eventType, count }) => {
        const rate = Math.round((count / totalSent) * 10000) / 100; // 2 decimal places
        const key = eventType === 'bounce' ? 'bounceRate' :
                  eventType === 'complaint' ? 'complaintRate' :
                  eventType === 'opened' ? 'openRate' :
                  eventType === 'clicked' ? 'clickRate' :
                  eventType === 'replied' ? 'replyRate' : 'unknown';
        return { ...acc, [key]: rate };
      }, {});
      
      // Update the account with the new metrics
      await db
        .update(emailAccounts)
        .set({
          openRate: rates.openRate || 0,
          clickRate: rates.clickRate || 0,
          replyRate: rates.replyRate || 0,
          bounceRate: rates.bounceRate || 0,
          complaintRate: rates.complaintRate || 0,
          lastHealthCheck: new Date()
        })
        .where(eq(emailAccounts.id, accountId));
      
      // Check if account needs to be paused due to high bounce or complaint rates
      if ((rates.bounceRate > 5 || rates.complaintRate > 0.1) && totalSent > 50) {
        await db
          .update(emailAccounts)
          .set({
            status: 'paused',
            notes: sql`CONCAT(${emailAccounts.notes}, '\nAccount automatically paused due to high bounce/complaint rate on ${new Date().toISOString()}')`
          })
          .where(eq(emailAccounts.id, accountId));
      }
      
      return rates;
    } catch (error) {
      console.error(`Error updating metrics for account ID ${accountId}:`, error);
      return null;
    }
  }
  
  /**
   * Get health metrics for all email accounts
   * @returns Array of email account metrics
   */
  async getAccountHealthMetrics(): Promise<EmailAccountMetrics[]> {
    try {
      console.log("Fetching email account health metrics including Smartlead accounts");
      // Ensure we fetch everything including from Smartlead
      const accounts = await db
        .select({
          id: emailAccounts.id,
          email: emailAccounts.email,
          name: emailAccounts.name,
          provider: emailAccounts.provider,
          openRate: emailAccounts.openRate,
          clickRate: emailAccounts.clickRate,
          replyRate: emailAccounts.replyRate,
          bounceRate: emailAccounts.bounceRate,
          complaintRate: emailAccounts.complaintRate,
          status: emailAccounts.status,
          dailyLimit: emailAccounts.dailyLimit,
          notes: emailAccounts.notes,
          lastHealthCheck: emailAccounts.lastHealthCheck
        })
        .from(emailAccounts);
      
      // Get the count of sent emails for each account
      const accountSentCounts = await Promise.all(
        accounts.map(async (account) => {
          const [countResult] = await db
            .select({ count: count() })
            .from(emailDeliveryEvents)
            .where(
              and(
                eq(emailDeliveryEvents.emailAccountId, account.id),
                eq(emailDeliveryEvents.eventType, 'delivered')
              )
            );
          return {
            accountId: account.id,
            totalSent: countResult?.count || 0
          };
        })
      );
      
      // Create a map for easy lookup
      const sentCountsMap = new Map(
        accountSentCounts.map(item => [item.accountId, item.totalSent])
      );
      
      return accounts.map(account => {
        // Calculate a health score based on metrics
        const healthScore = this.calculateHealthScore(account);
        const totalSent = sentCountsMap.get(account.id) || 0;
        
        // Determine health status based on score
        let healthStatus = 'unknown';
        if (healthScore >= 80) healthStatus = 'good';
        else if (healthScore >= 60) healthStatus = 'fair';
        else if (healthScore >= 40) healthStatus = 'poor';
        else if (healthScore >= 0) healthStatus = 'critical';
        
        return {
          ...account,
          totalSent,
          healthScore,
          healthStatus,
          lastUpdated: account.lastHealthCheck || new Date()
        };
      });
    } catch (error) {
      console.error('Error getting account health metrics:', error);
      return [];
    }
  }
  
  /**
   * Calculate sending limits for an email account
   * @param accountId - The email account ID
   * @returns The sending limits and current usage
   */
  async getSendingLimits(accountId: number): Promise<EmailSendingLimits | null> {
    try {
      // Get the account settings
      const [account] = await db
        .select({
          dailyLimit: emailAccounts.dailyLimit,
          hourlyLimit: emailAccounts.hourlyLimit,
          warmupEnabled: emailAccounts.warmupEnabled,
          warmupInProgress: emailAccounts.warmupInProgress,
          warmupDailyIncrement: emailAccounts.warmupDailyIncrement,
          warmupMaxVolume: emailAccounts.warmupMaxVolume,
          warmupStartDate: emailAccounts.warmupStartDate
        })
        .from(emailAccounts)
        .where(eq(emailAccounts.id, accountId));
      
      if (!account) {
        return null;
      }
      
      // Apply warmup logic if enabled
      let dailySendingLimit = account.dailyLimit || 100;
      let hourlySendingLimit = account.hourlyLimit || 25;
      
      if (account.warmupEnabled && account.warmupInProgress && account.warmupStartDate) {
        const daysInWarmup = Math.floor(
          (new Date().getTime() - account.warmupStartDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        // Calculate daily limit based on warmup progression
        const warmupDailyLimit = Math.min(
          (daysInWarmup + 1) * (account.warmupDailyIncrement || 5),
          account.warmupMaxVolume || 100
        );
        
        dailySendingLimit = Math.min(dailySendingLimit, warmupDailyLimit);
        hourlySendingLimit = Math.ceil(dailySendingLimit / 8); // Spread throughout working hours
      }
      
      // Get counts for emails sent today and in the last hour
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const hourAgo = new Date();
      hourAgo.setHours(hourAgo.getHours() - 1);
      
      const [dailyCount] = await db
        .select({ count: count() })
        .from(emailDeliveryEvents)
        .where(
          and(
            eq(emailDeliveryEvents.emailAccountId, accountId),
            eq(emailDeliveryEvents.eventType, 'delivered'),
            gte(emailDeliveryEvents.timestamp, today)
          )
        );
      
      const [hourlyCount] = await db
        .select({ count: count() })
        .from(emailDeliveryEvents)
        .where(
          and(
            eq(emailDeliveryEvents.emailAccountId, accountId),
            eq(emailDeliveryEvents.eventType, 'delivered'),
            gte(emailDeliveryEvents.timestamp, hourAgo)
          )
        );
      
      const dailySent = dailyCount?.count || 0;
      const hourlySent = hourlyCount?.count || 0;
      
      // Check if sending is allowed
      const canSend = dailySent < dailySendingLimit && hourlySent < hourlySendingLimit;
      
      // Calculate next available time if limits exceeded
      let nextAvailableTime = undefined;
      let estimatedWaitTimeMinutes = undefined;
      
      if (!canSend) {
        if (hourlySent >= hourlySendingLimit) {
          // Hourly limit exceeded - need to wait until next hour
          const latestSent = await db
            .select({ timestamp: emailDeliveryEvents.timestamp })
            .from(emailDeliveryEvents)
            .where(
              and(
                eq(emailDeliveryEvents.emailAccountId, accountId),
                eq(emailDeliveryEvents.eventType, 'delivered')
              )
            )
            .orderBy(desc(emailDeliveryEvents.timestamp))
            .limit(hourlySendingLimit);
          
          if (latestSent.length > 0) {
            const oldestInHour = latestSent[latestSent.length - 1]?.timestamp;
            if (oldestInHour) {
              nextAvailableTime = new Date(oldestInHour);
              nextAvailableTime.setHours(nextAvailableTime.getHours() + 1);
              
              const now = new Date();
              estimatedWaitTimeMinutes = Math.ceil(
                (nextAvailableTime.getTime() - now.getTime()) / (1000 * 60)
              );
            }
          }
        } else if (dailySent >= dailySendingLimit) {
          // Daily limit exceeded - need to wait until tomorrow
          nextAvailableTime = new Date();
          nextAvailableTime.setDate(nextAvailableTime.getDate() + 1);
          nextAvailableTime.setHours(0, 0, 0, 0);
          
          const now = new Date();
          estimatedWaitTimeMinutes = Math.ceil(
            (nextAvailableTime.getTime() - now.getTime()) / (1000 * 60)
          );
        }
      }
      
      return {
        dailySendingLimit,
        hourlySendingLimit,
        dailySent,
        hourlySent,
        canSend,
        nextAvailableTime,
        estimatedWaitTimeMinutes
      };
    } catch (error) {
      console.error(`Error getting sending limits for account ID ${accountId}:`, error);
      return null;
    }
  }
  
  /**
   * Calculate a health score for an email account
   * @param account - Email account metrics
   * @returns Health score (0-100)
   */
  private calculateHealthScore(account: any): number {
    if (!account) return 0;
    
    // Define weights for each metric
    const weights = {
      openRate: 0.3,
      clickRate: 0.2,
      replyRate: 0.2,
      bounceRate: -0.15, // Negative impact
      complaintRate: -0.15 // Negative impact
    };
    
    // Define ideal values
    const idealValues = {
      openRate: 30, // 30% open rate is good
      clickRate: 10, // 10% click rate is good
      replyRate: 5,  // 5% reply rate is good
      bounceRate: 0, // 0% bounce rate is ideal
      complaintRate: 0 // 0% complaint rate is ideal
    };
    
    // Calculate score components
    let score = 50; // Start at neutral
    
    // Add positive factors
    score += Math.min(account.openRate, idealValues.openRate) * weights.openRate * 2;
    score += Math.min(account.clickRate, idealValues.clickRate) * weights.clickRate * 3;
    score += Math.min(account.replyRate, idealValues.replyRate) * weights.replyRate * 4;
    
    // Subtract negative factors
    score += Math.min(10, account.bounceRate) * weights.bounceRate * 5; // Higher penalty for bounces
    score += Math.min(2, account.complaintRate) * weights.complaintRate * 25; // Very high penalty for complaints
    
    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, Math.round(score)));
  }
  
  /**
   * Calculate a random delay for email sending (jitter)
   * @param maxMinutes - Maximum delay in minutes
   * @returns Delay in milliseconds
   */
  getRandomDelay(maxMinutes: number = 5): number {
    return Math.floor(Math.random() * maxMinutes * 60 * 1000);
  }
}

export const emailDeliveryService = new EmailDeliveryService();