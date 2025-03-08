/**
 * Test script for our improved URL generator in background.js
 * 
 * This script tests the URL generation with sample topics to ensure
 * we're generating diverse, unique URLs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import vm from 'vm';

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock Chrome API
globalThis.chrome = {
  storage: {
    local: {
      get: () => Promise.resolve({}),
      set: () => Promise.resolve()
    }
  }
};

// Mock logger
globalThis.logger = {
  log: console.log,
  error: console.error,
  warn: console.warn
};

// Read the background.js file
const backgroundJsPath = path.join(__dirname, 'src', 'background.js');
const backgroundJsCode = fs.readFileSync(backgroundJsPath, 'utf8');

// Create a context for running the background.js code
const context = {
  console,
  chrome: globalThis.chrome,
  logger: globalThis.logger,
  fetch: () => Promise.resolve({ ok: true, text: () => Promise.resolve('<html><body>Test content</body></html>') }),
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  Math,
  Date,
  Promise,
  Array,
  Object,
  String,
  Number,
  Boolean,
  Error,
  JSON,
  RegExp,
  XMLHttpRequest: class XMLHttpRequest {
    open() {}
    send() {}
    setRequestHeader() {}
    addEventListener(event, callback) {
      if (event === 'load') {
        setTimeout(() => callback({ target: { responseText: '<html><body>Test content</body></html>', status: 200 } }), 10);
      }
    }
  },
  global: globalThis,
  window: globalThis,
  exports: {},
  document: { createElement: () => ({ setAttribute: () => {} }) }
};

// Execute the background.js code in our context
vm.createContext(context);
try {
  vm.runInContext(backgroundJsCode, context);
} catch (error) {
  console.error('Error executing background.js:', error.message);
}

// Sample topics for testing
const sampleTopics = [
  {
    id: 'topic1',
    name: 'E-commerce Products',
    urlGenerationStrategy: 'pattern_based',
    urlPatterns: [
      'https://www.amazon.com/*/dp/*',
      'https://www.walmart.com/ip/*',
      'https://www.bestbuy.com/site/*'
    ]
  },
  {
    id: 'topic2',
    name: 'Tech News',
    urlGenerationStrategy: 'pattern_based',
    urlPatterns: [
      'https://techcrunch.com/*/*/*',
      'https://www.theverge.com/*/*/*',
      'https://www.wired.com/*/*/*'
    ]
  },
  {
    id: 'topic3',
    name: 'Product Reviews',
    urlGenerationStrategy: 'pattern_based',
    urlPatterns: [
      'https://www.producthunt.com/posts/*',
      'https://www.cnet.com/reviews/*',
      'https://www.pcmag.com/reviews/*'
    ]
  }
];

// Test function
async function testUrlGeneration() {
  console.log('Testing URL generation with our improved code...');
  console.log('------------------------------------------------');
  
  // Test generateDiverseUrl function
  console.log('\n1. Testing generateDiverseUrl function:');
  for (const topic of sampleTopics) {
    console.log(`\nTopic: ${topic.name}`);
    for (const pattern of topic.urlPatterns) {
      console.log(`\nPattern: ${pattern}`);
      
      // Generate 5 URLs for each pattern to check diversity
      const urls = [];
      for (let i = 0; i < 5; i++) {
        const url = context.generateDiverseUrl(pattern, i);
        urls.push(url);
        console.log(`  ${i+1}. ${url}`);
      }
      
      // Check for uniqueness
      const uniqueUrls = new Set(urls);
      console.log(`  Unique URLs: ${uniqueUrls.size}/${urls.length}`);
      if (uniqueUrls.size < urls.length) {
        console.warn('  WARNING: Duplicate URLs detected!');
      }
    }
  }
  
  // Test generateUrlFromPattern function
  console.log('\n\n2. Testing generateUrlFromPattern function:');
  for (const topic of sampleTopics) {
    console.log(`\nTopic: ${topic.name}`);
    
    // Generate 5 URLs for each topic
    const urls = [];
    for (let i = 0; i < 5; i++) {
      try {
        const url = await context.generateUrlFromPattern(topic.urlPatterns[0], topic, i);
        urls.push(url);
        console.log(`  ${i+1}. ${url}`);
      } catch (error) {
        console.error(`  Error generating URL: ${error.message}`);
      }
    }
    
    // Check for uniqueness
    const uniqueUrls = new Set(urls);
    console.log(`  Unique URLs: ${uniqueUrls.size}/${urls.length}`);
    if (uniqueUrls.size < urls.length) {
      console.warn('  WARNING: Duplicate URLs detected!');
    }
  }
}

// Run the test
testUrlGeneration().catch(error => {
  console.error('Test failed:', error);
});
