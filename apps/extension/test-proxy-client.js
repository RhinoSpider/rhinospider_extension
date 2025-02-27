// Test script for the proxy client
// Use the global fetch API

// Proxy server configuration
const PROXY_URL = process.env.VITE_PROXY_URL || 'http://143.244.133.154:3001';
const API_PASSWORD = process.env.VITE_API_PASSWORD || 'ffGpA2saNS47qr';

// Test principal ID
const PRINCIPAL_ID = '535yc-uxytb-gfk7h-tny7p-vjkoe-i4krp-3qmcl-uqfgr-cpgej-yqtjq-rqe';

// Test the proxy client
async function testProxyClient() {
  try {
    console.log('Testing proxy client...');
    console.log('Proxy URL:', PROXY_URL);
    
    // Test health endpoint
    console.log('\nTesting health endpoint...');
    try {
      const healthResponse = await fetch(`${PROXY_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log('Health check response:', healthData);
        console.log('Health check result: PASSED');
      } else {
        console.error('Health check failed with status:', healthResponse.status);
        console.log('Health check result: FAILED');
      }
    } catch (error) {
      console.error('Error checking health:', error.message);
      console.log('Health check result: FAILED');
    }
    
    // Test profile endpoint
    console.log('\nTesting profile endpoint...');
    try {
      const profileResponse = await fetch(`${PROXY_URL}/api/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_PASSWORD}`
        },
        body: JSON.stringify({ principalId: PRINCIPAL_ID })
      });
      
      console.log('Profile response status:', profileResponse.status);
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        console.log('Profile response data:', profileData);
        console.log('Profile test result: PASSED');
      } else {
        console.error('Profile test failed with status:', profileResponse.status);
        console.log('Profile test result: FAILED');
      }
    } catch (error) {
      console.error('Error getting profile:', error.message);
      console.log('Profile test result: FAILED');
    }
    
    // Test topics endpoint
    console.log('\nTesting topics endpoint...');
    try {
      const topicsResponse = await fetch(`${PROXY_URL}/api/topics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_PASSWORD}`
        },
        body: JSON.stringify({ principalId: PRINCIPAL_ID })
      });
      
      console.log('Topics response status:', topicsResponse.status);
      
      if (topicsResponse.ok) {
        const topicsData = await topicsResponse.json();
        console.log('Topics response data:', topicsData);
        console.log('Topics test result: PASSED');
      } else {
        console.error('Topics test failed with status:', topicsResponse.status);
        console.log('Topics test result: FAILED');
      }
    } catch (error) {
      console.error('Error getting topics:', error.message);
      console.log('Topics test result: FAILED');
    }
    
    console.log('\nTests completed.');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the tests
testProxyClient();
