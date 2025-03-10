const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { searchGoogle, searchGoogleForMultipleTopics, getNextBatch } = require('../services/googleSearch');
const { createSession, updateSession, getSession, updateSessionTimestamp } = require('../services/sessionManager');

// Store active sessions
const BATCH_SIZE = 500; // Return 500 URLs per request

/**
 * @route POST /api/search
 * @description Initiate a new search session or continue an existing one
 * @access Public
 */
router.post('/', async (req, res) => {
  try {
    const { topics, extensionId, sessionToken } = req.body;
    
    // Validate request
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'At least one topic is required' 
      });
    }
    
    // Validate that each topic has a name
    const invalidTopics = topics.filter(topic => !topic || !topic.name);
    if (invalidTopics.length > 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'All topics must have a name'
      });
    }
    
    if (!extensionId) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'Extension ID is required' 
      });
    }
    
    let session;
    
    // Check if continuing an existing session
    if (sessionToken) {
      session = await getSession(sessionToken);
      
      // If session not found or expired, create a new one
      if (!session) {
        const newSessionToken = uuidv4();
        session = await createSession(newSessionToken, extensionId, topics);
        
        // Start Google search for these topics
        await searchGoogleForMultipleTopics(topics, session);
        
        return res.status(200).json({
          sessionToken: newSessionToken,
          message: 'New search session created',
          urls: session.urls.slice(0, BATCH_SIZE),
          hasMore: session.urls.length > BATCH_SIZE,
          totalFound: session.urls.length
        });
      }
      
      // Session exists, get next batch of URLs
      const nextBatch = await getNextBatch(session, BATCH_SIZE);
      
      // Update session timestamp
      await updateSessionTimestamp(session);
      
      return res.status(200).json({
        sessionToken,
        urls: nextBatch,
        hasMore: session.currentIndex + BATCH_SIZE < session.urls.length,
        totalFound: session.urls.length
      });
    } else {
      // Create new session
      const newSessionToken = uuidv4();
      session = await createSession(newSessionToken, extensionId, topics);
      
      // Start Google search for these topics
      await searchGoogleForMultipleTopics(topics, session);
      
      return res.status(200).json({
        sessionToken: newSessionToken,
        message: 'New search session created',
        urls: session.urls.slice(0, BATCH_SIZE),
        hasMore: session.urls.length > BATCH_SIZE,
        totalFound: session.urls.length
      });
    }
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      message: 'Failed to process search request' 
    });
  }
});

/**
 * @route GET /api/search/:sessionToken
 * @description Get the next batch of URLs for an existing session
 * @access Public
 */
router.get('/:sessionToken', async (req, res) => {
  try {
    const { sessionToken } = req.params;
    
    if (!sessionToken) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'Session token is required' 
      });
    }
    
    // Get session
    const session = await getSession(sessionToken);
    
    if (!session) {
      return res.status(404).json({ 
        error: 'Not Found', 
        message: 'Session not found or expired' 
      });
    }
    
    // Get next batch of URLs
    const nextBatch = await getNextBatch(session, BATCH_SIZE);
    
    // Update session timestamp
    await updateSessionTimestamp(session);
    
    return res.status(200).json({
      urls: nextBatch,
      hasMore: session.currentIndex + BATCH_SIZE < session.urls.length,
      totalFound: session.urls.length
    });
  } catch (error) {
    console.error('Get next batch error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      message: 'Failed to get next batch of URLs' 
    });
  }
});

module.exports = router;
