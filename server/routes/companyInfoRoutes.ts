import express from 'express';
import { storage } from '../storage';

const router = express.Router();

// Get all company information
router.get('/', async (req, res) => {
  try {
    const companies = await storage.getAllCompanyInfo();
    res.json(companies);
  } catch (error) {
    console.error('Error fetching company information:', error);
    res.status(500).json({ message: 'Failed to fetch company information' });
  }
});

// Get a single company by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid company ID format' });
    }

    const company = await storage.getCompanyInfo(id);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    res.json(company);
  } catch (error) {
    console.error('Error fetching company information:', error);
    res.status(500).json({ message: 'Failed to fetch company information' });
  }
});

// Create a new company
router.post('/', async (req, res) => {
  try {
    const newCompany = await storage.createCompanyInfo(req.body);
    res.status(201).json(newCompany);
  } catch (error) {
    console.error('Error creating company information:', error);
    res.status(500).json({ message: 'Failed to create company information' });
  }
});

// Update a company
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid company ID format' });
    }

    const updatedCompany = await storage.updateCompanyInfo(id, req.body);
    if (!updatedCompany) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    res.json(updatedCompany);
  } catch (error) {
    console.error('Error updating company information:', error);
    res.status(500).json({ message: 'Failed to update company information' });
  }
});

// Delete a company
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid company ID format' });
    }

    const success = await storage.deleteCompanyInfo(id);
    if (!success) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting company information:', error);
    res.status(500).json({ message: 'Failed to delete company information' });
  }
});

// Add a meeting log to a company
router.post('/:id/meeting-logs', async (req, res) => {
  try {
    const companyId = parseInt(req.params.id);
    if (isNaN(companyId)) {
      return res.status(400).json({ message: 'Invalid company ID format' });
    }

    const meetingLog = { ...req.body, companyId };
    const newMeetingLog = await storage.addMeetingLog(meetingLog);
    
    res.status(201).json(newMeetingLog);
  } catch (error) {
    console.error('Error adding meeting log:', error);
    res.status(500).json({ message: 'Failed to add meeting log' });
  }
});

// Get all meeting logs for a company
router.get('/:id/meeting-logs', async (req, res) => {
  try {
    const companyId = parseInt(req.params.id);
    if (isNaN(companyId)) {
      return res.status(400).json({ message: 'Invalid company ID format' });
    }

    const meetingLogs = await storage.getMeetingLogsByCompany(companyId);
    res.json(meetingLogs);
  } catch (error) {
    console.error('Error fetching meeting logs:', error);
    res.status(500).json({ message: 'Failed to fetch meeting logs' });
  }
});

export default router;