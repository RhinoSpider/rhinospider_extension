// This is a fix for the excludePatterns field in the updateTopic function
// Replace lines 200-204 with:

excludePatterns: topic.excludePatterns && topic.excludePatterns.length > 0
    ? [topic.excludePatterns
        .filter((p: any) => typeof p === 'string' && p.trim() !== '')
        .map((p: any) => p.trim())]
    : [],

// Replace lines 311-315 with:

excludePatterns: topic.excludePatterns && 
  topic.excludePatterns.some((p: any) => typeof p === 'string' && p.trim() !== '')
    ? [topic.excludePatterns
        .filter((p: any) => typeof p === 'string' && p.trim() !== '')
        .map((p: any) => p.trim())]
    : [],
