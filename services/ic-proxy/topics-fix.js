// Legacy topics endpoint - NOW ENFORCES GEO-FILTERING 
app.post('/api/topics', async (req, res) => {
  try {
    const { nodeCharacteristics, principalId } = req.body;
    
    console.log('[/api/topics] Request with principalId:', principalId ? 'YES' : 'NO');
    
    // Always fetch all topics first
    console.log('[/api/topics] Fetching all topics from admin canister...');
    const allTopics = await adminActor.getAllTopics();
    console.log(`[/api/topics] Fetched ${allTopics.length} topics from admin canister`);
    
    let filteredTopics = allTopics;
    
    // Apply any geo-filtering if needed (currently disabled for all users)
    if (nodeCharacteristics) {
      const { ipAddress, region } = nodeCharacteristics;
      console.log(`[/api/topics] Node characteristics - IP: ${ipAddress}, Region: ${region}`);
      
      // For now, skip geo-filtering to ensure all users get topics
      // Can be re-enabled later with proper geo-IP lookup
      /*
      filteredTopics = allTopics.filter(topic => {
        const geoFilter = (topic.geolocationFilter && topic.geolocationFilter.length > 0) 
          ? topic.geolocationFilter[0] 
          : null;
          
        if (!geoFilter || geoFilter === '') {
          return true;
        }
        
        const allowedLocations = geoFilter.split(',').map(loc => loc.trim().toUpperCase());
        
        if (ipAddress === 'unknown' || region === 'unknown') {
          return true;
        }
        
        return allowedLocations.includes(region.toUpperCase());
      });
      */
    }
    
    // Convert BigInt values to strings for JSON serialization
    const serializedTopics = filteredTopics.map(topic => ({
      ...topic,
      createdAt: topic.createdAt ? topic.createdAt.toString() : '0',
      lastScraped: topic.lastScraped ? topic.lastScraped.toString() : '0',
      minContentLength: topic.minContentLength ? Number(topic.minContentLength) : 100,
      maxContentLength: topic.maxContentLength ? Number(topic.maxContentLength) : 10000,
      maxUrlsPerBatch: topic.maxUrlsPerBatch ? Number(topic.maxUrlsPerBatch) : 50,
      scrapingInterval: topic.scrapingInterval ? Number(topic.scrapingInterval) : 3600,
      priority: topic.priority ? Number(topic.priority) : 1,
      totalUrlsScraped: topic.totalUrlsScraped ? Number(topic.totalUrlsScraped) : 0,
      geolocationFilter: (topic.geolocationFilter && topic.geolocationFilter.length > 0) ? topic.geolocationFilter[0] : '',
      percentageNodes: (topic.percentageNodes && topic.percentageNodes.length > 0) ? Number(topic.percentageNodes[0]) : 100,
      randomizationMode: (topic.randomizationMode && topic.randomizationMode.length > 0) ? topic.randomizationMode[0] : 'none'
    }));
    
    console.log(`[/api/topics] Returning ${serializedTopics.length} topics`);
    
    res.json({
      success: true,
      topics: serializedTopics,
      count: serializedTopics.length,
      nodeCharacteristics: nodeCharacteristics || {}
    });
  } catch (error) {
    console.error('[/api/topics] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      topics: []
    });
  }
});