/**
 * Add Tyler Blanchard Creator Profile Script
 * -----------------------------------------
 * This script directly adds the Tyler Blanchard creator profile with complete stats
 * as shown in the Pillar screenshots
 */

const tylerProfile = {
  name: "Tyler Blanchard",
  role: "Professional Content Creator",
  bio: "Tyler Blanchard is a professional content creator specializing in engaging digital content for brands and audiences. With years of experience in the digital media space, he's built a loyal following across multiple platforms through authentic storytelling and high-quality production.",
  profileImageUrl: "https://assets-global.website-files.com/639e61fe6002be495275a358/63a334d95e757716180c43f8_ThumbnailImg.webp",
  socialLinks: {
    twitter: "https://twitter.com/tylerblanchard",
    instagram: "https://instagram.com/_tylerblanchard_",
    youtube: "https://youtube.com/@tylerblanchard",
    tiktok: "https://tiktok.com/@tylerblanchard"
  },
  platformStats: {
    instagram: {
      followers: 110500, // 110.5K
      engagement: 5.1,   // 5.1%
      averageLikes: 59900, // 59.9K
      averageComments: 146.3,
      posts: 97
    },
    youtube: {
      subscribers: 2800000, // 2.8M
      views: 28000000,
      videos: 324
    },
    tiktok: {
      followers: 554000, // 554K
      likes: 3200000,
      videos: 189
    },
    facebook: {
      followers: 160800 // 160.8K
    }
  },
  audienceData: {
    demographics: {
      ageRanges: {
        "13-17": 21,
        "18-24": 43,
        "25-34": 23,
        "35-44": 8,
        "45+": 5
      },
      genderSplit: {
        "male": 81,
        "female": 19
      },
      topLocations: {
        "United States": 42,
        "United Kingdom": 12,
        "Canada": 9,
        "Australia": 7,
        "Germany": 4
      }
    },
    interests: [
      "Tech & Gadgets",
      "Travel",
      "Fitness",
      "Photography",
      "Outdoor Activities",
      "Gaming"
    ]
  },
  expertiseAndNiche: {
    primaryCategories: ["Content Creation", "Digital Marketing"],
    secondaryCategories: ["Tech Reviews", "Travel Vlogs"],
    expertise: [
      "Video Production",
      "Social Media Strategy",
      "Brand Partnerships",
      "Community Building"
    ]
  },
  collaborationInfo: {
    pastCollaborations: {
      brands: ["Samsung", "Adobe", "DJI", "Spotify", "GoPro"],
      campaigns: ["Product Launches", "Brand Awareness", "Tutorial Series"]
    },
    opportunities: {
      preferredDeals: ["Long-term Partnerships", "Product Endorsements"],
      availableFor: ["Sponsored Content", "Brand Ambassadorship", "Event Coverage"]
    },
    rates: {
      "instagram": "$1,500 per post",
      "youtube": "$3,500 per video",
      "bundle": "$6,000 for multi-platform"
    }
  },
  metaData: {
    brandVoice: "Tyler Blanchard's communication style is a blend of professionalism and relatability, characterized by a clear, engaging, and authentic tone. His ability to connect with diverse audiences through a conversational yet polished approach makes him a standout figure in content creation. Tyler's personality shines through his work, reflecting a passion for storytelling and a commitment to excellence.",
    lastUpdated: "MAR 22, 2025",
    dataVerified: true
  }
};

async function addTylerProfile() {
  try {
    console.log('Adding Tyler Blanchard creator profile to the database...');
    
    const response = await fetch('/api/creators', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tylerProfile),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to add Tyler Blanchard profile');
    }
    
    const result = await response.json();
    console.log('Successfully added Tyler profile:', result);
    console.log('Creator ID:', result.id);
    
    return result;
  } catch (error) {
    console.error('Error adding Tyler profile:', error);
    throw error;
  }
}

// Run the function if this script is executed directly
if (typeof window !== 'undefined') {
  window.addTylerProfile = addTylerProfile;
  console.log('Run window.addTylerProfile() in the browser console to add Tyler\'s profile');
}

export { addTylerProfile, tylerProfile };