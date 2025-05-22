import { Router } from 'express';
import { db } from '../db';
import { whiteboards, whiteboardCollaborators, creators, insertWhiteboardSchema, insertWhiteboardCollaboratorSchema } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

export const whiteboardRouter = Router();

// Get all whiteboards
whiteboardRouter.get('/', async (req, res) => {
  try {
    // In a real app with auth, we would get the user from req.session
    // For demo purposes, we'll use a default user ID of 1
    const userId = 1;
    
    const userWhiteboards = await db.query.whiteboards.findMany({
      where: eq(whiteboards.userId, userId),
      with: {
        campaign: true,
      },
    });

    // Fetch collaborator information for each whiteboard
    const whiteboardsWithCollaborators = await Promise.all(
      userWhiteboards.map(async (whiteboard) => {
        const collaborations = await db.query.whiteboardCollaborators.findMany({
          where: eq(whiteboardCollaborators.whiteboardId, whiteboard.id),
          with: {
            creator: true,
          },
        });

        const collaborators = collaborations.map((collab) => ({
          id: collab.creator.id,
          name: collab.creator.name,
        }));

        return {
          ...whiteboard,
          collaborators,
        };
      })
    );

    res.json(whiteboardsWithCollaborators);
  } catch (error) {
    console.error('Error fetching whiteboards:', error);
    res.status(500).json({ error: 'Failed to fetch whiteboards' });
  }
});

// Create a new whiteboard
whiteboardRouter.post('/', async (req, res) => {
  try {
    // For demo purposes, we'll use a default user ID of 1
    const userId = 1;
    
    // Validate request body
    const whiteboard = { ...req.body, userId };
    
    // Make campaignId null if it's undefined or "none"
    if (!whiteboard.campaignId || whiteboard.campaignId === "none") {
      whiteboard.campaignId = null;
    }
    
    const validatedData = insertWhiteboardSchema.parse(whiteboard);

    // Get the first creator for default author (in a real app, this would be based on the logged-in user)
    const [firstCreator] = await db.query.creators.findMany({
      limit: 1,
    });

    // Insert the whiteboard
    const [newWhiteboard] = await db.insert(whiteboards)
      .values({
        ...validatedData,
        createdAt: new Date(),
        lastModified: new Date(),
      })
      .returning();

    // If a creator exists, add them as a collaborator automatically
    if (firstCreator) {
      await db.insert(whiteboardCollaborators)
        .values({
          whiteboardId: newWhiteboard.id,
          creatorId: firstCreator.id,
          joinedAt: new Date(),
          lastActive: new Date(),
        });

      res.status(201).json({
        ...newWhiteboard,
        createdBy: firstCreator.name,
        collaborators: [
          {
            id: firstCreator.id,
            name: firstCreator.name,
          },
        ],
      });
    } else {
      res.status(201).json({
        ...newWhiteboard,
        collaborators: [],
      });
    }
  } catch (error) {
    console.error('Error creating whiteboard:', error);
    res.status(500).json({ error: 'Failed to create whiteboard' });
  }
});

// Get a specific whiteboard by ID
whiteboardRouter.get('/:id', async (req, res) => {
  try {
    const whiteboardId = parseInt(req.params.id);
    
    const whiteboard = await db.query.whiteboards.findFirst({
      where: eq(whiteboards.id, whiteboardId),
      with: {
        campaign: true,
      },
    });

    if (!whiteboard) {
      return res.status(404).json({ error: 'Whiteboard not found' });
    }

    // Fetch collaborators
    const collaborations = await db.query.whiteboardCollaborators.findMany({
      where: eq(whiteboardCollaborators.whiteboardId, whiteboardId),
      with: {
        creator: true,
      },
    });

    const collaborators = collaborations.map((collab) => ({
      id: collab.creator.id,
      name: collab.creator.name,
    }));

    res.json({
      ...whiteboard,
      collaborators,
    });
  } catch (error) {
    console.error('Error fetching whiteboard:', error);
    res.status(500).json({ error: 'Failed to fetch whiteboard' });
  }
});

// Update a whiteboard
whiteboardRouter.patch('/:id', async (req, res) => {
  try {
    const whiteboardId = parseInt(req.params.id);
    
    // Validate request body for elements update
    const updateSchema = z.object({
      elements: z.array(z.any()).optional(),
      name: z.string().optional(),
      campaignId: z.number().nullable().optional(),
    });
    
    const validatedData = updateSchema.parse(req.body);

    // Update the whiteboard
    const [updatedWhiteboard] = await db.update(whiteboards)
      .set({
        ...validatedData,
        lastModified: new Date(),
      })
      .where(eq(whiteboards.id, whiteboardId))
      .returning();

    if (!updatedWhiteboard) {
      return res.status(404).json({ error: 'Whiteboard not found' });
    }

    // Fetch collaborators
    const collaborations = await db.query.whiteboardCollaborators.findMany({
      where: eq(whiteboardCollaborators.whiteboardId, whiteboardId),
      with: {
        creator: true,
      },
    });

    const collaborators = collaborations.map((collab) => ({
      id: collab.creator.id,
      name: collab.creator.name,
    }));

    res.json({
      ...updatedWhiteboard,
      collaborators,
    });
  } catch (error) {
    console.error('Error updating whiteboard:', error);
    res.status(500).json({ error: 'Failed to update whiteboard' });
  }
});

// Delete a whiteboard
whiteboardRouter.delete('/:id', async (req, res) => {
  try {
    const whiteboardId = parseInt(req.params.id);
    
    // First delete all collaborators
    await db.delete(whiteboardCollaborators)
      .where(eq(whiteboardCollaborators.whiteboardId, whiteboardId));
    
    // Then delete the whiteboard
    const deletedCount = await db.delete(whiteboards)
      .where(eq(whiteboards.id, whiteboardId))
      .returning();

    if (!deletedCount.length) {
      return res.status(404).json({ error: 'Whiteboard not found' });
    }

    res.json({ success: true, message: 'Whiteboard deleted successfully' });
  } catch (error) {
    console.error('Error deleting whiteboard:', error);
    res.status(500).json({ error: 'Failed to delete whiteboard' });
  }
});

// Add a collaborator to a whiteboard
whiteboardRouter.post('/:id/collaborators', async (req, res) => {
  try {
    const whiteboardId = parseInt(req.params.id);
    
    // Validate request body
    const collaboratorSchema = z.object({
      creatorId: z.number(),
    });
    
    const { creatorId } = collaboratorSchema.parse(req.body);

    // Check if the whiteboard exists
    const whiteboard = await db.query.whiteboards.findFirst({
      where: eq(whiteboards.id, whiteboardId),
    });

    if (!whiteboard) {
      return res.status(404).json({ error: 'Whiteboard not found' });
    }

    // Check if the creator exists
    const creator = await db.query.creators.findFirst({
      where: eq(creators.id, creatorId),
    });

    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    // Check if collaboration already exists
    const existingCollaboration = await db.query.whiteboardCollaborators.findFirst({
      where: and(
        eq(whiteboardCollaborators.whiteboardId, whiteboardId),
        eq(whiteboardCollaborators.creatorId, creatorId)
      ),
    });

    if (existingCollaboration) {
      return res.status(409).json({ error: 'Creator is already a collaborator' });
    }

    // Add the collaborator
    const [newCollaboration] = await db.insert(whiteboardCollaborators)
      .values({
        whiteboardId,
        creatorId,
        joinedAt: new Date(),
        lastActive: new Date(),
      })
      .returning();

    res.status(201).json({
      ...newCollaboration,
      creator: {
        id: creator.id,
        name: creator.name,
      },
    });
  } catch (error) {
    console.error('Error adding collaborator:', error);
    res.status(500).json({ error: 'Failed to add collaborator' });
  }
});

// Remove a collaborator from a whiteboard
whiteboardRouter.delete('/:whiteboardId/collaborators/:creatorId', async (req, res) => {
  try {
    const whiteboardId = parseInt(req.params.whiteboardId);
    const creatorId = parseInt(req.params.creatorId);
    
    const deletedCount = await db.delete(whiteboardCollaborators)
      .where(
        and(
          eq(whiteboardCollaborators.whiteboardId, whiteboardId),
          eq(whiteboardCollaborators.creatorId, creatorId)
        )
      )
      .returning();

    if (!deletedCount.length) {
      return res.status(404).json({ error: 'Collaboration not found' });
    }

    res.json({ success: true, message: 'Collaborator removed successfully' });
  } catch (error) {
    console.error('Error removing collaborator:', error);
    res.status(500).json({ error: 'Failed to remove collaborator' });
  }
});