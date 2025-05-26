/**
 * Setup Sample Creator Profile Script
 * -----------------------------------
 * This script creates a sample creator with extended profile data
 * for testing the creator detail page.
 */

// Direct SQL approach using pg module for compatibility
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function setupSampleCreatorProfile() {
  console.log('Setting up sample creator with extended profile data...');
  
  // Create database connection
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  
  // Sample creator data with extended profile fields
  const sampleCreator = {
    name: "Sophia Lee",
    role: "Content Creator & Lifestyle Influencer",
    bio: "Lifestyle content creator specializing in travel, fashion, and sustainable living. With over 5 years of experience creating engaging content across multiple platforms, I connect authentically with audiences through storytelling and high-quality visuals.",
    brandVoice: "Warm, authentic, and approachable with a focus on sustainability and ethical consumption. I balance aspirational content with practical advice, always speaking with honesty and transparency.",
    profileColor: "#3B82F6",
    initials: "SL",
    googleDriveFolder: "https://drive.google.com/folder/sophia-lee-portfolio",
    pillarUrl: "https://instagram.com/sophialee",
    profileImageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&h=500&fit=crop",
    audienceData: {
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
    },
    platformStats: {
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
    },
    expertiseAndNiche: {
      primaryCategories: ["Lifestyle", "Travel", "Sustainable Fashion"],
      secondaryCategories: ["Beauty", "Home Decor", "Wellness"],
      expertise: ["Visual Storytelling", "Destination Marketing", "Eco-Friendly Product Reviews"]
    },
    collaborationInfo: {
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
    },
    socialLinks: {
      instagram: "https://instagram.com/sophialee",
      youtube: "https://youtube.com/sophialee",
      tiktok: "https://tiktok.com/@sophialee",
      website: "https://sophialeecreative.com",
      pinterest: "https://pinterest.com/sophialee"
    },
    metaData: {
      joinedDate: "2023-01-15",
      lastUpdated: new Date().toISOString(),
      verificationStatus: "Verified",
      preferredContactMethod: "Email"
    }
  };
  
  try {
    // Check if creator already exists
    const [existingCreator] = await db.select()
      .from(creators)
      .where(eq(creators.name, sampleCreator.name));
    
    if (existingCreator) {
      // Update the existing creator
      console.log(`Updating existing creator: ${sampleCreator.name}`);
      await db.update(creators)
        .set(sampleCreator)
        .where(eq(creators.id, existingCreator.id));
      
      console.log(`Creator updated successfully: ${sampleCreator.name} (ID: ${existingCreator.id})`);
      return;
    }
    
    // Create new creator with extended profile
    const [result] = await db.insert(creators)
      .values(sampleCreator)
      .returning();
    
    console.log(`Sample creator profile created: ${result.name} (ID: ${result.id})`);
  } catch (error) {
    console.error('Error setting up sample creator profile:', error);
  }
}

// Run the function
setupSampleCreatorProfile()
  .then(() => console.log('Sample creator profile setup complete'))
  .catch(err => console.error('Error in setup script:', err));