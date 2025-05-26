import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
// Smartlead integration removed - using direct SMTP implementation instead

const app = express();
// Increase JSON body size limit to 50MB for large STEM list files
app.use(express.json({ limit: '50mb' }));
// Increase URL encoded payload size limit for form submissions
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);
    
    // Initialize sample data if needed
    try {
      log(`Initializing sample data...`);
      
      // Add any initialization logic here if needed in the future
      
      // Create a sample creator with rich profile data
      try {
        const existingCreator = await storage.getCreatorByName("Sophia Lee");
        if (!existingCreator) {
          log("Creating sample creator profile...");
          const creatorData = {
            name: "Sophia Lee",
            role: "Content Creator & Lifestyle Influencer",
            bio: "Lifestyle content creator specializing in travel, fashion, and sustainable living. With over 5 years of experience creating engaging content across multiple platforms, I connect authentically with audiences through storytelling and high-quality visuals.",
            brandVoice: "Warm, authentic, and approachable with a focus on sustainability and ethical consumption. I balance aspirational content with practical advice, always speaking with honesty and transparency.",
            profileColor: "#3B82F6",
            initials: "SL",
            googleDriveFolder: "https://drive.google.com/folder/sophia-lee-portfolio",
            pillarUrl: "https://instagram.com/sophialee",
            profileImageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&h=500&fit=crop",
            audienceData: JSON.stringify({
              demographics: {
                ageGroups: {
                  "18-24": 22,
                  "25-34": 45,
                  "35-44": 18,
                  "45+": 15
                },
                genderSplit: {
                  female: 68,
                  male: 30,
                  other: 2
                },
                topLocations: ["United States", "United Kingdom", "Canada", "Australia", "Germany"]
              },
              interests: ["Travel", "Sustainable Living", "Fashion", "Wellness", "Photography"]
            }),
            platformStats: JSON.stringify({
              instagram: {
                followers: 128500,
                engagement: 3.8,
                averageLikes: 4850,
                averageComments: 235
              },
              youtube: {
                subscribers: 75200,
                averageViews: 28500,
                engagement: 4.2
              },
              tiktok: {
                followers: 210000,
                averageViews: 45000,
                engagement: 5.1
              },
              performance: {
                reachGrowth: "+15% in last 3 months",
                conversionRate: "3.2% for brand partnerships",
                audienceRetention: "78% on YouTube videos"
              }
            }),
            expertiseAndNiche: JSON.stringify({
              primaryCategories: ["Lifestyle", "Travel", "Sustainable Fashion"],
              secondaryCategories: ["Beauty", "Home Decor", "Wellness"],
              expertise: ["Visual Storytelling", "Destination Marketing", "Eco-Friendly Product Reviews"]
            }),
            collaborationInfo: JSON.stringify({
              pastCollaborations: {
                brands: ["Patagonia", "Away Luggage", "Glossier", "Airbnb", "Lululemon"],
                campaigns: ["Summer Travel Series", "Sustainable Fashion Guide", "Home Office Makeover"]
              },
              opportunities: {
                preferredDeals: ["Long-term Ambassadorships", "Content Series", "Travel Partnerships"],
                availableFor: ["Product Reviews", "Destination Features", "Social Media Takeovers"]
              },
              rates: {
                instagram: "$2,500 per post",
                youtube: "$5,000 per video",
                bundle: "$8,000 for multi-platform campaign"
              }
            }),
            socialLinks: JSON.stringify({
              instagram: "https://instagram.com/sophialee",
              youtube: "https://youtube.com/sophialee",
              tiktok: "https://tiktok.com/@sophialee",
              website: "https://sophialeecreative.com",
              pinterest: "https://pinterest.com/sophialee"
            }),
            metaData: JSON.stringify({
              joinedDate: "2023-01-15",
              lastUpdated: new Date().toISOString(),
              verificationStatus: "Verified",
              preferredContactMethod: "Email"
            })
          };
          
          const creator = await storage.createCreator(creatorData);
          log(`Created sample creator profile (ID: ${creator.id})`);
          
          // Create a sample email account for this creator
          const emailAccount = await storage.createEmailAccount({
            name: "Sophia's Gmail",
            email: "sophia@example.com",
            provider: "gmail",
            status: "active",
            userId: 1, // Assuming user ID 1 exists
            smtpHost: "smtp.gmail.com",
            smtpPort: 587,
            smtpUsername: "sophia@example.com",
            smtpPassword: "password123",
            smtpSecure: false
          });
          
          log(`Created sample email account (ID: ${emailAccount.id})`);
          
          // Associate the email account with the creator
          // Create the association table entry
          try {
            await storage.addCreatorEmailAccount(creator.id, emailAccount.id, true);
            log(`Associated creator with email account`);
          } catch (assocError) {
            log(`Error associating creator with email account: ${assocError instanceof Error ? assocError.message : String(assocError)}`);
          }
        } else {
          log(`Sample creator "Sophia Lee" already exists (ID: ${existingCreator.id})`);
        }
      } catch (creatorError) {
        log(`Error creating sample creator: ${creatorError instanceof Error ? creatorError.message : String(creatorError)}`);
      }
      
      // Ensure Patrick's email account is active
      try {
        const patrickAccount = await storage.getEmailAccountByEmail("patrick@xtendtalent.com");
        if (patrickAccount) {
          log(`Found Patrick's email account (ID: ${patrickAccount.id}), ensuring it's active...`);
          
          // Force update the account status to active and ensure testModeOnly is false
          await storage.updateEmailAccount(patrickAccount.id, {
            status: "active",
            testModeOnly: false
          });
          
          log(`Patrick's email account activated successfully`);
        } else {
          log(`Patrick's email account not found in database`);
        }
      } catch (accountError) {
        log(`Error activating Patrick's account: ${accountError instanceof Error ? accountError.message : String(accountError)}`);
      }
      
      log(`Sample data initialization completed successfully`);
    } catch (error) {
      log(`Error during sample data initialization: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
})();
