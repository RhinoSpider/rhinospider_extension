// Test script for the simplified URL selector with search proxy integration
// This script simulates the extension's usage of the URL selector

import { initialize, selectTopicAndUrl, trackSuccessfulUrl } from './simplified-url-selector.js';

// Sample topics for testing
const sampleTopics = [
  {
    id: 'topic-1',
    name: 'JavaScript Programming',
    status: 'active',
    keywords: ['tutorial', 'guide', 'examples'],
    sampleArticleUrls: [
      'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide',
      'https://javascript.info/'
    ]
  },
  {
    id: 'topic-2',
    name: 'Machine Learning',
    status: 'active',
    keywords: ['beginners', 'python', 'tensorflow'],
    sampleArticleUrls: []
  },
  {
    id: 'topic-3',
    name: 'Web Development',
    status: 'active',
    keywords: ['html', 'css', 'responsive'],
    sampleArticleUrls: [
      'https://developer.mozilla.org/en-US/docs/Web/Guide',
      'https://web.dev/learn'
    ]
  }
];

// Test the URL selector
async function testUrlSelector() {
  console.log('===== Testing URL Selector with Search Proxy Integration =====');
  
  // Initialize the URL selector
  console.log('\nInitializing URL selector...');
  await initialize();
  console.log('✅ URL selector initialized');
  
  // Test with sample URLs first
  console.log('\n----- Test 1: Using Sample URLs -----');
  const result1 = await selectTopicAndUrl(sampleTopics);
  
  if (result1.url) {
    console.log(`✅ Selected URL: ${result1.url}`);
    console.log(`✅ For topic: ${result1.topic.name}`);
    
    // Track this URL as successfully scraped
    await trackSuccessfulUrl(result1.topic.id, result1.url);
    console.log('✅ Tracked URL as successfully scraped');
  } else {
    console.log('❌ No URL selected');
  }
  
  // Test with a topic that has no sample URLs
  console.log('\n----- Test 2: Topic with No Sample URLs -----');
  // Create a copy with only the Machine Learning topic
  const topicsWithoutSamples = [sampleTopics[1]];
  
  const result2 = await selectTopicAndUrl(topicsWithoutSamples);
  
  if (result2.url) {
    console.log(`✅ Selected URL from search proxy: ${result2.url}`);
    console.log(`✅ For topic: ${result2.topic.name}`);
  } else {
    console.log('❌ No URL selected from search proxy');
  }
  
  // Test with all sample URLs marked as scraped
  console.log('\n----- Test 3: All Sample URLs Scraped -----');
  
  // Mark all sample URLs as scraped
  for (const topic of sampleTopics) {
    if (topic.sampleArticleUrls) {
      for (const url of topic.sampleArticleUrls) {
        await trackSuccessfulUrl(topic.id, url);
        console.log(`Marked as scraped: ${url}`);
      }
    }
  }
  
  const result3 = await selectTopicAndUrl(sampleTopics);
  
  if (result3.url) {
    console.log(`✅ Selected URL from search proxy after all samples scraped: ${result3.url}`);
    console.log(`✅ For topic: ${result3.topic.name}`);
  } else {
    console.log('❌ No URL selected after all samples scraped');
  }
  
  console.log('\n===== URL Selector Tests Completed =====');
}

// Run the test
testUrlSelector().catch(error => {
  console.error('Error in test:', error);
});
