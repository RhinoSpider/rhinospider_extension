// Test script for the RhinoSpider extension
import { HybridICClient } from './src/hybrid-ic-client.js';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { ProxyClient } from './src/proxy-client.js';

// Create a test identity
const testIdentity = Ed25519KeyIdentity.generate();
console.log('Test identity principal:', testIdentity.getPrincipal().toString());

// Create a hybrid client with the test identity
const client = new HybridICClient({
  identity: testIdentity,
  host: process.env.VITE_IC_HOST || 'https://ic0.app',
  canisterId: process.env.VITE_CONSUMER_CANISTER_ID || 'ryjl3-tyaaa-aaaaa-aaaba-cai',
  proxyUrl: process.env.VITE_PROXY_URL || 'http://143.244.133.154:3001',
  apiPassword: process.env.VITE_API_PASSWORD || 'password',
  debug: true,
  useProxy: true,
  useCache: false
});

// Test the client
async function testClient() {
  try {
    console.log('Testing HybridICClient...');
    
    // Test proxy client availability
    const proxyClient = new ProxyClient({
      proxyUrl: process.env.VITE_PROXY_URL || 'http://143.244.133.154:3001',
      API_PASSWORD: process.env.VITE_API_PASSWORD || 'password'
    });
    
    const available = await proxyClient.isAvailable();
    console.log('Proxy server available:', available);
    
    if (!available) {
      console.error('Proxy server is not available. Please make sure it is running.');
      return;
    }
    
    // Test getting profile
    console.log('Testing getProfile...');
    try {
      const profile = await client.getProfile();
      console.log('Profile result:', profile);
    } catch (error) {
      console.error('Error getting profile:', error.message);
    }
    
    // Test getting topics
    console.log('Testing getTopics...');
    try {
      const topics = await client.getTopics();
      console.log('Topics result:', topics);
    } catch (error) {
      console.error('Error getting topics:', error.message);
    }
    
    console.log('Tests completed.');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the tests
testClient();
