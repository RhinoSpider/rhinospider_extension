// Generate a valid URL from a pattern based on the topic's URL generation strategy
function generateUrlFromPattern(pattern) {
    logger.log('Generating URL from pattern:', pattern);
    
    if (!currentTopic) {
        logger.log('No current topic set for URL generation');
        return generateBasicUrl(pattern);
    }
    
    // Check the topic's URL generation strategy
    const strategy = currentTopic.urlGenerationStrategy || 'pattern_based';
    logger.log('URL generation strategy:', strategy);
    
    // Different strategies for URL generation
    switch (strategy) {
        case 'homepage_links':
            // For homepage_links strategy, use the base domain and add article paths
            if (currentTopic.articleUrlPatterns && currentTopic.articleUrlPatterns.length > 0) {
                // Extract base domain from the pattern
                const domainMatch = pattern.match(/^(?:https?:\/\/)?([^\/]+)/);
                if (domainMatch && domainMatch[1]) {
                    const baseDomain = 'https://' + domainMatch[1];
                    
                    // Select a random article pattern
                    const articlePattern = currentTopic.articleUrlPatterns[
                        Math.floor(Math.random() * currentTopic.articleUrlPatterns.length)
                    ];
                    
                    // Create a full URL by combining domain and article pattern
                    // Replace any placeholders like {num} with random values
                    let articlePath = articlePattern.replace(/\{num\}/g, () => Math.floor(Math.random() * 20) + 1);
                    
                    // Ensure the article path starts with a slash
                    if (!articlePath.startsWith('/')) {
                        articlePath = '/' + articlePath;
                    }
                    
                    const generatedUrl = baseDomain + articlePath;
                    logger.log('Generated URL using homepage_links strategy:', generatedUrl);
                    return generatedUrl;
                }
            }
            break;
            
        case 'pagination':
            // For pagination strategy, use pagination patterns if available
            if (currentTopic.paginationPatterns && currentTopic.paginationPatterns.length > 0) {
                // Extract base domain from the pattern
                const domainMatch = pattern.match(/^(?:https?:\/\/)?([^\/]+)/);
                if (domainMatch && domainMatch[1]) {
                    const baseDomain = 'https://' + domainMatch[1];
                    
                    // Select a random pagination pattern
                    const paginationPattern = currentTopic.paginationPatterns[
                        Math.floor(Math.random() * currentTopic.paginationPatterns.length)
                    ];
                    
                    // Replace {num} with a random page number (1-10)
                    const pageNum = Math.floor(Math.random() * 10) + 1;
                    let pagePath = paginationPattern.replace(/\{num\}/g, pageNum);
                    
                    // Ensure the path is properly formatted
                    if (pagePath.startsWith('*')) {
                        pagePath = pagePath.substring(1);
                    }
                    
                    if (!pagePath.startsWith('/') && !pagePath.startsWith('?')) {
                        pagePath = '/' + pagePath;
                    }
                    
                    const generatedUrl = baseDomain + pagePath;
                    logger.log('Generated URL using pagination strategy:', generatedUrl);
                    return generatedUrl;
                }
            }
            break;
    }
    
    // Fallback to using sample URLs if available
    if (currentTopic.sampleArticleUrls && currentTopic.sampleArticleUrls.length > 0) {
        // Use a sample URL from the topic if available
        const randomIndex = Math.floor(Math.random() * currentTopic.sampleArticleUrls.length);
        const sampleUrl = currentTopic.sampleArticleUrls[randomIndex];
        logger.log('Using sample URL from topic:', sampleUrl);
        return sampleUrl;
    }
    
    // If no strategy worked, handle patterns with wildcards using the basic approach
    return generateBasicUrl(pattern);
}

// Helper function to generate a basic URL from a pattern
function generateBasicUrl(pattern) {
    // Special case handling for common patterns
    if (pattern.includes('amazon.com')) {
        return 'https://www.amazon.com/Apple-MacBook-13-inch-256GB-Storage/dp/B08N5M7S6K';
    } else if (pattern.includes('walmart.com')) {
        return 'https://www.walmart.com/ip/PlayStation-5-Console-Marvel-s-Spider-Man-2-Bundle/1497307727';
    } else if (pattern.includes('bestbuy.com')) {
        return 'https://www.bestbuy.com/site/apple-airpods-pro-2nd-generation-with-magsafe-case-usb-c-white/4900964.p';
    } else if (pattern.includes('techcrunch.com')) {
        return 'https://techcrunch.com/2023/12/15/openai-announces-gpt-store-for-january-launch/';
    } else if (pattern.includes('producthunt.com')) {
        return 'https://www.producthunt.com/posts/chatgpt-4o';
    }
    
    // For other patterns, try to create a valid URL
    let url = pattern;
    
    // Replace * with empty string but ensure we have a valid path
    url = url.replace(/\*/g, '');
    
    // Replace double slashes (except after protocol) with single slash
    url = url.replace(/(https?:\/\/)|(\/\/+)/g, function(match, protocol) {
        return protocol || '/';
    });
    
    // Ensure URL is properly formatted
    if (!url.startsWith('http')) {
        url = 'https://' + url;
    }
    
    // Ensure URL doesn't end with just a domain (add path if needed)
    if (url.match(/https?:\/\/[^\/]+$/)) {
        url += '/';
    }
    
    logger.log('Generated URL using basic pattern replacement:', url);
    return url;
}
