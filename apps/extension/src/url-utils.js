// URL utility functions for RhinoSpider extension

/**
 * Add a cache buster to a URL to make it unique
 * @param {string} url - The URL to add a cache buster to
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
    
    try {
        const urlObj = new URL(url);
        
        // Add a more structured cache buster parameter
        // This makes it easier to identify and track unique URLs
        // Format: _cb=<cacheBusterValue>-<randomValue>
        const randomValue = Math.floor(Math.random() * 1000000);
        urlObj.searchParams.append('_cb', `${cacheBusterValue}-${randomValue}`);
        
        return urlObj.toString();
    } catch (error) {
        // If URL parsing fails, add the cache buster directly to the URL
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}_cb=${cacheBusterValue}-${Math.floor(Math.random() * 1000000)}`;
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

// Export the utility functions
export {
    addCacheBusterToUrl,
    validateUrlStructure
};
