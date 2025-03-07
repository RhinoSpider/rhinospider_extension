/**
 * Test script for the URL generator
 * 
 * This script tests the URL generator with sample topic data and validates the generated URLs
 * It also demonstrates how to format topic data for the Candid interface
 */

const { generateUrls, formatTopicForCreate, formatTopicForUpdate } = require('./url-generator');
const fetch = require('node-fetch');

/**
 * Validate a URL with a simple HTTP request
 * @param {string} url - The URL to validate
 * @returns {Promise<Object>} - Validation result with status and message
 */
async function validateUrl(url) {
  try {
    // First check if the URL is valid format
    new URL(url);
    
    // Use a HEAD request with a timeout to validate the URL
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      // First try a HEAD request (faster, less data)
      try {
        const headResponse = await fetch(url, { 
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
          }
        });
        
        clearTimeout(timeoutId);
        
        return {
          url,
          valid: headResponse.ok,
          status: headResponse.status,
          statusText: headResponse.statusText
        };
      } catch (headError) {
        // Some servers don't allow HEAD requests, fall back to GET
        if (headError.name !== 'AbortError') {
          const getController = new AbortController();
          const getTimeoutId = setTimeout(() => getController.abort(), 5000);
          
          try {
            const getResponse = await fetch(url, { 
              method: 'GET',
              signal: getController.signal,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
              }
            });
            
            clearTimeout(getTimeoutId);
            
            return {
              url,
              valid: getResponse.ok,
              status: getResponse.status,
              statusText: getResponse.statusText
            };
          } catch (getError) {
            return {
              url,
              valid: false,
              error: getError.message
            };
          }
        } else {
          return {
            url,
            valid: false,
            error: 'Request timed out'
          };
        }
      }
    } catch (error) {
      return {
        url,
        valid: false,
        error: error.message
      };
    }
  } catch (error) {
    return {
      url,
      valid: false,
      error: 'Invalid URL format'
    };
  }
}

// Sample topics based on the actual data from the proxy server
const sampleTopics = [
  {
    id: "topic_swsi3j4lj",
    status: "active",
    name: "TechCrunch News Articles",
    urlGenerationStrategy: "homepage_links",
    urlPatterns: [
      "https://techcrunch.com/*"
    ],
    articleUrlPatterns: [
      "/2025/*",
      "/2024/*",
      "/2023/*",
      "/post/*",
      "/article/*"
    ],
    excludePatterns: [
      "/tag/*",
      "/author/*",
      "/about/*",
      "/contact/*",
      "/advertise/*"
    ],
    paginationPatterns: [
      "?page={num}",
      "/page/{num}"
    ],
    contentIdentifiers: {
      selectors: ["article", "article-content", "article__content"],
      keywords: ["tech", "startup", "funding", "acquisition", "AI"]
    },
    siteTypeClassification: "news",
    sampleArticleUrls: [
      "https://techcrunch.com/2025/02/28/the-biggest-data-breaches-of-2025-so-far/",
      "https://techcrunch.com/2025/03/05/apple-updates-the-new-mac-studio-with-m4-max-or-m3-ultra/"
    ]
  },
  {
    id: "topic_t7wkl7zyb",
    status: "active",
    name: "E-commerce Product Monitor",
    urlGenerationStrategy: "pattern_based",
    urlPatterns: [
      "https://www.amazon.com/*/dp/*",
      "https://www.bestbuy.com/site/*/",
      "https://www.walmart.com/ip/*"
    ],
    articleUrlPatterns: [
      "https://www.amazon.com/*/dp/[A-Z0-9]{10}",
      "https://www.bestbuy.com/site/*/[0-9]+.p",
      "https://www.walmart.com/ip/*/[0-9]+"
    ],
    excludePatterns: [
      "*/customer-reviews/*",
      "*/questions/*",
      "*/offers/*",
      "*/compare/*"
    ],
    paginationPatterns: [
      "*&page=[0-9]+"
    ],
    contentIdentifiers: {
      selectors: ["productTitle", ".product-title", ".prod-ProductTitle"],
      keywords: ["title", "ai", "tech"]
    },
    siteTypeClassification: "ecommerce",
    sampleArticleUrls: [
      "https://www.amazon.com/crocs-Unisex-Classic-Black-Women/dp/B0014C0LUC/",
      "https://www.walmart.com/ip/NEXPURE-Hair-Dryer-1800W-Professional-Ionic-Hairdryer-for-Hair-Care-Powerful-Hot-Cool-Wind-Blow-Dryer-with-Diffuser-Nozzle/5406374397"
    ]
  },
  {
    id: "topic_b8hj2k9lm",
    status: "active",
    name: "Programming Blog Articles",
    urlGenerationStrategy: "pattern_based",
    urlPatterns: [
      "https://medium.com/*",
      "https://dev.to/*",
      "https://blog.github.com/*"
    ],
    articleUrlPatterns: [
      "/@*/javascript-*",
      "/*/react-*",
      "/*/nodejs-*"
    ],
    excludePatterns: [
      "/tag/*",
      "/search?*",
      "/about/*"
    ],
    paginationPatterns: [
      "?page={num}"
    ],
    contentIdentifiers: {
      selectors: [".article", ".post-content", ".blog-post"],
      keywords: ["javascript", "react", "nodejs", "programming", "development"]
    },
    siteTypeClassification: "blog",
    sampleArticleUrls: [
      "https://medium.com/@johndoe/javascript-best-practices-2023-edition-a1b2c3d4",
      "https://dev.to/devteam/react-performance-optimization-techniques-123"
    ]
  },
  {
    id: "topic_p9kl3m7n4",
    status: "active",
    name: "Programming Forums",
    urlGenerationStrategy: "pattern_based",
    urlPatterns: [
      "https://www.reddit.com/r/programming/*",
      "https://stackoverflow.com/questions/*",
      "https://forum.freecodecamp.org/*"
    ],
    articleUrlPatterns: [
      "comments/*/javascript-*",
      "questions/*/react-*",
      "topic/*/nodejs-*"
    ],
    excludePatterns: [
      "*/wiki/*",
      "*/about/*",
      "*/rules/*"
    ],
    paginationPatterns: [
      "?page={num}",
      "/page/{num}"
    ],
    contentIdentifiers: {
      selectors: [".post", ".question", ".thread"],
      keywords: ["javascript", "react", "nodejs", "programming", "code"]
    },
    siteTypeClassification: "forum",
    sampleArticleUrls: [
      "https://www.reddit.com/r/programming/comments/abc123/javascript_async_await_explained/",
      "https://stackoverflow.com/questions/12345678/react-hooks-vs-class-components"
    ]
  },
  {
    id: "topic_q1w2e3r4t5",
    status: "active",
    name: "Tech News Sites",
    urlGenerationStrategy: "pattern_based",
    urlPatterns: [
      "https://www.theverge.com/*",
      "https://www.wired.com/*",
      "https://www.nytimes.com/section/technology/*"
    ],
    articleUrlPatterns: [
      "/2023/*/technology/*.html",
      "/story/*/tech-*",
      "/article/*/technology-*"
    ],
    excludePatterns: [
      "/tag/*",
      "/author/*",
      "/about/*"
    ],
    paginationPatterns: [
      "?page={num}",
      "/page/{num}"
    ],
    contentIdentifiers: {
      selectors: [".article", ".story", ".post"],
      keywords: ["technology", "tech", "innovation", "AI", "gadgets"]
    },
    siteTypeClassification: "news",
    sampleArticleUrls: [
      "https://www.theverge.com/2023/5/15/tech-news-ai-revolution",
      "https://www.wired.com/story/2023/artificial-intelligence-future"
    ]
  }
];

// URL generation limit
const URL_LIMIT = 5;

/**
 * Test URL generation for a topic
 * @param {Object} topic - The topic configuration
 * @param {number} index - The topic index
 * @returns {Promise<void>}
 */
async function testUrlGeneration(topic, index) {
  console.log(`\nTopic ${index + 1}: ${topic.name} (ID: ${topic.id})`);
  console.log(`Strategy: ${topic.urlGenerationStrategy || 'pattern_based'}`);
  
  // Log the key patterns used for URL generation
  console.log('URL Patterns:');
  if (topic.urlPatterns && topic.urlPatterns.length > 0) {
    topic.urlPatterns.forEach((pattern, i) => {
      console.log(`  ${i + 1}. ${pattern}`);
    });
  } else {
    console.log('  None defined');
  }
  
  console.log('Article URL Patterns:');
  if (topic.articleUrlPatterns && topic.articleUrlPatterns.length > 0) {
    topic.articleUrlPatterns.forEach((pattern, i) => {
      console.log(`  ${i + 1}. ${pattern}`);
    });
  } else {
    console.log('  None defined');
  }
  
  // Generate URLs
  const generatedUrls = generateUrls(topic, URL_LIMIT);
  
  console.log(`\nGenerated URLs (${generatedUrls.length}):`);
  if (generatedUrls.length > 0) {
    generatedUrls.forEach((url, i) => {
      console.log(`  ${i + 1}. ${url}`);
    });
    
    // Validate URL format
    const validFormatUrls = generatedUrls.filter(url => {
      try {
        new URL(url);
        return true;
      } catch (e) {
        return false;
      }
    });
    
    console.log(`\nURL Format Validation: ${validFormatUrls.length}/${generatedUrls.length} have valid format`);
    
    if (validFormatUrls.length < generatedUrls.length) {
      console.log('Invalid URL Format:');
      generatedUrls.forEach((url, i) => {
        try {
          new URL(url);
        } catch (e) {
          console.log(`  ${i + 1}. ${url} - Error: ${e.message}`);
        }
      });
    }
    
    // Validate URLs by making HEAD requests
    console.log('\nValidating URLs with HEAD requests...');
    const validationResults = await Promise.all(validFormatUrls.map(validateUrl));
    
    // Display validation results
    console.log('URL Validation Results:');
    validationResults.forEach((result, index) => {
      let details = '';
      if (result.status) {
        details = `(${result.status} ${result.statusText})`;
      } else if (result.error) {
        details = `(${result.error})`;
      }
      
      if (result.details) {
        details += ` [Format: ${result.details.format ? 'Valid' : 'Invalid'}, DNS: ${result.details.dns ? 'Valid' : 'Invalid'}, Reachable: ${result.details.reachable ? 'Yes' : 'No'}]`;
      }
      
      console.log(`  ${index + 1}. ${result.url}: ${result.valid ? 'Valid ✓' : 'Invalid ✗'} ${details}`);
    });
    
    const accessibleUrls = validationResults.filter(result => result.valid);
    console.log(`\nAccessibility Check: ${accessibleUrls.length}/${validationResults.length} URLs are accessible`);
    
    if (accessibleUrls.length > 0) {
      console.log('\nAccessible URLs:');
      accessibleUrls.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.url}`);
      });
    }
  } else {
    console.log('  No URLs generated');
  }
}

// Main test function
async function runTests() {
  console.log('Testing URL generator...');
  console.log(`URL limit per topic: ${URL_LIMIT}`);
  console.log('-----------------------------------');
  
  for (let i = 0; i < sampleTopics.length; i++) {
    await testUrlGeneration(sampleTopics[i], i);
  }
  
  console.log('\nURL generation testing completed');
}

/**
 * Test the topic formatting functions
 */
async function testTopicFormatting() {
  console.log('\n-----------------------------------');
  console.log('Testing topic formatting for Candid interface...');
  
  // Sample topic for testing
  const sampleTopic = {
    name: "Test Topic",
    description: "A test topic for formatting",
    status: "active",
    urlGenerationStrategy: "pattern_based",
    siteTypeClassification: "ecommerce",
    urlPatterns: [
      "https://example.com/*",
      "https://test.com/*",
      "", // Empty string to test filtering
    ],
    articleUrlPatterns: [
      "/product/*",
      "/item/*",
      "" // Empty string to test filtering
    ],
    excludePatterns: [
      "/tag/*",
      "/category/*"
    ],
    paginationPatterns: [
      "?page={num}"
    ],
    contentIdentifiers: {
      selectors: [".product", ".item"],
      keywords: ["product", "item"]
    },
    extractionRules: {
      title: ".product-title",
      price: ".product-price",
      description: ".product-description"
    }
  };
  
  // Test formatTopicForCreate
  console.log('\nFormatting for createTopic:');
  const formattedForCreate = formatTopicForCreate(sampleTopic);
  console.log(JSON.stringify(formattedForCreate, null, 2));
  
  // Test formatTopicForUpdate
  console.log('\nFormatting for updateTopic:');
  const formattedForUpdate = formatTopicForUpdate(sampleTopic);
  console.log(JSON.stringify(formattedForUpdate, null, 2));
  
  // Test with missing fields
  const partialTopic = {
    name: "Partial Topic",
    urlPatterns: [
      "https://example.com/*"
    ]
  };
  
  console.log('\nFormatting partial topic for updateTopic:');
  const partialForUpdate = formatTopicForUpdate(partialTopic);
  console.log(JSON.stringify(partialForUpdate, null, 2));
  
  console.log('\nTopic formatting tests completed');
}

// Main function to run all tests
async function runAllTests() {
  try {
    await runTests();
    await testTopicFormatting();
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run all tests
runAllTests();
