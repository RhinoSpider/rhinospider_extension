/**
 * Scraping API routes for RhinoSpider
 * 
 * This module provides endpoints for generating URLs and initiating scraping operations
 */

const express = require('express');
const router = express.Router();
const { generateUrls } = require('../url-generator');

/**
 * Generate URLs for a topic
 * GET /api/scraping/generate-urls/:topicId
 */
router.get('/generate-urls/:topicId', async (req, res) => {
  try {
    const { topicId } = req.params;
    const { limit = 10 } = req.query;
    
    console.log(`[/api/scraping/generate-urls] Generating URLs for topic: ${topicId}, limit: ${limit}`);
    
    // Get the topic from the topics endpoint
    const topicsResponse = await fetch(`${req.protocol}://${req.get('host')}/api/topics`);
    
    if (!topicsResponse.ok) {
      console.error(`[/api/scraping/generate-urls] Failed to fetch topics: ${topicsResponse.status}`);
      return res.status(500).json({ 
        err: `Failed to fetch topics: ${topicsResponse.status}` 
      });
    }
    
    const topicsData = await topicsResponse.json();
    
    if (!topicsData.ok || !Array.isArray(topicsData.ok)) {
      console.error('[/api/scraping/generate-urls] Invalid response format from topics endpoint');
      return res.status(500).json({ 
        err: 'Invalid response format from topics endpoint' 
      });
    }
    
    // Find the requested topic
    const topic = topicsData.ok.find(t => t.id === topicId);
    
    if (!topic) {
      console.error(`[/api/scraping/generate-urls] Topic not found: ${topicId}`);
      return res.status(404).json({ 
        err: `Topic not found: ${topicId}` 
      });
    }
    
    // Generate URLs for the topic
    const urls = generateUrls(topic, parseInt(limit, 10));
    
    console.log(`[/api/scraping/generate-urls] Generated ${urls.length} URLs for topic: ${topicId}`);
    
    return res.json({
      ok: {
        topicId,
        topicName: topic.name,
        urls,
        timestamp: Date.now()
      }
    });
    
  } catch (error) {
    console.error('[/api/scraping/generate-urls] Error:', error);
    return res.status(500).json({ 
      err: `Error generating URLs: ${error.message}` 
    });
  }
});

/**
 * Initiate scraping for a topic
 * POST /api/scraping/start/:topicId
 */
router.post('/start/:topicId', async (req, res) => {
  try {
    const { topicId } = req.params;
    const { urls, limit } = req.body;
    
    console.log(`[/api/scraping/start] Starting scraping for topic: ${topicId}`);
    
    // If URLs are provided, use them
    // Otherwise, generate URLs for the topic
    let scrapingUrls = urls;
    
    if (!scrapingUrls || !Array.isArray(scrapingUrls) || scrapingUrls.length === 0) {
      // Get the topic from the topics endpoint
      const topicsResponse = await fetch(`${req.protocol}://${req.get('host')}/api/topics`);
      
      if (!topicsResponse.ok) {
        console.error(`[/api/scraping/start] Failed to fetch topics: ${topicsResponse.status}`);
        return res.status(500).json({ 
          err: `Failed to fetch topics: ${topicsResponse.status}` 
        });
      }
      
      const topicsData = await topicsResponse.json();
      
      if (!topicsData.ok || !Array.isArray(topicsData.ok)) {
        console.error('[/api/scraping/start] Invalid response format from topics endpoint');
        return res.status(500).json({ 
          err: 'Invalid response format from topics endpoint' 
        });
      }
      
      // Find the requested topic
      const topic = topicsData.ok.find(t => t.id === topicId);
      
      if (!topic) {
        console.error(`[/api/scraping/start] Topic not found: ${topicId}`);
        return res.status(404).json({ 
          err: `Topic not found: ${topicId}` 
        });
      }
      
      // Generate URLs for the topic
      scrapingUrls = generateUrls(topic, parseInt(limit || 10, 10));
    }
    
    console.log(`[/api/scraping/start] Scraping ${scrapingUrls.length} URLs for topic: ${topicId}`);
    
    // In a real implementation, this would initiate the scraping process
    // For now, we'll just return the URLs that would be scraped
    
    return res.json({
      ok: {
        topicId,
        status: 'started',
        urlCount: scrapingUrls.length,
        urls: scrapingUrls,
        timestamp: Date.now()
      }
    });
    
  } catch (error) {
    console.error('[/api/scraping/start] Error:', error);
    return res.status(500).json({ 
      err: `Error starting scraping: ${error.message}` 
    });
  }
});

/**
 * Get scraping status for a topic
 * GET /api/scraping/status/:topicId
 */
router.get('/status/:topicId', (req, res) => {
  try {
    const { topicId } = req.params;
    
    console.log(`[/api/scraping/status] Getting scraping status for topic: ${topicId}`);
    
    // In a real implementation, this would check the status of the scraping process
    // For now, we'll just return a mock status
    
    return res.json({
      ok: {
        topicId,
        status: 'in_progress',
        progress: {
          total: 10,
          completed: 5,
          failed: 1,
          pending: 4
        },
        timestamp: Date.now()
      }
    });
    
  } catch (error) {
    console.error('[/api/scraping/status] Error:', error);
    return res.status(500).json({ 
      err: `Error getting scraping status: ${error.message}` 
    });
  }
});

module.exports = router;
