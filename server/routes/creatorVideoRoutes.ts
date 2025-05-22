import express from 'express';
import { storage } from '../storage';
import { asanaService } from '../services/asanaService';

const router = express.Router();

// Get all creator videos
router.get('/api/creator-videos', async (req, res) => {
  try {
    const creatorVideos = await asanaService.getCreatorVideos();
    
    // Return the videos (which may now include creator connections)
    res.json(creatorVideos);
  } catch (error) {
    console.error('Error fetching creator videos:', error);
    res.status(500).json({ message: 'Failed to fetch creator videos' });
  }
});

// Connect a video to a creator profile
router.post('/api/connect-video', async (req, res) => {
  try {
    const { videoId, creatorId } = req.body;
    
    if (!videoId || !creatorId) {
      return res.status(400).json({ message: "Video ID and Creator ID are required" });
    }
    
    console.log(`API request to connect video ${videoId} to creator ${creatorId}`);
    
    // Update the video record with the creator ID
    await storage.updateCreatorVideo(videoId, { creatorId });
    
    res.status(200).json({ 
      message: "Video connected to creator successfully",
      videoId,
      creatorId
    });
  } catch (error) {
    console.error("Error connecting video to creator:", error);
    res.status(500).json({ 
      message: "Failed to connect video to creator",
      error: error.message
    });
  }
});

// Bulk connect multiple videos to a creator profile
router.post('/api/bulk-connect-videos', async (req, res) => {
  try {
    const { videoIds, creatorId } = req.body;
    
    if (!videoIds || !videoIds.length || !creatorId) {
      return res.status(400).json({ message: "Video IDs array and Creator ID are required" });
    }
    
    console.log(`API request to bulk connect ${videoIds.length} videos to creator ${creatorId}`);
    
    // Track successful connections
    const results = {
      successful: [],
      failed: []
    };
    
    // Update each video with the creator ID
    for (const videoId of videoIds) {
      try {
        await storage.updateCreatorVideo(videoId, { creatorId });
        results.successful.push(videoId);
      } catch (err) {
        console.error(`Error connecting video ${videoId} to creator:`, err);
        results.failed.push({
          videoId,
          error: err.message
        });
      }
    }
    
    // Return results summary
    res.status(200).json({ 
      message: `Connected ${results.successful.length} of ${videoIds.length} videos to creator successfully`,
      creatorId,
      results
    });
  } catch (error) {
    console.error("Error in bulk video connection:", error);
    res.status(500).json({ 
      message: "Failed to process bulk video connection",
      error: error.message
    });
  }
});

export default router;