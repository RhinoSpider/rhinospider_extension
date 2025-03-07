/**
 * URL Generator for RhinoSpider
 * 
 * This module generates URLs for scraping based on topic configuration.
 * It supports different URL generation strategies:
 * - homepage_links: Start with the base URL and follow links matching articleUrlPatterns
 * - pattern_based: Generate URLs by combining urlPatterns with articleUrlPatterns
 * - sitemap: Extract URLs from the site's sitemap
 * - rss: Extract URLs from RSS feeds
 * - multi_strategy: Try multiple strategies in sequence
 *
 * The generator also supports specialized handling for different website types:
 * - ecommerce: Generate product URLs for e-commerce sites
 * - news: Generate article URLs for news sites
 * - blog: Generate post URLs for blog platforms
 * - forum: Generate thread URLs for forum sites
 */

// Cache for generated URLs to improve performance
const urlCache = new Map();
const CACHE_TTL = 3600000; // 1 hour in milliseconds

/**
 * Generate URLs for a given topic
 * @param {Object} topic - The topic configuration
 * @param {number} limit - Maximum number of URLs to generate (default: 10)
 * @returns {Array<string>} - Array of generated URLs
 */
function generateUrls(topic, limit = 10) {
  if (!topic || !topic.urlPatterns || topic.urlPatterns.length === 0) {
    console.error('[URL Generator] Missing required topic fields for URL generation');
    return [];
  }

  // Check cache first
  const cacheKey = `${topic.id || topic.name}_${limit}`;
  if (urlCache.has(cacheKey)) {
    const cachedData = urlCache.get(cacheKey);
    if (Date.now() - cachedData.timestamp < CACHE_TTL) {
      console.log(`[URL Generator] Using cached URLs for topic: ${topic.name}`);
      return cachedData.urls;
    } else {
      // Cache expired, remove it
      urlCache.delete(cacheKey);
    }
  }

  const strategy = topic.urlGenerationStrategy || 'pattern_based';
  const siteType = topic.siteTypeClassification || 'general';
  console.log(`[URL Generator] Using strategy: ${strategy} for topic: ${topic.name} (Type: ${siteType})`);
  
  let urls = [];
  
  // Use site type specific generators if available
  if (siteType === 'ecommerce') {
    urls = generateForEcommerce(topic, limit);
  } else if (siteType === 'news') {
    urls = generateForNews(topic, limit);
  } else if (siteType === 'blog') {
    urls = generateForBlog(topic, limit);
  } else if (siteType === 'forum') {
    urls = generateForForum(topic, limit);
  } else {
    // Fall back to strategy-based generation
    switch (strategy) {
      case 'homepage_links':
        urls = generateFromHomepageLinks(topic, limit);
        break;
      case 'pattern_based':
        urls = generateFromPatterns(topic, limit);
        break;
      case 'sitemap':
        urls = generateFromSitemap(topic, limit);
        break;
      case 'rss':
        urls = generateFromRSS(topic, limit);
        break;
      case 'multi_strategy':
        urls = generateWithMultipleStrategies(topic, limit);
        break;
      default:
        console.warn(`[URL Generator] Unknown strategy: ${strategy}, falling back to pattern_based`);
        urls = generateFromPatterns(topic, limit);
    }
  }
  
  // Cache the results
  urlCache.set(cacheKey, {
    urls: urls,
    timestamp: Date.now()
  });
  
  return urls;
}

/**
 * Generate URLs by combining base URL patterns with article URL patterns
 * @param {Object} topic - The topic configuration
 * @param {number} limit - Maximum number of URLs to generate
 * @returns {Array<string>} - Array of generated URLs
 */
function generateFromPatterns(topic, limit) {
  const { urlPatterns, articleUrlPatterns } = topic;
  const urls = [];

  if (!articleUrlPatterns || articleUrlPatterns.length === 0) {
    console.warn('[URL Generator] No articleUrlPatterns found, using urlPatterns as-is');
    return urlPatterns.slice(0, limit).map(pattern => processWildcards(pattern));
  }

  // Handle e-commerce sites with full URLs in articleUrlPatterns
  if (topic.siteTypeClassification === 'ecommerce' && 
      articleUrlPatterns.some(pattern => pattern.startsWith('http'))) {
    console.log('[URL Generator] Using e-commerce specific URL generation');
    
    // Process each article URL pattern directly
    for (const pattern of articleUrlPatterns) {
      if (urls.length >= limit) break;
      urls.push(processWildcards(pattern));
    }
    
    return urls;
  }

  // For each base URL pattern, combine with each article URL pattern
  for (const basePattern of urlPatterns) {
    // Extract the domain from the base pattern
    const domainMatch = basePattern.match(/^(https?:\/\/[^\/]+)/);
    if (!domainMatch) continue;
    
    const domain = domainMatch[1];
    
    for (const articlePattern of articleUrlPatterns) {
      // Skip if we've reached the limit
      if (urls.length >= limit) break;
      
      // If the article pattern is a full URL, use it directly
      if (articlePattern.startsWith('http')) {
        urls.push(processWildcards(articlePattern));
        continue;
      }
      
      // If the article pattern starts with a slash, append it to the domain
      if (articlePattern.startsWith('/')) {
        // Replace wildcards with realistic values
        const processedPattern = processWildcards(articlePattern);
        urls.push(`${domain}${processedPattern}`);
      } else {
        // Otherwise, combine the base pattern with the article pattern
        // Remove the wildcard from the base pattern if it exists
        const baseWithoutWildcard = basePattern.replace(/\/\*$/, '/');
        const processedPattern = processWildcards(articlePattern);
        urls.push(`${baseWithoutWildcard}${processedPattern}`);
      }
    }
  }

  return urls.slice(0, limit);
}

/**
 * Replace wildcards in patterns with realistic values
 * @param {string} pattern - The pattern with wildcards
 * @returns {string} - The processed pattern
 */
function processWildcards(pattern) {
  // Handle full URL patterns with regex-like syntax
  if (pattern.startsWith('http')) {
    let processed = pattern;
    
    // Process Amazon product URLs
    if (pattern.includes('amazon.com')) {
      // Real Amazon product examples
      const amazonProducts = [
        { path: 'Apple-AirPods-Pro-2nd-Generation/dp/B0BDHWDR12', id: 'B0BDHWDR12' },
        { path: 'Sony-WH-1000XM4-Canceling-Headphones-Phone-Call/dp/B0863TXGM3', id: 'B0863TXGM3' },
        { path: 'Samsung-Smartphone-Unlocked-Smartphone-Processing/dp/B0BLP45GY8', id: 'B0BLP45GY8' },
        { path: 'Kindle-Paperwhite-16GB-Now-with-2x-Storage/dp/B08KTZ8249', id: 'B08KTZ8249' },
        { path: 'Logitech-MX-Master-Advanced-Wireless/dp/B07S395RWD', id: 'B07S395RWD' }
      ];
      
      const product = amazonProducts[Math.floor(Math.random() * amazonProducts.length)];
      
      processed = processed.replace(/\/\*\/dp\/\*/, `/${product.path}`);
      processed = processed.replace(/\*\/dp\/\[A-Z0-9\]\{10\}/, product.path);
      processed = processed.replace(/\[A-Z0-9\]\{10\}/, product.id);
      return processed;
    }
    
    // Process Best Buy product URLs
    if (pattern.includes('bestbuy.com')) {
      // Real Best Buy product examples
      const bestBuyProducts = [
        { path: 'site/apple-airpods-pro-2nd-generation-with-magsafe-case-white/4900964.p', id: '4900964' },
        { path: 'site/sony-wh-1000xm4-wireless-noise-cancelling-over-the-ear-headphones-black/6408356.p', id: '6408356' },
        { path: 'site/samsung-galaxy-s23-ultra-256gb-phantom-black-verizon/6529738.p', id: '6529738' },
        { path: 'site/amazon-kindle-paperwhite-6-8-8gb-e-reader-black/6486884.p', id: '6486884' },
        { path: 'site/logitech-mx-master-3s-wireless-mouse-with-ultrafast-scrolling-black/6505905.p', id: '6505905' }
      ];
      
      const product = bestBuyProducts[Math.floor(Math.random() * bestBuyProducts.length)];
      
      processed = processed.replace(/\/site\/\*\//, '/site/electronics/');
      processed = processed.replace(/\/site\/\*\/\[0-9\]\+\.p/, `/${product.path}`);
      processed = processed.replace(/\[0-9\]\+\.p/, `${product.id}.p`);
      return processed;
    }
    
    // Process Walmart product URLs
    if (pattern.includes('walmart.com')) {
      // Real Walmart product examples
      const walmartProducts = [
        { path: 'ip/Apple-AirPods-Pro-2nd-Generation-with-MagSafe-Case/1963343037', id: '1963343037' },
        { path: 'ip/Sony-WH-1000XM4-Wireless-Noise-Canceling-Overhead-Headphones-Black/473994856', id: '473994856' },
        { path: 'ip/Samsung-Galaxy-S23-Ultra-256GB-Phantom-Black-Verizon/1347846753', id: '1347846753' },
        { path: 'ip/Amazon-Kindle-Paperwhite-8GB-6-8-Black/795200802', id: '795200802' },
        { path: 'ip/Logitech-MX-Master-3S-Wireless-Mouse-with-Ultra-fast-Scrolling-Black/505127929', id: '505127929' }
      ];
      
      const product = walmartProducts[Math.floor(Math.random() * walmartProducts.length)];
      
      processed = processed.replace(/\/ip\/\*/, `/ip/sample-product`);
      processed = processed.replace(/\/ip\/\*\/\[0-9\]\+/, `/${product.path}`);
      processed = processed.replace(/\*\/\[0-9\]\+/, product.path.replace('ip/', ''));
      processed = processed.replace(/\[0-9\]\+/, product.id);
      return processed;
    }
    
    // Process news site URLs
    if (pattern.includes('nytimes.com')) {
      const newsArticles = [
        '2023/03/15/technology/ai-chatbots-hallucinations.html',
        '2023/05/22/technology/ai-photo-editing-adobe.html',
        '2023/06/10/technology/apple-vision-pro-ar-vr.html',
        '2023/07/18/technology/generative-ai-jobs-automation.html',
        '2023/08/05/technology/crypto-regulation-future.html'
      ];
      const article = newsArticles[Math.floor(Math.random() * newsArticles.length)];
      processed = processed.replace(/\d{4}\/\*\/technology\/\*\.html/, article);
      processed = processed.replace(/\*\/technology\/\*\.html/, article);
      return processed;
    }
    
    if (pattern.includes('techcrunch.com')) {
      const techArticles = [
        '2023/08/15/apple-announces-new-macbook-pro-with-m3-chip/',
        '2023/09/22/meta-launches-new-vr-headset-to-compete-with-apple/',
        '2023/10/10/microsoft-unveils-new-surface-devices-with-ai-features/',
        '2023/11/18/google-introduces-gemini-ai-model-to-challenge-gpt-4/',
        '2023/12/05/amazon-expands-same-day-delivery-to-more-cities/'
      ];
      const article = techArticles[Math.floor(Math.random() * techArticles.length)];
      processed = processed.replace(/\d{4}\/\*\//, article.substring(0, 8));
      processed = processed.replace(/\*\//, article.substring(5));
      return processed;
    }
    
    // Process Reddit URLs
    if (pattern.includes('reddit.com')) {
      const redditPosts = [
        'comments/18zcmd4/what_are_some_good_resources_for_learning_react/',
        'comments/18y7f3p/how_to_optimize_postgresql_queries_for_large_datasets/',
        'comments/18xvb2q/best_practices_for_securing_nodejs_applications/',
        'comments/18wt5zx/tips_for_improving_frontend_performance/',
        'comments/18v9p2r/how_to_structure_a_large_scale_react_application/'
      ];
      const post = redditPosts[Math.floor(Math.random() * redditPosts.length)];
      processed = processed.replace(/comments\/\*\//, post);
      processed = processed.replace(/\*\/$/, '/');
      return processed;
    }
    
    // Process blog URLs
    if (pattern.includes('medium.com') || pattern.includes('dev.to') || pattern.includes('hashnode.com')) {
      const blogPosts = [
        'understanding-react-hooks-a-comprehensive-guide-e32fd5',
        'building-scalable-apis-with-graphql-and-apollo-b78c2',
        'the-future-of-web-development-in-2023-and-beyond-f45a1',
        'mastering-typescript-advanced-tips-and-tricks-d92e3',
        'optimizing-docker-containers-for-production-c67b5'
      ];
      const post = blogPosts[Math.floor(Math.random() * blogPosts.length)];
      processed = processed.replace(/\*\//, post + '/');
      return processed;
    }
    
    // Generic URL wildcard replacement
    return processed.replace(/\*/g, 'sample');
  }
  
  // Handle relative URL patterns
  
  // Replace year wildcards
  let processed = pattern.replace('/2025/*', '/2025/03/sample-article-1');
  processed = processed.replace('/2024/*', '/2024/12/sample-article-2');
  processed = processed.replace('/2023/*', '/2023/06/sample-article-3');
  
  // Replace other common wildcards
  processed = processed.replace('/post/*', '/post/sample-post-title');
  processed = processed.replace('/article/*', '/article/sample-article-title');
  
  // Replace numeric placeholders
  processed = processed.replace('{num}', '1');
  
  // Replace complex patterns with realistic values
  processed = processed.replace(/\[A-Z0-9\]\{10\}/, 'B07PXGQC1Q');
  processed = processed.replace(/\[0-9\]\+\.p/, '12345.p');
  processed = processed.replace(/\[0-9\]\+/, '67890');
  
  // Replace simple wildcards
  processed = processed.replace(/\*/, 'sample');
  
  return processed;
}

/**
 * Generate URLs by starting from homepage and following links
 * This is a simplified simulation since we can't actually crawl in this context
 * @param {Object} topic - The topic configuration
 * @param {number} limit - Maximum number of URLs to generate
 * @returns {Array<string>} - Array of generated URLs
 */
function generateFromHomepageLinks(topic, limit) {
  // In a real implementation, this would fetch the homepage and extract links
  // For now, we'll simulate this by using the sample article URLs if available
  // or falling back to pattern-based generation
  
  if (topic.sampleArticleUrls && topic.sampleArticleUrls.length > 0) {
    console.log('[URL Generator] Using sample article URLs for homepage_links strategy');
    
    // If we have enough sample URLs, use them
    if (topic.sampleArticleUrls.length >= limit) {
      return topic.sampleArticleUrls.slice(0, limit);
    }
    
    // Otherwise, combine sample URLs with generated ones
    const urls = [...topic.sampleArticleUrls];
    const additionalUrls = generateFromPatterns(topic, limit - urls.length);
    return [...urls, ...additionalUrls];
  }
  
  // Fall back to pattern-based generation
  console.log('[URL Generator] No sample URLs available, falling back to pattern-based generation');
  return generateFromPatterns(topic, limit);
}

/**
 * Generate URLs by extracting from sitemap
 * This is a simplified simulation since we can't actually fetch sitemaps in this context
 * @param {Object} topic - The topic configuration
 * @param {number} limit - Maximum number of URLs to generate
 * @returns {Array<string>} - Array of generated URLs
 */
function generateFromSitemap(topic, limit) {
  // In a real implementation, this would fetch and parse the sitemap
  // For now, we'll simulate this by using pattern-based generation
  console.log('[URL Generator] Sitemap strategy not fully implemented, using pattern-based generation');
  return generateFromPatterns(topic, limit);
}

/**
 * Generate URLs specifically for e-commerce sites
 * @param {Object} topic - The topic configuration
 * @param {number} limit - Maximum number of URLs to generate
 * @returns {Array<string>} - Array of generated URLs
 */
function generateForEcommerce(topic, limit) {
  console.log('[URL Generator] Using e-commerce specific URL generation');
  
  // E-commerce sites often have product pages with specific patterns
  const urls = [];
  const { urlPatterns, articleUrlPatterns } = topic;
  
  // Use article URL patterns if available, otherwise use base URL patterns
  const patterns = (articleUrlPatterns && articleUrlPatterns.length > 0) ? 
    articleUrlPatterns : urlPatterns;
  
  // Process each pattern to generate realistic product URLs
  for (const pattern of patterns) {
    if (urls.length >= limit) break;
    
    // Process the pattern to generate a realistic product URL
    urls.push(processWildcards(pattern));
  }
  
  return urls.slice(0, limit);
}

/**
 * Generate URLs specifically for news sites
 * @param {Object} topic - The topic configuration
 * @param {number} limit - Maximum number of URLs to generate
 * @returns {Array<string>} - Array of generated URLs
 */
function generateForNews(topic, limit) {
  console.log('[URL Generator] Using news site specific URL generation');
  
  const urls = [];
  const { urlPatterns, articleUrlPatterns } = topic;
  
  // News sites often have article URLs with date patterns
  // Generate realistic article URLs based on the patterns
  
  // Use sample article URLs if available
  if (articleUrlPatterns && articleUrlPatterns.length > 0) {
    // Current date for generating recent article URLs
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    // Sample article titles for news sites
    const articleTitles = [
      'the-biggest-data-breaches-of-2025-so-far',
      'apple-updates-the-new-mac-studio-with-m4-max-or-m3-ultra',
      'microsoft-announces-new-ai-features-for-office-365',
      'google-launches-pixel-9-with-improved-camera-system',
      'amazon-introduces-new-echo-devices-with-enhanced-privacy-features',
      'tesla-unveils-new-model-for-affordable-electric-vehicles',
      'meta-releases-next-generation-vr-headset-to-compete-with-apple',
      'twitter-implements-new-content-moderation-policies',
      'netflix-adds-interactive-gaming-features-to-streaming-service',
      'spacex-announces-plans-for-first-civilian-mission-to-mars'
    ];
    
    for (const basePattern of urlPatterns) {
      // Extract the domain from the base pattern
      const domainMatch = basePattern.match(/^(https?:\/\/[^\/]+)/);
      if (!domainMatch) continue;
      
      const domain = domainMatch[1];
      
      for (let i = 0; i < Math.min(limit, articleTitles.length); i++) {
        if (urls.length >= limit) break;
        
        // Generate a date within the last year
        const randomDaysAgo = Math.floor(Math.random() * 365);
        const articleDate = new Date(now);
        articleDate.setDate(articleDate.getDate() - randomDaysAgo);
        
        const articleYear = articleDate.getFullYear();
        const articleMonth = String(articleDate.getMonth() + 1).padStart(2, '0');
        const articleDay = String(articleDate.getDate()).padStart(2, '0');
        
        // Generate URL based on the site pattern
        let articleUrl;
        if (domain.includes('nytimes.com')) {
          articleUrl = `${domain}/${articleYear}/${articleMonth}/${articleDay}/technology/${articleTitles[i]}.html`;
        } else if (domain.includes('techcrunch.com')) {
          articleUrl = `${domain}/${articleYear}/${articleMonth}/${articleDay}/${articleTitles[i]}/`;
        } else if (domain.includes('washingtonpost.com')) {
          articleUrl = `${domain}/technology/${articleYear}/${articleMonth}/${articleDay}/${articleTitles[i]}/`;
        } else if (domain.includes('bbc.com') || domain.includes('bbc.co.uk')) {
          articleUrl = `${domain}/news/technology-${Math.floor(10000000 + Math.random() * 90000000)}`;
        } else {
          // Generic news site pattern
          articleUrl = `${domain}/articles/${articleYear}/${articleMonth}/${articleTitles[i]}`;
        }
        
        urls.push(articleUrl);
      }
    }
  } else {
    // Fall back to pattern-based generation
    return generateFromPatterns(topic, limit);
  }
  
  return urls.slice(0, limit);
}

/**
 * Generate URLs specifically for blog sites
 * @param {Object} topic - The topic configuration
 * @param {number} limit - Maximum number of URLs to generate
 * @returns {Array<string>} - Array of generated URLs
 */
function generateForBlog(topic, limit) {
  console.log('[URL Generator] Using blog site specific URL generation');
  
  const urls = [];
  const { urlPatterns, articleUrlPatterns } = topic;
  
  // Blog post titles
  const blogPostTitles = [
    'understanding-react-hooks-a-comprehensive-guide',
    'building-scalable-apis-with-graphql-and-apollo',
    'the-future-of-web-development-in-2023-and-beyond',
    'mastering-typescript-advanced-tips-and-tricks',
    'optimizing-docker-containers-for-production',
    'implementing-ci-cd-pipelines-with-github-actions',
    'serverless-architecture-pros-and-cons',
    'machine-learning-for-frontend-developers',
    'responsive-design-best-practices-in-2023',
    'web-accessibility-guidelines-everyone-should-follow'
  ];
  
  for (const basePattern of urlPatterns) {
    // Extract the domain from the base pattern
    const domainMatch = basePattern.match(/^(https?:\/\/[^\/]+)/);
    if (!domainMatch) continue;
    
    const domain = domainMatch[1];
    
    for (let i = 0; i < Math.min(limit, blogPostTitles.length); i++) {
      if (urls.length >= limit) break;
      
      // Generate URL based on the site pattern
      let blogUrl;
      if (domain.includes('medium.com')) {
        const randomId = Math.random().toString(36).substring(2, 8);
        blogUrl = `${domain}/@username/${blogPostTitles[i]}-${randomId}`;
      } else if (domain.includes('dev.to')) {
        blogUrl = `${domain}/${blogPostTitles[i]}`;
      } else if (domain.includes('hashnode.com')) {
        blogUrl = `${domain}/${blogPostTitles[i]}`;
      } else if (domain.includes('wordpress.com')) {
        blogUrl = `${domain}/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${blogPostTitles[i]}`;
      } else {
        // Generic blog pattern
        blogUrl = `${domain}/blog/${blogPostTitles[i]}`;
      }
      
      urls.push(blogUrl);
    }
  }
  
  return urls.length > 0 ? urls.slice(0, limit) : generateFromPatterns(topic, limit);
}

/**
 * Generate URLs specifically for forum sites
 * @param {Object} topic - The topic configuration
 * @param {number} limit - Maximum number of URLs to generate
 * @returns {Array<string>} - Array of generated URLs
 */
function generateForForum(topic, limit) {
  console.log('[URL Generator] Using forum site specific URL generation');
  
  const urls = [];
  const { urlPatterns } = topic;
  
  // Forum thread titles
  const forumThreads = [
    'what-are-some-good-resources-for-learning-react',
    'how-to-optimize-postgresql-queries-for-large-datasets',
    'best-practices-for-securing-nodejs-applications',
    'tips-for-improving-frontend-performance',
    'how-to-structure-a-large-scale-react-application',
    'debugging-memory-leaks-in-javascript-applications',
    'recommended-tools-for-monitoring-production-applications',
    'handling-authentication-in-microservices-architecture',
    'strategies-for-effective-error-handling-in-apis',
    'comparing-different-state-management-solutions-for-react'
  ];
  
  for (const basePattern of urlPatterns) {
    // Extract the domain from the base pattern
    const domainMatch = basePattern.match(/^(https?:\/\/[^\/]+)/);
    if (!domainMatch) continue;
    
    const domain = domainMatch[1];
    
    for (let i = 0; i < Math.min(limit, forumThreads.length); i++) {
      if (urls.length >= limit) break;
      
      // Generate URL based on the site pattern
      let forumUrl;
      if (domain.includes('reddit.com')) {
        const randomId = Math.random().toString(36).substring(2, 8);
        forumUrl = `${domain}/r/programming/comments/${randomId}/${forumThreads[i]}/`;
      } else if (domain.includes('stackoverflow.com')) {
        const randomId = Math.floor(1000000 + Math.random() * 9000000);
        forumUrl = `${domain}/questions/${randomId}/${forumThreads[i]}`;
      } else if (domain.includes('quora.com')) {
        forumUrl = `${domain}/${forumThreads[i]}`;
      } else {
        // Generic forum pattern
        const randomId = Math.floor(1000 + Math.random() * 9000);
        forumUrl = `${domain}/threads/${forumThreads[i]}-${randomId}`;
      }
      
      urls.push(forumUrl);
    }
  }
  
  return urls.length > 0 ? urls.slice(0, limit) : generateFromPatterns(topic, limit);
}

/**
 * Format topic data for the createTopic function in the Candid interface
 * @param {Object} topic - The topic data to format
 * @returns {Object} - Formatted topic data
 */
function formatTopicForCreate(topic) {
  if (!topic) return null;
  
  // Clone the topic to avoid modifying the original
  const formattedTopic = { ...topic };
  
  // Format arrays and optional fields according to Candid interface requirements
  if (formattedTopic.articleUrlPatterns && formattedTopic.articleUrlPatterns.length > 0) {
    // For createTopic: articleUrlPatterns should be a direct array (no wrapping)
    formattedTopic.articleUrlPatterns = formattedTopic.articleUrlPatterns.filter(
      p => typeof p === 'string' && p.trim() !== ''
    );
  } else {
    formattedTopic.articleUrlPatterns = [];
  }
  
  if (formattedTopic.excludePatterns && formattedTopic.excludePatterns.length > 0) {
    // For createTopic: excludePatterns should be a direct array (no wrapping)
    formattedTopic.excludePatterns = formattedTopic.excludePatterns.filter(
      p => typeof p === 'string' && p.trim() !== ''
    );
  } else {
    formattedTopic.excludePatterns = [];
  }
  
  if (formattedTopic.paginationPatterns && formattedTopic.paginationPatterns.length > 0) {
    // For createTopic: paginationPatterns should be a direct array (no wrapping)
    formattedTopic.paginationPatterns = formattedTopic.paginationPatterns.filter(
      p => typeof p === 'string' && p.trim() !== ''
    );
  } else {
    formattedTopic.paginationPatterns = [];
  }
  
  // Format contentIdentifiers (no wrapping for createTopic)
  if (!formattedTopic.contentIdentifiers) {
    formattedTopic.contentIdentifiers = { selectors: [], keywords: [] };
  }
  
  return formattedTopic;
}

/**
 * Format topic data for the updateTopic function in the Candid interface
 * @param {Object} topic - The topic data to format
 * @returns {Object} - Formatted topic data
 */
function formatTopicForUpdate(topic) {
  if (!topic) return null;
  
  // Clone the topic to avoid modifying the original
  const formattedTopic = {};
  
  // Format fields according to Candid interface requirements for updateTopic
  // For updateTopic: optional text fields should be wrapped in an array
  if (topic.name !== undefined) {
    formattedTopic.name = topic.name ? [topic.name] : [];
  }
  
  if (topic.description !== undefined) {
    formattedTopic.description = topic.description ? [topic.description] : [];
  }
  
  if (topic.status !== undefined) {
    formattedTopic.status = topic.status ? [topic.status] : [];
  }
  
  if (topic.urlGenerationStrategy !== undefined) {
    formattedTopic.urlGenerationStrategy = topic.urlGenerationStrategy ? [topic.urlGenerationStrategy] : [];
  }
  
  if (topic.siteTypeClassification !== undefined) {
    formattedTopic.siteTypeClassification = topic.siteTypeClassification ? [topic.siteTypeClassification] : [];
  }
  
  // For updateTopic: arrays should be wrapped in a single array
  if (topic.urlPatterns !== undefined) {
    formattedTopic.urlPatterns = topic.urlPatterns && topic.urlPatterns.length > 0 
      ? [topic.urlPatterns.filter(p => typeof p === 'string' && p.trim() !== '')] 
      : [];
  }
  
  if (topic.articleUrlPatterns !== undefined) {
    formattedTopic.articleUrlPatterns = topic.articleUrlPatterns && topic.articleUrlPatterns.length > 0 
      ? [topic.articleUrlPatterns.filter(p => typeof p === 'string' && p.trim() !== '')] 
      : [];
  }
  
  if (topic.excludePatterns !== undefined) {
    formattedTopic.excludePatterns = topic.excludePatterns && topic.excludePatterns.length > 0 
      ? [topic.excludePatterns.filter(p => typeof p === 'string' && p.trim() !== '')] 
      : [];
  }
  
  if (topic.paginationPatterns !== undefined) {
    formattedTopic.paginationPatterns = topic.paginationPatterns && topic.paginationPatterns.length > 0 
      ? [topic.paginationPatterns.filter(p => typeof p === 'string' && p.trim() !== '')] 
      : [];
  }
  
  // For updateTopic: contentIdentifiers should be wrapped in a single array
  if (topic.contentIdentifiers !== undefined) {
    formattedTopic.contentIdentifiers = topic.contentIdentifiers 
      ? [topic.contentIdentifiers] 
      : [];
  }
  
  if (topic.extractionRules !== undefined) {
    formattedTopic.extractionRules = topic.extractionRules 
      ? [topic.extractionRules] 
      : [];
  }
  
  return formattedTopic;
}

/**
 * Generate URLs using multiple strategies in sequence
 * @param {Object} topic - The topic configuration
 * @param {number} limit - Maximum number of URLs to generate
 * @returns {Array<string>} - Array of generated URLs
 */
function generateWithMultipleStrategies(topic, limit) {
  let urls = [];
  
  // Try strategies in order of reliability
  const strategies = [
    generateFromPatterns,
    generateFromHomepageLinks,
    generateFromSitemap,
    generateFromRSS
  ];
  
  for (const strategy of strategies) {
    if (urls.length >= limit) break;
    
    try {
      const newUrls = strategy(topic, limit - urls.length);
      urls = [...urls, ...newUrls];
    } catch (error) {
      console.warn(`[URL Generator] Strategy failed: ${error.message}`);
      // Continue to next strategy
    }
  }
  
  return urls.slice(0, limit);
}

/**
 * Generate URLs from RSS feeds
 * @param {Object} topic - The topic configuration
 * @param {number} limit - Maximum number of URLs to generate
 * @returns {Array<string>} - Array of generated URLs
 */
function generateFromRSS(topic, limit) {
  // This is a simplified implementation since we can't actually fetch RSS feeds in this context
  // In a real implementation, this would fetch and parse RSS feeds
  
  const urls = [];
  const { urlPatterns } = topic;
  
  // Generate some sample RSS-based URLs
  for (const pattern of urlPatterns) {
    const domainMatch = pattern.match(/^(https?:\/\/[^\/]+)/);
    if (!domainMatch) continue;
    
    const domain = domainMatch[1];
    
    // Common RSS feed paths
    const feedPaths = [
      '/feed',
      '/rss',
      '/atom',
      '/feed.xml',
      '/rss.xml',
      '/index.xml'
    ];
    
    // For each feed path, generate a sample article URL
    for (let i = 0; i < Math.min(limit, feedPaths.length); i++) {
      if (urls.length >= limit) break;
      
      const path = `/article-${Math.floor(Math.random() * 1000)}`;
      urls.push(`${domain}${path}`);
    }
  }
  
  return urls.slice(0, limit);
}

/**
 * Clear the URL cache
 */
function clearUrlCache() {
  urlCache.clear();
  console.log('[URL Generator] Cache cleared');
}

module.exports = {
  generateUrls,
  formatTopicForCreate,
  formatTopicForUpdate,
  clearUrlCache
};
