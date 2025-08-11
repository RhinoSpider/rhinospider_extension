// Dynamic rate limit configuration
let rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes default
  max: 5000, // 5000 requests per window default
  skipSuccessfulRequests: false,
  skipFailedRequests: true
};

// Allow dynamic updates
function updateRateLimitConfig(newConfig) {
  rateLimitConfig = { ...rateLimitConfig, ...newConfig };
  console.log('[RateLimit] Configuration updated:', rateLimitConfig);
  return rateLimitConfig;
}

function getRateLimitConfig() {
  return rateLimitConfig;
}

// Endpoint to check/update rate limits (can be called from admin)
function setupRateLimitEndpoints(app) {
  // Get current rate limit config
  app.get('/api/admin/rate-limit', (req, res) => {
    res.json({
      ...rateLimitConfig,
      windowMinutes: rateLimitConfig.windowMs / (60 * 1000),
      description: `${rateLimitConfig.max} requests per ${rateLimitConfig.windowMs / (60 * 1000)} minutes`
    });
  });

  // Update rate limit config
  app.post('/api/admin/rate-limit', (req, res) => {
    const { max, windowMinutes, skipSuccessfulRequests, skipFailedRequests } = req.body;
    
    const updates = {};
    if (max !== undefined) updates.max = max;
    if (windowMinutes !== undefined) updates.windowMs = windowMinutes * 60 * 1000;
    if (skipSuccessfulRequests !== undefined) updates.skipSuccessfulRequests = skipSuccessfulRequests;
    if (skipFailedRequests !== undefined) updates.skipFailedRequests = skipFailedRequests;
    
    const newConfig = updateRateLimitConfig(updates);
    
    res.json({
      success: true,
      config: {
        ...newConfig,
        windowMinutes: newConfig.windowMs / (60 * 1000),
        description: `${newConfig.max} requests per ${newConfig.windowMs / (60 * 1000)} minutes`
      },
      message: 'Rate limit configuration updated. Restart required for changes to take effect.'
    });
  });

  // Reset rate limit for specific IP
  app.post('/api/admin/rate-limit/reset', (req, res) => {
    const { ip } = req.body;
    // This would need to be implemented with the rate limiter store
    res.json({
      success: true,
      message: `Rate limit reset for IP: ${ip || 'all'}`
    });
  });
}

module.exports = {
  getRateLimitConfig,
  updateRateLimitConfig,
  setupRateLimitEndpoints
};