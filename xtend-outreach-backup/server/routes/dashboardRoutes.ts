import { Router } from 'express';
import { db } from '../db';
import { 
  campaigns,
  emails,
  activities,
  notifications,
  contacts,
  proposals
} from '@shared/schema';
import { and, desc, eq, sql } from 'drizzle-orm';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { dashboardService } from '../services/dashboardService';

const router = Router();

// Get dashboard statistics
router.get('/stats', async (_req, res) => {
  try {
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

    res.json({
      activeCampaigns: activeCampaigns.count,
      campaignsChange,
      emailsSent: emailStats.sent,
      emailsChange,
      openRate: Math.round(currentOpenRate * 10) / 10,
      openRateChange: Math.round(openRateChange * 10) / 10,
      responseRate: Math.round(currentResponseRate * 10) / 10,
      responseRateChange: Math.round(responseRateChange * 10) / 10
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Get recent activities
router.get('/activities', async (_req, res) => {
  try {
    const recentActivities = await db
      .select()
      .from(activities)
      .orderBy(desc(activities.timestamp))
      .limit(10);

    res.json(recentActivities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// Get notifications
router.get('/notifications', async (_req, res) => {
  try {
    const userNotifications = await db
      .select()
      .from(notifications)
      .orderBy(desc(notifications.timestamp))
      .limit(10);

    res.json(userNotifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.patch('/notifications/:id/read', async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    
    if (isNaN(notificationId)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, notificationId));

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Get performance data
router.get('/performance', async (req, res) => {
  try {
    const { period = '6m' } = req.query;
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

    const data = monthlyStats.map(stat => ({
      month: stat.month,
      openRate: stat.sent > 0 ? (stat.opened / stat.sent) * 100 : 0,
      responseRate: stat.sent > 0 ? (stat.replied / stat.sent) * 100 : 0
    }));

    res.json(data);
  } catch (error) {
    console.error('Error fetching performance data:', error);
    res.status(500).json({ error: 'Failed to fetch performance data' });
  }
});

// Get real-time metrics
router.get('/real-time-metrics', async (_req, res) => {
  try {
    const metrics = await dashboardService.getRealTimeMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching real-time metrics:', error);
    res.status(500).json({ error: 'Failed to fetch real-time metrics' });
  }
});

export function registerDashboardRoutes(app: any) {
  app.use('/api', router);
} 