import { Express } from 'express';
import { createServer, type Server } from 'http';
import userRoutes from './routes/userRoutes';
import { registerPipelineRoutes } from './routes/pipelineRoutes';
import { createAiAgentRoutes } from './routes/aiAgentRoutes';
import { registerDashboardRoutes } from './routes/dashboardRoutes';
import { storage } from './storage';

export async function registerRoutes(app: Express): Promise<Server> {
  // Register user routes
  app.use('/api/auth', userRoutes);

  // Register the pipeline routes
  registerPipelineRoutes(app);

  // Register AI agent routes
  app.use('/api/ai-agent', createAiAgentRoutes(storage));

  // Register dashboard routes
  registerDashboardRoutes(app);

  // Create and return HTTP server
  return createServer(app);
}
