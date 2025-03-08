/**
 * Test script for URL generation and validation
 * 
 * This script tests both URL generation and validation to ensure we're generating
 * URLs that actually pass our validation checks (not 404, empty, error, captcha, etc.)
 * 
 * Enhanced version to test the improved URL validation logic
 */

// Import required modules
// Use dynamic imports to avoid ESM issues
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { JSDOM } = await import('jsdom');

// Sample URL patterns for testing
const patterns = [
  'https://www.amazon.com/s?k=*',
  'https://www.cnn.com/business',
  'https://www.nytimes.com/section/technology',
  'https://www.theverge.com/tech',
  'https://www.bbc.com/news/technology'
];

// Sample topics for testing
const sampleTopics = [
  {
    id: 'tech_products',
    name: 'Tech Products',
    urlGenerationStrategy: 'pattern_based',
    urlPatterns: [
      'https://www.amazon.com/s?k=*',
      'https://www.bestbuy.com/site/searchpage.jsp?st=*'
    ]
  },
  {
    id: 'tech_news',
    name: 'Tech News',
    urlGenerationStrategy: 'pattern_based',
    urlPatterns: [
      'https://www.theverge.com/tech',
      'https://www.cnn.com/business/tech',
      'https://www.bbc.com/news/technology'
    ]
  }
];

// Keywords for tech products searches
const techProductKeywords = [
  'laptop', 'smartphone', 'tablet', 'headphones', 'monitor',
  'keyboard', 'mouse', 'smart watch', 'wireless earbuds',
  'gaming console', 'bluetooth speaker'
];

/**
 * Generate a diverse URL from a pattern
 */
function generateDiverseUrl(pattern, entropy = 0) {
  console.log(`Generating diverse URL from pattern: ${pattern}`);
  
  // Create unique identifiers for this URL generation
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8) + entropy.toString(36);
  
  // Handle specific patterns for common websites with much more diversity
  if (pattern.includes('amazon.com/s?k=')) {
    // Generate diverse Amazon search URLs with real product categories
    const keyword = techProductKeywords[Math.floor(Math.random() * techProductKeywords.length)];
    return `https://www.amazon.com/s?k=${encodeURIComponent(keyword)}&ref=nb_sb_noss_${randomId.substring(0, 1)}`;
  } else if (pattern.includes('bestbuy.com/site/searchpage')) {
    // Generate diverse Best Buy search URLs
    const keyword = techProductKeywords[Math.floor(Math.random() * techProductKeywords.length)];
    return `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(keyword)}&ref=${randomId.substring(0, 4)}`;
  } else if (pattern.includes('cnn.com/business')) {
    // CNN Business section - this is a direct URL that should be valid
    return 'https://www.cnn.com/business';
  } else if (pattern.includes('theverge.com/tech')) {
    // The Verge tech section - this is a direct URL that should be valid
    return 'https://www.theverge.com/tech';
  } else if (pattern.includes('bbc.com/news/technology')) {
    // BBC technology news - this is a direct URL that should be valid
    return 'https://www.bbc.com/news/technology';
  } else if (pattern.includes('nytimes.com/section/technology')) {
    // NY Times technology section - this is a direct URL that should be valid
    return 'https://www.nytimes.com/section/technology';
  }
  
  // For other patterns, return the pattern as is if it doesn't contain wildcards
  if (!pattern.includes('*')) {
    return pattern;
  }
  
  // Handle general patterns with wildcards
  try {
    let url = pattern;
    
    // Replace wildcards with reasonable content
    url = url.replace(/\*/g, () => {
      const words = ['products', 'technology', 'reviews', 'news', 'latest', 'top', 'best'];
      return words[Math.floor(Math.random() * words.length)] + '-' + randomId.substring(0, 4);
    });
    
    // Ensure URL is properly formatted
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    
    console.log('Generated URL using pattern replacement:', url);
    return url;
  } catch (error) {
    console.error('Error generating URL:', error);
    return pattern.replace(/\*/g, 'test');
  }
}

/**
 * Validate a URL by checking its content
 */
async function validateUrl(url) {
  console.log(`Validating URL: ${url}`);
  
  try {
    // Fetch the URL with appropriate headers
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 10000 // 10 second timeout
    });
    
    // Check HTTP status
    if (!response.ok) {
      console.log(`URL validation failed: ${url} (HTTP status: ${response.status})`);
      return {
        valid: false,
        reason: `HTTP status ${response.status}`
      };
    }
    
    // Get content
    const content = await response.text();
    
    // Basic content validation
    if (typeof content !== 'string') {
      console.log(`URL validation failed: ${url} (content is not a string)`);
      return {
        valid: false,
        reason: 'Content is not a string'
      };
    }
    
    // Check if the content is too short
    if (content.length < 500) {
      console.log(`URL validation failed: ${url} (content too short: ${content.length} chars)`);
      return {
        valid: false,
        reason: 'Content too short'
      };
    }
    
    // Check for login/error pages
    const lowerContent = content.toLowerCase();
    
    // Check for 404 pages - enhanced detection
    if ((lowerContent.includes('404') && lowerContent.includes('not found')) ||
        (lowerContent.includes('page not found')) ||
        (lowerContent.includes('page cannot be found')) ||
        (lowerContent.includes('page doesn\'t exist')) ||
        (lowerContent.includes('this page isn\'t available')) ||
        (lowerContent.includes('content unavailable'))) {
      console.log(`URL validation failed: ${url} (detected 404 page)`);
      return {
        valid: false,
        reason: '404 page detected'
      };
    }
    
    // Check for other error pages - enhanced detection
    if ((lowerContent.includes('403') && lowerContent.includes('forbidden')) ||
        (lowerContent.includes('500') && lowerContent.includes('server error')) ||
        (lowerContent.includes('access denied')) ||
        (lowerContent.includes('not available in your region')) ||
        (lowerContent.includes('error') && lowerContent.includes('occurred')) ||
        (lowerContent.includes('site maintenance')) ||
        (lowerContent.includes('temporarily unavailable'))) {
      console.log(`URL validation failed: ${url} (detected error page)`);
      return {
        valid: false,
        reason: 'Error page detected'
      };
    }
    
    // Check for robot detection or captcha - enhanced detection
    if ((lowerContent.includes('captcha')) ||
        (lowerContent.includes('recaptcha')) ||
        (lowerContent.includes('robot') && lowerContent.includes('check')) ||
        (lowerContent.includes('human verification')) ||
        (lowerContent.includes('security check')) ||
        (lowerContent.includes('prove you\'re human')) ||
        (lowerContent.includes('are you a robot')) ||
        (lowerContent.includes('cloudflare') && lowerContent.includes('security')) ||
        (lowerContent.includes('prove you are human')) ||
        (lowerContent.includes('automated access')) ||
        (lowerContent.includes('bot protection')) ||
        (lowerContent.includes('challenge') && lowerContent.includes('security')) ||
        (lowerContent.includes('ddos') && lowerContent.includes('protection')) ||
        (lowerContent.includes('automated request')) ||
        (lowerContent.includes('suspicious activity')) ||
        (lowerContent.includes('unusual traffic')) ||
        (lowerContent.includes('checking your browser')) ||
        (content.includes('g-recaptcha') || content.includes('grecaptcha')) ||
        (content.includes('hcaptcha')) ||
        (content.includes('turnstile.js')) ||
        (content.includes('cf-') && content.includes('challenge')) ||
        (lowerContent.includes('bot') && lowerContent.includes('detection')) ||
        (lowerContent.includes('verify') && lowerContent.includes('human'))) {
      console.log(`URL validation failed: ${url} (detected robot/captcha page)`);
      return {
        valid: false,
        reason: 'Robot/captcha detection page'
      };
    }
    
    // Check if it's a login page - enhanced detection
    if ((lowerContent.includes('login') && lowerContent.includes('password')) ||
        (lowerContent.includes('sign in') && lowerContent.includes('password')) ||
        (lowerContent.includes('register') && lowerContent.includes('password')) ||
        (lowerContent.includes('log in') && lowerContent.includes('password')) ||
        (lowerContent.includes('signin') && lowerContent.includes('password')) ||
        (lowerContent.includes('account') && lowerContent.includes('password')) ||
        (lowerContent.includes('authentication') && lowerContent.includes('password')) ||
        (lowerContent.includes('username') && lowerContent.includes('password')) ||
        (lowerContent.includes('forgot password') && (lowerContent.includes('email') || lowerContent.includes('username'))) ||
        (lowerContent.includes('create account') && lowerContent.includes('password')) ||
        (lowerContent.includes('sign up') && lowerContent.includes('password')) ||
        (content.includes('<form') && lowerContent.includes('password') && 
         (lowerContent.includes('submit') || lowerContent.includes('login') || lowerContent.includes('sign in'))) ||
        (content.includes('<input type="password"')) ||
        (lowerContent.includes('authentication') && lowerContent.includes('required')) ||
        (lowerContent.includes('access denied') && (lowerContent.includes('login') || lowerContent.includes('sign in'))) ||
        (lowerContent.includes('session expired') && (lowerContent.includes('login') || lowerContent.includes('sign in'))) ||
        (lowerContent.includes('please authenticate'))) {
      console.log(`URL validation failed: ${url} (detected login page)`);
      return {
        valid: false,
        reason: 'Login page detected'
      };
    }
    
    // Parse the HTML to check for content
    const dom = new JSDOM(content);
    const document = dom.window.document;
    
    // Check if there's actual content in the body
    const bodyText = document.body.textContent.trim();
    if (bodyText.length < 200) {
      console.log(`URL validation failed: ${url} (body text too short: ${bodyText.length} chars)`);
      return {
        valid: false,
        reason: 'Body text too short'
      };
    }
    
    // Evaluate content quality
    const qualityScore = evaluateContentQuality(content, document);
    console.log(`Content quality score for ${url}: ${qualityScore}`);
    
    // Require a minimum quality score
    const qualityThreshold = 3;
    if (qualityScore < qualityThreshold) {
      console.log(`URL validation failed: ${url} (quality score too low: ${qualityScore}, threshold: ${qualityThreshold})`);
      return {
        valid: false,
        reason: `Quality score too low (${qualityScore}/${qualityThreshold})`
      };
    }
    
    // URL passed all checks
    console.log(`URL validation successful: ${url}`);
    return {
      valid: true,
      content: content,
      qualityScore: qualityScore
    };
  } catch (error) {
    console.error(`Error validating URL: ${url}`, error);
    return {
      valid: false,
      reason: `Error: ${error.message}`
    };
  }
}

/**
 * Evaluate content quality and detect valid pages
 */
function evaluateContentQuality(content, document) {
  // Convert to lowercase for case-insensitive matching
  const lowerContent = content.toLowerCase();
  
  // Initialize quality score
  let qualityScore = 0;
  
  // Check for semantic HTML structure indicators (stronger indicators of valid content)
  if (content.includes('<article') || 
      content.includes('class="article"') || 
      content.includes('class="post"') || 
      content.includes('id="article"') || 
      content.includes('id="post"') ||
      content.includes('class="entry"') ||
      content.includes('class="blog-post"') ||
      content.includes('class="news-article"')) {
    qualityScore += 2;
  }
  
  // Check for content containers
  if (content.includes('class="content"') || 
      content.includes('id="content"') || 
      content.includes('class="main"') || 
      content.includes('id="main"') ||
      content.includes('class="container"') ||
      content.includes('class="page-content"') ||
      content.includes('class="site-content"')) {
    qualityScore += 1;
  }
  
  // Check for header and footer elements (indicates proper page structure)
  if ((content.includes('<header') && content.includes('<footer')) ||
      (content.includes('class="header"') && content.includes('class="footer"')) ||
      (content.includes('id="header"') && content.includes('id="footer"'))) {
    qualityScore += 1;
  }
  
  // Check for navigation elements (indicates proper site structure)
  if (content.includes('<nav') ||
      content.includes('class="nav"') ||
      content.includes('class="navigation"') ||
      content.includes('class="menu"') ||
      content.includes('id="nav"') ||
      content.includes('id="menu"')) {
    qualityScore += 1;
  }
  
  // Check for content indicators
  const headings = (content.match(/<h[1-3][^>]*>/g) || []).length;
  if (headings >= 3) qualityScore += 2;
  else if (headings >= 1) qualityScore += 1;
  
  const paragraphs = (content.match(/<p[^>]*>/g) || []).length;
  if (paragraphs >= 5) qualityScore += 2;
  else if (paragraphs >= 3) qualityScore += 1;
  
  // Check for content length
  if (content.length > 10000) qualityScore += 3;
  else if (content.length > 5000) qualityScore += 2;
  else if (content.length > 2000) qualityScore += 1;
  
  // Check for links (too many can indicate low quality, but some are expected)
  const links = (content.match(/<a[^>]*>/g) || []).length;
  if (links > 100) qualityScore -= 2; // Too many links might be a link farm
  else if (links > 50) qualityScore -= 1; // Many links might be low quality
  else if (links >= 5 && links <= 30) qualityScore += 1; // Good range for normal content
  
  // Check for images (articles often have images)
  const images = (content.match(/<img[^>]*>/g) || []).length;
  if (images >= 2 && images <= 15) qualityScore += 1; // Some images but not too many
  
  // Check for meta tags (indicates proper SEO and structured content)
  if (content.includes('<meta name="description"') ||
      content.includes('<meta property="og:') ||
      content.includes('<meta name="keywords"')) {
    qualityScore += 1;
  }
  
  // Check for common content words
  const contentWords = [
    'introduction', 'conclusion', 'summary', 'overview', 'analysis', 
    'review', 'guide', 'tutorial', 'how to', 'what is', 'why', 'when',
    'article', 'news', 'report', 'story', 'feature', 'opinion', 'editorial',
    'research', 'study', 'survey', 'interview', 'profile', 'case study'
  ];
  
  let contentWordCount = 0;
  for (const word of contentWords) {
    if (lowerContent.includes(word)) contentWordCount++;
  }
  
  if (contentWordCount >= 5) qualityScore += 2;
  else if (contentWordCount >= 2) qualityScore += 1;
  
  // Check for low-quality indicators
  const lowQualityIndicators = [
    'click here', 'buy now', 'sign up now', 'limited time', 
    'exclusive offer', 'one weird trick', 'doctors hate', 'this simple trick',
    'you won\'t believe', 'shocking', 'miracle', 'secret', 'revolutionary',
    'amazing', 'incredible', 'unbelievable', 'jaw-dropping', 'insane results'
  ];
  
  let lowQualityCount = 0;
  for (const indicator of lowQualityIndicators) {
    if (lowerContent.includes(indicator)) lowQualityCount++;
  }
  
  if (lowQualityCount >= 3) qualityScore -= 3;
  else if (lowQualityCount >= 1) qualityScore -= 1;
  
  // Check for empty page indicators
  if (paragraphs === 0 && headings === 0) qualityScore -= 3;
  
  // Check for JavaScript-heavy pages that might not have rendered content
  if (content.includes('window.onload') && content.includes('document.getElementById') && paragraphs < 2) {
    qualityScore -= 1;
  }
  
  // Detect search pages (these are usually valid and useful)
  if ((lowerContent.includes('search results') || lowerContent.includes('search for')) && 
      (lowerContent.includes('found') || lowerContent.includes('results'))) {
    qualityScore += 1;
  }
  
  // Detect category/archive pages (these are usually valid and useful)
  if ((lowerContent.includes('category') || lowerContent.includes('archive')) && 
      (paragraphs >= 2 || links >= 5)) {
    qualityScore += 1;
  }
  
  return Math.max(0, qualityScore); // Ensure score is not negative
}

/**
 * Test URL generation and validation
 */
async function testUrlGenerationAndValidation() {
  console.log('Testing URL generation and validation...');
  console.log('---------------------------------------');
  
  // Test each pattern
  for (const pattern of patterns) {
    console.log(`\nPattern: ${pattern}`);
    
    // Generate 3 URLs for each pattern
    const results = [];
    for (let i = 0; i < 3; i++) {
      const url = generateDiverseUrl(pattern, i);
      console.log(`\nGenerated URL ${i+1}: ${url}`);
      
      // Validate the URL
      const validationResult = await validateUrl(url);
      results.push({
        url,
        valid: validationResult.valid,
        reason: validationResult.reason || 'Valid'
      });
      
      console.log(`Validation result: ${validationResult.valid ? 'VALID' : 'INVALID'} - ${validationResult.reason || 'URL is valid'}`);
    }
    
    // Summarize results for this pattern
    const validCount = results.filter(r => r.valid).length;
    console.log(`\nSummary for pattern ${pattern}: ${validCount}/3 valid URLs`);
    
    // Log all results
    console.log('Results:');
    results.forEach((result, index) => {
      console.log(`  ${index+1}. ${result.url} - ${result.valid ? 'VALID' : 'INVALID'} (${result.reason})`);
    });
  }
  
  console.log('\n\nTest completed.');
}

// Run the test
testUrlGenerationAndValidation().catch(error => {
  console.error('Test failed:', error);
});
