import express from 'express';
import { storage } from '../storage';

const router = express.Router();

// Get all pipeline cards
router.get('/cards', async (req, res) => {
  try {
    const cards = await storage.getAllPipelineCards();
    res.json(cards);
  } catch (error) {
    console.error('Error fetching pipeline cards:', error);
    res.status(500).json({ message: 'Failed to fetch pipeline cards' });
  }
});

// Add a new pipeline card
router.post('/cards', async (req, res) => {
  try {
    const newCard = await storage.createPipelineCard(req.body);
    res.status(201).json(newCard);
  } catch (error) {
    console.error('Error creating pipeline card:', error);
    res.status(500).json({ message: 'Failed to create pipeline card' });
  }
});

// Update a pipeline card
router.put('/cards/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid pipeline card ID' });
    }

    const updatedCard = await storage.updatePipelineCard(id, req.body);
    if (!updatedCard) {
      return res.status(404).json({ message: 'Pipeline card not found' });
    }
    
    res.json(updatedCard);
  } catch (error) {
    console.error('Error updating pipeline card:', error);
    res.status(500).json({ message: 'Failed to update pipeline card' });
  }
});

// Delete a pipeline card
router.delete('/cards/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid pipeline card ID' });
    }

    const success = await storage.deletePipelineCard(id);
    if (!success) {
      return res.status(404).json({ message: 'Pipeline card not found' });
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting pipeline card:', error);
    res.status(500).json({ message: 'Failed to delete pipeline card' });
  }
});

// Get pipeline stages (hardcoded for now)
router.get('/stages', async (req, res) => {
  const stages = [
    { id: "1", name: "Warm Leads" },
    { id: "3", name: "Meeting Scheduled" },
    { id: "4", name: "Proposal Sent" },
    { id: "5", name: "Negotiation" },
    { id: "6", name: "Won" },
    { id: "7", name: "Lost" }
  ];
  // Only send these exact stages - do not allow any cached or memory-resident stages
  res.json(stages);
});

export default router;