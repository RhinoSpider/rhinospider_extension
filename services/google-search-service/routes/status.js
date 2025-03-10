const express = require('express');
const router = express.Router();
const { getSession, getAllSessions } = require('../services/sessionManager');

/**
 * @route GET /api/status/:sessionToken
 * @description Get status of a specific search session
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
    
    return res.status(200).json({
      sessionToken,
      extensionId: session.extensionId,
      topic: session.topic.name,
      totalUrls: session.urls.length,
      currentIndex: session.currentIndex,
      remaining: session.urls.length - session.currentIndex,
      lastAccessTime: session.lastAccessTime,
      createdAt: session.createdAt
    });
  } catch (error) {
    console.error('Status error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      message: 'Failed to get session status' 
    });
  }
});

/**
 * @route GET /api/status
 * @description Get overall service status
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    // Get all active sessions
    const sessions = await getAllSessions();
    
    return res.status(200).json({
      status: 'OK',
      activeSessions: sessions.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Service status error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      message: 'Failed to get service status' 
    });
  }
});

module.exports = router;
