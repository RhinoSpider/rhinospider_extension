// Simple test script to verify the getTopicsFromStorage function
// This simulates the Chrome extension environment for testing purposes

// Mock Chrome API
global.chrome = {
  storage: {
    local: {
      get: (keys) => Promise.resolve({ topics: mockTopics }),
      set: (data) => Promise.resolve()
    }
  },
  runtime: {
    getManifest: () => ({ version: '1.0.0' })
  },
  action: {
    setBadgeText: () => {},
    setBadgeBackgroundColor: () => {}
  }
};

// Mock logger
global.logger = {
  log: (...args) => console.log('[LOG]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  info: (...args) => console.info('[INFO]', ...args)
};

// Mock topics
const mockTopics = [
  {
    id: 'topic_techcrunch',
    name: 'TechCrunch News',
    status: 'active',
    urlPatterns: ['https://techcrunch.com/*'],
    articleUrls: [
      'https://techcrunch.com/2025/02/28/the-biggest-data-breaches-of-2025-so-far/'
    ],
    urlPathPatterns: ['/2025/02/28/latest-tech-news'],
    extractionRules: {
      title: { selector: 'h1.article-title', attribute: 'text' },
      content: { selector: 'article', attribute: 'text' }
    }
  }
];

// Mock global topics variable
global.topics = [];

// Implementation of getTopicsFromStorage function
async function getTopicsFromStorage() {
  logger.log('Getting topics from storage');
  
  try {
    // Retrieve topics from Chrome storage
    const result = await chrome.storage.local.get(['topics']);
    
    if (result.topics && result.topics.length > 0) {
      logger.log(`Retrieved ${result.topics.length} topics from storage`);
      return { topics: result.topics, success: true };
    } else {
      logger.log('No topics found in storage, returning empty array');
      return { topics: [], success: false };
    }
  } catch (error) {
    logger.error(`Error retrieving topics from storage: ${error.message}`);
    return { topics: [], success: false, error: error.message };
  }
}

// Implementation of selectTopicAndUrl function
async function selectTopicAndUrl() {
  const result = await getTopicsFromStorage();
  const topicsFromStorage = result.topics;
  
  logger.log(`Got ${topicsFromStorage.length} topics from storage`);
  
  if (!topicsFromStorage || topicsFromStorage.length === 0) {
    logger.error('No topics available for selection');
    return { topic: null, url: null };
  }
  
  // Filter active topics
  const activeTopics = topicsFromStorage.filter(topic => topic.status === 'active');
  
  if (activeTopics.length === 0) {
    logger.error('No active topics available for selection');
    return { topic: null, url: null };
  }
  
  // Select a random topic
  const randomIndex = Math.floor(Math.random() * activeTopics.length);
  const selectedTopic = activeTopics[randomIndex];
  
  logger.log(`Selected topic: ${selectedTopic.name} (${selectedTopic.id})`);
  
  // Select a URL pattern from the topic
  if (!selectedTopic.urlPatterns || selectedTopic.urlPatterns.length === 0) {
    logger.error('Selected topic has no URL patterns');
    return { topic: selectedTopic, url: null };
  }
  
  const urlIndex = Math.floor(Math.random() * selectedTopic.urlPatterns.length);
  const selectedUrl = selectedTopic.urlPatterns[urlIndex];
  
  logger.log(`Selected URL: ${selectedUrl}`);
  
  return { topic: selectedTopic, url: selectedUrl };
}

// Test function
async function runTest() {
  console.log('=== TESTING getTopicsFromStorage and selectTopicAndUrl ===');
  
  try {
    // Test getTopicsFromStorage
    const storageResult = await getTopicsFromStorage();
    console.log('getTopicsFromStorage result:', storageResult);
    
    // Test selectTopicAndUrl
    const selectionResult = await selectTopicAndUrl();
    console.log('selectTopicAndUrl result:', selectionResult);
    
    console.log('=== TEST COMPLETED SUCCESSFULLY ===');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
runTest();
