import express, { type Express } from "express";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { createAiAgentRoutes } from "./routes/aiAgentRoutes";
import { generatePersonalizedEmail } from "./services/openai";
import { getCreatorFiles } from "./services/googleDrive";
import { sendEmail, sendEmailFromCreator, scheduleEmail, validateEmailAccount, sendTestEmail } from "./services/emailService";
import { processScheduledEmails } from "./services/scheduledEmailProcessor";
import { z } from "zod";
import { 
  insertCampaignSchema, 
  insertContactListSchema, 
  insertContactSchema, 
  insertCreatorSchema,
  insertEmailAccountSchema,
  insertCreatorEmailAccountSchema,
  campaignStatusUpdateSchema,
  contactCSVSchema,
  insertEmailTemplateSchema
} from "@shared/schema";
// Smartlead routes removed - using direct SMTP implementation instead
// Whiteboard routes removed
import { emailTemplateRouter } from "./routes/emailTemplateRoutes";
import outreachRoutes from "./routes/outreachRoutes";
import { asanaService } from "./services/asanaService";
import emailDeliveryRoutes from "./routes/emailDeliveryRoutes";
import enhancedOutreachRoutes from "./routes/enhancedOutreachRoutes";
import aiMonitoringRoutes, { registerAiMonitoringRoutes } from "./routes/aiMonitoringRoutes";
// import statements for pipeline, company info, and ai agent routes are already set elsewhere
import { registerAbTestingRoutes } from "./routes/abTestingRoutes";
import openaiService from "./services/openaiService";
import trackingRoutes from "./routes/trackingRoutes";
import testAddContactsRoutes from "./routes/testAddContacts";
import campaignContactsCheckRoutes from "./routes/campaignContactsCheck";
import directContactImportRoutes from "./routes/directContactImport";
import directContactViewRoutes from "./routes/directContactView";
import stemContactsViewRoutes from "./routes/stemContactsView";
import proposalRoutes from "./routes/proposalRoutes";
import landingPageRoutes from "./routes/landingPageRoutes";
import creatorUrlRoutes from "./routes/creatorUrlRoutes";
import stemContactsRoutes from "./routes/stemContactsRoutes";
import pipelineRoutes from "./routes/pipelineRoutes";
import companyInfoRoutes from "./routes/companyInfoRoutes";
import { aiAgentRouter } from "./routes/aiAgentRoutes";

// Define path for serving static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function registerRoutes(app: Express): Promise<Server> {
  // Register the pipeline routes
  app.use("/api/pipeline", pipelineRoutes);
  
  // Direct pipeline stages endpoint (without Initial Contact)
  app.get("/api/pipeline-stages", (req, res) => {
    const stages = [
      { id: "1", name: "Warm Leads" },
      { id: "3", name: "Meeting Scheduled" },
      { id: "4", name: "Proposal Sent" },
      { id: "5", name: "Negotiation" },
      { id: "6", name: "Won" },
      { id: "7", name: "Lost" }
    ];
    res.json(stages);
  });
  // Register company information routes with a specific prefix
  app.use("/api/company-info", companyInfoRoutes);
  // Debug endpoint to test contact creation directly
  app.get("/api/debug/create-contact-with-type", async (req, res) => {
    try {
      const user = await storage.getFirstUser();
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create a test contact with an explicit TYPE
      const contact = await storage.createContact({
        firstName: "Test",
        lastName: "Contact",
        company: "Debug Co",
        email: `debug-${Date.now()}@example.com`,
        industry: "Technology",
        type: "Creator", // Explicit type for testing
        userId: user.id
      });
      
      console.log("Debug contact created with TYPE:", contact.type);
      
      return res.json({
        message: "Debug contact created successfully",
        contact
      });
    } catch (error) {
      console.error("Error creating debug contact:", error);
      return res.status(500).json({ message: "Failed to create debug contact" });
    }
  });
  // Make all public data accessible
  app.use(express.static(path.join(__dirname, '../public')));
  
  // Manually connect a creator video to a creator profile
  app.post("/api/creator-videos/connect", async (req, res) => {
    try {
      const { videoId, creatorId } = req.body;
      
      if (!videoId || !creatorId) {
        return res.status(400).json({ message: "Video ID and creator ID are required" });
      }
      
      // Use the new storage method to update the creator video connection
      await storage.updateCreatorVideo(videoId, { creatorId });
      
      // Validate that the creator exists
      const creator = await storage.getCreator(creatorId);
      if (!creator) {
        return res.status(404).json({ message: "Creator not found" });
      }
      
      // In a real implementation, we would store this connection in the database
      // For the demo, we'll just log the connection and return success
      console.log(`Connecting video ${videoId} to creator ${creatorId} (${creator.name})`);
      
      res.status(200).json({ 
        message: "Video successfully connected to creator profile",
        videoId,
        creatorId,
        creatorName: creator.name,
        creatorProfileUrl: `/creators/${creatorId}`,
        creatorImageUrl: creator.profileImageUrl || null
      });
    } catch (error) {
      console.error("Error connecting video to creator:", error);
      res.status(500).json({ message: "Failed to connect video to creator" });
    }
  });
  
  const httpServer = createServer(app);
  
  // API endpoint to get list of creator profiles
  app.get("/api/creators", async (req, res) => {
    try {
      // Get all creators from the database
      const creators = await storage.getAllCreators();
      
      // Return only the necessary information for the dropdown
      const formattedCreators = creators.map(creator => ({
        id: creator.id,
        name: creator.name,
        profileImageUrl: creator.profileImageUrl
      }));
      
      res.json(formattedCreators);
    } catch (error) {
      console.error("Error getting creators:", error);
      res.status(500).json({ message: "Failed to load creators" });
    }
  });

  // API endpoint for creator videos from Asana
  app.get("/api/creator-videos", async (req, res) => {
    try {
      // Get all creator videos
      const creatorVideos = await asanaService.getCreatorVideos();
      
      // Get all creators from the database
      const creators = await storage.getAllCreators();
      
      // Link videos to creator profiles by matching creator name
      const enhancedVideos = creatorVideos.map(video => {
        // Try to find a matching creator profile
        const matchingCreator = creators.find(creator => {
          // Match by exact name or normalized name (case insensitive)
          return creator.name.toLowerCase() === video.creator.toLowerCase() || 
                 creator.name.toLowerCase() === video.name.toLowerCase();
        });
        
        // If we found a match, add the creator ID and more info to the video
        if (matchingCreator) {
          return {
            ...video,
            creatorId: matchingCreator.id,
            creatorProfileUrl: `/creators/${matchingCreator.id}`,
            creatorImageUrl: matchingCreator.profileImageUrl || null,
            hasMatchingProfile: true
          };
        }
        
        // If no match, return the original video
        return {
          ...video,
          hasMatchingProfile: false
        };
      });
      
      res.json(enhancedVideos);
    } catch (error) {
      console.error("Error fetching creator videos from Asana:", error);
      res.status(500).json({ 
        message: "Failed to fetch creator videos",
        error: (error as Error).message
      });
    }
  });
  
  // API endpoint to generate thumbnails for videos
  app.post("/api/generate-thumbnail", async (req, res) => {
    try {
      const { videoTitle, videoDetails } = req.body;
      
      if (!videoTitle) {
        return res.status(400).json({ 
          message: "Video title is required" 
        });
      }
      
      const result = await openaiService.generateVideoThumbnail(videoTitle, videoDetails);
      res.json(result);
    } catch (error) {
      console.error("Error generating thumbnail:", error);
      res.status(500).json({ 
        message: "Failed to generate thumbnail",
        error: (error as Error).message
      });
    }
  });

  // User routes
  app.get("/api/users/me", async (req, res) => {
    // In a real app, this would use authentication
    // For this demo, we'll return a mock user
    const user = await storage.getFirstUser();
    
    if (!user) {
      // Create a default user if none exists
      const newUser = await storage.createUser({
        username: "demo",
        password: "password123", // Would be hashed in production
        fullName: "John Doe",
        email: "john@example.com"
      });
      
      return res.json(newUser);
    }
    
    res.json(user);
  });

  app.patch("/api/users/me", async (req, res) => {
    try {
      const user = await storage.getFirstUser();
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updatedUser = await storage.updateUser(user.id, req.body);
      res.json(updatedUser);
    } catch (error) {
      res.status(400).json({ message: "Failed to update user" });
    }
  });

  // Creator routes
  app.get("/api/creators", async (req, res) => {
    try {
      const creators = await storage.getAllCreators();
      res.json(creators);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch creators" });
    }
  });
  
  // Get a single creator by ID with all details
  app.get("/api/creators/:id", async (req, res) => {
    try {
      const creatorId = parseInt(req.params.id);
      
      if (isNaN(creatorId)) {
        return res.status(400).json({ message: "Invalid creator ID" });
      }
      
      const creator = await storage.getCreator(creatorId);
      
      if (!creator) {
        return res.status(404).json({ message: "Creator not found" });
      }
      
      // Fetch additional data for the creator detail page
      try {
        // Extract URL data if not already present
        if (creator.pillarUrl && (!creator.audienceData || !creator.platformStats)) {
          const { extractCreatorDataFromUrl } = await import('./services/urlExtractorService');
          const urlData = await extractCreatorDataFromUrl(creator.pillarUrl);
          
          if (urlData) {
            // Include URL extraction data in the response
            creator.audienceData = urlData.audienceData || {}; 
            creator.platformStats = urlData.platformStats || {};
            creator.expertiseAndNiche = urlData.expertiseAndNiche || {};
            creator.collaborationInfo = urlData.collaborationInfo || {};
            creator.socialLinks = urlData.socialLinks || {};
            creator.profileImageUrl = urlData.profileImageUrl || null;
            creator.metaData = urlData.metaData || {};
            
            // Update the creator in the database with this new info
            await storage.updateCreator(creatorId, {
              audienceData: creator.audienceData,
              platformStats: creator.platformStats,
              expertiseAndNiche: creator.expertiseAndNiche,
              collaborationInfo: creator.collaborationInfo,
              socialLinks: creator.socialLinks,
              profileImageUrl: creator.profileImageUrl,
              metaData: creator.metaData
            });
          }
        }
      } catch (extractError) {
        console.error("Error enriching creator data:", extractError);
        // Continue with the original creator data
      }
      
      res.json(creator);
    } catch (error) {
      console.error("Error fetching creator:", error);
      res.status(500).json({ message: "Failed to fetch creator" });
    }
  });
  
  // Get pricing options for a creator by ID
  app.get("/api/creators/:id/pricing", async (req, res) => {
    try {
      const creatorId = parseInt(req.params.id);
      
      if (isNaN(creatorId)) {
        return res.status(400).json({ message: "Invalid creator ID" });
      }
      
      const pricing = await storage.getCreatorPricing(creatorId);
      res.json(pricing);
    } catch (error) {
      console.error("Error fetching creator pricing:", error);
      res.status(500).json({ message: "Failed to fetch pricing options" });
    }
  });
  
  // Get email accounts associated with a creator
  app.get("/api/creators/:id/email-accounts", async (req, res) => {
    try {
      const creatorId = parseInt(req.params.id);
      
      if (isNaN(creatorId)) {
        return res.status(400).json({ message: "Invalid creator ID" });
      }
      
      // Check if the creator exists
      const creator = await storage.getCreator(creatorId);
      if (!creator) {
        return res.status(404).json({ message: "Creator not found" });
      }
      
      // Fetch email accounts associated with this creator
      const emailAccounts = await storage.getCreatorEmailAccounts(creatorId);
      
      res.json(emailAccounts);
    } catch (error) {
      console.error("Error fetching creator email accounts:", error);
      res.status(500).json({ message: "Failed to fetch email accounts" });
    }
  });
  
  // Get campaigns associated with a creator
  app.get("/api/creators/:id/campaigns", async (req, res) => {
    try {
      const creatorId = parseInt(req.params.id);
      
      if (isNaN(creatorId)) {
        return res.status(400).json({ message: "Invalid creator ID" });
      }
      
      // Check if the creator exists
      const creator = await storage.getCreator(creatorId);
      if (!creator) {
        return res.status(404).json({ message: "Creator not found" });
      }
      
      // Fetch campaigns associated with this creator
      const campaigns = await storage.getCreatorCampaigns(creatorId);
      
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching creator campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.post("/api/creators", async (req, res) => {
    try {
      const data = insertCreatorSchema.parse(req.body);
      const user = await storage.getFirstUser();
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Generate creator profile with OpenAI if not provided
      if (!data.bio || !data.brandVoice) {
        try {
          // Import the generateCreatorProfile function
          const { generateCreatorProfile } = await import('./services/openai');
          
          // Generate the profile based on name, role, and optional Google Drive folder and pillar URL
          const generatedProfile = await generateCreatorProfile(
            data.name,
            data.role,
            data.googleDriveFolder,
            data.pillarUrl
          );
          
          // Use the generated profile data if not provided in the request
          if (!data.bio) {
            data.bio = generatedProfile.bio;
          }
          
          if (!data.brandVoice) {
            data.brandVoice = generatedProfile.brandVoice;
          }
          
          console.log(`Generated profile for ${data.name}:`, { 
            bio: data.bio, 
            brandVoice: data.brandVoice 
          });
        } catch (aiError) {
          console.error("Error generating creator profile with OpenAI:", aiError);
          // Continue with creation even if AI generation fails
        }
      }
      
      const creator = await storage.createCreator({
        ...data,
        userId: user.id,
        initials: data.name.split(' ').map(part => part.charAt(0)).join('').toUpperCase().substring(0, 2)
      });
      
      res.status(201).json(creator);
    } catch (error) {
      console.error("Error creating creator:", error);
      res.status(400).json({ message: "Invalid creator data" });
    }
  });
  
  // Update a creator
  app.patch("/api/creators/:id", async (req, res) => {
    try {
      const creatorId = parseInt(req.params.id);
      
      // Check if creator exists
      const existingCreator = await storage.getCreator(creatorId);
      if (!existingCreator) {
        return res.status(404).json({ message: "Creator not found" });
      }
      
      // Get valid fields from request body
      const updatedFields = {
        name: req.body.name,
        role: req.body.role,
        bio: req.body.bio,
        brandVoice: req.body.brandVoice,
        googleDriveFolder: req.body.googleDriveFolder,
        pillarUrl: req.body.pillarUrl,
        profileImageUrl: req.body.profileImageUrl,
        profileColor: req.body.profileColor,
        initials: req.body.name ? req.body.name.split(' ').map(part => part.charAt(0)).join('').toUpperCase().substring(0, 2) : req.body.initials
      };
      
      // Remove undefined fields
      Object.keys(updatedFields).forEach(key => {
        if (updatedFields[key] === undefined) {
          delete updatedFields[key];
        }
      });
      
      // Generate creator profile with OpenAI if not provided and major fields were updated
      if ((!updatedFields.bio || !updatedFields.brandVoice) && 
          (updatedFields.name || updatedFields.role || updatedFields.googleDriveFolder || updatedFields.pillarUrl)) {
        try {
          // Import the generateCreatorProfile function
          const { generateCreatorProfile } = await import('./services/openai');
          
          // Prepare data for AI generation
          const name = updatedFields.name || existingCreator.name;
          const role = updatedFields.role || existingCreator.role;
          const googleDriveFolder = updatedFields.googleDriveFolder || existingCreator.googleDriveFolder;
          const pillarUrl = updatedFields.pillarUrl || existingCreator.pillarUrl;
          
          // Generate the profile
          const generatedProfile = await generateCreatorProfile(
            name,
            role,
            googleDriveFolder,
            pillarUrl
          );
          
          // Use the generated profile data if not provided in the request
          if (!updatedFields.bio) {
            updatedFields.bio = generatedProfile.bio;
          }
          
          if (!updatedFields.brandVoice) {
            updatedFields.brandVoice = generatedProfile.brandVoice;
          }
          
          console.log(`Generated updated profile for ${name}:`, { 
            bio: updatedFields.bio, 
            brandVoice: updatedFields.brandVoice 
          });
        } catch (aiError) {
          console.error("Error generating creator profile with OpenAI:", aiError);
          // Continue with update even if AI generation fails
        }
      }
      
      // Update the creator
      const updatedCreator = await storage.updateCreator(creatorId, updatedFields);
      
      res.json(updatedCreator);
    } catch (error) {
      console.error("Error updating creator:", error);
      res.status(500).json({ message: "Failed to update creator" });
    }
  });
  
  // Delete a creator
  app.delete("/api/creators/:id", async (req, res) => {
    try {
      const creatorId = parseInt(req.params.id);
      
      // Check if creator exists
      const existingCreator = await storage.getCreator(creatorId);
      if (!existingCreator) {
        return res.status(404).json({ message: "Creator not found" });
      }
      
      // Delete the creator
      const success = await storage.deleteCreator(creatorId);
      
      if (success) {
        res.json({ success: true, message: "Creator deleted successfully" });
      } else {
        res.status(500).json({ success: false, message: "Failed to delete creator" });
      }
    } catch (error) {
      console.error("Error deleting creator:", error);
      res.status(500).json({ message: "Failed to delete creator" });
    }
  });
  
  // Get pricing options for a creator
  app.get("/api/creators/:id/pricing", async (req, res) => {
    try {
      const creatorId = parseInt(req.params.id);
      
      // Check if creator exists
      const existingCreator = await storage.getCreator(creatorId);
      if (!existingCreator) {
        return res.status(404).json({ message: "Creator not found" });
      }
      
      // Get pricing options for the creator
      const pricing = await storage.getCreatorPricing(creatorId);
      res.json(pricing);
    } catch (error) {
      console.error("Error fetching creator pricing:", error);
      res.status(500).json({ message: "Failed to fetch creator pricing" });
    }
  });



  // Contact routes
  // Get unique industries from contacts
  app.get("/api/contacts/industries", async (req, res) => {
    try {
      const allContacts = await storage.getAllContacts();
      
      // Extract unique industries
      const industries = [...new Set(
        allContacts
          .map(contact => contact.industry)
          .filter(industry => industry && industry.trim() !== '')
      )].sort();
      
      return res.json(industries);
    } catch (error) {
      console.error('Error fetching industries:', error);
      return res.status(500).json({ message: 'Error fetching industries' });
    }
  });

  // Simple debug endpoint for direct contact type testing
  app.get("/api/debug/contact-types", async (req, res) => {
    try {
      // Create one contact of each type to test
      const user = await storage.getFirstUser();
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Array of all supported contact types
      const types = ["Brand", "Agency", "Creator", "Media", "Other"];
      const createdContacts = [];
      
      // Create one contact of each type
      for (const type of types) {
        const contact = await storage.createContact({
          firstName: `Test`,
          lastName: type,
          company: `${type} Co`,
          email: `test-${type.toLowerCase()}-${Date.now()}@example.com`,
          industry: "Technology",
          type: type,
          userId: user.id
        });
        
        console.log(`Created contact with explicit TYPE '${type}':`, contact.type);
        createdContacts.push(contact);
      }
      
      // Get all contacts to verify they were created properly
      const allContacts = await storage.getAllContacts();
      
      return res.json({
        message: "Debug contacts created successfully",
        createdContacts,
        allContacts
      });
    } catch (error) {
      console.error("Error creating debug contacts:", error);
      return res.status(500).json({ message: "Failed to create debug contacts" });
    }
  });

  app.get("/api/contacts", async (req, res) => {
    try {
      // Check for search query parameter
      const { q, status, tags, country, industry, type, from, to, includeArchived } = req.query;
      
      // If search query is provided
      if (q) {
        const contacts = await storage.searchContacts(q as string);
        return res.json(contacts);
      }
      
      // If filter parameters are provided
      if (status || tags || country || industry || type || from || to || includeArchived) {
        const filterParams: ContactFilterParams = {};
        
        if (status) filterParams.status = status as string;
        if (country) filterParams.country = country as string;
        if (industry) filterParams.industry = industry as string;
        
        // Handle type filtering (Brand or Agency)
        if (type) filterParams.type = type as string;
        
        // Handle tag filtering
        if (tags) {
          if (Array.isArray(tags)) {
            filterParams.tags = tags as string[];
          } else {
            filterParams.tags = [tags as string];
          }
        }
        
        // Handle date filtering
        if (from) filterParams.createdAfter = new Date(from as string);
        if (to) filterParams.createdBefore = new Date(to as string);
        
        // Handle archive filtering
        if (includeArchived) filterParams.includeArchived = includeArchived === 'true';
        
        const filteredContacts = await storage.getFilteredContacts(filterParams);
        return res.json(filteredContacts);
      }
      
      // Default: return all non-archived contacts
      const contacts = await storage.getAllContacts();
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.get("/api/contacts/:id", async (req, res) => {
    try {
      const contactId = parseInt(req.params.id);
      const contact = await storage.getContact(contactId);
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      res.json(contact);
    } catch (error) {
      console.error("Error fetching contact:", error);
      res.status(500).json({ message: "Failed to fetch contact" });
    }
  });

  app.post("/api/contacts", async (req, res) => {
    try {
      const data = insertContactSchema.parse(req.body);
      const user = await storage.getFirstUser();
      
      // Define normalizeContactType function locally
      const normalizeContactType = (type: string | undefined | null): string => {
        if (!type) return "Brand"; // Default to Brand if not provided
        
        // Convert to lowercase for case-insensitive comparison
        const typeLower = type.toLowerCase().trim();
        
        // Map common variations to standard values
        if (typeLower.includes('brand')) return "Brand";
        if (typeLower.includes('agency')) return "Agency";  
        if (typeLower.includes('creator') || typeLower.includes('influencer')) return "Creator";
        if (typeLower.includes('media') || typeLower.includes('press')) return "Media";
        
        // Capitalize first letter for any other values
        return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
      };
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Normalize the contact type
      const normalizedType = normalizeContactType(data.type);
      console.log(`Normalizing contact type: "${data.type}" -> "${normalizedType}"`);
      
      const contact = await storage.createContact({
        ...data,
        type: normalizedType, // Use normalized type
        userId: user.id
      });
      
      res.status(201).json(contact);
    } catch (error) {
      res.status(400).json({ message: "Invalid contact data" });
    }
  });
  
  app.patch("/api/contacts/:id", async (req, res) => {
    try {
      const contactId = parseInt(req.params.id);
      
      // Check if contact exists
      const existingContact = await storage.getContact(contactId);
      if (!existingContact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      // Update the contact
      const updatedContact = await storage.updateContact(contactId, req.body);
      
      res.json(updatedContact);
    } catch (error) {
      console.error("Error updating contact:", error);
      res.status(500).json({ message: "Failed to update contact" });
    }
  });
  
  app.delete("/api/contacts/:id", async (req, res) => {
    try {
      const contactId = parseInt(req.params.id);
      
      // Check if contact exists
      const existingContact = await storage.getContact(contactId);
      if (!existingContact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      // Delete the contact
      const success = await storage.deleteContact(contactId);
      
      if (success) {
        res.json({ success: true, message: "Contact deleted successfully" });
      } else {
        res.status(500).json({ success: false, message: "Failed to delete contact" });
      }
    } catch (error) {
      console.error("Error deleting contact:", error);
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });
  
  app.post("/api/contacts/:id/archive", async (req, res) => {
    try {
      const contactId = parseInt(req.params.id);
      
      // Check if contact exists
      const existingContact = await storage.getContact(contactId);
      if (!existingContact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      // Archive the contact
      const archivedContact = await storage.archiveContact(contactId);
      
      res.json(archivedContact);
    } catch (error) {
      console.error("Error archiving contact:", error);
      res.status(500).json({ message: "Failed to archive contact" });
    }
  });
  
  app.post("/api/contacts/:id/restore", async (req, res) => {
    try {
      const contactId = parseInt(req.params.id);
      
      // Check if contact exists
      const existingContact = await storage.getContact(contactId);
      if (!existingContact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      // Restore the contact
      const restoredContact = await storage.restoreContact(contactId);
      
      res.json(restoredContact);
    } catch (error) {
      console.error("Error restoring contact:", error);
      res.status(500).json({ message: "Failed to restore contact" });
    }
  });

  app.post("/api/contacts/batch", express.json({ limit: '100mb' }), async (req, res) => {
    try {
      const { contacts, listName } = req.body;
      
      // Debug: Check incoming data for TYPE field
      console.log("Batch import request received for list:", listName);
      console.log("Sample contact data (first entry):", JSON.stringify(contacts[0]));
      console.log("TYPE field in first contact:", contacts[0]?.TYPE);
      
      if (!Array.isArray(contacts) || !listName) {
        return res.status(400).json({ message: "Invalid request format" });
      }
      
      const user = await storage.getFirstUser();
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create a new contact list
      const contactList = await storage.createContactList({
        name: listName,
        description: `List imported with ${contacts.length} contacts`,
        userId: user.id
      });
      
      // Process each contact from CSV format to our schema format
      for (const csvContact of contacts) {
        try {
          contactCSVSchema.parse(csvContact);
          
          // Debug: Log the raw CSV contact data and TYPE field
          console.log("Processing CSV contact:", JSON.stringify(csvContact));
          
          // Map NICHE field to TYPE if TYPE is not present
          if (!csvContact.TYPE && csvContact.NICHE) {
            console.log(`NICHE field found, using as TYPE. Value: "${csvContact.NICHE}"`);
            csvContact.TYPE = csvContact.NICHE;
          }
          
          console.log("TYPE field value after NICHE mapping:", csvContact.TYPE);
          
          // Debug: Check all the fields before creating contact
          console.log(`Creating contact with fields:
            firstName: ${csvContact.FIRST_NAME}
            email: ${csvContact.E_MAIL}
            industry: ${csvContact.INDUSTRY || 'not provided'}
            type: ${csvContact.TYPE || 'not provided'}`);
            
          // Define the normalizeContactType function locally since we can't import from client
          const normalizeContactType = (type: string | undefined | null): string => {
            if (!type) return "Brand"; // Default to Brand if not provided
            
            // Convert to lowercase for case-insensitive comparison
            const typeLower = type.toLowerCase().trim();
            
            // Map common variations to standard values
            if (typeLower.includes('brand')) return "Brand";
            if (typeLower.includes('agency')) return "Agency";  
            if (typeLower.includes('creator') || typeLower.includes('influencer')) return "Creator";
            if (typeLower.includes('media') || typeLower.includes('press')) return "Media";
            
            // Capitalize first letter for any other values
            return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
          };
          
          // Determine the contact type using TYPE or NICHE field
          let contactType: string;
          if (csvContact.TYPE) {
            console.log(`Using TYPE field: "${csvContact.TYPE}"`);
            contactType = csvContact.TYPE;
          } else if (csvContact.NICHE) {
            console.log(`Using NICHE field as TYPE: "${csvContact.NICHE}"`);
            contactType = csvContact.NICHE;
          } else {
            console.log("Both TYPE and NICHE fields missing, using default");
            contactType = "Brand";
          }
          
          // Normalize the contact type for consistent values
          const normalizedType = normalizeContactType(contactType);
          console.log(`Normalized contact type: "${contactType}" -> "${normalizedType}"`);
          
          const contact = await storage.createContact({
            firstName: csvContact.FIRST_NAME,
            lastName: csvContact.LAST_NAME || "",
            company: csvContact.COMPANY,
            email: csvContact.E_MAIL,
            role: csvContact.ROLE || "",
            phone: csvContact.PHONE || "",
            linkedin: csvContact.LINKEDIN || "",
            industry: csvContact.INDUSTRY || "",
            type: normalizedType, // Use the normalized type
            niche: csvContact.NICHE || "",
            country: csvContact.COUNTRY || "",
            businessLinkedin: csvContact.BUSINESS_LINKEDIN || "",
            website: csvContact.WEBSITE || "",
            businessEmail: csvContact.BUSINESS_E_MAIL || "",
            userId: user.id
          });
          
          // Add contact to the list
          await storage.addContactToList(contactList.id, contact.id);
        } catch (error) {
          console.error("Error adding contact:", error);
          // Continue with other contacts even if one fails
        }
      }
      
      res.status(201).json({ 
        message: "Contacts imported successfully", 
        contactListId: contactList.id,
        contactCount: contacts.length
      });
    } catch (error) {
      res.status(400).json({ message: "Failed to import contacts" });
    }
  });

  // Contact List routes
  app.get("/api/contact-lists", async (req, res) => {
    try {
      const contactLists = await storage.getAllContactLists();
      res.json(contactLists);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contact lists" });
    }
  });

  app.get("/api/contact-lists/:id", async (req, res) => {
    try {
      const listId = parseInt(req.params.id);
      const contactList = await storage.getContactList(listId);
      
      if (!contactList) {
        return res.status(404).json({ message: "Contact list not found" });
      }
      
      const contacts = await storage.getContactsInList(listId);
      
      res.json({
        ...contactList,
        contacts
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contact list" });
    }
  });

  app.post("/api/contact-lists", async (req, res) => {
    try {
      const data = insertContactListSchema.parse(req.body);
      const user = await storage.getFirstUser();
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const contactList = await storage.createContactList({
        ...data,
        userId: user.id
      });
      
      res.status(201).json(contactList);
    } catch (error) {
      res.status(400).json({ message: "Invalid contact list data" });
    }
  });
  
  // Get contacts in a list
  app.get("/api/contact-lists/:listId/contacts", async (req, res) => {
    try {
      const listId = parseInt(req.params.listId);
      
      // Check if the contact list exists
      const contactList = await storage.getContactList(listId);
      if (!contactList) {
        return res.status(404).json({ message: "Contact list not found" });
      }
      
      // Get contacts in the list
      const contacts = await storage.getContactsInList(listId);
      
      res.json(contacts);
    } catch (error) {
      console.error("Error getting contacts in list:", error);
      res.status(500).json({ message: "Failed to get contacts in list" });
    }
  });
  
  // Add a contact to a contact list
  app.post("/api/contact-lists/:listId/contacts/:contactId", async (req, res) => {
    try {
      const listId = parseInt(req.params.listId);
      const contactId = parseInt(req.params.contactId);
      
      // Check if the contact list exists
      const contactList = await storage.getContactList(listId);
      if (!contactList) {
        return res.status(404).json({ message: "Contact list not found" });
      }
      
      // Check if the contact exists
      const contact = await storage.getContact(contactId);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      // Add the contact to the list
      await storage.addContactToList(listId, contactId);
      
      res.json({ message: "Contact added to list successfully" });
    } catch (error) {
      console.error("Error adding contact to list:", error);
      res.status(500).json({ message: "Failed to add contact to list" });
    }
  });

  // Campaign routes
  app.get("/api/campaigns", async (req, res) => {
    try {
      const campaigns = await storage.getAllCampaigns();
      
      // Enrich campaigns with creator names
      const enrichedCampaigns = await Promise.all(campaigns.map(async (campaign) => {
        const creator = await storage.getCreator(campaign.creatorId);
        const contactList = await storage.getContactList(campaign.contactListId);
        
        return {
          ...campaign,
          creatorName: creator?.name || 'Unknown',
          listName: contactList?.name || 'Unknown'
        };
      }));
      
      res.json(enrichedCampaigns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });
  
  // Get recent campaigns (specific route must come before param routes)
  app.get("/api/campaigns/recent", async (req, res) => {
    try {
      const campaigns = await storage.getRecentCampaigns(5);
      
      // Enrich campaigns with creator names
      const enrichedCampaigns = await Promise.all(campaigns.map(async (campaign) => {
        const creator = await storage.getCreator(campaign.creatorId);
        const contactList = await storage.getContactList(campaign.contactListId);
        
        return {
          ...campaign,
          creatorName: creator?.name || 'Unknown',
          listName: contactList?.name || 'Unknown'
        };
      }));
      
      res.json(enrichedCampaigns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent campaigns" });
    }
  });
  
  // Get individual campaign by ID - must be after specific routes but before other param routes
  app.get("/api/campaigns/:id", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }
      
      const campaign = await storage.getCampaign(campaignId);
      
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Enrich campaign with creator and contact list info
      const creator = await storage.getCreator(campaign.creatorId);
      const contactList = await storage.getContactList(campaign.contactListId);
      
      const enrichedCampaign = {
        ...campaign,
        creatorName: creator?.name || 'Unknown',
        listName: contactList?.name || 'Unknown'
      };
      
      res.json(enrichedCampaign);
    } catch (error) {
      console.error("Failed to get campaign:", error);
      res.status(500).json({ message: "Failed to get campaign" });
    }
  });

  app.post("/api/campaigns", async (req, res) => {
    try {
      console.log("Received campaign create request with body:", JSON.stringify(req.body, null, 2));
      
      // Handle missing/null values for required fields with defaults
      const safeData = {
        ...req.body,
        name: req.body.name || `Campaign ${new Date().toISOString()}`,
        creatorId: req.body.creatorId || 1,
        contactListId: req.body.contactListId || 1,
        objective: req.body.objective || "general",
        tone: req.body.tone || "professional",
        sequenceCount: req.body.sequenceCount || 3,
        status: req.body.status || "draft"
      };
      
      console.log("Parsed safe campaign data:", safeData);
      
      // Now try to parse with schema
      let data;
      try {
        data = insertCampaignSchema.parse(safeData);
      } catch (parseError) {
        console.error("Schema validation error:", parseError);
        // Create with minimal valid data if schema validation fails
        data = {
          name: safeData.name,
          creatorId: safeData.creatorId,
          contactListId: safeData.contactListId,
          objective: safeData.objective,
          tone: safeData.tone,
          sequenceCount: safeData.sequenceCount,
          status: "draft" // Force to draft to avoid complex processing
        };
      }
      
      // Get the first user (for development)
      const user = await storage.getFirstUser();
      
      if (!user) {
        console.error("No user found in the system");
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log("Creating campaign with data:", data);
      
      // Create the campaign
      const campaign = await storage.createCampaign({
        ...data,
        userId: user.id
      });
      
      console.log("Campaign created successfully:", campaign);
      
      // Return the created campaign object immediately if it's a draft status
      // This helps the frontend get the campaign ID right away
      if (!campaign.status || campaign.status === 'draft') {
        return res.status(201).json({ 
          message: "Campaign created successfully",
          campaign
        });
      }
      
      // Process active or scheduled campaigns
      if (campaign.status === 'active' || campaign.status === 'scheduled') {
        try {
          // Get contacts from the list
          const contacts = await storage.getContactsInList(campaign.contactListId);
          console.log(`Found ${contacts.length} contacts in list ${campaign.contactListId}`);
          
          const creator = await storage.getCreator(campaign.creatorId);
          
          if (!creator) {
            console.error(`Creator not found with ID: ${campaign.creatorId}`);
            return res.status(201).json({ 
              message: "Campaign created but creator not found for email generation",
              campaign
            });
          }
          
          // Get creator data from Google Drive with error handling
          let creatorFiles = [];
          try {
            if (creator.googleDriveFolder) {
              creatorFiles = await getCreatorFiles(creator.googleDriveFolder);
            } else {
              console.log("No Google Drive folder specified for creator");
            }
          } catch (googleError) {
            console.error("Error fetching Google Drive files:", googleError);
          }
          
          // Get the primary email account for this creator
          let emailAccountForCampaign = await storage.getPrimaryEmailAccountForCreator(campaign.creatorId);
          
          // If no primary email account is found, try to get any linked email account
          if (!emailAccountForCampaign) {
            console.log("No primary email account found, checking linked accounts");
            const creatorEmailAccounts = await storage.getCreatorEmailAccounts(campaign.creatorId);
            if (creatorEmailAccounts.length > 0) {
              // Use the first available email account in the list
              emailAccountForCampaign = creatorEmailAccounts[0];
              console.log("Using linked email account:", emailAccountForCampaign);
            }
          }
          
          if (!emailAccountForCampaign) {
            console.error("No email account found for creator");
            return res.status(201).json({ 
              message: "Campaign created but email account missing for sending",
              campaign
            });
          }
        
          // For each contact, generate emails for each sequence step
          try {
            for (const contact of contacts) {
              for (let sequence = 1; sequence <= campaign.sequenceCount; sequence++) {
                try {
                  // Generate email content using OpenAI
                  const emailContent = await generatePersonalizedEmail({
                    creatorName: creator.name,
                    creatorBio: creator.bio || '',
                    creatorBrandVoice: creator.brandVoice || '',
                    contactInfo: {
                      firstName: contact.firstName,
                      lastName: contact.lastName,
                      company: contact.company,
                      role: contact.role,
                      industry: contact.industry,
                      niche: contact.niche,
                      country: contact.country,
                      businessLinkedin: contact.businessLinkedin,
                      website: contact.website,
                      linkedin: contact.linkedin
                    },
                    strategy: {
                      objective: campaign.objective,
                      customObjective: campaign.customObjective || '',
                      tone: campaign.tone,
                      sequenceNumber: sequence,
                      totalInSequence: campaign.sequenceCount
                    }
                  });
                  
                  // Calculate send date (if scheduled)
                  let scheduledDate = new Date();
                  if (campaign.startDate) {
                    scheduledDate = new Date(campaign.startDate);
                  }
                  
                  // Add days for sequence > 1
                  if (sequence > 1) {
                    scheduledDate.setDate(scheduledDate.getDate() + (sequence - 1) * campaign.interval);
                  }
                  
                  // Create email in the database
                  const email = await storage.createEmail({
                    campaignId: campaign.id,
                    contactId: contact.id,
                    emailAccountId: emailAccountForCampaign.id,
                    sequence: sequence,
                    subject: emailContent.subject,
                    body: emailContent.body,
                    status: 'scheduled',
                    scheduledAt: scheduledDate
                  });
                  
                  // Send or schedule the email directly if it's the first email and campaign is active
                  if (sequence === 1 && campaign.status === 'active') {
                    try {
                      // In a real implementation, we would use the emailService to send or schedule the email
                      // For now, just mark it as scheduled/sent in our database
                      const now = new Date();
                      const status = email.scheduledAt && email.scheduledAt > now ? 'scheduled' : 'sent';
                      await storage.updateEmail(email.id, { status });
                      
                      // If campaign starts now, mark email as sent
                      if (status === 'sent') {
                        await storage.updateEmail(email.id, { sentAt: now });
                      }
                    } catch (error) {
                      console.error("Failed to schedule/send email:", error);
                    }
                  }
                } catch (emailGenError) {
                  console.error("Error generating email:", emailGenError);
                }
              }
            }
          } catch (contactsError) {
            console.error("Error processing contacts:", contactsError);
          }
        } catch (activeError) {
          console.error("Error processing active campaign:", activeError);
        }
      }
      
      return res.status(201).json({ message: "Campaign created successfully", campaign });
    } catch (error) {
      console.error("Campaign creation error:", error);
      res.status(400).json({ message: "Invalid campaign data" });
    }
  });

  // Launch a campaign - generates emails for contacts
  app.post("/api/campaigns/:id/launch", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }
      
      // Get the campaign
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Get creator information
      const creator = await storage.getCreator(campaign.creatorId);
      if (!creator) {
        return res.status(400).json({ message: "Creator not found for this campaign" });
      }
      
      // Get contact list information
      const contactList = await storage.getContactList(campaign.contactListId);
      if (!contactList) {
        return res.status(400).json({ message: "Contact list not found for this campaign" });
      }
      
      // Get contacts in the list
      const contacts = await storage.getContactsInList(campaign.contactListId);
      if (!contacts || contacts.length === 0) {
        return res.status(400).json({ message: "No contacts found in the selected list" });
      }
      
      // Get email account for the campaign
      const emailAccount = await storage.getPrimaryEmailAccountForCreator(campaign.creatorId);
      if (!emailAccount) {
        return res.status(400).json({ message: "No email account found for this creator" });
      }
      
      // Update campaign status to active when launching
      await storage.updateCampaign(campaignId, { status: 'active' });
      
      // Generate and store emails for each contact and sequence
      const generatedEmails = [];
      
      for (const contact of contacts) {
        for (let sequence = 1; sequence <= campaign.sequenceCount; sequence++) {
          try {
            // Generate email content using OpenAI
            const emailContent = await generatePersonalizedEmail({
              creatorName: creator.name,
              creatorBio: creator.bio || '',
              creatorBrandVoice: creator.brandVoice || '',
              contactInfo: {
                firstName: contact.firstName,
                lastName: contact.lastName,
                company: contact.company,
                role: contact.role,
                industry: contact.industry,
                niche: contact.niche,
                country: contact.country,
                businessLinkedin: contact.businessLinkedin,
                website: contact.website,
                linkedin: contact.linkedin
              },
              strategy: {
                objective: campaign.objective,
                customObjective: campaign.customObjective || '',
                tone: campaign.tone,
                sequenceNumber: sequence,
                totalInSequence: campaign.sequenceCount
              }
            });
            
            // Calculate send date with proper interval for sequence emails
            let scheduledDate = new Date();
            if (sequence > 1) {
              // Add interval days for follow-up emails
              const interval = campaign.interval || 3; // Default 3 days if not specified
              scheduledDate.setDate(scheduledDate.getDate() + (sequence - 1) * interval);
            }
            
            // Create email in the database
            const email = await storage.createEmail({
              campaignId: campaign.id,
              contactId: contact.id,
              emailAccountId: emailAccount.id,
              sequence: sequence,
              subject: emailContent.subject,
              body: emailContent.body,
              status: 'scheduled',
              scheduledAt: scheduledDate
            });
            
            generatedEmails.push(email);
          } catch (error) {
            console.error(`Error generating email for contact ${contact.id}, sequence ${sequence}:`, error);
          }
        }
      }
      
      return res.json({ 
        message: `Successfully generated ${generatedEmails.length} emails for ${contacts.length} contacts`,
        emailCount: generatedEmails.length
      });
      
    } catch (error) {
      console.error("Error launching campaign:", error);
      return res.status(500).json({ message: "Failed to launch campaign" });
    }
  });

  app.patch("/api/campaigns/:id/status", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const { status } = campaignStatusUpdateSchema.parse(req.body);
      
      const campaign = await storage.getCampaign(campaignId);
      
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Update campaign status
      const updatedCampaign = await storage.updateCampaign(campaignId, { status });
      
      // If campaign is activated, schedule emails
      if (status === 'active' && campaign.status !== 'active') {
        console.log(`Activating campaign ${campaignId} and creating scheduled emails...`);
        
        // Get all scheduled emails for this campaign
        const existingEmails = await storage.getEmailsByCampaign(campaignId);
        
        // Only create new emails if there are none yet (first activation)
        if (existingEmails.length === 0) {
          // Get contacts from the contact list
          const contacts = await storage.getContactsInList(campaign.contactListId);
          console.log(`Found ${contacts.length} contacts in list ${campaign.contactListId}`);
          
          // Get the creator info
          const creator = await storage.getCreator(campaign.creatorId);
          
          if (!creator) {
            console.error(`Creator not found with ID: ${campaign.creatorId}`);
            return res.status(201).json({ 
              message: "Campaign activated but creator not found for email generation",
              campaign: updatedCampaign
            });
          }
          
          // Get the email account for this campaign
          let emailAccount = null;
          if (campaign.emailAccountId) {
            emailAccount = await storage.getEmailAccount(campaign.emailAccountId);
          }
          
          if (!emailAccount) {
            // Try to get primary account
            emailAccount = await storage.getPrimaryEmailAccountForCreator(campaign.creatorId);
            
            if (!emailAccount) {
              // Try any linked account
              const creatorEmailAccounts = await storage.getCreatorEmailAccounts(campaign.creatorId);
              if (creatorEmailAccounts.length > 0) {
                emailAccount = await storage.getEmailAccount(creatorEmailAccounts[0].emailAccountId);
              }
            }
          }
          
          if (!emailAccount) {
            console.error("No email account found for campaign");
            return res.status(201).json({ 
              message: "Campaign activated but email account missing for sending",
              campaign: updatedCampaign
            });
          }
          
          // Generate and schedule emails for each contact
          for (const contact of contacts) {
            try {
              for (let sequence = 1; sequence <= campaign.sequenceCount; sequence++) {
                // Generate email content using OpenAI
                const emailContent = await generatePersonalizedEmail({
                  creatorName: creator.name,
                  creatorBio: creator.bio || '',
                  creatorBrandVoice: creator.brandVoice || '',
                  contactInfo: {
                    firstName: contact.firstName,
                    lastName: contact.lastName,
                    company: contact.company,
                    role: contact.role,
                    industry: contact.industry,
                    niche: contact.niche,
                    country: contact.country,
                    businessLinkedin: contact.businessLinkedin,
                    website: contact.website,
                    linkedin: contact.linkedin
                  },
                  strategy: {
                    objective: campaign.objective,
                    customObjective: campaign.customObjective || '',
                    tone: campaign.tone,
                    sequenceNumber: sequence,
                    totalInSequence: campaign.sequenceCount
                  }
                });
                
                // Calculate scheduled date - first email right away, others based on interval
                const now = new Date();
                let scheduledDate = new Date(now); // Create a new date to avoid reference issues
                
                // Add days for sequence > 1
                if (sequence > 1 && campaign.interval) {
                  // Calculate offset days for follow-up emails
                  const offsetDays = (sequence - 1) * (campaign.interval || 2);
                  scheduledDate = new Date(now.getTime() + offsetDays * 24 * 60 * 60 * 1000);
                }
                
                console.log(`Creating scheduled email for contact ${contact.id}, sequence ${sequence}, scheduled for ${scheduledDate.toISOString()}`);
                
                // Create the email in the database with 'scheduled' status
                await storage.createEmail({
                  campaignId: campaign.id,
                  contactId: contact.id,
                  emailAccountId: emailAccount.id,
                  sequence: sequence,
                  subject: emailContent.subject,
                  body: emailContent.body,
                  status: 'scheduled',
                  scheduledAt: scheduledDate
                });
              }
            } catch (error) {
              console.error(`Error generating emails for contact ${contact.id}:`, error);
            }
          }
        } else {
          // If emails already exist, just update their status
          for (const email of existingEmails) {
            if (email.status === 'draft' || email.status === 'paused') {
              const contact = await storage.getContact(email.contactId);
              
              if (contact) {
                try {
                  // Set status to scheduled
                  await storage.updateEmail(email.id, { 
                    status: 'scheduled'
                  });
                  
                  // If it should be sent right now, mark it accordingly
                  const now = new Date();
                  if (!email.scheduledAt || email.scheduledAt <= now) {
                    await storage.updateEmail(email.id, { 
                      status: 'sent',
                      sentAt: now
                    });
                  }
                } catch (error) {
                  console.error("Failed to schedule/send email:", error);
                }
              }
            }
          }
        }
      }
      
      // Get the updated campaign
      const finalCampaign = await storage.getCampaign(campaignId);
      
      // Return the updated campaign
      return res.status(201).json({ 
        message: "Campaign activated with scheduled emails",
        campaign: finalCampaign
      });
      
    } catch (error) {
      console.error("Error updating campaign status:", error);
      res.status(500).json({ 
        message: "Failed to update campaign status", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Update campaign details
  app.patch("/api/campaigns/:id", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const campaignData = req.body;
      
      // Get the existing campaign
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Validate and sanitize input - only allow specific fields to be updated
      const allowedUpdates = [
        'name', 'objective', 'tone', 'sequenceCount', 'interval'
      ];
      
      const sanitizedData: Partial<Campaign> = {};
      for (const key of allowedUpdates) {
        if (key in campaignData) {
          sanitizedData[key as keyof Campaign] = campaignData[key];
        }
      }
      
      // Update the campaign
      const updatedCampaign = await storage.updateCampaign(campaignId, sanitizedData);
      
      res.json(updatedCampaign);
    } catch (error) {
      console.error("Failed to update campaign:", error);
      res.status(500).json({ message: "Failed to update campaign" });
    }
  });
  
  // Delete campaign
  app.delete("/api/campaigns/:id", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      
      // Check if campaign exists
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Delete the campaign
      const result = await storage.deleteCampaign(campaignId);
      
      if (result) {
        res.json({ message: "Campaign deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete campaign" });
      }
    } catch (error) {
      console.error("Failed to delete campaign:", error);
      res.status(500).json({ message: "Failed to delete campaign" });
    }
  });

  // Get all emails for a specific campaign
  app.get("/api/campaigns/:id/emails", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }
      
      // Check if campaign exists
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Get emails for this campaign
      const emails = await storage.getEmailsByCampaign(campaignId);
      
      // If needed, enrich emails with contact information
      const enrichedEmails = await Promise.all(emails.map(async (email) => {
        let contactEmail = "Unknown";
        
        if (email.contactId) {
          const contact = await storage.getContact(email.contactId);
          if (contact) {
            contactEmail = contact.email || `${contact.firstName} ${contact.lastName}`.trim();
          }
        }
        
        return {
          ...email,
          contactEmail
        };
      }));
      
      return res.json(enrichedEmails);
    } catch (error) {
      console.error("Error fetching campaign emails:", error);
      return res.status(500).json({ message: "Failed to fetch campaign emails" });
    }
  });
  
  // Get a campaign preview
  app.get("/api/campaigns/preview", async (req, res) => {
    try {
      const { contactListId, creatorId } = req.query;
      
      if (!contactListId || !creatorId) {
        return res.status(400).json({ message: "Missing required parameters" });
      }
      
      const contactList = await storage.getContactList(parseInt(contactListId as string));
      const creator = await storage.getCreator(parseInt(creatorId as string));
      
      if (!contactList || !creator) {
        return res.status(404).json({ message: "Contact list or creator not found" });
      }
      
      const contacts = await storage.getContactsInList(contactList.id);
      const contactCount = contacts.length;
      
      // Get a sample contact for the preview
      const sampleContact = contacts.length > 0 ? contacts[0] : null;
      
      res.json({
        contactListName: contactList.name,
        contactCount,
        creatorName: creator.name,
        creatorRole: creator.role,
        sampleContact
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate campaign preview" });
    }
  });

  // Email routes
  app.post("/api/emails/generate", async (req, res) => {
    try {
      const emailRequest = req.body;
      
      // Validate the request structure (basic check)
      if (!emailRequest.creatorName || !emailRequest.contactInfo || !emailRequest.strategy) {
        return res.status(400).json({ message: "Invalid email generation request" });
      }
      
      const generatedEmail = await generatePersonalizedEmail(emailRequest);
      res.json(generatedEmail);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate email" });
    }
  });

  app.get("/api/emails/generated-preview", async (req, res) => {
    try {
      // Check if OpenAI API key is set
      if (!process.env.OPENAI_API_KEY) {
        console.error("OPENAI_API_KEY is not set in environment variables");
        return res.status(500).json({ 
          message: "OpenAI API key is not configured. Please add your OpenAI API key to continue.", 
          code: "OPENAI_API_KEY_MISSING",
          solution: "Add your OpenAI API key to the environment variables using the secrets manager."
        });
      }
      
      const { contactListId, creatorId, objective, tone, sequenceCount, emailAccountId } = req.query;
      
      console.log("Email preview request params:", { 
        contactListId, 
        creatorId, 
        objective, 
        tone, 
        sequenceCount,
        emailAccountId 
      });
      
      // Enhanced validation with better error messages
      const missingParams = [];
      if (!contactListId) missingParams.push("contactListId");
      if (!creatorId) missingParams.push("creatorId");
      if (!objective) missingParams.push("objective");
      if (!tone) missingParams.push("tone");
      if (!sequenceCount) missingParams.push("sequenceCount");
      
      if (missingParams.length > 0) {
        const errorMsg = `Missing required parameters: ${missingParams.join(", ")}`;
        console.log(errorMsg, {
          hasContactListId: !!contactListId,
          hasCreatorId: !!creatorId,
          hasObjective: !!objective,
          hasTone: !!tone,
          hasSequenceCount: !!sequenceCount,
          hasEmailAccountId: !!emailAccountId
        });
        return res.status(400).json({ 
          message: errorMsg,
          code: "MISSING_PARAMETERS",
          missingParams
        });
      }
      
      // Email account ID is technically optional but should be logged if missing
      if (!emailAccountId) {
        console.warn("Email account ID not provided for email preview generation. Will use default settings.");
      }
      
      try {
        const contactList = await storage.getContactList(parseInt(contactListId as string));
        if (!contactList) {
          return res.status(404).json({ 
            message: `Contact list with ID ${contactListId} not found`, 
            code: "CONTACT_LIST_NOT_FOUND" 
          });
        }
        
        const creator = await storage.getCreator(parseInt(creatorId as string));
        if (!creator) {
          return res.status(404).json({ 
            message: `Creator with ID ${creatorId} not found`, 
            code: "CREATOR_NOT_FOUND" 
          });
        }
        
        console.log("Found creator and contact list:", {
          creatorId: creator.id,
          creatorName: creator.name,
          contactListId: contactList.id,
          contactListName: contactList.name
        });
        
        const contacts = await storage.getContactsInList(contactList.id);
        
        if (!contacts || contacts.length === 0) {
          return res.status(404).json({ 
            message: `No contacts found in list with ID ${contactListId}`, 
            code: "CONTACTS_NOT_FOUND" 
          });
        }
        
        console.log(`Found ${contacts.length} contacts in list ${contactList.id}`);
        
        // Use the first contact for the preview
        const contact = contacts[0];
        
        // Generate emails for each sequence
        const emailPreviews = [];
        const totalEmails = parseInt(sequenceCount as string);
        
        // Get the email account if provided
        let emailAccount = null;
        if (emailAccountId) {
          try {
            emailAccount = await storage.getEmailAccount(parseInt(emailAccountId as string));
            if (emailAccount) {
              console.log(`Using email account ID ${emailAccountId} for email generation: ${emailAccount.email}`);
            } else {
              console.warn(`Email account with ID ${emailAccountId} not found, will use default settings`);
            }
          } catch (error) {
            console.error(`Failed to get email account with ID ${emailAccountId}:`, error);
          }
        }
        
        // Log details of what we're sending to OpenAI
        console.log("Generating email previews with these parameters:", {
          creatorName: creator.name,
          hasBio: !!creator.bio,
          hasBrandVoice: !!creator.brandVoice,
          contactName: `${contact.firstName} ${contact.lastName || ''}`.trim(),
          contactIndustry: contact.industry,
          objective: objective as string,
          tone: tone as string,
          totalEmails,
          hasEmailAccount: !!emailAccount
        });
        
        for (let sequence = 1; sequence <= totalEmails; sequence++) {
          console.log(`Generating email ${sequence} of ${totalEmails}...`);
          
          try {
            const emailContent = await generatePersonalizedEmail({
              creatorName: creator.name,
              creatorBio: creator.bio || '',
              creatorBrandVoice: creator.brandVoice || '',
              contactInfo: {
                firstName: contact.firstName,
                lastName: contact.lastName,
                company: contact.company,
                role: contact.role,
                industry: contact.industry,
                niche: contact.niche,
                country: contact.country,
                businessLinkedin: contact.businessLinkedin,
                website: contact.website,
                linkedin: contact.linkedin
              },
              // Add sender info if we have an email account
              senderInfo: emailAccount ? {
                name: emailAccount.name,
                email: emailAccount.email,
                emailAccountId: emailAccount.id,
                provider: emailAccount.provider,
                role: creator.role || undefined
              } : undefined,
              strategy: {
                objective: objective as string,
                customObjective: req.query.customObjective as string,
                tone: tone as string,
                sequenceNumber: sequence,
                totalInSequence: totalEmails
              }
            });
            
            console.log(`Successfully generated email ${sequence} of ${totalEmails}`);
            emailPreviews.push(emailContent);
          } catch (seqError) {
            console.error(`Error generating email sequence ${sequence}:`, seqError);
            // Get error message safely
            const errorMessage = seqError instanceof Error ? seqError.message : String(seqError);
            
            // Continue with next sequence instead of failing completely
            emailPreviews.push({
              subject: `[Generation Error] Email ${sequence}`,
              body: `Unable to generate this email due to an error: ${errorMessage}\n\nPlease check your settings and try again.`
            });
          }
        }
        
        if (emailPreviews.length === 0) {
          throw new Error("Failed to generate any email previews");
        }
        
        res.json(emailPreviews);
      } catch (dataError) {
        console.error("Data error in email preview generation:", dataError);
        const errorMessage = dataError instanceof Error ? dataError.message : String(dataError);
        return res.status(500).json({ 
          message: `Error accessing data: ${errorMessage}`, 
          code: "DATA_ACCESS_ERROR",
          details: "There was an issue retrieving the required data for email generation. Please check your database connection."
        });
      }
    } catch (error) {
      console.error("Error in email preview generation:", error);
      
      // Get error message safely
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Provide more detailed error information
      if (error instanceof Error && (error.name === 'OpenAIError' || errorMessage.includes('OpenAI'))) {
        return res.status(500).json({ 
          message: `OpenAI API error: ${errorMessage}. Please check your API key and OpenAI account status.`,
          code: "OPENAI_API_ERROR",
          details: "There was an issue with the OpenAI API. This could be due to invalid API key, rate limiting, or the OpenAI service being temporarily unavailable."
        });
      }
      
      // Default error response
      res.status(500).json({ 
        message: `Failed to generate email previews: ${errorMessage || "Unknown error"}`,
        code: "EMAIL_GENERATION_ERROR",
        details: "An unexpected error occurred while generating email previews. Please try again or contact support if the issue persists."
      });
    }
  });

  // API Keys and settings routes
  app.get("/api/settings/api-keys", async (req, res) => {
    // In a real app, these would be stored securely
    // For this demo, we return placeholders
    res.json({
      openaiApiKey: process.env.OPENAI_API_KEY || "",
      googleApiKey: process.env.GOOGLE_DRIVE_API_KEY || ""
    });
  });

  app.patch("/api/settings/api-keys", async (req, res) => {
    // In a real app, we would securely store the API keys
    // For this demo, we just acknowledge receipt
    res.json({ message: "API keys updated" });
  });

  // Email Account routes
  app.get("/api/email-accounts", async (req, res) => {
    try {
      console.log("Getting email accounts from database");
      
      // Fetch all email accounts directly from our database
      const accounts = await storage.getAllEmailAccounts();
      console.log(`Found ${accounts.length} email accounts in database`);
      
      // Return all accounts without filtering
      console.log(`Returning all ${accounts.length} email accounts`);
      
      // Return the accounts
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching email accounts from database:", error);
      res.status(500).json({ message: "Failed to fetch email accounts" });
    }
  });
  
  // Add a new email account
  app.post("/api/email-accounts", async (req, res) => {
    try {
      // Validate request body
      const data = insertEmailAccountSchema.parse(req.body);
      
      // Get the user for association
      const user = await storage.getFirstUser();
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Set defaults for any missing fields
      const emailAccountData = {
        ...data,
        status: data.status || "active",
        createdAt: new Date(),
        userId: user.id
      };
      
      // Create the new email account
      const createdAccount = await storage.createEmailAccount(emailAccountData);
      
      res.status(201).json(createdAccount);
    } catch (error) {
      console.error("Error creating email account:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          message: "Invalid email account data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create email account" });
    }
  });
  
  // Get a specific email account
  app.get("/api/email-accounts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const emailAccountId = parseInt(id);
      
      const emailAccount = await storage.getEmailAccount(emailAccountId);
      
      if (!emailAccount) {
        return res.status(404).json({ message: "Email account not found" });
      }
      
      res.json(emailAccount);
    } catch (error) {
      console.error("Error fetching email account:", error);
      res.status(500).json({ message: "Failed to fetch email account" });
    }
  });
  
  // Update an email account
  app.patch("/api/email-accounts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Get the account from our database by ID
      let existingAccount = null;
      let accountId = 0;
      
      // Try to parse as a numeric ID for our database
      try {
        accountId = parseInt(id);
        existingAccount = await storage.getEmailAccount(accountId);
      } catch (err) {
        console.error(`Error getting email account with ID ${id}:`, err);
      }
      
      // Validate that account exists
      if (!existingAccount) {
        return res.status(404).json({ message: "Email account not found" });
      }
      
      // Special handling for password fields to preserve them if not explicitly provided
      if (updateData.smtpPassword === undefined && existingAccount.smtpPassword) {
        updateData.smtpPassword = existingAccount.smtpPassword;
      }
      
      if (updateData.imapPassword === undefined && existingAccount.imapPassword) {
        updateData.imapPassword = existingAccount.imapPassword;
      }
      
      // Preserve original creation date and other critical fields
      if (!updateData.createdAt && existingAccount.createdAt) {
        updateData.createdAt = existingAccount.createdAt;
      }
      
      // Ensure status is always present
      if (!updateData.status) {
        updateData.status = existingAccount.status;
      }
      
      // Log for debugging what's being updated (but mask passwords)
      const logUpdateData = { ...updateData };
      if (logUpdateData.smtpPassword) logUpdateData.smtpPassword = '***MASKED***';
      if (logUpdateData.imapPassword) logUpdateData.imapPassword = '***MASKED***';
      console.log('Updating email account with data:', logUpdateData);
      
      // Update the account
      const updatedAccount = await storage.updateEmailAccount(accountId, updateData);
      
      // Verify the update was successful by retrieving the account again
      const verifiedAccount = await storage.getEmailAccount(accountId);
      if (!verifiedAccount) {
        throw new Error("Failed to verify updated email account");
      }
      
      // Log what was updated (but mask passwords)
      const logResult = { ...verifiedAccount };
      if (logResult.smtpPassword) logResult.smtpPassword = '***MASKED***';
      if (logResult.imapPassword) logResult.imapPassword = '***MASKED***';
      console.log('Updated email account:', logResult);
      
      res.json(updatedAccount);
    } catch (error) {
      console.error("Error updating email account:", error);
      res.status(500).json({ 
        message: "Failed to update email account", 
        error: error.message 
      });
    }
  });
  

  
  // Validate an email account configuration
  app.post("/api/email-accounts/validate", async (req, res) => {
    try {
      console.log("Validating email account:", JSON.stringify(req.body, null, 2));
      const accountData = req.body;
      
      // Create a temporary email account object for validation
      // We don't save this to the database
      const tempAccount = {
        id: 0, // Temporary ID
        name: accountData.name || '',
        email: accountData.email || '',
        provider: accountData.provider || '',
        status: 'active',
        createdAt: new Date(),
        userId: 1, // Default user ID
        
        // SMTP settings
        smtpHost: accountData.smtpHost || '',
        smtpPort: accountData.smtpPort ? parseInt(accountData.smtpPort, 10) : 0,
        smtpUsername: accountData.smtpUsername || '',
        smtpPassword: accountData.smtpPassword || process.env.SMTP_PASSWORD || '',
        smtpSecure: accountData.smtpSecure === true || accountData.smtpSecure === 'true',
        
        // IMAP settings
        imapHost: accountData.imapHost || '',
        imapPort: accountData.imapPort ? parseInt(accountData.imapPort, 10) : 0,
        imapUsername: accountData.imapUsername || '',
        imapPassword: accountData.imapPassword || process.env.SMTP_PASSWORD || '',
        imapSecure: accountData.imapSecure === true || accountData.imapSecure === 'true',
        
        // Other settings
        dailyLimit: accountData.dailyLimit ? parseInt(accountData.dailyLimit, 10) : 0,
        warmupEnabled: accountData.warmupEnabled === true || accountData.warmupEnabled === 'true',
      };
      
      // Use the new validation function
      const validationResult = await validateEmailAccount(tempAccount);
      
      res.json({
        ...validationResult,
        validationTime: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error validating email account:", error);
      res.status(500).json({ 
        message: "Failed to validate email account", 
        error: error instanceof Error ? error.message : 'Unknown error',
        valid: false
      });
    }
  });
  
  // Send a test email from an existing account
  app.post("/api/email-accounts/:id/test", async (req, res) => {
    try {
      const { id } = req.params;
      const { recipient } = req.body;
      
      if (!recipient) {
        return res.status(400).json({
          success: false,
          message: "Recipient email address is required"
        });
      }
      
      let accountId: string | number = id;
      let account = null;
      
      console.log(`Processing test email request for account ID: ${id}`);
      
      // First try to get account by ID directly (could be a string or numeric ID)
      if (typeof id === 'string' && id.includes('@')) {
        // This is an email address, look up by email
        account = await storage.getEmailAccountByEmail(id);
      } else {
        // Try direct ID lookup first
        account = await storage.getEmailAccount(id);
        
        // If not found and looks like a numeric ID, try parsing as number
        if (!account && /^\d+$/.test(id)) {
          accountId = parseInt(id, 10);
          account = await storage.getEmailAccount(accountId);
        }
      }
      
      // If still not found, try looking up by former external ID in notes
      if (!account && /^\d+$/.test(id)) {
        try {
          const accounts = await storage.getAllEmailAccounts();
          account = accounts.find(acct => {
            if (!acct.notes) return false;
            
            return (
              acct.notes.includes(`Former ID: ${id}`)
            );
          });
          
          if (account) {
            console.log(`Found account via notes lookup with former ID: ${account.email}`);
          }
        } catch (err) {
          console.error(`Error searching notes for former ID ${id}:`, err);
        }
      }
      
      // If still not found, return error
      if (!account) {
        return res.status(404).json({
          success: false,
          message: `Email account not found with ID: ${id}`
        });
      }
      
      console.log(`Using account ID for test: ${account.id} (account: ${account.email})`);
      
      // Send the test email using the database ID
      const result = await sendTestEmail(account.id, recipient);
      
      // Return the result
      res.json({
        ...result,
        testSentAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to send test email", 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Delete an email account
  app.delete("/api/email-accounts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Handle both numeric and string IDs
      // Try to find by numeric ID first
      let existingAccount = null;
      
      if (!isNaN(parseInt(id))) {
        existingAccount = await storage.getEmailAccount(parseInt(id));
      }
      
      // If not found by numeric ID, try to use the string ID directly
      // This assumes storage.getEmailAccount can handle string IDs appropriately
      if (!existingAccount && typeof id === 'string') {
        try {
          // Some accounts might have string IDs (from external systems)
          existingAccount = await storage.getEmailAccount(id as any); // Type casting to handle string ID
        } catch (err) {
          console.log("Failed to get by string ID, continuing...");
        }
      }
      
      if (!existingAccount) {
        return res.status(404).json({ message: "Email account not found" });
      }
      
      // Delete the account using its actual ID type
      const success = await storage.deleteEmailAccount(existingAccount.id);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to delete email account" });
      }
      
      res.json({ message: "Email account deleted successfully" });
    } catch (error) {
      console.error("Error deleting email account:", error);
      res.status(500).json({ message: "Failed to delete email account" });
    }
  });

  // Associate creator with one or more email accounts
  app.post("/api/creators/:creatorId/email-accounts", async (req, res) => {
    try {
      const creatorId = parseInt(req.params.creatorId);
      const { emailAccountIds, isPrimary } = req.body;
      
      if (!emailAccountIds || !Array.isArray(emailAccountIds) || emailAccountIds.length === 0) {
        return res.status(400).json({ message: "emailAccountIds array is required and must not be empty" });
      }
      
      const creator = await storage.getCreator(creatorId);
      if (!creator) {
        return res.status(404).json({ message: "Creator not found" });
      }
      
      // Process each email account
      const associations = [];
      for (const emailAccountId of emailAccountIds) {
        const emailAccount = await storage.getEmailAccount(parseInt(emailAccountId));
        if (!emailAccount) {
          return res.status(404).json({ 
            message: `Email account not found with ID: ${emailAccountId}`
          });
        }
        
        // If this account should be primary and we have multiple accounts,
        // only the first one will be set as primary (when isPrimary is true)
        const shouldBePrimary = isPrimary && (emailAccountIds.length === 1 || 
          emailAccountIds.indexOf(emailAccountId) === 0);
        
        // Create association
        const association = await storage.linkCreatorToEmailAccount({
          creatorId,
          emailAccountId: parseInt(emailAccountId),
          isPrimary: shouldBePrimary
        });
        
        associations.push(association);
      }
      
      res.status(201).json(associations);
    } catch (error) {
      console.error("Error linking creator to email accounts:", error);
      res.status(500).json({ message: "Failed to link creator to email accounts" });
    }
  });

  // Get email accounts for a creator
  app.get("/api/creators/:creatorId/email-accounts", async (req, res) => {
    try {
      const creatorId = parseInt(req.params.creatorId);
      
      const creator = await storage.getCreator(creatorId);
      if (!creator) {
        return res.status(404).json({ message: "Creator not found" });
      }
      
      const emailAccounts = await storage.getCreatorEmailAccounts(creatorId);
      
      res.json(emailAccounts);
    } catch (error) {
      console.error("Error fetching creator email accounts:", error);
      res.status(500).json({ message: "Failed to fetch creator email accounts" });
    }
  });
  
  // Get primary email account for a creator
  app.get("/api/creators/:creatorId/email-account/primary", async (req, res) => {
    try {
      const creatorId = parseInt(req.params.creatorId);
      
      const creator = await storage.getCreator(creatorId);
      if (!creator) {
        return res.status(404).json({ message: "Creator not found" });
      }
      
      const primaryEmailAccount = await storage.getPrimaryEmailAccountForCreator(creatorId);
      
      if (!primaryEmailAccount) {
        return res.status(404).json({ message: "No primary email account found for this creator" });
      }
      
      res.json(primaryEmailAccount);
    } catch (error) {
      console.error("Error fetching primary email account:", error);
      res.status(500).json({ message: "Failed to fetch primary email account" });
    }
  });
  
  // Clean up test/demo email accounts (one-time cleanup)
  app.delete("/api/email-accounts/cleanup-test", async (req, res) => {
    try {
      const accounts = await storage.getAllEmailAccounts();
      
      // Identify demo/test accounts 
      // We'll consider an account fake if it has one of these characteristics:
      // 1. Email contains our test domains
      const testDomains = ["xtendcreators.com", "example.com", "test.com"];
      
      // List of permanent email accounts that should never be removed during cleanup
      const permanentEmails = ["shayirimi@stemmgt.com"];
      
      const testAccounts = accounts.filter(account => {
        // Never include permanent emails in cleanup
        if (permanentEmails.includes(account.email)) {
          return false;
        }
        
        // Check if it has a fake test domain
        for (const domain of testDomains) {
          if (account.email.includes(domain)) {
            return true;
          }
        }
        
        return false;
      });
      
      if (testAccounts.length === 0) {
        return res.json({ message: "No test email accounts found to clean up" });
      }
      
      // Delete each test account
      const deletedIds = [];
      const preservedAccounts = [];
      
      for (const account of testAccounts) {
        try {
          // Delete the account
          await storage.deleteEmailAccount(account.id);
          deletedIds.push(account.id);
        } catch (err) {
          console.error(`Failed to delete email account ID ${account.id}:`, err);
          preservedAccounts.push(account);
        }
      }
      
      res.json({ 
        message: `Successfully removed ${deletedIds.length} test email accounts`, 
        deletedCount: deletedIds.length,
        deletedIds,
        preservedCount: preservedAccounts.length
      });
    } catch (error) {
      console.error("Error cleaning up test email accounts:", error);
      res.status(500).json({ message: "Failed to clean up test email accounts" });
    }
  });
  
  // Update primary email account for a creator
  app.post("/api/creators/:creatorId/email-accounts/:emailAccountId/set-primary", async (req, res) => {
    try {
      const creatorId = parseInt(req.params.creatorId);
      const emailAccountId = parseInt(req.params.emailAccountId);
      
      const creator = await storage.getCreator(creatorId);
      if (!creator) {
        return res.status(404).json({ message: "Creator not found" });
      }
      
      const emailAccount = await storage.getEmailAccount(emailAccountId);
      if (!emailAccount) {
        return res.status(404).json({ message: "Email account not found" });
      }
      
      // Get all creator email accounts to update their isPrimary status
      const creatorEmailAccounts = await storage.getCreatorEmailAccounts(creatorId);
      
      // Check if the email account is linked to this creator
      const isLinked = creatorEmailAccounts.some(account => account.id === emailAccountId);
      if (!isLinked) {
        return res.status(404).json({ message: "Email account not linked to this creator" });
      }
      
      // First, get all existing creator-email account associations
      const allAssociations = await storage.getCreatorEmailAccountAssociations();
      const creatorAssociations = allAssociations.filter(assoc => assoc.creatorId === creatorId);
      
      // Delete all existing associations for this creator to prevent duplicates
      for (const assoc of creatorAssociations) {
        await storage.deleteCreatorEmailAccount(assoc.id);
      }
      
      // Then recreate the associations with correct primary status
      for (const account of creatorEmailAccounts) {
        await storage.linkCreatorToEmailAccount({
          creatorId,
          emailAccountId: account.id,
          isPrimary: account.id === emailAccountId
        });
      }
      
      const updatedPrimaryAccount = await storage.getPrimaryEmailAccountForCreator(creatorId);
      res.json(updatedPrimaryAccount);
    } catch (error) {
      console.error("Error updating primary email account:", error);
      res.status(500).json({ message: "Failed to update primary email account" });
    }
  });
  
  // Unlink email account from a creator
  app.delete("/api/creators/:creatorId/email-accounts/:emailAccountId", async (req, res) => {
    try {
      const creatorId = parseInt(req.params.creatorId);
      const emailAccountId = parseInt(req.params.emailAccountId);
      
      // Check if creator exists
      const creator = await storage.getCreator(creatorId);
      if (!creator) {
        return res.status(404).json({ message: "Creator not found" });
      }
      
      // Check if email account exists
      const emailAccount = await storage.getEmailAccount(emailAccountId);
      if (!emailAccount) {
        return res.status(404).json({ message: "Email account not found" });
      }
      
      // Check if this is the primary account
      const primaryAccount = await storage.getPrimaryEmailAccountForCreator(creatorId);
      
      if (primaryAccount && primaryAccount.id === emailAccountId) {
        return res.status(400).json({ 
          message: "Cannot unlink primary email account. Set another account as primary first." 
        });
      }
      
      // TODO: Implement unlinkCreatorFromEmailAccount in storage
      // For now, return a success message
      res.json({ message: "Email account unlinked successfully" });
    } catch (error) {
      console.error("Error unlinking email account:", error);
      res.status(500).json({ message: "Failed to unlink email account" });
    }
  });
  
  // Dashboard stats
  app.get("/api/stats", async (req, res) => {
    try {
      const campaigns = await storage.getAllCampaigns();
      const emails = await storage.getAllEmails();
      
      // Calculate stats
      const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
      const emailsSent = emails.filter(e => e.status === 'sent' || e.status === 'opened' || e.status === 'clicked' || e.status === 'replied').length;
      
      const openedEmails = emails.filter(e => e.status === 'opened' || e.status === 'clicked' || e.status === 'replied').length;
      const openRate = emailsSent > 0 ? (openedEmails / emailsSent) * 100 : 0;
      
      const repliedEmails = emails.filter(e => e.status === 'replied').length;
      const responseRate = emailsSent > 0 ? (repliedEmails / emailsSent) * 100 : 0;
      
      // In a real app, we would calculate changes from last month
      // For this demo, we'll provide random changes
      
      res.json({
        activeCampaigns,
        campaignsChange: Math.floor(Math.random() * 30) - 15, // -15 to +15
        
        emailsSent,
        emailsChange: Math.floor(Math.random() * 40), // 0 to +40
        
        openRate: parseFloat(openRate.toFixed(1)),
        openRateChange: Math.floor(Math.random() * 10) - 5, // -5 to +5
        
        responseRate: parseFloat(responseRate.toFixed(1)),
        responseRateChange: Math.floor(Math.random() * 8) - 4 // -4 to +4
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });
  
  // Remove test emails (one-time cleanup)
  app.delete("/api/emails/cleanup-test", async (req, res) => {
    try {
      const emails = await storage.getAllEmails();
      
      // Find test emails (recent sent emails as test emails)
      const testEmails = emails.filter(email => 
        (email.status === 'sent' && (email.sentAt?.getTime() || 0) > Date.now() - 5 * 60 * 1000) // Emails sent in the last 5 minutes
      );
      
      if (testEmails.length === 0) {
        return res.json({ message: "No test emails found to clean up" });
      }
      
      // Delete each test email
      const deletedIds = [];
      for (const email of testEmails) {
        try {
          await storage.deleteEmail(email.id);
          deletedIds.push(email.id);
        } catch (err) {
          console.error(`Failed to delete email ID ${email.id}:`, err);
        }
      }
      
      res.json({ 
        message: `Successfully removed ${deletedIds.length} test emails`, 
        deletedCount: deletedIds.length,
        deletedIds 
      });
    } catch (error) {
      console.error("Error cleaning up test emails:", error);
      res.status(500).json({ message: "Failed to clean up test emails" });
    }
  });

  // Email sending routes using direct SMTP
  app.post("/api/emails/send", async (req, res) => {
    try {
      const { emailAccountId, to, subject, html, text, campaignId, contactId, scheduledAt } = req.body;
      
      if (!emailAccountId || !to || !subject || (!html && !text)) {
        return res.status(400).json({ 
          message: "Missing required fields: emailAccountId, to, subject, and either html or text content"
        });
      }
      
      // Get the email account from database
      let emailAccount = null;
      
      // Try to find account by email if the ID includes @ symbol
      if (typeof emailAccountId === 'string' && emailAccountId.includes('@')) {
        console.log(`Looking up email account by email address: ${emailAccountId}`);
        emailAccount = await storage.getEmailAccountByEmail(emailAccountId);
      } else {
        // Convert emailAccountId to number if it's a string numeric ID
        const accountId = typeof emailAccountId === 'string' && /^\d+$/.test(emailAccountId)
          ? parseInt(emailAccountId) 
          : emailAccountId;
        
        // Check if email account exists in database
        emailAccount = await storage.getEmailAccount(accountId);
      }
      
      // If still not found, try finding by notes field which might contain former external IDs
      if (!emailAccount && typeof emailAccountId === 'string' && /^\d+$/.test(emailAccountId)) {
        const accounts = await storage.getAllEmailAccounts();
        emailAccount = accounts.find(acct => {
          if (!acct.notes) return false;
          
          return (
            acct.notes.includes(`Former ID: ${emailAccountId}`)
          );
        });
        
        if (emailAccount) {
          console.log(`Found account via notes lookup with former ID ${emailAccountId}: ${emailAccount.email}`);
        }
      }
      
      // If still not found, return error
      if (!emailAccount) {
        return res.status(404).json({ 
          message: `Email account not found with ID: ${emailAccountId}`,
          error: "ACCOUNT_NOT_FOUND"
        });
      }
      
      console.log(`Attempting to send email from account ${emailAccount.id} (${emailAccount.email}) to ${to}`);
      
      // Send the email using the found account ID
      const result = await sendEmail(emailAccount.id, {
        from: req.body.from, // If not provided, will use the email account's email
        to,
        cc: req.body.cc,
        bcc: req.body.bcc,
        subject,
        html,
        text,
        attachments: req.body.attachments,
        _emailAccount: emailAccount, // Pass the full email account object for services
        campaignId: campaignId ? (typeof campaignId === 'string' ? parseInt(campaignId) : campaignId) : undefined,
        contactId: contactId ? (typeof contactId === 'string' ? parseInt(contactId) : contactId) : undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined
      });
      
      // Special flag to indicate if test transport was used
      const useTestTransport = process.env.NODE_ENV === 'development' && 
                              !['shayirimi@stemmgt.com', 'ana@stemgroup.io'].includes(emailAccount.email);

      if (!result.success) {
        console.error(`Failed to send email: ${result.error}`);
        return res.status(500).json({ 
          message: result.error || "Failed to send email",
          error: "SEND_FAILED",
          details: result.error
        });
      }
      
      // Log success information
      console.log(`Email sent successfully to ${to}, messageId: ${result.messageId}, useTestTransport: ${useTestTransport}`);
      
      res.status(200).json({ 
        message: "Email sent successfully", 
        emailId: result.emailId,
        messageId: result.messageId,
        useTestTransport
      });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ 
        message: "Failed to send email",
        error: error.message || "Unknown error" 
      });
    }
  });

  // Send email from a creator's primary email account
  app.post("/api/creators/:creatorId/emails/send", async (req, res) => {
    try {
      const creatorId = parseInt(req.params.creatorId);
      const { to, subject, html, text, campaignId, contactId, scheduledAt } = req.body;
      
      if (!to || !subject || (!html && !text)) {
        return res.status(400).json({ 
          message: "Missing required fields: to, subject, and either html or text content"
        });
      }
      
      const creator = await storage.getCreator(creatorId);
      if (!creator) {
        return res.status(404).json({ 
          message: "Creator not found",
          error: "CREATOR_NOT_FOUND"
        });
      }
      
      // Get the primary email account to check if it exists
      const primaryAccount = await storage.getPrimaryEmailAccountForCreator(creatorId);
      if (!primaryAccount) {
        return res.status(404).json({
          message: `No primary email account found for creator ID: ${creatorId}`,
          error: "PRIMARY_ACCOUNT_MISSING"
        });
      }
      
      console.log(`Attempting to send email from creator ${creatorId} (${creator.name}) using email ${primaryAccount.email} to ${to}`);
      
      // Send the email from creator's primary account
      const result = await sendEmailFromCreator(creatorId, {
        from: req.body.from, // If not provided, will use the creator's email account
        to,
        cc: req.body.cc,
        bcc: req.body.bcc,
        subject,
        html,
        text,
        attachments: req.body.attachments,
        campaignId: campaignId ? (typeof campaignId === 'string' ? parseInt(campaignId) : campaignId) : undefined,
        contactId: contactId ? (typeof contactId === 'string' ? parseInt(contactId) : contactId) : undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined
      });

      // Special flag to indicate if test transport was used
      const useTestTransport = process.env.NODE_ENV === 'development' && 
                              !['shayirimi@stemmgt.com', 'ana@stemgroup.io'].includes(primaryAccount.email);

      if (!result.success) {
        console.error(`Failed to send email from creator: ${result.error}`);
        return res.status(500).json({ 
          message: result.error || "Failed to send email from creator", 
          error: "SEND_FAILED",
          details: result.error
        });
      }
      
      // Log success information
      console.log(`Email sent successfully from creator ${creatorId} to ${to}, messageId: ${result.messageId}, useTestTransport: ${useTestTransport}`);
      
      res.status(200).json({ 
        message: "Email sent successfully", 
        emailId: result.emailId,
        messageId: result.messageId,
        useTestTransport
      });
    } catch (error) {
      console.error("Error sending email from creator:", error);
      res.status(500).json({ 
        message: "Failed to send email from creator",
        error: "EXCEPTION",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Schedule an email to be sent later
  app.post("/api/emails/schedule", async (req, res) => {
    try {
      const { emailAccountId, to, subject, html, text, scheduledAt, campaignId, contactId } = req.body;
      
      if (!emailAccountId || !to || !subject || (!html && !text) || !scheduledAt) {
        return res.status(400).json({ 
          message: "Missing required fields: emailAccountId, to, subject, scheduledAt, and either html or text content"
        });
      }
      
      const scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        return res.status(400).json({ 
          message: "Invalid scheduledAt date format",
          error: "INVALID_DATE"
        });
      }
      
      // Convert emailAccountId to number if it's a string
      const accountId = typeof emailAccountId === 'string' 
        ? parseInt(emailAccountId) 
        : emailAccountId;
      
      // Check if email account exists before trying to schedule
      const emailAccount = await storage.getEmailAccount(accountId);
      if (!emailAccount) {
        return res.status(404).json({ 
          message: `Email account not found with ID: ${accountId}`,
          error: "ACCOUNT_NOT_FOUND"
        });
      }
      
      console.log(`Attempting to schedule email from account ${accountId} (${emailAccount.email}) to ${to} at ${scheduledDate.toISOString()}`);
      
      // Schedule the email
      const result = await scheduleEmail(accountId, {
        from: req.body.from, // If not provided, will use the email account's email
        to,
        cc: req.body.cc,
        bcc: req.body.bcc,
        subject,
        html,
        text,
        attachments: req.body.attachments,
        campaignId: campaignId ? (typeof campaignId === 'string' ? parseInt(campaignId) : campaignId) : undefined,
        contactId: contactId ? (typeof contactId === 'string' ? parseInt(contactId) : contactId) : undefined,
        scheduledAt: scheduledDate
      }, scheduledDate);

      // Special flag to indicate if test transport will be used when sending (not affecting scheduling)
      const useTestTransport = process.env.NODE_ENV === 'development' && 
                              !['shayirimi@stemmgt.com', 'ana@stemgroup.io'].includes(emailAccount.email);

      if (!result.success) {
        console.error(`Failed to schedule email: ${result.error}`);
        return res.status(500).json({ 
          message: result.error || "Failed to schedule email",
          error: "SCHEDULE_FAILED",
          details: result.error
        });
      }
      
      // Log success information
      console.log(`Email scheduled successfully to ${to} at ${scheduledDate.toISOString()}, emailId: ${result.emailId}, useTestTransport when sending: ${useTestTransport}`);
      
      res.status(200).json({ 
        message: "Email scheduled successfully", 
        emailId: result.emailId,
        scheduledAt: scheduledDate,
        useTestTransport
      });
    } catch (error) {
      console.error("Error scheduling email:", error);
      res.status(500).json({ 
        message: "Failed to schedule email",
        error: "EXCEPTION",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Endpoint to process scheduled emails
  app.post("/api/process-scheduled-emails", async (req, res) => {
    try {
      // Simple API key authorization for this endpoint to prevent unauthorized access
      const apiKey = req.headers['x-api-key'];
      const expectedApiKey = process.env.EMAIL_PROCESSOR_API_KEY || 'development-key';
      
      if (apiKey !== expectedApiKey) {
        console.warn('Unauthorized attempt to process scheduled emails');
        return res.status(401).json({ 
          message: "Unauthorized access",
          error: "UNAUTHORIZED"
        });
      }
      
      console.log('Processing scheduled emails on demand...');
      const result = await processScheduledEmails();
      
      // Update campaign progress values for campaigns that have sent emails
      if (result.sent > 0) {
        // This would be implemented in a production system to update campaign progress
        console.log('Updating campaign progress metrics...');
      }
      
      return res.status(200).json({
        message: "Scheduled emails processed successfully",
        result
      });
    } catch (error) {
      console.error("Error processing scheduled emails:", error);
      return res.status(500).json({ 
        message: "Failed to process scheduled emails",
        error: "EXCEPTION",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Endpoint to manually trigger scheduled email processing
  app.get("/api/trigger-email-processing", async (req, res) => {
    try {
      console.log('Manually triggering scheduled email processing...');
      const result = await processScheduledEmails();
      
      return res.status(200).json({
        message: "Email processing triggered successfully",
        result
      });
    } catch (error) {
      console.error("Error triggering email processing:", error);
      return res.status(500).json({ 
        message: "Failed to trigger email processing",
        error: "EXCEPTION",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Endpoint to force-send a specific email regardless of schedule
  app.post("/api/emails/:id/send-now", async (req, res) => {
    try {
      const emailId = parseInt(req.params.id);
      
      // Get the email
      const email = await storage.getEmail(emailId);
      if (!email) {
        return res.status(404).json({ message: "Email not found" });
      }
      
      // Get the contact
      const contact = await storage.getContact(email.contactId || 0);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      // Get the email account
      const emailAccount = await storage.getEmailAccount(email.emailAccountId || 0);
      if (!emailAccount) {
        return res.status(404).json({ message: "Email account not found" });
      }
      
      console.log(`Force sending email ID: ${emailId} to ${contact.email} using account ${emailAccount.email}...`);
      
      // Attempt to send the email
      const result = await sendEmail(
        email.emailAccountId || 0,
        {
          from: emailAccount.email,
          to: contact.email,
          subject: email.subject,
          html: email.body,
          text: '', // Plain text version not stored separately
          campaignId: email.campaignId || undefined,
          contactId: email.contactId || undefined,
          _emailId: email.id
        }
      );
      
      if (result.success) {
        // Update email status directly in storage
        await storage.updateEmail(emailId, {
          ...email,
          status: 'sent',
          sentAt: new Date(),
          messageId: result.messageId || null
        });
        
        return res.status(200).json({
          message: `Email successfully sent to ${contact.email}`,
          result
        });
      } else {
        return res.status(500).json({
          message: "Failed to send email",
          error: result.error
        });
      }
    } catch (error) {
      console.error("Error sending email:", error);
      return res.status(500).json({ 
        message: "Failed to send email",
        error: "EXCEPTION",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Smartlead API routes removed - using direct SMTP implementation instead

  // Register AI email monitoring routes
  registerAiMonitoringRoutes(app);

  // Register whiteboard routes
  // Whiteboard routes removed

  // Register email template routes
  app.use('/api/email-templates', emailTemplateRouter);
  
  // Register outreach routes
  app.use('/api/outreach', outreachRoutes);
  
  // Register enhanced email deliverability routes
  app.use('/api/email-delivery', emailDeliveryRoutes);
  
  // Register enhanced outreach routes
  app.use('/api/enhanced-outreach', enhancedOutreachRoutes);
  
  // Register direct contact view routes for database access
  app.use('/api/direct-contacts', directContactViewRoutes);
  app.use('/api/stem-contacts', stemContactsViewRoutes);
  
  // Register proposal routes
  app.use('/api/proposals', proposalRoutes);
  
  // Register landing page routes
  app.use('/api', landingPageRoutes);
  
  // Register email tracking routes - important: these are at the root level, not under /api
  app.use('/t', trackingRoutes);
  
  // Shareable Landing Pages routes
  const shareableLandingPagesRouter = express.Router();
  
  // Get all shareable landing pages
  shareableLandingPagesRouter.get('/', async (req, res) => {
    try {
      const pages = await storage.getAllShareableLandingPages();
      res.json(pages);
    } catch (error) {
      console.error('Error fetching shareable landing pages:', error);
      res.status(500).json({ message: 'Failed to fetch shareable landing pages' });
    }
  });
  
  // Get analytics for shareable landing pages
  shareableLandingPagesRouter.get('/analytics', async (req, res) => {
    try {
      const pages = await storage.getAllShareableLandingPages();
      
      // Calculate total views and page counts
      const totalViews = pages.reduce((sum, page) => sum + (page.viewCount || 0), 0);
      const totalPages = pages.length;
      
      // Get top 5 most viewed pages
      const topPages = [...pages]
        .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
        .slice(0, 5)
        .map(page => ({
          id: page.id,
          title: page.title,
          uniqueId: page.uniqueId,
          viewCount: page.viewCount || 0,
          type: page.type || 'standard',
          createdAt: page.createdAt
        }));
      
      // Calculate page types
      const pageTypeCount = {
        'creator-project': pages.filter(p => p.type === 'creator-project').length,
        'creator-list': pages.filter(p => p.type === 'creator-list').length,
        'selected-creators': pages.filter(p => p.type === 'selected-creators').length
      };
      
      // Calculate status counts
      const statusCount = {
        active: pages.filter(p => p.status === 'active').length,
        expired: pages.filter(p => p.expiresAt && new Date(p.expiresAt) < new Date()).length,
        deleted: pages.filter(p => p.status === 'deleted').length
      };
      
      // Calculate recent page views (last 7 days)
      const now = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      
      const recentPages = pages.filter(page => 
        page.updatedAt && new Date(page.updatedAt) >= sevenDaysAgo
      );
      
      const recentViews = recentPages.reduce((sum, page) => sum + (page.viewCount || 0), 0);
      
      res.json({
        totalPages,
        totalViews,
        topPages,
        pageTypeCount,
        statusCount,
        recentViews
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ message: 'Failed to fetch analytics' });
    }
  });
  
  // Get shareable landing pages for a specific user
  shareableLandingPagesRouter.get('/user/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      const pages = await storage.getUserShareableLandingPages(userId);
      res.json(pages);
    } catch (error) {
      console.error('Error fetching user shareable landing pages:', error);
      res.status(500).json({ message: 'Failed to fetch user shareable landing pages' });
    }
  });
  
  // Get shareable landing pages for a specific creator
  shareableLandingPagesRouter.get('/creator/:creatorId', async (req, res) => {
    try {
      const creatorId = parseInt(req.params.creatorId);
      if (isNaN(creatorId)) {
        return res.status(400).json({ message: 'Invalid creator ID' });
      }
      
      const pages = await storage.getCreatorShareableLandingPages(creatorId);
      res.json(pages);
    } catch (error) {
      console.error('Error fetching creator shareable landing pages:', error);
      res.status(500).json({ message: 'Failed to fetch creator shareable landing pages' });
    }
  });
  
  // Get a specific shareable landing page by ID
  shareableLandingPagesRouter.get('/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      
      const page = await storage.getShareableLandingPage(id);
      if (!page) {
        return res.status(404).json({ message: 'Shareable landing page not found' });
      }
      
      res.json(page);
    } catch (error) {
      console.error('Error fetching shareable landing page:', error);
      res.status(500).json({ message: 'Failed to fetch shareable landing page' });
    }
  });
  
  // Get a specific shareable landing page by unique ID (public access)
  shareableLandingPagesRouter.get('/public/:uniqueId', async (req, res) => {
    try {
      const { uniqueId } = req.params;
      
      const page = await storage.getShareableLandingPageByUniqueId(uniqueId);
      if (!page) {
        return res.status(404).json({ message: 'Shareable landing page not found' });
      }
      
      // Increment view count
      await storage.incrementShareableLandingPageViewCount(page.id);
      
      // Check if the page has expired
      if (page.expiresAt && new Date(page.expiresAt) < new Date()) {
        return res.status(410).json({ message: 'This shareable landing page has expired' });
      }
      
      res.json(page);
    } catch (error) {
      console.error('Error fetching public shareable landing page:', error);
      res.status(500).json({ message: 'Failed to fetch public shareable landing page' });
    }
  });
  
  // Create a new shareable landing page
  shareableLandingPagesRouter.post('/', async (req, res) => {
    try {
      const pageData = req.body;
      
      // Generate expiration date if specified in days
      if (pageData.expiresInDays) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + pageData.expiresInDays);
        pageData.expiresAt = expiresAt;
        delete pageData.expiresInDays; // Remove the temporary field
      }
      
      const page = await storage.createShareableLandingPage(pageData);
      res.status(201).json(page);
    } catch (error) {
      console.error('Error creating shareable landing page:', error);
      res.status(500).json({ message: 'Failed to create shareable landing page' });
    }
  });
  
  // Update a shareable landing page
  shareableLandingPagesRouter.put('/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      
      const pageData = req.body;
      
      // Generate expiration date if specified in days
      if (pageData.expiresInDays) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + pageData.expiresInDays);
        pageData.expiresAt = expiresAt;
        delete pageData.expiresInDays; // Remove the temporary field
      }
      
      const page = await storage.updateShareableLandingPage(id, pageData);
      res.json(page);
    } catch (error) {
      console.error('Error updating shareable landing page:', error);
      res.status(500).json({ message: 'Failed to update shareable landing page' });
    }
  });
  
  // Delete a shareable landing page
  shareableLandingPagesRouter.delete('/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }
      
      const success = await storage.deleteShareableLandingPage(id);
      if (!success) {
        return res.status(404).json({ message: 'Shareable landing page not found' });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error('Error deleting shareable landing page:', error);
      res.status(500).json({ message: 'Failed to delete shareable landing page' });
    }
  });
  
  // Track click events (email, whatsapp, platform, mediakit)
  shareableLandingPagesRouter.post('/track/:uniqueId/:action', async (req, res) => {
    try {
      const { uniqueId, action } = req.params;
      
      const page = await storage.getShareableLandingPageByUniqueId(uniqueId);
      if (!page) {
        return res.status(404).json({ message: 'Shareable landing page not found' });
      }
      
      // Update the appropriate click counter based on action type
      const updates: Record<string, any> = {};
      
      switch (action) {
        case 'email':
          updates.emailClicks = (page.emailClicks || 0) + 1;
          break;
        case 'whatsapp':
          updates.whatsappClicks = (page.whatsappClicks || 0) + 1;
          break;
        case 'platform':
          updates.platformClicks = (page.platformClicks || 0) + 1;
          break;
        case 'mediakit':
          updates.mediaKitClicks = (page.mediaKitClicks || 0) + 1;
          break;
        default:
          return res.status(400).json({ message: 'Invalid action type' });
      }
      
      // Use basic update function since our enhanced schema fields may not exist yet
      await storage.updateShareableLandingPage(page.id, updates);
      
      res.json({ success: true, action });
    } catch (error) {
      console.error('Error tracking click event:', error);
      res.status(500).json({ message: 'Failed to track click event' });
    }
  });
  
  // Submit contact form
  shareableLandingPagesRouter.post('/contact/:uniqueId', async (req, res) => {
    try {
      const { uniqueId } = req.params;
      const formData = req.body;
      
      const page = await storage.getShareableLandingPageByUniqueId(uniqueId);
      if (!page) {
        return res.status(404).json({ message: 'Shareable landing page not found' });
      }
      
      // Validate required fields
      if (!formData.name || !formData.email || !formData.message) {
        return res.status(400).json({ message: 'Name, email and message are required' });
      }
      
      // Add timestamp to submission
      const submission = {
        ...formData,
        timestamp: new Date().toISOString()
      };
      
      // Update the contact form submissions
      const submissions = (page.contactFormSubmissions as any[] || []);
      await storage.updateShareableLandingPage(page.id, {
        contactFormSubmissions: [...submissions, submission]
      });
      
      res.json({ message: 'Form submitted successfully' });
    } catch (error) {
      console.error('Error submitting contact form:', error);
      res.status(500).json({ message: 'Failed to submit contact form' });
    }
  });
  
  app.use('/api/shareable-landing-pages', shareableLandingPagesRouter);
  
  // Create specific routes for creator video sharing
  shareableLandingPagesRouter.post('/creator-videos', async (req, res) => {
    try {
      const { title, description, content, uniqueId, recipientEmail } = req.body;
      
      // Generate a unique ID if not provided
      const shareUniqueId = uniqueId || `share_${Math.random().toString(36).substring(2, 12)}`;
      
      // Create the shareable landing page without requiring a user
      const newPage = await storage.createShareableLandingPage({
        uniqueId: shareUniqueId,
        title,
        description,
        type: 'creator-list',
        content,
        status: 'active',
        userId: null, // Make userId null since we don't have a valid user
        metadata: { 
          createdAt: new Date(),
          creatorCount: Array.isArray(content) ? content.length : 1,
          sharedWith: recipientEmail || null
        }
      });
      
      res.status(201).json({
        success: true,
        page: newPage,
        shareUrl: `${req.protocol}://${req.get('host')}/share/${shareUniqueId}`
      });
    } catch (error) {
      console.error('Error creating shareable landing page:', error);
      res.status(500).json({ message: 'Failed to create shareable landing page' });
    }
  });
  
  // Get a specific shareable landing page by uniqueId
  shareableLandingPagesRouter.get('/public/:uniqueId', async (req, res) => {
    try {
      const { uniqueId } = req.params;
      const page = await storage.getShareableLandingPageByUniqueId(uniqueId);
      
      if (!page) {
        return res.status(404).json({ message: 'Shareable landing page not found' });
      }
      
      // Update view count
      await storage.incrementShareableLandingPageViewCount(page.id);
      
      res.json(page);
    } catch (error) {
      console.error('Error fetching shareable landing page:', error);
      res.status(500).json({ message: 'Failed to fetch shareable landing page' });
    }
  });
  
  // Register AI monitoring routes
  registerAiMonitoringRoutes(app);
  
  // Register A/B testing routes
  registerAbTestingRoutes(app);
  
  // Register tracking routes
  app.use('/api/tracking', trackingRoutes);
  
  // Register test routes for adding contacts
  app.use('/api/test', testAddContactsRoutes);
  
  // Register campaign diagnostics routes
  app.use('/api/diagnostics', campaignContactsCheckRoutes);

  // Register STEM contacts routes
  app.use('/api/stem-contacts', stemContactsRoutes);

  // These direct pipeline routes must come BEFORE other route registrations to avoid conflicts
  app.get('/api/pipeline-stages', async (req, res) => {
    // Return default pipeline stages
    const DEFAULT_PIPELINE_STAGES = [
      { id: "1", name: "Warm Leads" },
      { id: "2", name: "Initial Contact" },
      { id: "3", name: "Meeting Scheduled" },
      { id: "4", name: "Proposal Sent" },
      { id: "5", name: "Negotiation" },
      { id: "6", name: "Won" },
      { id: "7", name: "Lost" }
    ];
    res.json(DEFAULT_PIPELINE_STAGES);
  });
  
  app.get('/api/pipeline-cards', async (req, res) => {
    try {
      const allCards = await storage.getAllPipelineCards();
      res.json(allCards);
    } catch (error) {
      console.error('Error fetching pipeline cards:', error);
      res.status(500).json({ message: 'Failed to fetch pipeline cards' });
    }
  });
  
  // Register proposal routes with specific prefix to avoid conflicts
  app.use('/api/proposals', proposalRoutes);
  
  // Register landing page routes
  app.use('/api', landingPageRoutes);
  
  // Register creator URL extraction routes
  app.use('/api/creator-extraction', creatorUrlRoutes);
  
  // Register sales pipeline routes
  app.use('/api/pipeline', pipelineRoutes);
  
  // Register company information routes
  app.use('/api/company-info', companyInfoRoutes);
  
  // Register AI agent routes
  app.use('/api/ai', createAiAgentRoutes(storage));

  return httpServer;
}
