import express from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import OpenAI from 'openai';

const router = express.Router();

// Get all proposals
router.get('/', async (req, res) => {
  try {
    const proposals = await storage.getAllProposals();
    res.json(proposals);
  } catch (error) {
    console.error('Error fetching proposals:', error);
    res.status(500).json({ message: 'Failed to fetch proposals' });
  }
});

// Get a single proposal by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid proposal ID' });
    }

    const proposal = await storage.getProposal(id);
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found' });
    }

    res.json(proposal);
  } catch (error) {
    console.error('Error fetching proposal:', error);
    res.status(500).json({ message: 'Failed to fetch proposal' });
  }
});

// Create a new proposal
const createProposalSchema = z.object({
  name: z.string().default('Untitled Proposal'),
  status: z.string().default('draft'),
  contactId: z.number().optional().nullable(),
  contactName: z.string().optional().default(''),
  contactCompany: z.string().optional().default(''),
  contactEmail: z.string().optional().default(''),
  contactIndustry: z.string().optional().default(''),
  value: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  followupDate: z.string().optional().nullable().transform(val => val ? new Date(val) : null),
  researchData: z.any().optional(),
  emailSubject: z.string().optional().nullable(),
  emailContent: z.string().optional().nullable(),
  creators: z.any().optional(), // Use any() instead of array to be more flexible
  creatorFits: z.any().optional(), 
  creatorPricing: z.any().optional(), // Use any() instead of array to be more flexible
});

router.post('/', async (req, res) => {
  try {
    console.log("Proposal data received:", JSON.stringify(req.body));
    
    // Make sure we have a name
    if (!req.body.name || req.body.name.trim() === '') {
      req.body.name = req.body.contactCompany ? 
        `${req.body.contactCompany} Proposal` : 
        'New Proposal';
    }
    
    // Log to help debug validation errors
    console.log("Validating proposal data...");
    const validatedData = createProposalSchema.parse(req.body);
    console.log("Validation successful, creating proposal");
    
    const proposal = await storage.createProposal({
      ...validatedData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("Proposal created successfully:", proposal.id);
    res.status(201).json(proposal);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', JSON.stringify(error.errors));
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    
    console.error('Error creating proposal:', error);
    res.status(500).json({ message: 'Failed to create proposal' });
  }
});

// Update a proposal
router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid proposal ID' });
    }

    const proposal = await storage.getProposal(id);
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found' });
    }

    const validatedData = createProposalSchema.partial().parse(req.body);
    
    const updatedProposal = await storage.updateProposal(id, {
      ...validatedData,
      updatedAt: new Date(),
    });

    res.json(updatedProposal);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    
    console.error('Error updating proposal:', error);
    res.status(500).json({ message: 'Failed to update proposal' });
  }
});

// Update proposal status to live
router.post('/:id/make-live', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid proposal ID' });
    }

    const proposal = await storage.getProposal(id);
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found' });
    }

    const updatedProposal = await storage.updateProposal(id, {
      status: 'live',
      updatedAt: new Date(),
    });

    res.json(updatedProposal);
  } catch (error) {
    console.error('Error updating proposal status:', error);
    res.status(500).json({ message: 'Failed to update proposal status' });
  }
});

// Delete a proposal
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid proposal ID' });
    }

    const proposal = await storage.getProposal(id);
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found' });
    }

    await storage.deleteProposal(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting proposal:', error);
    res.status(500).json({ message: 'Failed to delete proposal' });
  }
});

// AI Research endpoint
router.post('/research', async (req, res) => {
  try {
    const { company, industry } = req.body;
    
    if (!company || !industry) {
      return res.status(400).json({ 
        message: 'Company and industry are required for research' 
      });
    }

    // Generate AI research using OpenAI
    const researchData = await generateCompanyResearch(company, industry);
    
    // Add brand deals search if not present
    if (!researchData.previousPartnerships) {
      researchData.previousPartnerships = await searchBrandPartnerships(company);
    }
    
    // Add platform focus data if not present
    if (!researchData.platformFocus) {
      researchData.platformFocus = ["YouTube", "TikTok", "Instagram"];
    }
    
    // Add partnership trends if not present
    if (!researchData.partnershipTrends) {
      researchData.partnershipTrends = `${company} appears to ${researchData.previousPartnerships ? "have some creator partnerships but no consistent pattern was identified" : "not have significant visible creator partnerships in the public domain"}.`;
    }
    
    res.json(researchData);
  } catch (error) {
    console.error('Error performing research:', error);
    res.status(500).json({ 
      message: 'Failed to perform company research',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper function to generate AI research
async function generateCompanyResearch(company: string, industry: string) {
  // Check if OpenAI API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OpenAI API key is not available. Using mock data for research.');
    return generateMockResearchData(company, industry);
  }

  try {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `
    Please analyze the company "${company}" in the "${industry}" industry and provide the following information:
    
    1. Company Information:
       - Estimated company size (small, medium, large)
       - Likely location/headquarters
    
    2. Business Analysis:
       - Business model summary
       - Target audience/customer base
       - Key products or services
    
    3. Partnership Potential:
       - Partnership potential rating (Low, Medium, or High)
       - Recommended approach for partnership
       - Best creator match type for collaboration
    
    Format the response as a structured JSON object with the following schema:
    {
      "companyInfo": {
        "name": "Company Name",
        "industry": "Industry",
        "size": "Company Size",
        "location": "Likely Headquarters"
      },
      "businessModel": "Brief description of business model",
      "targetAudience": "Description of target audience",
      "keyProducts": "List of key products/services",
      "partnershipPotential": "Low/Medium/High",
      "recommendedApproach": "Recommended strategy for partnership",
      "suggestedCreatorMatch": "Type of creator that would be a good match"
    }
    
    Respond with only the JSON data, no additional text.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { 
          role: "system", 
          content: "You are a business analyst providing insights on potential partnership opportunities. Respond with structured JSON data only."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content || '{}');
  } catch (error) {
    console.error('OpenAI API error:', error);
    // Fallback to mock data if API fails
    return generateMockResearchData(company, industry);
  }
}

// Mock research data generator for testing
function generateMockResearchData(company: string, industry: string) {
  // This is used only when OpenAI API is not available
  return {
    companyInfo: {
      name: company,
      industry: industry,
      size: ["Small", "Medium", "Large"][Math.floor(Math.random() * 3)],
      location: "United States"
    },
    businessModel: `${company} likely operates a B2B SaaS model focusing on solutions for the ${industry} sector.`,
    targetAudience: `Companies in the ${industry} industry looking to optimize their operations and increase efficiency.`,
    keyProducts: `Software solutions for ${industry} management, analytics tools, and consultation services.`,
    partnershipPotential: ["Low", "Medium", "High"][Math.floor(Math.random() * 3)],
    recommendedApproach: "Demonstrate clear ROI and specific use cases for their customer base.",
    suggestedCreatorMatch: "Technical creator with industry expertise who can showcase practical applications."
  };
}

// Function to search for brand's previous creator partnerships
async function searchBrandPartnerships(companyName: string): Promise<any[]> {
  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not available for brand partnerships search');
      return generateMockBrandPartnerships(companyName);
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `
    Find examples of creator partnerships or sponsored content for the brand "${companyName}" on platforms like YouTube and TikTok.
    
    Focus on:
    1. Identifying 3-5 specific creators who have worked with ${companyName}
    2. The type of content they created (reviews, tutorials, etc.)
    3. Approximately when these partnerships occurred
    4. Include links to the content if you can find them
    
    Format your response as a JSON array of partnership objects with these properties:
    - creator: The creator's name
    - platform: The platform (YouTube, TikTok, Instagram, etc.)
    - description: Brief description of the partnership content
    - date: Approximate date or timeframe if known (or "Unknown")
    - link: Direct URL to the content if available (or null if not available)
    
    If no partnerships can be found, return an empty array.
    Respond with only the JSON data, no additional text.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      messages: [
        { 
          role: "system", 
          content: "You are a research assistant that finds creator partnerships for brands. Return JSON data only."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    const partnerships = JSON.parse(content || '[]');
    
    // Ensure we have a valid array
    if (Array.isArray(partnerships)) {
      return partnerships;
    } else if (partnerships.partnerships && Array.isArray(partnerships.partnerships)) {
      return partnerships.partnerships;
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error searching for brand partnerships:', error);
    return generateMockBrandPartnerships(companyName);
  }
}

// Fallback function when API access is unavailable
function generateMockBrandPartnerships(companyName: string): any[] {
  // When we don't have API access, we should transparently indicate no partnerships found
  // until we can fetch real data from the API
  return [];
}

// Publish proposal as landing page
router.post('/:id/publish', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid proposal ID' });
    }
    
    // Import the direct proposal service
    const { publishProposalAsLandingPage } = await import('../services/directProposalService');
    
    // Get publish settings from request body
    const publishSettings = {
      pageName: req.body.pageName,
      expirationDays: req.body.expirationDays || 30,
      isPasswordProtected: req.body.isPasswordProtected || false,
      password: req.body.password || '',
      brandPrimaryColor: req.body.brandPrimaryColor || '#3B82F6',
      brandSecondaryColor: req.body.brandSecondaryColor || '#1E3A8A',
      brandFooterText: req.body.brandFooterText || 'This proposal is confidential and intended for the recipient only.'
    };
    
    console.log(`Publishing proposal ${id} with settings:`, publishSettings);
    
    // Use the end-to-end function to publish the proposal
    const hostname = req.get('host');
    const protocol = req.protocol || 'https';
    
    const landingPage = await publishProposalAsLandingPage(
      id, 
      publishSettings, 
      hostname,
      protocol
    );
    
    // Return the created landing page with full URL
    res.json(landingPage);
  } catch (error: any) {
    console.error('Error publishing proposal:', error);
    res.status(500).json({ 
      message: 'Failed to publish proposal as landing page',
      error: error?.message || 'Unknown error'
    });
  }
});

// Make a proposal live (change status from draft to published)
router.post('/:id/make-live', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid proposal ID' });
    }
    
    // Get the current proposal
    const proposal = await storage.getProposal(id);
    
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found' });
    }
    
    if (proposal.status !== 'draft') {
      return res.status(400).json({ message: 'Only draft proposals can be made live' });
    }
    
    // Update the proposal status to published
    const updatedProposal = await storage.updateProposal(id, {
      ...proposal,
      status: 'published'
    });
    
    res.json(updatedProposal);
  } catch (error: any) {
    console.error('Error making proposal live:', error);
    res.status(500).json({ message: 'Failed to update proposal status', error: error?.message || 'Unknown error' });
  }
});

export default router;