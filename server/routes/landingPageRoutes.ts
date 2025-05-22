import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { 
  getShareableLandingPageByUniqueId, 
  getAllShareableLandingPages,
  incrementShareableLandingPageViewCount
} from '../services/directProposalService';

const router = express.Router();

/**
 * Get all landing pages
 */
router.get('/landing-pages', async (req, res) => {
  try {
    const landingPages = await getAllShareableLandingPages();
    return res.json(landingPages);
  } catch (error) {
    console.error('Failed to get landing pages:', error);
    return res.status(500).json({ message: 'Failed to get landing pages' });
  }
});

/**
 * Get a landing page by unique ID - for shared proposals
 */
router.get('/landing-pages/shared/:uniqueId', async (req, res) => {
  try {
    const { uniqueId } = req.params;
    console.log(`Fetching shared landing page with uniqueId: ${uniqueId}`);
    const landingPage = await getShareableLandingPageByUniqueId(uniqueId);
    
    if (!landingPage) {
      console.log(`Landing page not found with uniqueId: ${uniqueId}`);
      return res.status(404).json({ message: 'Landing page not found' });
    }
    
    // Track view count
    if (landingPage.id) {
      await incrementShareableLandingPageViewCount(landingPage.id);
    }
    
    console.log(`Successfully fetched shared landing page: ${landingPage.title}`);
    return res.json(landingPage);
  } catch (error) {
    console.error('Failed to get shared landing page:', error);
    return res.status(500).json({ message: 'Failed to get landing page' });
  }
});

/**
 * Get a landing page by unique ID - original endpoint 
 */
router.get('/landing-pages/:uniqueId', async (req, res) => {
  try {
    const { uniqueId } = req.params;
    const landingPage = await getShareableLandingPageByUniqueId(uniqueId);
    
    if (!landingPage) {
      return res.status(404).json({ message: 'Landing page not found' });
    }
    
    // Track view count
    if (landingPage.id) {
      await incrementShareableLandingPageViewCount(landingPage.id);
    }
    
    return res.json(landingPage);
  } catch (error) {
    console.error('Failed to get landing page:', error);
    return res.status(500).json({ message: 'Failed to get landing page' });
  }
});

/**
 * Get a landing page for printing
 */
router.get('/landing-pages/:uniqueId/print', async (req, res) => {
  try {
    const { uniqueId } = req.params;
    const landingPage = await getShareableLandingPageByUniqueId(uniqueId);
    
    if (!landingPage) {
      return res.status(404).json({ message: 'Landing page not found' });
    }
    
    // Return the same data but with a print flag
    return res.json({
      ...landingPage,
      isPrintVersion: true
    });
  } catch (error) {
    console.error('Failed to get print version of landing page:', error);
    return res.status(500).json({ message: 'Failed to get print version' });
  }
});

/**
 * Track a click on a landing page (email, link, etc.)
 */
router.post('/landing-pages/:uniqueId/track-click', async (req, res) => {
  try {
    const { uniqueId } = req.params;
    const { type } = req.body;
    
    const landingPage = await getShareableLandingPageByUniqueId(uniqueId);
    
    if (!landingPage) {
      return res.status(404).json({ message: 'Landing page not found' });
    }
    
    // In a real implementation, this would track the click in the database
    // For now, just log it
    console.log(`Click tracked on landing page ${uniqueId}: ${type}`);
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Failed to track click:', error);
    return res.status(500).json({ message: 'Failed to track click' });
  }
});

export default router;