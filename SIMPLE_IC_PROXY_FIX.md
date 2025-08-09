# Simple IC Proxy Fix

## Problem
The `/api/consumer-submit` endpoint is overly complex and has missing functions causing errors.

## Solution
Replace with simple direct storage submission:

```javascript
app.post('/api/submit-data', async (req, res) => {
  try {
    const { url, content, topic, principalId, status, scraping_time } = req.body;
    
    const submissionId = `submission-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const storageData = {
      id: submissionId,
      url: url || '',
      topic: topic || '',
      content: content || '<html><body><p>No content available</p></body></html>',
      source: 'extension',
      timestamp: BigInt(Date.now() * 1000000),
      client_id: principalId ? Principal.fromText(principalId) : Principal.anonymous(),
      status: status || 'completed',
      scraping_time: BigInt(scraping_time || 500)
    };

    // Submit directly to storage canister
    const result = await storageActor.storeScrapedData(storageData);
    
    return res.status(200).json({
      success: true,
      submissionId,
      result
    });
  } catch (error) {
    console.error('Storage submission error:', error);
    return res.status(500).json({ error: error.message });
  }
});
```

## What to do:
1. Remove complex consumer fallback logic
2. Remove missing function calls
3. Keep it simple - direct to storage only
4. Consumer canister only for points/rewards tracking