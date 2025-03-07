/**
 * Test script for the URL generator
 * 
 * This script tests the URL generator with real topic data from the proxy server
 */

import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Dynamically import the URL generator module
const urlGeneratorPath = join(__dirname, '../services/ic-proxy/url-generator.js');
const urlGeneratorCode = fs.readFileSync(urlGeneratorPath, 'utf8');

// Convert CommonJS module to ES module
const modifiedCode = urlGeneratorCode.replace('module.exports =', 'export');
const tempPath = join(__dirname, 'temp-url-generator.js');
fs.writeFileSync(tempPath, modifiedCode);

// Import the module
const urlGeneratorModule = await import('./temp-url-generator.js');
const urlGenerator = urlGeneratorModule.default || urlGeneratorModule;

// Clean up temporary file after import
fs.unlinkSync(tempPath);

// Configuration
const PROXY_URL = 'http://143.244.133.154:3001';
const URL_LIMIT = 5; // Number of URLs to generate per topic

async function testUrlGenerator() {
  console.log('Testing URL generator...');
  console.log(`Proxy URL: ${PROXY_URL}`);
  console.log(`URL limit per topic: ${URL_LIMIT}`);
  console.log('-----------------------------------');

  try {
    // Fetch topics from the proxy server
    const response = await fetch(`${PROXY_URL}/api/topics`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch topics: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.ok || !Array.isArray(data.ok)) {
      throw new Error('Invalid response format from topics endpoint');
    }
    
    const topics = data.ok;
    console.log(`Fetched ${topics.length} topics for URL generation testing`);
    
    // Test URL generation for each topic
    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      console.log(`\nTopic ${i + 1}: ${topic.name} (ID: ${topic.id})`);
      console.log(`Strategy: ${topic.urlGenerationStrategy || 'pattern_based'}`);
      
      // Log the key patterns used for URL generation
      console.log('URL Patterns:');
      if (topic.urlPatterns && topic.urlPatterns.length > 0) {
        topic.urlPatterns.forEach((pattern, index) => {
          console.log(`  ${index + 1}. ${pattern}`);
        });
      } else {
        console.log('  None defined');
      }
      
      console.log('Article URL Patterns:');
      if (topic.articleUrlPatterns && topic.articleUrlPatterns.length > 0) {
        topic.articleUrlPatterns.forEach((pattern, index) => {
          console.log(`  ${index + 1}. ${pattern}`);
        });
      } else {
        console.log('  None defined');
      }
      
      // Generate URLs
      const generatedUrls = urlGenerator.generateUrls(topic, URL_LIMIT);
      
      console.log(`\nGenerated URLs (${generatedUrls.length}):`);
      if (generatedUrls.length > 0) {
        generatedUrls.forEach((url, index) => {
          console.log(`  ${index + 1}. ${url}`);
        });
        
        // Validate URLs
        const validUrls = generatedUrls.filter(url => {
          try {
            new URL(url);
            return true;
          } catch (e) {
            return false;
          }
        });
        
        console.log(`\nURL Validation: ${validUrls.length}/${generatedUrls.length} are valid URLs`);
        
        if (validUrls.length < generatedUrls.length) {
          console.log('Invalid URLs:');
          generatedUrls.forEach((url, index) => {
            try {
              new URL(url);
            } catch (e) {
              console.log(`  ${index + 1}. ${url} - Error: ${e.message}`);
            }
          });
        }
      } else {
        console.log('  No URLs generated');
      }
    }
    
    console.log('\nURL generation testing completed');
    
  } catch (error) {
    console.error('Error during URL generation testing:', error);
  }
}

// Run the test
testUrlGenerator();
