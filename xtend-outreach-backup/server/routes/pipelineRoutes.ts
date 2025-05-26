import { Router } from 'express';
import { db } from '../db';
import {
  pipelineCards,
  activities,
  notifications,
  type PipelineCard,
} from '@shared/schema';
import { and, desc, eq, sql } from 'drizzle-orm';

const router = Router();

// Get all pipeline deals with filters and sorting
router.get('/pipeline/deals', async (req, res) => {
  try {
    const { assignedTo, product, source, status, sortBy } = req.query;

    let query = db.select().from(pipelineCards);

    // Apply filters
    if (assignedTo) {
      query = query.where(eq(pipelineCards.assignedTo, assignedTo as string));
    }
    if (product) {
      query = query.where(eq(pipelineCards.product, product as string));
    }
    if (source) {
      query = query.where(eq(pipelineCards.source, source as string));
    }
    if (status) {
      query = query.where(eq(pipelineCards.status, status as string));
    }

    // Apply sorting
    if (sortBy === 'value') {
      query = query.orderBy(desc(pipelineCards.value));
    } else if (sortBy === 'date') {
      query = query.orderBy(desc(pipelineCards.updatedAt));
    } else if (sortBy === 'probability') {
      query = query.orderBy(desc(pipelineCards.probability));
    }

    const deals = await query;
    res.json(deals);
  } catch (error) {
    console.error('Error fetching pipeline deals:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline deals' });
  }
});

// Create new deal
router.post('/pipeline/deals', async (req, res) => {
  try {
    const dealData = req.body;
    const [deal] = await db
      .insert(pipelineCards)
      .values({
        ...dealData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Create activity
    await db.insert(activities).values({
      type: 'pipeline',
      action: 'create_deal',
      description: `New deal created: ${dealData.companyName}`,
      metadata: { dealId: deal.id },
      timestamp: new Date(),
      userId: req.user?.id,
    });

    res.json(deal);
  } catch (error) {
    console.error('Error creating pipeline deal:', error);
    res.status(500).json({ error: 'Failed to create pipeline deal' });
  }
});

// Update deal
router.put('/pipeline/deals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const [deal] = await db
      .update(pipelineCards)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(pipelineCards.id, parseInt(id)))
      .returning();

    // Create activity
    await db.insert(activities).values({
      type: 'pipeline',
      action: 'update_deal',
      description: `Deal updated: ${deal.companyName}`,
      metadata: { dealId: deal.id, changes: updateData },
      timestamp: new Date(),
      userId: req.user?.id,
    });

    res.json(deal);
  } catch (error) {
    console.error('Error updating pipeline deal:', error);
    res.status(500).json({ error: 'Failed to update pipeline deal' });
  }
});

// Update deal stage
router.patch('/pipeline/deals/:id/stage', async (req, res) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;

    const [deal] = await db
      .update(pipelineCards)
      .set({
        currentStage: stage,
        updatedAt: new Date(),
      })
      .where(eq(pipelineCards.id, parseInt(id)))
      .returning();

    // Create activity
    await db.insert(activities).values({
      type: 'pipeline',
      action: 'move_deal',
      description: `Deal moved to ${stage}: ${deal.companyName}`,
      metadata: { dealId: deal.id, newStage: stage },
      timestamp: new Date(),
      userId: req.user?.id,
    });

    // Create notification for stagnant deals
    const lastActivity = new Date(deal.updatedAt);
    const daysSinceLastActivity = Math.floor(
      (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastActivity >= 30) {
      await db.insert(notifications).values({
        title: 'Stagnant Deal Alert',
        message: `${deal.companyName} has had no activity for ${daysSinceLastActivity} days`,
        type: 'warning',
        metadata: { dealId: deal.id },
        timestamp: new Date(),
        userId: req.user?.id,
      });
    }

    res.json(deal);
  } catch (error) {
    console.error('Error updating pipeline deal stage:', error);
    res.status(500).json({ error: 'Failed to update pipeline deal stage' });
  }
});

// Delete deal
router.delete('/pipeline/deals/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [deal] = await db
      .delete(pipelineCards)
      .where(eq(pipelineCards.id, parseInt(id)))
      .returning();

    // Create activity
    await db.insert(activities).values({
      type: 'pipeline',
      action: 'delete_deal',
      description: `Deal deleted: ${deal.companyName}`,
      metadata: { dealId: deal.id },
      timestamp: new Date(),
      userId: req.user?.id,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting pipeline deal:', error);
    res.status(500).json({ error: 'Failed to delete pipeline deal' });
  }
});

// Get pipeline analytics
router.get('/pipeline/analytics', async (req, res) => {
  try {
    // Total pipeline value
    const [{ total }] = await db
      .select({
        total: sql<number>`sum(value)`,
      })
      .from(pipelineCards);

    // Value by stage
    const valueByStage = await db
      .select({
        stage: pipelineCards.currentStage,
        value: sql<number>`sum(value)`,
        count: sql<number>`count(*)`,
      })
      .from(pipelineCards)
      .groupBy(pipelineCards.currentStage);

    // Weekly velocity (deals moved forward)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weeklyMoves = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(activities)
      .where(
        and(
          eq(activities.type, 'pipeline'),
          eq(activities.action, 'move_deal'),
          sql`${activities.timestamp} >= ${oneWeekAgo}`
        )
      );

    res.json({
      totalValue: total || 0,
      valueByStage,
      weeklyVelocity: weeklyMoves[0].count,
    });
  } catch (error) {
    console.error('Error fetching pipeline analytics:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline analytics' });
  }
});

export function registerPipelineRoutes(app: any) {
  app.use('/api', router);
}