import { Router, Request, Response } from 'express';
import { AiAgentService } from '../services/aiAgentService';
import { IStorage } from '../storage';

// Pipeline change log interface
export interface PipelineChangeLog {
  id: number;
  cardId: number;
  companyName: string;
  contactName?: string;
  contactEmail?: string;
  previousStage?: string;
  newStage: string;
  vertical: string;
  timestamp: Date;
  notes?: string;
}

export function createAiAgentRoutes(storage: IStorage) {
  const router = Router();
  const aiAgentService = new AiAgentService(storage);

  // Ask question endpoint
  router.post('/ask-question', async (req: Request, res: Response) => {
    try {
      const { question } = req.body;
      
      if (!question) {
        return res.status(400).json({ message: 'Question is required' });
      }
      
      const answer = await aiAgentService.answerQuestion(question);
      
      return res.json({ answer });
    } catch (error) {
      console.error('Error processing AI question:', error);
      return res.status(500).json({ 
        message: 'Error processing your question',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Log pipeline change endpoint
  router.post('/log-pipeline-change', async (req: Request, res: Response) => {
    try {
      const { 
        cardId, 
        companyName, 
        contactName, 
        contactEmail,
        previousStage, 
        newStage, 
        vertical, 
        timestamp,
        notes
      } = req.body;
      
      if (!cardId || !companyName || !newStage) {
        return res.status(400).json({ 
          message: 'Required fields missing. cardId, companyName, and newStage are required.' 
        });
      }
      
      // Log pipeline change to database
      const pipelineChange = await aiAgentService.logPipelineChange({
        cardId,
        companyName,
        contactName,
        contactEmail,
        previousStage,
        newStage,
        vertical,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        notes
      });
      
      return res.status(201).json({
        message: 'Pipeline change logged successfully',
        data: pipelineChange
      });
    } catch (error) {
      console.error('Error logging pipeline change:', error);
      return res.status(500).json({ 
        message: 'Error logging pipeline change',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Get pipeline change logs
  router.get('/pipeline-logs', async (req: Request, res: Response) => {
    try {
      const { cardId, companyName, limit } = req.query;
      
      let filters: Record<string, any> = {};
      if (cardId) filters.cardId = Number(cardId);
      if (companyName) filters.companyName = companyName;
      
      const logs = await aiAgentService.getPipelineChangeLogs(
        filters,
        limit ? Number(limit) : 20
      );
      
      return res.json(logs);
    } catch (error) {
      console.error('Error retrieving pipeline logs:', error);
      return res.status(500).json({ 
        message: 'Error retrieving pipeline logs',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  return router;
}