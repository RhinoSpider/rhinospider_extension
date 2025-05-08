/**
 * RSS and Sitemap Search Service
 * Discovers URLs by finding and parsing RSS feeds and XML sitemaps
 */

const axios = require('axios');
const { JSDOM } = require('jsdom');
const { parseStringPromise } = require('xml2js');
const urlParser = require('url');

// Configure axios with timeout and user agent
const axiosInstance = axios.create({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; RhinoSpider/1.0; +https://rhinospider.com/bot)'
  }
});

/**
 * Discover and parse RSS feeds for a domain
 * @param {string} domain - Domain to search for RSS feeds
 * @returns {Promise<Array>} - Array of URLs found in RSS feeds
 */
async function discoverRssFeeds(domain) {
  try {
    console.log(`Discovering RSS feeds for domain: ${domain}`);
    
    // Clean up the domain to ensure it's a valid URL
    let cleanDomain = domain;
    if (!cleanDomain.startsWith('http')) {
      cleanDomain = `https://${cleanDomain}`;
    }
    
    // Remove trailing slash if present
    if (cleanDomain.endsWith('/')) {
      cleanDomain = cleanDomain.slice(0, -1);
    }
    
    // Common RSS feed paths to check
    const feedPaths = [
      '/feed',
      '/rss',
      '/feed/atom',
      '/atom',
      '/feeds/posts/default',
      '/rss.xml',
      '/feed.xml',
      '/atom.xml',
      '/index.xml',
      '/blog/feed',
      '/blog/rss',
      '/news/feed',
      '/news/rss'
    ];
    
    // First try to find RSS feed links on the homepage
    let feedUrls = [];
    try {
      const homepageResponse = await axiosInstance.get(cleanDomain, {
        timeout: 8000
      });
      
      if (homepageResponse.status === 200) {
        const dom = new JSDOM(homepageResponse.data);
        const document = dom.window.document;
        
        // Look for RSS feed links in the HTML
        const feedLinks = document.querySelectorAll('link[type="application/rss+xml"], link[type="application/atom+xml"]');
        
        feedLinks.forEach(link => {
          const href = link.getAttribute('href');
          if (href) {
            // Handle relative URLs
            let fullUrl = href;
            if (href.startsWith('/')) {
              fullUrl = `${cleanDomain}${href}`;
            } else if (!href.startsWith('http')) {
              fullUrl = `${cleanDomain}/${href}`;
            }
            feedUrls.push(fullUrl);
          }
        });
        
        console.log(`Found ${feedUrls.length} RSS feed links on homepage of ${domain}`);
      }
    } catch (error) {
      console.log(`Error fetching homepage for ${domain}: ${error.message}`);
    }
    
    // If no feed links found on homepage, try common paths
    if (feedUrls.length === 0) {
      feedUrls = feedPaths.map(path => `${cleanDomain}${path}`);
    }
    
    // Try each feed URL and parse the first one that works
    const urls = [];
    
    for (const feedUrl of feedUrls) {
      try {
        console.log(`Trying RSS feed URL: ${feedUrl}`);
        
        const response = await axiosInstance.get(feedUrl, {
          timeout: 5000,
          headers: {
            'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml'
          }
        });
        
        if (response.status !== 200) {
          continue;
        }
        
        const contentType = response.headers['content-type'] || '';
        if (!contentType.includes('xml') && !contentType.includes('rss') && !contentType.includes('atom')) {
          // Check content for XML structure
          if (!response.data.includes('<rss') && !response.data.includes('<feed')) {
            continue;
          }
        }
        
        // Parse the XML
        const parsedFeed = await parseStringPromise(response.data, {
          explicitArray: false,
          normalize: true
        });
        
        // Extract URLs from RSS items
        if (parsedFeed.rss && parsedFeed.rss.channel) {
          // RSS format
          const channel = parsedFeed.rss.channel;
          const items = Array.isArray(channel.item) ? channel.item : [channel.item];
          
          items.forEach(item => {
            if (item && item.link) {
              urls.push({
                url: item.link,
                title: item.title || '',
                source: 'rss',
                domain: domain
              });
            }
          });
          
          console.log(`Found ${items.length} items in RSS feed: ${feedUrl}`);
          
          // If we found URLs, we can stop checking other feeds
          if (urls.length > 0) {
            break;
          }
        } else if (parsedFeed.feed) {
          // Atom format
          const feed = parsedFeed.feed;
          const entries = Array.isArray(feed.entry) ? feed.entry : [feed.entry];
          
          entries.forEach(entry => {
            if (entry && entry.link) {
              // Atom uses link with href attribute
              const link = Array.isArray(entry.link) ? entry.link[0] : entry.link;
              const href = link.$ ? link.$.href : link.href;
              
              if (href) {
                urls.push({
                  url: href,
                  title: entry.title || '',
                  source: 'atom',
                  domain: domain
                });
              }
            }
          });
          
          console.log(`Found ${entries.length} entries in Atom feed: ${feedUrl}`);
          
          // If we found URLs, we can stop checking other feeds
          if (urls.length > 0) {
            break;
          }
        }
      } catch (error) {
        console.log(`Error fetching or parsing RSS feed ${feedUrl}: ${error.message}`);
      }
    }
    
    return urls;
  } catch (error) {
    console.error(`Error discovering RSS feeds for ${domain}: ${error.message}`);
    return [];
  }
}

/**
 * Discover and parse sitemaps for a domain
 * @param {string} domain - Domain to search for sitemaps
 * @returns {Promise<Array>} - Array of URLs found in sitemaps
 */
async function discoverSitemaps(domain) {
  try {
    console.log(`Discovering sitemaps for domain: ${domain}`);
    
    // Clean up the domain to ensure it's a valid URL
    let cleanDomain = domain;
    if (!cleanDomain.startsWith('http')) {
      cleanDomain = `https://${cleanDomain}`;
    }
    
    // Remove trailing slash if present
    if (cleanDomain.endsWith('/')) {
      cleanDomain = cleanDomain.slice(0, -1);
    }
    
    // Common sitemap paths
    const sitemapPaths = [
      '/sitemap.xml',
      '/sitemap_index.xml',
      '/sitemap',
      '/sitemaps.xml',
      '/sitemap/sitemap.xml'
    ];
    
    // Try each sitemap URL
    const urls = [];
    
    for (const sitemapPath of sitemapPaths) {
      const sitemapUrl = `${cleanDomain}${sitemapPath}`;
      
      try {
        console.log(`Trying sitemap URL: ${sitemapUrl}`);
        
        const response = await axiosInstance.get(sitemapUrl, {
          timeout: 8000,
          headers: {
            'Accept': 'application/xml, text/xml'
          }
        });
        
        if (response.status !== 200) {
          continue;
        }
        
        // Check if it's a valid sitemap
        if (!response.data.includes('<urlset') && !response.data.includes('<sitemapindex')) {
          continue;
        }
        
        // Parse the XML
        const parsedSitemap = await parseStringPromise(response.data, {
          explicitArray: false,
          normalize: true
        });
        
        // Check if it's a sitemap index
        if (parsedSitemap.sitemapindex) {
          console.log(`Found sitemap index at ${sitemapUrl}`);
          
          // Process the first child sitemap
          const sitemaps = Array.isArray(parsedSitemap.sitemapindex.sitemap) 
            ? parsedSitemap.sitemapindex.sitemap 
            : [parsedSitemap.sitemapindex.sitemap];
          
          if (sitemaps && sitemaps.length > 0) {
            const childSitemapUrl = sitemaps[0].loc;
            
            try {
              const childResponse = await axiosInstance.get(childSitemapUrl, {
                timeout: 8000,
                headers: {
                  'Accept': 'application/xml, text/xml'
                }
              });
              
              if (childResponse.status === 200) {
                const childParsedSitemap = await parseStringPromise(childResponse.data, {
                  explicitArray: false,
                  normalize: true
                });
                
                if (childParsedSitemap.urlset && childParsedSitemap.urlset.url) {
                  const urlEntries = Array.isArray(childParsedSitemap.urlset.url) 
                    ? childParsedSitemap.urlset.url 
                    : [childParsedSitemap.urlset.url];
                  
                  // Extract URLs (limit to 50 to avoid too many)
                  for (let i = 0; i < Math.min(50, urlEntries.length); i++) {
                    const urlEntry = urlEntries[i];
                    if (urlEntry && urlEntry.loc) {
                      urls.push({
                        url: urlEntry.loc,
                        title: '',
                        source: 'sitemap',
                        domain: domain,
                        lastmod: urlEntry.lastmod || null
                      });
                    }
                  }
                  
                  console.log(`Found ${urlEntries.length} URLs in child sitemap: ${childSitemapUrl}`);
                }
              }
            } catch (error) {
              console.log(`Error fetching child sitemap ${childSitemapUrl}: ${error.message}`);
            }
          }
        } else if (parsedSitemap.urlset && parsedSitemap.urlset.url) {
          // It's a regular sitemap
          const urlEntries = Array.isArray(parsedSitemap.urlset.url) 
            ? parsedSitemap.urlset.url 
            : [parsedSitemap.urlset.url];
          
          // Extract URLs (limit to 50 to avoid too many)
          for (let i = 0; i < Math.min(50, urlEntries.length); i++) {
            const urlEntry = urlEntries[i];
            if (urlEntry && urlEntry.loc) {
              urls.push({
                url: urlEntry.loc,
                title: '',
                source: 'sitemap',
                domain: domain,
                lastmod: urlEntry.lastmod || null
              });
            }
          }
          
          console.log(`Found ${urlEntries.length} URLs in sitemap: ${sitemapUrl}`);
        }
        
        // If we found URLs, we can stop checking other sitemaps
        if (urls.length > 0) {
          break;
        }
      } catch (error) {
        console.log(`Error fetching sitemap ${sitemapUrl}: ${error.message}`);
      }
    }
    
    return urls;
  } catch (error) {
    console.error(`Error discovering sitemaps for ${domain}: ${error.message}`);
    return [];
  }
}

/**
 * Search for URLs using RSS feeds and sitemaps
 * @param {string} topic - Topic name
 * @param {Array} domains - Array of domains to search
 * @param {number} page - Page number for pagination
 * @returns {Promise<Array>} - Array of URLs found
 */
async function searchRssAndSitemaps(topic, domains = [], page = 0) {
  try {
    console.log(`Searching RSS feeds and sitemaps for topic: ${topic}`);
    
    // If no domains provided, return empty results
    if (!domains || domains.length === 0) {
      console.log('No domains provided for RSS/sitemap search');
      return [];
    }
    
    const allUrls = [];
    const pageSize = 20;
    
    // Process each domain
    for (const domain of domains) {
      // Skip empty domains
      if (!domain) continue;
      
      // Extract base domain (remove protocol, www, and path)
      const parsedUrl = urlParser.parse(domain.startsWith('http') ? domain : `https://${domain}`);
      const baseDomain = parsedUrl.hostname.replace(/^www\./, '');
      
      console.log(`Processing domain: ${baseDomain}`);
      
      // Try RSS feeds first
      let domainUrls = await discoverRssFeeds(baseDomain);
      
      // If no URLs found in RSS feeds, try sitemaps
      if (domainUrls.length === 0) {
        domainUrls = await discoverSitemaps(baseDomain);
      }
      
      // Add to all URLs
      allUrls.push(...domainUrls);
      
      // If we have enough URLs, we can stop processing domains
      if (allUrls.length >= (page + 1) * pageSize) {
        break;
      }
    }
    
    // Sort by lastmod date if available (newest first)
    allUrls.sort((a, b) => {
      if (a.lastmod && b.lastmod) {
        return new Date(b.lastmod) - new Date(a.lastmod);
      }
      return 0;
    });
    
    // Apply pagination
    const startIndex = page * pageSize;
    const paginatedUrls = allUrls.slice(startIndex, startIndex + pageSize);
    
    console.log(`Found ${allUrls.length} total URLs, returning ${paginatedUrls.length} for page ${page}`);
    
    // Format the URLs to match the expected format
    return paginatedUrls.map(item => ({
      url: item.url,
      title: item.title || '',
      source: item.source,
      domain: item.domain
    }));
  } catch (error) {
    console.error(`Error in RSS and sitemap search: ${error.message}`);
    return [];
  }
}

module.exports = {
  searchRssAndSitemaps,
  discoverRssFeeds,
  discoverSitemaps
};
