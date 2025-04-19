// Enhanced URL Fetcher for RhinoSpider extension
// Provides multiple strategies for fetching URLs

import { addCacheBusterToUrl } from './url-utils.js';
import { validateAndFormatUrl } from './proxy-client.js';

// Logger utility
const logger = {  
    log: (msg, data) => {
        console.log(`[EnhancedUrlFetcher] ${msg}`, data || '');
    },
    error: (msg, error) => {
        console.error(`[EnhancedUrlFetcher] ERROR: ${msg}`, error || '');
    },
    warn: (msg, data) => {
        console.warn(`[EnhancedUrlFetcher] WARNING: ${msg}`, data || '');
    }
};

// Fetch with timeout and retry logic
async function fetchWithRetry(url, options, timeout = 15000, maxRetries = 3) {
    let retries = 0;
    let lastError = null;
    let retryDelay = 2000; // Start with 2 seconds
    
    while (retries < maxRetries) {
        try {
            // Create an abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            // Add the abort signal to options
            const optionsWithSignal = {
                ...options,
                signal: controller.signal
            };
            
            // Make the request
            const response = await fetch(url, optionsWithSignal);
            
            // Clear the timeout
            clearTimeout(timeoutId);
            
            return response;
        } catch (error) {
            lastError = error;
            retries++;
            
            if (retries >= maxRetries) {
                break;
            }
            
            // Log the retry
            logger.warn(`Fetch attempt ${retries} failed, retrying in ${retryDelay}ms: ${error.message}`);
            
            // Wait before retrying with exponential backoff
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            retryDelay *= 2; // Exponential backoff
        }
    }
    
    // If we get here, all retries failed
    throw new Error(`Fetch failed after ${maxRetries} retries: ${lastError?.message}`);
}

// 1. RSS Feed Strategy
async function fetchUrlsFromRss(topic) {
    logger.log(`Attempting to fetch URLs from RSS feeds for topic: ${topic.name}`);
    
    // Generate potential RSS feed URLs based on domains
    const potentialFeeds = [];
    
    if (topic.domains && topic.domains.length > 0) {
        for (const domain of topic.domains) {
            // Clean up the domain to ensure it's a valid URL
            let cleanDomain = domain;
            if (!cleanDomain.startsWith('http')) {
                cleanDomain = `https://${cleanDomain}`;
            }
            
            // Remove trailing slash if present
            if (cleanDomain.endsWith('/')) {
                cleanDomain = cleanDomain.slice(0, -1);
            }
            
            // Add common RSS feed paths
            potentialFeeds.push(`${cleanDomain}/feed`);
            potentialFeeds.push(`${cleanDomain}/rss`);
            potentialFeeds.push(`${cleanDomain}/feed/atom`);
            potentialFeeds.push(`${cleanDomain}/atom`);
            potentialFeeds.push(`${cleanDomain}/feeds/posts/default`);
            potentialFeeds.push(`${cleanDomain}/rss.xml`);
            potentialFeeds.push(`${cleanDomain}/feed.xml`);
            potentialFeeds.push(`${cleanDomain}/atom.xml`);
        }
    }
    
    logger.log(`Generated ${potentialFeeds.length} potential RSS feed URLs for topic: ${topic.name}`);
    
    // Try each potential feed URL
    const urls = [];
    
    for (const feedUrl of potentialFeeds) {
        try {
            logger.log(`Trying RSS feed URL: ${feedUrl}`);
            
            const response = await fetchWithRetry(feedUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
                    'User-Agent': 'Mozilla/5.0 (compatible; RhinoSpider/1.0)'
                }
            }, 10000, 1); // Shorter timeout and only 1 retry for RSS feeds
            
            if (!response.ok) {
                logger.warn(`RSS feed ${feedUrl} returned status ${response.status}`);
                continue;
            }
            
            const text = await response.text();
            
            // Check if it's a valid RSS or Atom feed
            if (!text.includes('<rss') && !text.includes('<feed')) {
                logger.warn(`URL ${feedUrl} does not appear to be a valid RSS or Atom feed`);
                continue;
            }
            
            // Parse the XML
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, 'text/xml');
            
            // Extract URLs from RSS items or Atom entries
            const items = xmlDoc.querySelectorAll('item, entry');
            
            logger.log(`Found ${items.length} items in RSS feed: ${feedUrl}`);
            
            for (const item of items) {
                // Get the link - RSS uses <link> directly, Atom uses <link href="...">
                let url = '';
                
                const linkElement = item.querySelector('link');
                if (linkElement) {
                    if (linkElement.textContent && linkElement.textContent.trim()) {
                        url = linkElement.textContent.trim();
                    } else if (linkElement.getAttribute('href')) {
                        url = linkElement.getAttribute('href');
                    }
                }
                
                if (!url) {
                    continue;
                }
                
                // Validate and format the URL
                try {
                    const validatedUrl = validateAndFormatUrl(url);
                    if (validatedUrl) {
                        urls.push({
                            url: validatedUrl,
                            source: 'rss',
                            topic: topic.id,
                            timestamp: Date.now()
                        });
                    }
                } catch (error) {
                    logger.warn(`Invalid URL in RSS feed: ${url}`);
                }
            }
            
            // If we found URLs, we can stop checking other feeds
            if (urls.length > 0) {
                logger.log(`Successfully extracted ${urls.length} URLs from RSS feed: ${feedUrl}`);
                break;
            }
        } catch (error) {
            logger.warn(`Error fetching RSS feed ${feedUrl}: ${error.message}`);
        }
    }
    
    return urls;
}

// 2. Sitemap Strategy
async function fetchUrlsFromSitemap(topic) {
    logger.log(`Attempting to fetch URLs from sitemaps for topic: ${topic.name}`);
    
    // Generate potential sitemap URLs based on domains
    const potentialSitemaps = [];
    
    if (topic.domains && topic.domains.length > 0) {
        for (const domain of topic.domains) {
            // Clean up the domain to ensure it's a valid URL
            let cleanDomain = domain;
            if (!cleanDomain.startsWith('http')) {
                cleanDomain = `https://${cleanDomain}`;
            }
            
            // Remove trailing slash if present
            if (cleanDomain.endsWith('/')) {
                cleanDomain = cleanDomain.slice(0, -1);
            }
            
            // Add common sitemap paths
            potentialSitemaps.push(`${cleanDomain}/sitemap.xml`);
            potentialSitemaps.push(`${cleanDomain}/sitemap_index.xml`);
            potentialSitemaps.push(`${cleanDomain}/sitemap`);
            potentialSitemaps.push(`${cleanDomain}/sitemaps.xml`);
        }
    }
    
    logger.log(`Generated ${potentialSitemaps.length} potential sitemap URLs for topic: ${topic.name}`);
    
    // Try each potential sitemap URL
    const urls = [];
    
    for (const sitemapUrl of potentialSitemaps) {
        try {
            logger.log(`Trying sitemap URL: ${sitemapUrl}`);
            
            const response = await fetchWithRetry(sitemapUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/xml, text/xml',
                    'User-Agent': 'Mozilla/5.0 (compatible; RhinoSpider/1.0)'
                }
            }, 10000, 1); // Shorter timeout and only 1 retry for sitemaps
            
            if (!response.ok) {
                logger.warn(`Sitemap ${sitemapUrl} returned status ${response.status}`);
                continue;
            }
            
            const text = await response.text();
            
            // Check if it's a valid sitemap
            if (!text.includes('<urlset') && !text.includes('<sitemapindex')) {
                logger.warn(`URL ${sitemapUrl} does not appear to be a valid sitemap`);
                continue;
            }
            
            // Parse the XML
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, 'text/xml');
            
            // Check if it's a sitemap index
            const sitemapElements = xmlDoc.querySelectorAll('sitemap loc');
            
            if (sitemapElements.length > 0) {
                logger.log(`Found sitemap index with ${sitemapElements.length} sitemaps`);
                
                // Process the first child sitemap (to avoid too many requests)
                if (sitemapElements.length > 0 && sitemapElements[0].textContent) {
                    const childSitemapUrl = sitemapElements[0].textContent.trim();
                    
                    try {
                        const childResponse = await fetchWithRetry(childSitemapUrl, {
                            method: 'GET',
                            headers: {
                                'Accept': 'application/xml, text/xml',
                                'User-Agent': 'Mozilla/5.0 (compatible; RhinoSpider/1.0)'
                            }
                        }, 10000, 1);
                        
                        if (childResponse.ok) {
                            const childText = await childResponse.text();
                            const childXmlDoc = parser.parseFromString(childText, 'text/xml');
                            const urlElements = childXmlDoc.querySelectorAll('url loc');
                            
                            logger.log(`Found ${urlElements.length} URLs in child sitemap: ${childSitemapUrl}`);
                            
                            // Extract URLs (limit to 20 to avoid too many)
                            for (let i = 0; i < Math.min(20, urlElements.length); i++) {
                                const urlElement = urlElements[i];
                                if (urlElement.textContent) {
                                    const url = urlElement.textContent.trim();
                                    
                                    // Validate and format the URL
                                    try {
                                        const validatedUrl = validateAndFormatUrl(url);
                                        if (validatedUrl) {
                                            urls.push({
                                                url: validatedUrl,
                                                source: 'sitemap',
                                                topic: topic.id,
                                                timestamp: Date.now()
                                            });
                                        }
                                    } catch (error) {
                                        logger.warn(`Invalid URL in sitemap: ${url}`);
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        logger.warn(`Error fetching child sitemap ${childSitemapUrl}: ${error.message}`);
                    }
                }
            } else {
                // It's a regular sitemap
                const urlElements = xmlDoc.querySelectorAll('url loc');
                
                logger.log(`Found ${urlElements.length} URLs in sitemap: ${sitemapUrl}`);
                
                // Extract URLs (limit to 20 to avoid too many)
                for (let i = 0; i < Math.min(20, urlElements.length); i++) {
                    const urlElement = urlElements[i];
                    if (urlElement.textContent) {
                        const url = urlElement.textContent.trim();
                        
                        // Validate and format the URL
                        try {
                            const validatedUrl = validateAndFormatUrl(url);
                            if (validatedUrl) {
                                urls.push({
                                    url: validatedUrl,
                                    source: 'sitemap',
                                    topic: topic.id,
                                    timestamp: Date.now()
                                });
                            }
                        } catch (error) {
                            logger.warn(`Invalid URL in sitemap: ${url}`);
                        }
                    }
                }
            }
            
            // If we found URLs, we can stop checking other sitemaps
            if (urls.length > 0) {
                logger.log(`Successfully extracted ${urls.length} URLs from sitemap: ${sitemapUrl}`);
                break;
            }
        } catch (error) {
            logger.warn(`Error fetching sitemap ${sitemapUrl}: ${error.message}`);
        }
    }
    
    return urls;
}

// 3. DuckDuckGo Search Strategy
async function fetchUrlsFromDuckDuckGo(topic) {
    logger.log(`Attempting to fetch URLs from DuckDuckGo for topic: ${topic.name}`);
    
    // Construct the search query
    let query = topic.name;
    
    // Add domain restrictions if available
    if (topic.domains && topic.domains.length > 0) {
        const domainQueries = topic.domains.map(domain => {
            // Extract the base domain without protocol
            const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
            return `site:${cleanDomain}`;
        });
        
        query = `${query} (${domainQueries.join(' OR ')})`;
    }
    
    // Add keywords if available
    if (topic.keywords && topic.keywords.length > 0) {
        query = `${query} ${topic.keywords.join(' ')}`;
    }
    
    logger.log(`DuckDuckGo search query: ${query}`);
    
    try {
        // Use the DuckDuckGo HTML search (no official API available)
        const encodedQuery = encodeURIComponent(query);
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;
        
        const response = await fetchWithRetry(searchUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html'
            }
        });
        
        if (!response.ok) {
            logger.error(`DuckDuckGo search failed with status ${response.status}`);
            return [];
        }
        
        const html = await response.text();
        
        // Parse the HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Extract search result URLs
        const results = doc.querySelectorAll('.result .result__a');
        logger.log(`Found ${results.length} results from DuckDuckGo search`);
        
        const urls = [];
        
        for (const result of results) {
            const href = result.getAttribute('href');
            
            if (!href) continue;
            
            // DuckDuckGo uses redirects, extract the actual URL
            let url = href;
            
            if (href.startsWith('/l/?')) {
                // Extract the URL from the redirect
                const urlMatch = href.match(/uddg=([^&]+)/);
                if (urlMatch && urlMatch[1]) {
                    url = decodeURIComponent(urlMatch[1]);
                }
            }
            
            // Validate and format the URL
            try {
                const validatedUrl = validateAndFormatUrl(url);
                if (validatedUrl) {
                    urls.push({
                        url: validatedUrl,
                        source: 'duckduckgo',
                        topic: topic.id,
                        timestamp: Date.now()
                    });
                }
            } catch (error) {
                logger.warn(`Invalid URL from DuckDuckGo: ${url}`);
            }
        }
        
        logger.log(`Successfully extracted ${urls.length} URLs from DuckDuckGo search`);
        return urls;
    } catch (error) {
        logger.error(`Error fetching URLs from DuckDuckGo: ${error.message}`);
        return [];
    }
}

// Get cached URLs from storage
async function getCachedUrlsForTopic(topic) {
    logger.log(`Getting cached URLs for topic: ${topic.name}`);
    
    try {
        const key = `cached_urls_${topic.id}`;
        const result = await chrome.storage.local.get([key]);
        
        if (result[key] && Array.isArray(result[key])) {
            logger.log(`Found ${result[key].length} cached URLs for topic: ${topic.name}`);
            return result[key];
        }
    } catch (error) {
        logger.error(`Error getting cached URLs for topic ${topic.name}: ${error.message}`);
    }
    
    return [];
}

// Store URLs in cache
async function cacheUrlsForTopic(topic, urls) {
    if (!urls || urls.length === 0) {
        return;
    }
    
    logger.log(`Caching ${urls.length} URLs for topic: ${topic.name}`);
    
    try {
        const key = `cached_urls_${topic.id}`;
        
        // Get existing cached URLs
        const result = await chrome.storage.local.get([key]);
        const existingUrls = result[key] || [];
        
        // Merge with new URLs, avoiding duplicates
        const existingUrlSet = new Set(existingUrls.map(item => item.url));
        const newUrls = urls.filter(item => !existingUrlSet.has(item.url));
        
        const mergedUrls = [...existingUrls, ...newUrls];
        
        // Limit to 50 URLs per topic to avoid storage issues
        const limitedUrls = mergedUrls.slice(0, 50);
        
        // Store in cache
        await chrome.storage.local.set({ [key]: limitedUrls });
        
        logger.log(`Successfully cached ${limitedUrls.length} URLs for topic: ${topic.name}`);
    } catch (error) {
        logger.error(`Error caching URLs for topic ${topic.name}: ${error.message}`);
    }
}

// Main function to get URLs for a topic using all strategies
async function getUrlsForTopic(topic, batchSize = 5) {
    logger.log(`Getting URLs for topic: ${topic.name} (batchSize: ${batchSize})`);
    
    let urls = [];
    
    // 1. Try RSS feeds first
    if (urls.length < batchSize) {
        try {
            const rssUrls = await fetchUrlsFromRss(topic);
            if (rssUrls.length > 0) {
                logger.log(`Found ${rssUrls.length} URLs from RSS feeds for topic: ${topic.name}`);
                urls = [...urls, ...rssUrls];
                
                // Cache these URLs for future use
                await cacheUrlsForTopic(topic, rssUrls);
            }
        } catch (error) {
            logger.error(`Error fetching URLs from RSS feeds: ${error.message}`);
        }
    }
    
    // 2. Try sitemaps if we still need more URLs
    if (urls.length < batchSize) {
        try {
            const sitemapUrls = await fetchUrlsFromSitemap(topic);
            if (sitemapUrls.length > 0) {
                logger.log(`Found ${sitemapUrls.length} URLs from sitemaps for topic: ${topic.name}`);
                urls = [...urls, ...sitemapUrls];
                
                // Cache these URLs for future use
                await cacheUrlsForTopic(topic, sitemapUrls);
            }
        } catch (error) {
            logger.error(`Error fetching URLs from sitemaps: ${error.message}`);
        }
    }
    
    // 3. Try the existing search proxy if we still need more URLs
    // This uses the existing implementation, so we'll skip it here
    
    // 4. Try cached URLs if we still need more URLs
    if (urls.length < batchSize) {
        try {
            const cachedUrls = await getCachedUrlsForTopic(topic);
            if (cachedUrls.length > 0) {
                logger.log(`Found ${cachedUrls.length} cached URLs for topic: ${topic.name}`);
                
                // Filter out URLs we already have
                const existingUrlSet = new Set(urls.map(item => item.url));
                const newCachedUrls = cachedUrls.filter(item => !existingUrlSet.has(item.url));
                
                urls = [...urls, ...newCachedUrls];
            }
        } catch (error) {
            logger.error(`Error getting cached URLs: ${error.message}`);
        }
    }
    
    // 5. Try DuckDuckGo as a last resort
    if (urls.length < batchSize) {
        try {
            const ddgUrls = await fetchUrlsFromDuckDuckGo(topic);
            if (ddgUrls.length > 0) {
                logger.log(`Found ${ddgUrls.length} URLs from DuckDuckGo for topic: ${topic.name}`);
                
                // Filter out URLs we already have
                const existingUrlSet = new Set(urls.map(item => item.url));
                const newDdgUrls = ddgUrls.filter(item => !existingUrlSet.has(item.url));
                
                urls = [...urls, ...newDdgUrls];
                
                // Cache these URLs for future use
                await cacheUrlsForTopic(topic, ddgUrls);
            }
        } catch (error) {
            logger.error(`Error fetching URLs from DuckDuckGo: ${error.message}`);
        }
    }
    
    // Return the requested batch size
    return urls.slice(0, batchSize);
}

// Main function to get URLs for multiple topics
async function getUrlsForTopics(topics, batchSize = 5) {
    logger.log(`Getting URLs for ${topics.length} topics (batchSize: ${batchSize})`);
    
    const result = {};
    
    // Process each topic
    for (const topic of topics) {
        try {
            const urls = await getUrlsForTopic(topic, batchSize);
            result[topic.id] = urls;
        } catch (error) {
            logger.error(`Error getting URLs for topic ${topic.name}: ${error.message}`);
            result[topic.id] = [];
        }
    }
    
    return result;
}

// Export the functions
export {
    getUrlsForTopic,
    getUrlsForTopics,
    fetchUrlsFromRss,
    fetchUrlsFromSitemap,
    fetchUrlsFromDuckDuckGo,
    getCachedUrlsForTopic,
    cacheUrlsForTopic
};
