/**
 * AI Monitoring Routes
 * 
 * Routes for AI-based email deliverability monitoring, including:
 * - Content analysis (spam detection, deliverability scoring)
 * - Account health analysis
 * - Inbox placement prediction
 * - A/B testing for deliverability
 * - Reputation alerts
 */

import { Router, Request, Response, Express } from 'express';
import { aiEmailMonitoringService } from '../services/aiEmailMonitoringService';
import { db } from '../db';
import { 
  emailContentAnalysis, 
  accountHealthAnalysis,
  inboxPlacementPredictions,
  deliverabilityTests,
  deliverabilityTestVariants,
  reputationAlerts,
  emailAccounts
} from '@shared/schema';
import { desc, eq, and, sql, or, lt, gt, isNull } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

// Schema for content analysis request
const contentAnalysisSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  content: z.string().min(1, 'Content is required'),
  userId: z.number().optional()
});

// Schema for inbox placement prediction request
const inboxPredictionSchema = z.object({
  emailAccountId: z.number(),
  subject: z.string().min(1, 'Subject is required'),
  content: z.string().min(1, 'Content is required'),
  recipientDomains: z.array(z.string()).optional(),
  userId: z.number().optional()
});

// Schema for A/B test creation
const abTestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  emailAccountId: z.number(),
  testVariables: z.array(z.string()),
  sampleSize: z.number().optional(),
  variants: z.array(z.object({
    variantName: z.string().min(1, 'Variant name is required'),
    subjectLine: z.string().optional(),
    fromName: z.string().optional(),
    sendTime: z.string().optional(), // ISO date string
    content: z.string().optional()
  })).min(2, 'At least 2 variants are required')
});

/**
 * Analyze email content for deliverability
 * 
 * POST /api/ai-monitoring/content-analysis
 */
router.post('/content-analysis', async (req: Request, res: Response) => {
  try {
    const validatedData = contentAnalysisSchema.parse(req.body);
    
    const analysis = await aiEmailMonitoringService.analyzeEmailContent(
      validatedData.subject,
      validatedData.content,
      validatedData.userId
    );
    
    res.json(analysis);
  } catch (error) {
    console.error('Error in content analysis:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request data', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to analyze content' });
    }
  }
});

/**
 * Get recent content analyses
 * 
 * GET /api/ai-monitoring/content-analysis
 */
router.get('/content-analysis', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    const limit = req.query.limit ? Math.min(Number(req.query.limit), 50) : 10;
    
    const query = db
      .select()
      .from(emailContentAnalysis)
      .orderBy(desc(emailContentAnalysis.analysisDate))
      .limit(limit);
      
    if (userId) {
      query.where(eq(emailContentAnalysis.createdById, userId));
    }
    
    const analyses = await query;
    res.json(analyses);
  } catch (error) {
    console.error('Error fetching content analyses:', error);
    res.status(500).json({ error: 'Failed to fetch analyses' });
  }
});

/**
 * Analyze account health
 * 
 * POST /api/ai-monitoring/account-health
 */
router.post('/account-health', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.body;
    
    if (!accountId || typeof accountId !== 'number') {
      return res.status(400).json({ error: 'Account ID is required' });
    }
    
    const analysis = await aiEmailMonitoringService.analyzeAccountHealth(accountId);
    
    // Store the analysis in the database
    await db.insert(accountHealthAnalysis).values({
      emailAccountId: accountId,
      healthScore: analysis.healthScore,
      overallRating: analysis.overallRating,
      bounceRateAnalysis: analysis.bounceRateAnalysis,
      complaintRateAnalysis: analysis.complaintRateAnalysis,
      openRateAnalysis: analysis.openRateAnalysis,
      clickRateAnalysis: analysis.clickRateAnalysis,
      replyRateAnalysis: analysis.replyRateAnalysis,
      riskFactors: analysis.riskFactors,
      recommendations: analysis.recommendations,
      priorityActions: analysis.priorityActions,
      analysisDate: new Date(),
      aiModel: "gpt-4o",
      aiVersion: "20240513"
    });
    
    res.json(analysis);
  } catch (error) {
    console.error('Error in account health analysis:', error);
    res.status(500).json({ error: 'Failed to analyze account health' });
  }
});

/**
 * Get account health history
 * 
 * GET /api/ai-monitoring/account-health/:accountId
 */
router.get('/account-health/:accountId', async (req: Request, res: Response) => {
  try {
    const accountId = Number(req.params.accountId);
    
    if (isNaN(accountId)) {
      return res.status(400).json({ error: 'Invalid account ID' });
    }
    
    const analyses = await db
      .select()
      .from(accountHealthAnalysis)
      .where(eq(accountHealthAnalysis.emailAccountId, accountId))
      .orderBy(desc(accountHealthAnalysis.analysisDate))
      .limit(10);
      
    res.json(analyses);
  } catch (error) {
    console.error('Error fetching account health history:', error);
    res.status(500).json({ error: 'Failed to fetch account health history' });
  }
});

/**
 * Predict inbox placement
 * 
 * POST /api/ai-monitoring/inbox-prediction
 */
router.post('/inbox-prediction', async (req: Request, res: Response) => {
  try {
    const validatedData = inboxPredictionSchema.parse(req.body);
    
    const prediction = await aiEmailMonitoringService.predictInboxPlacement(
      validatedData.emailAccountId,
      validatedData.subject,
      validatedData.content,
      validatedData.recipientDomains,
      validatedData.userId
    );
    
    res.json(prediction);
  } catch (error) {
    console.error('Error in inbox placement prediction:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request data', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to predict inbox placement' });
    }
  }
});

/**
 * Get inbox placement predictions for an account
 * 
 * GET /api/ai-monitoring/inbox-prediction/:accountId
 */
router.get('/inbox-prediction/:accountId', async (req: Request, res: Response) => {
  try {
    const accountId = Number(req.params.accountId);
    
    if (isNaN(accountId)) {
      return res.status(400).json({ error: 'Invalid account ID' });
    }
    
    const predictions = await db
      .select()
      .from(inboxPlacementPredictions)
      .where(eq(inboxPlacementPredictions.emailAccountId, accountId))
      .orderBy(desc(inboxPlacementPredictions.predictionDate))
      .limit(10);
      
    res.json(predictions);
  } catch (error) {
    console.error('Error fetching inbox placement predictions:', error);
    res.status(500).json({ error: 'Failed to fetch inbox placement predictions' });
  }
});

/**
 * Create a new A/B test for deliverability
 * 
 * POST /api/ai-monitoring/ab-test
 */
router.post('/ab-test', async (req: Request, res: Response) => {
  try {
    const validatedData = abTestSchema.parse(req.body);
    const userId = req.body.userId || 1; // Default to user ID 1 if not provided
    
    // Process sendTime fields to convert string to Date objects
    const processedVariants = validatedData.variants.map(variant => {
      if (variant.sendTime) {
        return {
          ...variant,
          sendTime: new Date(variant.sendTime)
        };
      }
      return variant;
    });
    
    const testId = await aiEmailMonitoringService.createDeliverabilityTest(
      {
        ...validatedData,
        variants: processedVariants
      },
      userId
    );
    
    res.json({ testId, message: 'A/B test created successfully' });
  } catch (error) {
    console.error('Error creating A/B test:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request data', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to create A/B test' });
    }
  }
});

/**
 * Get A/B test results
 * 
 * GET /api/ai-monitoring/ab-test/:testId
 */
router.get('/ab-test/:testId', async (req: Request, res: Response) => {
  try {
    const testId = Number(req.params.testId);
    
    if (isNaN(testId)) {
      return res.status(400).json({ error: 'Invalid test ID' });
    }
    
    const results = await aiEmailMonitoringService.getDeliverabilityTestResults(testId);
    res.json(results);
  } catch (error) {
    console.error('Error fetching A/B test results:', error);
    res.status(500).json({ error: 'Failed to fetch A/B test results' });
  }
});

/**
 * Get all A/B tests for an account
 * 
 * GET /api/ai-monitoring/ab-test/account/:accountId
 */
router.get('/ab-test/account/:accountId', async (req: Request, res: Response) => {
  try {
    const accountId = Number(req.params.accountId);
    
    if (isNaN(accountId)) {
      return res.status(400).json({ error: 'Invalid account ID' });
    }
    
    const tests = await db
      .select()
      .from(deliverabilityTests)
      .where(eq(deliverabilityTests.emailAccountId, accountId))
      .orderBy(desc(deliverabilityTests.createdAt));
      
    res.json(tests);
  } catch (error) {
    console.error('Error fetching A/B tests:', error);
    res.status(500).json({ error: 'Failed to fetch A/B tests' });
  }
});

/**
 * Monitor account reputation
 * 
 * POST /api/ai-monitoring/reputation
 */
router.post('/reputation', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.body;
    
    if (!accountId || typeof accountId !== 'number') {
      return res.status(400).json({ error: 'Account ID is required' });
    }
    
    const alerts = await aiEmailMonitoringService.monitorAccountReputation(accountId);
    res.json({ alerts, message: 'Reputation monitoring completed' });
  } catch (error) {
    console.error('Error monitoring account reputation:', error);
    res.status(500).json({ error: 'Failed to monitor account reputation' });
  }
});

/**
 * Get reputation alerts for an account
 * 
 * GET /api/ai-monitoring/reputation/:accountId
 */
router.get('/reputation/:accountId', async (req: Request, res: Response) => {
  try {
    const accountId = Number(req.params.accountId);
    
    if (isNaN(accountId)) {
      return res.status(400).json({ error: 'Invalid account ID' });
    }
    
    const alerts = await db
      .select()
      .from(reputationAlerts)
      .where(eq(reputationAlerts.emailAccountId, accountId))
      .orderBy([
        desc(reputationAlerts.isResolved), // Unresolved alerts first
        desc(reputationAlerts.timestamp) // Most recent first
      ]);
      
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching reputation alerts:', error);
    res.status(500).json({ error: 'Failed to fetch reputation alerts' });
  }
});

/**
 * Resolve a reputation alert
 * 
 * PUT /api/ai-monitoring/reputation/:alertId/resolve
 */
router.put('/reputation/:alertId/resolve', async (req: Request, res: Response) => {
  try {
    const alertId = Number(req.params.alertId);
    const { userId } = req.body;
    
    if (isNaN(alertId)) {
      return res.status(400).json({ error: 'Invalid alert ID' });
    }
    
    await db
      .update(reputationAlerts)
      .set({
        isResolved: true,
        resolvedAt: new Date(),
        resolvedById: userId || null
      })
      .where(eq(reputationAlerts.id, alertId));
      
    res.json({ message: 'Alert resolved successfully' });
  } catch (error) {
    console.error('Error resolving reputation alert:', error);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

/**
 * Get monitoring dashboard summary
 * 
 * GET /api/ai-monitoring/dashboard
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    // Get all email accounts
    const accounts = await db
      .select({
        id: emailAccounts.id,
        email: emailAccounts.email,
        name: emailAccounts.name,
        provider: emailAccounts.provider,
        status: emailAccounts.status,
        healthScore: emailAccounts.healthScore,
        healthStatus: emailAccounts.healthStatus,
        lastHealthCheck: emailAccounts.lastHealthCheck
      })
      .from(emailAccounts)
      .where(eq(emailAccounts.status, 'active'));
    
    // Count active alerts by severity
    const alertCounts = await db
      .select({
        severity: reputationAlerts.severity,
        count: sql<number>`count(*)::integer`
      })
      .from(reputationAlerts)
      .where(eq(reputationAlerts.isResolved, false))
      .groupBy(reputationAlerts.severity);
    
    // Get recent content analyses
    const recentAnalyses = await db
      .select()
      .from(emailContentAnalysis)
      .orderBy(desc(emailContentAnalysis.analysisDate))
      .limit(5);
    
    // Calculate overall metrics
    const totalAccounts = accounts.length;
    const accountsWithIssues = accounts.filter(a => a.healthScore !== null && a.healthScore < 70).length;
    const averageHealthScore = accounts.reduce((sum, account) => sum + (account.healthScore || 0), 0) / 
      (accounts.filter(a => a.healthScore !== null).length || 1);
    
    // Format alert counts
    const formattedAlertCounts = {
      critical: 0,
      warning: 0,
      info: 0
    };
    
    alertCounts.forEach(alert => {
      formattedAlertCounts[alert.severity as keyof typeof formattedAlertCounts] = alert.count;
    });
    
    res.json({
      accountMetrics: {
        total: totalAccounts,
        withIssues: accountsWithIssues,
        averageHealthScore
      },
      alerts: formattedAlertCounts,
      accounts,
      recentAnalyses
    });
  } catch (error) {
    console.error('Error fetching monitoring dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch monitoring dashboard' });
  }
});

export function registerAiMonitoringRoutes(app: any) {
  app.use('/api/ai-monitoring', router);
}

export default router;