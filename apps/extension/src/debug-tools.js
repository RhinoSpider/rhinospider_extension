// Debug tools for RhinoSpider extension
import searchProxyClient from './search-proxy-client.js';
import proxyClient from './proxy-client.js';

/**
 * Test the search proxy client
 * @returns {Promise<Object>} - Test results
 */
async function testSearchProxy() {
  console.log('Testing search proxy client...');
  
  // Test topics
  const testTopics = [
    { id: 'test-topic-1', name: 'Artificial Intelligence', keywords: ['AI', 'machine learning'] },
    { id: 'test-topic-2', name: 'Blockchain', keywords: ['crypto', 'web3'] },
    { id: 'test-topic-3', name: 'Climate Change', keywords: ['global warming', 'environment'] }
  ];
  
  // Test health check
  console.log('Testing search proxy health check...');
  const isHealthy = await searchProxyClient.checkProxyHealth();
  console.log(`Search proxy health check result: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
  
  // Test URL fetching
  console.log('Testing URL fetching for topics...');
  const urlResults = await searchProxyClient.getUrlsForTopics(testTopics, 5);
  console.log('URL fetching results:', urlResults);
  
  return {
    healthCheck: isHealthy,
    urlResults
  };
}

/**
 * Test the consumer canister submission
 * @returns {Promise<Object>} - Test results
 */
async function testConsumerSubmission() {
  console.log('Testing consumer canister submission...');
  
  // Create test data
  const testData = {
    url: 'https://example.com/test-page',
    topicId: 'test-topic-1',
    content: 'This is test content for debugging purposes.',
    metadata: {
      title: 'Test Page',
      description: 'A test page for debugging the RhinoSpider extension',
      timestamp: Date.now()
    }
  };
  
  // Test submission
  console.log('Submitting test data to consumer canister...');
  const submissionResult = await proxyClient.submitScrapedData(testData);
  console.log('Submission result:', submissionResult);
  
  return {
    submissionResult
  };
}

/**
 * Run all tests
 * @returns {Promise<Object>} - All test results
 */
async function runAllTests() {
  console.log('Running all RhinoSpider extension tests...');
  
  const searchProxyResults = await testSearchProxy();
  const consumerSubmissionResults = await testConsumerSubmission();
  
  return {
    searchProxy: searchProxyResults,
    consumerSubmission: consumerSubmissionResults
  };
}

// Export functions
export default {
  testSearchProxy,
  testConsumerSubmission,
  runAllTests
};

// Make functions available globally
globalThis.rhinoSpiderDebugTools = {
  testSearchProxy,
  testConsumerSubmission,
  runAllTests
};
