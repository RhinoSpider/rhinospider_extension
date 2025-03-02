// Test script for RhinoSpider scraping functionality
// Run this in the browser console to test URL generation and content fetching

async function testUrlGeneration() {
  console.log('=== TESTING URL GENERATION ===');
  
  // Use the background page's testUrlGeneration function
  const backgroundPage = await chrome.runtime.getBackgroundPage();
  const results = backgroundPage.testUrlGeneration();
  
  if (results.success) {
    console.log('URL generation test results:');
    results.results.forEach(result => {
      console.log(`Topic: ${result.topic}, Pattern: ${result.pattern} => URL: ${result.generatedUrl}`);
    });
  } else {
    console.error('URL generation test failed:', results.error);
  }
}

async function testContentFetching() {
  console.log('=== TESTING CONTENT FETCHING ===');
  
  // Get principal ID
  const cachedData = await chrome.storage.local.get(['principalId']);
  if (!cachedData.principalId) {
    console.error('Cannot test: User is not authenticated');
    return;
  }
  
  // Get the background page
  const backgroundPage = await chrome.runtime.getBackgroundPage();
  
  // Get a URL to test
  const { topic, url } = await backgroundPage.selectTopicAndUrl();
  
  if (!url) {
    console.error('Failed to generate a URL for testing');
    return;
  }
  
  console.log(`Testing URL: ${url} for topic: ${topic.name}`);
  
  // Initialize proxy client
  const proxyClient = new ProxyClient();
  
  try {
    console.log('Fetching content...');
    const fetchResult = await proxyClient.fetchContent(url, cachedData.principalId);
    
    if (fetchResult && fetchResult.ok && fetchResult.ok.content) {
      console.log(`Successfully fetched content via proxy (${fetchResult.ok.content.length} bytes)`);
      console.log('Content preview:', fetchResult.ok.content.substring(0, 200) + '...');
    } else if (fetchResult && fetchResult.content) {
      console.log(`Successfully fetched content via proxy (${fetchResult.content.length} bytes)`);
      console.log('Content preview:', fetchResult.content.substring(0, 200) + '...');
    } else {
      console.error('Failed to fetch content: No content in response');
    }
  } catch (error) {
    console.error('Error fetching content:', error);
  }
}

async function testSubmission() {
  console.log('=== TESTING SUBMISSION ===');
  
  // Get the background page
  const backgroundPage = await chrome.runtime.getBackgroundPage();
  
  try {
    // Trigger a test scrape
    const result = await backgroundPage.testScrape();
    console.log('Test scrape result:', result);
    
    if (result.success) {
      console.log('Scrape and submission successful!');
      if (result.result) {
        console.log('Submission result:', result.result);
      }
    } else {
      console.error('Scrape failed:', result.error);
    }
  } catch (error) {
    console.error('Error during test scrape:', error);
  }
}

async function runAllTests() {
  console.log('=== RUNNING ALL TESTS ===');
  
  await testUrlGeneration();
  console.log('\n');
  
  await testContentFetching();
  console.log('\n');
  
  await testSubmission();
}

// Expose test functions to the console
window.testUrlGeneration = testUrlGeneration;
window.testContentFetching = testContentFetching;
window.testSubmission = testSubmission;
window.runAllTests = runAllTests;

console.log('RhinoSpider test script loaded. Available test functions:');
console.log('- testUrlGeneration(): Test URL generation from patterns');
console.log('- testContentFetching(): Test fetching content from generated URLs');
console.log('- testSubmission(): Test the full scraping and submission process');
console.log('- runAllTests(): Run all tests in sequence');
