const fetch = require('node-fetch');
const { Ed25519KeyIdentity } = require('@dfinity/identity');
const { Principal } = require('@dfinity/principal');

// Configuration
const PROXY_URL = process.env.PROXY_URL || 'http://143.244.133.154:3001';
const API_PASSWORD = process.env.API_PASSWORD || 'ffGpA2saNS47qr';

// Test the health endpoint
async function testHealth() {
  try {
    console.log(`Testing health endpoint: ${PROXY_URL}/health`);
    const response = await fetch(`${PROXY_URL}/health`);
    const data = await response.json();
    console.log('Health check response:', data);
    return data.status === 'ok';
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

// Test the profile endpoint with a principal ID
async function testProfile() {
  try {
    // Create a random identity for testing
    const identity = Ed25519KeyIdentity.generate();
    const principal = identity.getPrincipal();
    const principalId = principal.toString();
    
    console.log(`Testing profile endpoint: ${PROXY_URL}/api/profile`);
    console.log('Testing with principal ID:', principalId);
    
    const response = await fetch(`${PROXY_URL}/api/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_PASSWORD}`
      },
      body: JSON.stringify({ principalId })
    });
    
    console.log('Profile response status:', response.status);
    const data = await response.json();
    console.log('Profile response data:', data);
    
    return response.ok;
  } catch (error) {
    console.error('Profile test failed:', error);
    return false;
  }
}

// Test the topics endpoint with a principal ID
async function testTopics() {
  try {
    // Create a random identity for testing
    const identity = Ed25519KeyIdentity.generate();
    const principal = identity.getPrincipal();
    const principalId = principal.toString();
    
    console.log(`Testing topics endpoint: ${PROXY_URL}/api/topics`);
    console.log('Testing with principal ID:', principalId);
    
    const response = await fetch(`${PROXY_URL}/api/topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_PASSWORD}`
      },
      body: JSON.stringify({ principalId })
    });
    
    console.log('Topics response status:', response.status);
    const data = await response.json();
    console.log('Topics response data:', data);
    
    return response.ok;
  } catch (error) {
    console.error('Topics test failed:', error);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('Starting proxy server tests...');
  console.log(`Proxy URL: ${PROXY_URL}`);
  
  // Test health endpoint
  console.log('\n--- Testing Health Endpoint ---');
  const healthResult = await testHealth();
  console.log('Health test result:', healthResult ? 'PASSED' : 'FAILED');
  
  // Test profile endpoint
  console.log('\n--- Testing Profile Endpoint ---');
  const profileResult = await testProfile();
  console.log('Profile test result:', profileResult ? 'PASSED' : 'FAILED');
  
  // Test topics endpoint
  console.log('\n--- Testing Topics Endpoint ---');
  const topicsResult = await testTopics();
  console.log('Topics test result:', topicsResult ? 'PASSED' : 'FAILED');
  
  console.log('\n--- Test Summary ---');
  console.log(`Health: ${healthResult ? 'PASSED' : 'FAILED'}`);
  console.log(`Profile: ${profileResult ? 'PASSED' : 'FAILED'}`);
  console.log(`Topics: ${topicsResult ? 'PASSED' : 'FAILED'}`);
  
  const allPassed = healthResult && profileResult && topicsResult;
  console.log(`\nOverall: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
});
