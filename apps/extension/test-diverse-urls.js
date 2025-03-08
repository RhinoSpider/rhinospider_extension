/**
 * Simple test script for our generateDiverseUrl function
 * 
 * This script directly tests the URL diversity by generating multiple URLs
 * from the same patterns and checking for uniqueness
 */

// Sample URL patterns to test - focusing on patterns that would lead to real pages
const patterns = [
  'https://www.amazon.com/s?k=*',
  'https://www.walmart.com/browse/*',
  'https://www.bestbuy.com/site/searchpage.jsp?st=*',
  'https://www.cnn.com/business',
  'https://www.theverge.com/tech',
  'https://www.nytimes.com/section/technology'
];

// Function to generate a random Amazon ASIN (product ID)
function generateRandomAsin() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let asin = 'B0';
  for (let i = 0; i < 8; i++) {
    asin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return asin;
}

// Our improved generateDiverseUrl function
function generateDiverseUrl(pattern, entropy = 0) {
  console.log(`Generating diverse URL from pattern: ${pattern}`);
  
  // Create unique identifiers for this URL generation
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8) + entropy.toString(36);
  
  // Handle specific patterns for common websites with much more diversity
  if (pattern.includes('amazon.com')) {
    // Generate diverse Amazon product URLs
    const asin = generateRandomAsin();
    const products = [
      'laptop', 'headphones', 'smartphone', 'tablet', 'monitor', 'keyboard',
      'mouse', 'speaker', 'camera', 'watch', 'tv', 'console', 'router'
    ];
    const brands = [
      'Apple', 'Samsung', 'Sony', 'Microsoft', 'LG', 'Asus', 'Dell',
      'HP', 'Lenovo', 'Logitech', 'Razer', 'Bose', 'JBL'
    ];
    
    const randomProduct = products[Math.floor(Math.random() * products.length)];
    const randomBrand = brands[Math.floor(Math.random() * brands.length)];
    
    return `https://www.amazon.com/${randomBrand}-${randomProduct}-${randomId}/dp/${asin}`;
  } else if (pattern.includes('walmart.com')) {
    // Generate diverse Walmart product URLs
    const productId = Math.floor(Math.random() * 9000000) + 1000000;
    const categories = [
      'electronics', 'home', 'toys', 'clothing', 'grocery', 'sports',
      'beauty', 'auto', 'garden', 'office', 'furniture', 'baby', 'pets'
    ];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    
    return `https://www.walmart.com/ip/${randomCategory}-item-${randomId}/${productId}`;
  } else if (pattern.includes('bestbuy.com')) {
    // Generate diverse Best Buy product URLs
    const productId = Math.floor(Math.random() * 9000000) + 1000000;
    const categories = [
      'computers', 'phones', 'audio', 'video', 'cameras', 'appliances',
      'games', 'smart-home', 'wearable-tech', 'tablets', 'accessories'
    ];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    
    return `https://www.bestbuy.com/site/${randomCategory}-${randomId}/${productId}.p`;
  } else if (pattern.includes('techcrunch.com')) {
    // Generate diverse TechCrunch article URLs
    const year = 2023 + Math.floor(Math.random() * 3); // 2023-2025
    const month = Math.floor(Math.random() * 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1;
    
    const topics = [
      'ai', 'startups', 'apps', 'gadgets', 'enterprise', 'security',
      'fintech', 'crypto', 'venture', 'policy', 'ecommerce', 'social'
    ];
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    
    return `https://techcrunch.com/${year}/${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${randomTopic}-news-${randomId}/`;
  } else if (pattern.includes('producthunt.com')) {
    // Generate diverse ProductHunt URLs
    const productTypes = [
      'app', 'tool', 'service', 'platform', 'extension', 'plugin',
      'framework', 'api', 'bot', 'website', 'saas', 'hardware'
    ];
    const randomType = productTypes[Math.floor(Math.random() * productTypes.length)];
    
    return `https://www.producthunt.com/posts/${randomType}-${randomId}`;
  }
  
  // For other patterns, create a more diverse set of URLs
  try {
    let url = pattern;
    
    // Extract the domain from the pattern
    let domain = '';
    const domainMatch = url.match(/https?:\/\/([^\/]+)/);
    if (domainMatch) {
      domain = domainMatch[1];
    } else if (url.includes('/')) {
      domain = url.split('/')[0];
    } else {
      domain = url;
    }
    
    // Create diverse paths
    const paths = [
      'products', 'articles', 'news', 'blog', 'shop', 'category',
      'item', 'post', 'page', 'content', 'info', 'details', 'view'
    ];
    
    // Generate a random path component
    const randomPath = paths[Math.floor(Math.random() * paths.length)];
    
    // Replace wildcards with random content
    url = url.replace(/\*/g, () => {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      // Vary the length between 5-12 characters for more diversity
      const length = Math.floor(Math.random() * 8) + 5; // 5-12 characters
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    });
    
    // Replace double slashes (except after protocol) with single slash
    url = url.replace(/(https?:\/\/)|(\/\/+)/g, function(match, protocol) {
      return protocol || '/';
    });
    
    // Ensure URL is properly formatted
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    
    // If URL ends with just a domain, add a diverse path
    if (url.match(/https?:\/\/[^\/]+$/)) {
      url += `/${randomPath}/${randomId}-${timestamp % 10000}/`;
    }
    
    // Add a unique query parameter to ensure uniqueness
    const hasQuery = url.includes('?');
    url += hasQuery ? `&_=${timestamp}` : `?_=${timestamp}`;
    
    console.log('Generated diverse URL using enhanced pattern replacement:', url);
    return url;
  } catch (error) {
    console.error('Error generating diverse URL:', error);
    
    // Fallback to basic URL generation if something goes wrong
    let fallbackUrl = pattern.replace(/\*/g, '');
    
    // Ensure URL is properly formatted
    if (!fallbackUrl.startsWith('http')) {
      fallbackUrl = 'https://' + fallbackUrl;
    }
    
    // Add a unique query parameter
    fallbackUrl += fallbackUrl.includes('?') ? `&_=${Date.now()}` : `?_=${Date.now()}`;
    
    console.log('Falling back to basic URL generation:', fallbackUrl);
    return fallbackUrl;
  }
}

// Test function
function testUrlDiversity() {
  console.log('Testing URL diversity with our improved generateDiverseUrl function...');
  console.log('-------------------------------------------------------------------');
  
  for (const pattern of patterns) {
    console.log(`\nPattern: ${pattern}`);
    
    // Generate 10 URLs for each pattern
    const urls = [];
    for (let i = 0; i < 10; i++) {
      const url = generateDiverseUrl(pattern, i);
      urls.push(url);
      console.log(`  ${i+1}. ${url}`);
    }
    
    // Check for uniqueness
    const uniqueUrls = new Set(urls);
    console.log(`\n  Unique URLs: ${uniqueUrls.size}/${urls.length}`);
    if (uniqueUrls.size < urls.length) {
      console.warn('  WARNING: Duplicate URLs detected!');
    } else {
      console.log('  SUCCESS: All URLs are unique!');
    }
  }
}

// Run the test
testUrlDiversity();
