import { Router } from 'express';
import { storage } from '../storage';
import { insertEmailTemplateSchema } from '@shared/schema';
import { z } from 'zod';

export const emailTemplateRouter = Router();

// Get all email templates
emailTemplateRouter.get('/', async (req, res) => {
  try {
    // Check for query parameters for filtering
    const { creatorId, isSystem } = req.query;
    
    // Get email templates specific to a creator
    if (creatorId) {
      const creatorIdNum = parseInt(creatorId as string);
      
      if (isNaN(creatorIdNum)) {
        return res.status(400).json({ message: "Invalid creator ID" });
      }
      
      const templates = await storage.getEmailTemplatesByCreator(creatorIdNum);
      return res.json(templates);
    }
    
    // Get system templates only
    if (isSystem === 'true') {
      const templates = await storage.getSystemEmailTemplates();
      return res.json(templates);
    }
    
    // Default: return all templates
    const templates = await storage.getAllEmailTemplates();
    res.json(templates);
  } catch (error) {
    console.error("Error fetching email templates:", error);
    res.status(500).json({ message: "Failed to fetch email templates" });
  }
});

// Get a specific email template by ID
emailTemplateRouter.get('/:id', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    
    if (isNaN(templateId)) {
      return res.status(400).json({ message: "Invalid template ID" });
    }
    
    const template = await storage.getEmailTemplate(templateId);
    
    if (!template) {
      return res.status(404).json({ message: "Email template not found" });
    }
    
    res.json(template);
  } catch (error) {
    console.error("Error fetching email template:", error);
    res.status(500).json({ message: "Failed to fetch email template" });
  }
});

// Create a new email template
emailTemplateRouter.post('/', async (req, res) => {
  try {
    const data = insertEmailTemplateSchema.parse(req.body);
    const user = await storage.getFirstUser();
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Set default values if not provided
    const templateData = {
      ...data,
      userId: data.userId || user.id,
      isSystem: data.isSystem || false
    };
    
    const template = await storage.createEmailTemplate(templateData);
    res.status(201).json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid template data", errors: error.errors });
    }
    console.error("Error creating email template:", error);
    res.status(500).json({ message: "Failed to create email template" });
  }
});

// Update an existing email template
emailTemplateRouter.patch('/:id', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    
    if (isNaN(templateId)) {
      return res.status(400).json({ message: "Invalid template ID" });
    }
    
    // Check if template exists
    const existingTemplate = await storage.getEmailTemplate(templateId);
    if (!existingTemplate) {
      return res.status(404).json({ message: "Email template not found" });
    }
    
    // Update the template with the provided data
    const updatedTemplate = await storage.updateEmailTemplate(templateId, req.body);
    res.json(updatedTemplate);
  } catch (error) {
    console.error("Error updating email template:", error);
    res.status(500).json({ message: "Failed to update email template" });
  }
});

// Delete an email template
emailTemplateRouter.delete('/:id', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    
    if (isNaN(templateId)) {
      return res.status(400).json({ message: "Invalid template ID" });
    }
    
    // Check if template exists
    const existingTemplate = await storage.getEmailTemplate(templateId);
    if (!existingTemplate) {
      return res.status(404).json({ message: "Email template not found" });
    }
    
    // Delete the template
    const success = await storage.deleteEmailTemplate(templateId);
    
    if (success) {
      res.json({ success: true, message: "Email template deleted successfully" });
    } else {
      res.status(500).json({ success: false, message: "Failed to delete email template" });
    }
  } catch (error) {
    console.error("Error deleting email template:", error);
    res.status(500).json({ message: "Failed to delete email template" });
  }
});