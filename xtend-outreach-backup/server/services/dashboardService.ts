import { db } from '../db';
import { 
  activities,
  notifications,
  campaigns,
  emails,
  contacts,
  proposals
} from '@shared/schema';
import { and, desc, eq, sql } from 'drizzle-orm';
import { startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay, subDays } from 'date-fns';

export const dashboardService = {
  // Get dashboard statistics
  async getDashboardStats() {
    const now = new Date();
    const currentMonth = startOfMonth(now);
    const lastMonth = startOfMonth(subMonths(now, 1));

    // Get campaign stats
    const [activeCampaigns] = await db
      .select({ count: sql<number>`count(*)` })
      .from(campaigns)
      .where(eq(campaigns.status, 'active'));

    const [lastMonthCampaigns] = await db
      .select({ count: sql<number>`count(*)` })
      .from(campaigns)
      .where(and(
        eq(campaigns.status, 'active'),
        sql`created_at >= ${lastMonth} AND created_at < ${currentMonth}`
      ));

    // Get email stats
    const [emailStats] = await db
      .select({
        sent: sql<number>`count(*)`,
        opened: sql<number>`count(case when opened_at is not null then 1 end)`,
        replied: sql<number>`count(case when replied_at is not null then 1 end)`
      })
      .from(emails)
      .where(sql`created_at >= ${currentMonth}`);

    const [lastMonthEmailStats] = await db
      .select({
        sent: sql<number>`count(*)`,
        opened: sql<number>`count(case when opened_at is not null then 1 end)`,
        replied: sql<number>`count(case when replied_at is not null then 1 end)`
      })
      .from(emails)
      .where(sql`created_at >= ${lastMonth} AND created_at < ${currentMonth}`);

    // Calculate changes
    const campaignsChange = lastMonthCampaigns?.count > 0
      ? ((activeCampaigns.count - lastMonthCampaigns.count) / lastMonthCampaigns.count) * 100
      : 0;

    const emailsChange = lastMonthEmailStats?.sent > 0
      ? ((emailStats.sent - lastMonthEmailStats.sent) / lastMonthEmailStats.sent) * 100
      : 0;

    const currentOpenRate = emailStats.sent > 0
      ? (emailStats.opened / emailStats.sent) * 100
      : 0;

    const lastMonthOpenRate = lastMonthEmailStats.sent > 0
      ? (lastMonthEmailStats.opened / lastMonthEmailStats.sent) * 100
      : 0;

    const openRateChange = lastMonthOpenRate > 0
      ? ((currentOpenRate - lastMonthOpenRate) / lastMonthOpenRate) * 100
      : 0;

    const currentResponseRate = emailStats.sent > 0
      ? (emailStats.replied / emailStats.sent) * 100
      : 0;

    const lastMonthResponseRate = lastMonthEmailStats.sent > 0
      ? (lastMonthEmailStats.replied / lastMonthEmailStats.sent) * 100
      : 0;

    const responseRateChange = lastMonthResponseRate > 0
      ? ((currentResponseRate - lastMonthResponseRate) / lastMonthResponseRate) * 100
      : 0;

    return {
      activeCampaigns: activeCampaigns.count,
      campaignsChange,
      emailsSent: emailStats.sent,
      emailsChange,
      openRate: Math.round(currentOpenRate * 10) / 10,
      openRateChange: Math.round(openRateChange * 10) / 10,
      responseRate: Math.round(currentResponseRate * 10) / 10,
      responseRateChange: Math.round(responseRateChange * 10) / 10
    };
  },

  // Get recent activities
  async getRecentActivities(limit = 10) {
    return db
      .select()
      .from(activities)
      .orderBy(desc(activities.timestamp))
      .limit(limit);
  },

  // Get notifications
  async getNotifications(userId: number, limit = 10) {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.timestamp))
      .limit(limit);
  },

  // Mark notification as read
  async markNotificationAsRead(notificationId: number) {
    return db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, notificationId));
  },

  // Create a new activity
  async createActivity(data: {
    type: string;
    action: string;
    description: string;
    metadata?: any;
    userId?: number;
  }) {
    return db.insert(activities).values(data);
  },

  // Create a new notification
  async createNotification(data: {
    title: string;
    message: string;
    type: string;
    metadata?: any;
    userId?: number;
  }) {
    return db.insert(notifications).values(data);
  },

  // Get performance data
  async getPerformanceData(period: '6m' | '1y' = '6m') {
    const now = new Date();
    const startDate = period === '1y' 
      ? subMonths(now, 12)
      : subMonths(now, 6);

    const monthlyStats = await db
      .select({
        month: sql`date_trunc('month', created_at)`,
        sent: sql<number>`count(*)`,
        opened: sql<number>`count(case when opened_at is not null then 1 end)`,
        replied: sql<number>`count(case when replied_at is not null then 1 end)`
      })
      .from(emails)
      .where(sql`created_at >= ${startDate}`)
      .groupBy(sql`date_trunc('month', created_at)`)
      .orderBy(sql`date_trunc('month', created_at)`);

    return monthlyStats.map(stat => ({
      month: stat.month,
      openRate: stat.sent > 0 ? (stat.opened / stat.sent) * 100 : 0,
      responseRate: stat.sent > 0 ? (stat.replied / stat.sent) * 100 : 0
    }));
  },

  // Get real-time metrics for today
  async getRealTimeMetrics() {
    const today = new Date();
    const yesterday = subDays(today, 1);
    
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    const yesterdayStart = startOfDay(yesterday);
    const yesterdayEnd = endOfDay(yesterday);

    // Get today's stats
    const [todayStats] = await db
      .select({
        sent: sql<number>`count(*)`,
        opened: sql<number>`count(case when opened_at is not null then 1 end)`,
        replied: sql<number>`count(case when replied_at is not null then 1 end)`
      })
      .from(emails)
      .where(sql`created_at >= ${todayStart} AND created_at <= ${todayEnd}`);

    // Get yesterday's stats for comparison
    const [yesterdayStats] = await db
      .select({
        sent: sql<number>`count(*)`,
        opened: sql<number>`count(case when opened_at is not null then 1 end)`,
        replied: sql<number>`count(case when replied_at is not null then 1 end)`
      })
      .from(emails)
      .where(sql`created_at >= ${yesterdayStart} AND created_at <= ${yesterdayEnd}`);

    // Calculate success rate and changes
    const successRate = todayStats.sent > 0
      ? ((todayStats.opened + todayStats.replied) / (todayStats.sent * 2)) * 100
      : 0;

    const calculateChange = (today: number, yesterday: number) => {
      if (yesterday === 0) return 0;
      return ((today - yesterday) / yesterday) * 100;
    };

    return {
      todayStats: {
        emailsSent: todayStats.sent,
        emailsOpened: todayStats.opened,
        emailsReplied: todayStats.replied,
        successRate: Math.round(successRate * 10) / 10
      },
      comparisonStats: {
        emailsSentChange: Math.round(calculateChange(todayStats.sent, yesterdayStats.sent) * 10) / 10,
        openRateChange: Math.round(calculateChange(todayStats.opened, yesterdayStats.opened) * 10) / 10,
        replyRateChange: Math.round(calculateChange(todayStats.replied, yesterdayStats.replied) * 10) / 10
      }
    };
  }
}; 