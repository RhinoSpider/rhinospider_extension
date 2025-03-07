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
      const healthResponse = await fetch(`${PROXY_URL}/api/health`, {
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
        
        // Print the full raw response for detailed analysis
        console.log('\nRaw topics response:', JSON.stringify(topicsData, null, 2));
        
        // Check if we have topics and they contain all expected fields
        if (topicsData && topicsData.ok && Array.isArray(topicsData.ok)) {
          const topics = topicsData.ok;
          console.log(`Received ${topics.length} topics`);          
          
          // Check specific array fields that were previously empty
          topics.forEach((topic, index) => {
            console.log(`\nTopic ${index + 1}: ${topic.name} (ID: ${topic.id})`);
            
            // Check articleUrlPatterns
            console.log(`  articleUrlPatterns: ${JSON.stringify(topic.articleUrlPatterns)}`);
            console.log(`  articleUrlPatterns length: ${topic.articleUrlPatterns ? topic.articleUrlPatterns.length : 0}`);
            
            // Check excludePatterns
            console.log(`  excludePatterns: ${JSON.stringify(topic.excludePatterns)}`);
            console.log(`  excludePatterns length: ${topic.excludePatterns ? topic.excludePatterns.length : 0}`);
            
            // Check paginationPatterns
            console.log(`  paginationPatterns: ${JSON.stringify(topic.paginationPatterns)}`);
            console.log(`  paginationPatterns length: ${topic.paginationPatterns ? topic.paginationPatterns.length : 0}`);
            
            // Check sampleArticleUrls
            console.log(`  sampleArticleUrls: ${JSON.stringify(topic.sampleArticleUrls)}`);
            console.log(`  sampleArticleUrls length: ${topic.sampleArticleUrls ? topic.sampleArticleUrls.length : 0}`);
            
            // Check contentIdentifiers
            console.log(`  contentIdentifiers: ${JSON.stringify(topic.contentIdentifiers)}`);
            if (topic.contentIdentifiers) {
              console.log(`  contentIdentifiers.selectors length: ${topic.contentIdentifiers.selectors ? topic.contentIdentifiers.selectors.length : 0}`);
              console.log(`  contentIdentifiers.keywords length: ${topic.contentIdentifiers.keywords ? topic.contentIdentifiers.keywords.length : 0}`);
            }
          });
          
          // Check the first topic for all required fields
          if (topics.length > 0) {
            const firstTopic = topics[0];
            console.log('\nFirst topic ID:', firstTopic.id);
            console.log('First topic name:', firstTopic.name);
            console.log('\nFirst topic keys:', Object.keys(firstTopic).join(', '));
            
            // Detailed inspection of the first topic
            console.log('\nDetailed inspection of first topic:');
            for (const key of Object.keys(firstTopic)) {
              const value = firstTopic[key];
              const valueType = Array.isArray(value) ? 'array' : typeof value;
              const valueDetails = valueType === 'array' ? 
                `[${value.length} items]` : 
                (valueType === 'object' && value !== null) ? 
                  `{${Object.keys(value).join(', ')}}` : 
                  String(value).substring(0, 50) + (String(value).length > 50 ? '...' : '');
              
              console.log(`- ${key} (${valueType}): ${valueDetails}`);
            }
            
            // Check for previously missing fields
            const requiredFields = [
              'id', 'name', 'description', 'urlPatterns', 'status', 'scrapingInterval',
              'maxRetries', 'activeHours', 'createdAt', 'extractionRules', 'aiConfig',
              'articleUrlPatterns', 'excludePatterns', 'contentIdentifiers',
              'urlGenerationStrategy', 'siteTypeClassification', 'paginationPatterns'
            ];
            
            const missingFields = requiredFields.filter(field => !(field in firstTopic));
            
            if (missingFields.length === 0) {
              console.log('\nAll required fields are present!');
              
              // Display some of the previously missing fields
              console.log('\nPreviously missing fields now present:');
              console.log('- articleUrlPatterns:', Array.isArray(firstTopic.articleUrlPatterns) ? 
                `[${firstTopic.articleUrlPatterns.length} items]` : firstTopic.articleUrlPatterns);
              console.log('- excludePatterns:', Array.isArray(firstTopic.excludePatterns) ? 
                `[${firstTopic.excludePatterns.length} items]` : firstTopic.excludePatterns);
              console.log('- contentIdentifiers:', firstTopic.contentIdentifiers ? 
                `{selectors: [${firstTopic.contentIdentifiers.selectors?.length || 0} items], keywords: [${firstTopic.contentIdentifiers.keywords?.length || 0} items]}` : 
                'null');
              console.log('- urlGenerationStrategy:', firstTopic.urlGenerationStrategy);
              console.log('- siteTypeClassification:', firstTopic.siteTypeClassification);
              
              console.log('\nTopics test result: PASSED');
            } else {
              console.error('\nMissing fields:', missingFields);
              console.log('\nTopics test result: PARTIALLY PASSED - Some fields still missing');
            }
          } else {
            console.log('No topics found in the response');
            console.log('Topics test result: PARTIALLY PASSED - No topics to check');
          }
        } else {
          console.error('Invalid topics response format');
          console.log('Topics test result: FAILED - Invalid response format');
        }
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
