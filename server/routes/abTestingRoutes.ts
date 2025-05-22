import { Request, Response } from 'express';
import { abTestingService } from '../services/abTestingService';
import { z } from 'zod';

// Zod schema for ab test creation request
const createAbTestSchema = z.object({
  campaignId: z.number(),
  testType: z.string(),
  variantCount: z.number().min(2).max(5),
  variants: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      description: z.string().optional(),
      subjectLine: z.string().optional(),
      emailBody: z.string().optional(),
      senderId: z.number().optional(),
      sendTime: z.string().optional(),
      content: z.any().optional(),
    })
  ),
  winnerMetric: z.string(),
  distribution: z.object({
    type: z.enum(['equal', 'percentage']),
    values: z.array(z.number()).optional(),
  }),
  sampleSize: z.number().optional(),
  notes: z.string().optional(),
});

export async function registerAbTestingRoutes(app: any) {
  // Create a new A/B test
  app.post('/api/ab-tests', async (req: Request, res: Response) => {
    try {
      const validation = createAbTestSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid request data',
          details: validation.error.format(),
        });
      }
      
      const abTestId = await abTestingService.createAbTest(validation.data);
      
      res.status(201).json({
        success: true,
        abTestId,
        message: 'A/B test created successfully'
      });
    } catch (error) {
      console.error('Error creating A/B test:', error);
      res.status(500).json({
        error: 'Failed to create A/B test',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get all A/B test campaigns
  app.get('/api/ab-tests', async (_req: Request, res: Response) => {
    try {
      const abTests = await abTestingService.getAbTestCampaigns();
      
      res.status(200).json({
        success: true,
        data: abTests
      });
    } catch (error) {
      console.error('Error getting A/B tests:', error);
      res.status(500).json({
        error: 'Failed to get A/B tests',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get A/B test configuration
  app.get('/api/ab-tests/:campaignId', async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      
      if (isNaN(campaignId)) {
        return res.status(400).json({
          error: 'Invalid campaign ID'
        });
      }
      
      const config = await abTestingService.getAbTestConfig(campaignId);
      
      res.status(200).json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error('Error getting A/B test config:', error);
      res.status(500).json({
        error: 'Failed to get A/B test config',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Analyze A/B test results
  app.get('/api/ab-tests/:campaignId/results', async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      
      if (isNaN(campaignId)) {
        return res.status(400).json({
          error: 'Invalid campaign ID'
        });
      }
      
      const results = await abTestingService.analyzeAbTestResults(campaignId);
      
      res.status(200).json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Error analyzing A/B test results:', error);
      res.status(500).json({
        error: 'Failed to analyze A/B test results',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Apply A/B test variant to an email
  app.post('/api/ab-tests/apply-variant', async (req: Request, res: Response) => {
    try {
      const { emailId, variantId } = req.body;
      
      if (!emailId || !variantId) {
        return res.status(400).json({
          error: 'Missing required fields: emailId and variantId'
        });
      }
      
      await abTestingService.applyVariantToEmail(emailId, variantId);
      
      res.status(200).json({
        success: true,
        message: 'Variant applied to email successfully'
      });
    } catch (error) {
      console.error('Error applying variant to email:', error);
      res.status(500).json({
        error: 'Failed to apply variant to email',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
}