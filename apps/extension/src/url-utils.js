// URL utility functions for RhinoSpider extension

/**
 * Add a cache buster to a URL to make it unique
 * @param {string|Object} url - The URL to add a cache buster to
 * @param {string|number} cacheBuster - The cache buster value or timestamp
 * @returns {string} - The URL with a cache buster added
 */
function addCacheBusterToUrl(url, cacheBuster) {
    // Handle different types of cache busters
    // If cacheBuster is a string (like our new version suffix), use it directly
    // Otherwise, use it as a timestamp
    const cacheBusterValue = typeof cacheBuster === 'string' ? 
        cacheBuster : 
        (cacheBuster || Date.now()).toString();
    
    // Handle URL objects from the search proxy
    if (url && typeof url === 'object' && url.url) {
        // If we have a URL object with a url property, use that
        url = url.url;
    }
    
    // Ensure we have a string URL
    if (!url || typeof url !== 'string') {
        logger.error('Invalid URL provided to addCacheBusterToUrl:', url);
        return null;
    }
    
    try {
        const urlObj = new URL(url);
        
        // Add a cache buster parameter
        const randomValue = Math.floor(Math.random() * 1000000);
        urlObj.searchParams.append('_cb', `${cacheBusterValue}-${randomValue}`);
        
        return urlObj.toString();
    } catch (error) {
        logger.error('Failed to parse URL in addCacheBusterToUrl:', error);
        return null;
    }
}

/**
 * Validate URL structure without making network requests
 * @param {string} url - The URL to validate
 * @returns {boolean} - Whether the URL is valid
 */
function validateUrlStructure(url) {
    // Basic URL validation
    if (!url || typeof url !== 'string') {
        return false;
    }
    
    try {
        // Try to parse the URL
        const urlObj = new URL(url);
        
        // Check for valid protocol (http or https)
        if (!urlObj.protocol || !['http:', 'https:'].includes(urlObj.protocol)) {
            return false;
        }
        
        // Check for valid hostname
        if (!urlObj.hostname || urlObj.hostname.length < 3) {
            return false;
        }
        
        // Check for common invalid URL patterns
        const invalidPatterns = [
            /localhost/i,
            /127\.0\.0\.1/,
            /0\.0\.0\.0/,
            /example\.com/i,
            /test\.com/i,
            /\.test$/i,
            /\.local$/i,
            /\.invalid$/i,
            /\.example$/i
        ];
        
        if (invalidPatterns.some(pattern => pattern.test(urlObj.hostname))) {
            return false;
        }
        
        return true;
    } catch (error) {
        // URL parsing failed
        return false;
    }
}

// Export for modules that use import syntax
export {
    addCacheBusterToUrl,
    validateUrlStructure
};
