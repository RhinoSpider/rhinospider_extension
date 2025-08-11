// Offscreen document for fetching content without CORS restrictions
// This runs in a special context that can fetch cross-origin resources

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetch-content') {
        fetchContent(request.url).then(sendResponse);
        return true; // Will respond asynchronously
    }
});

async function fetchContent(url) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            },
            credentials: 'omit',
            cache: 'no-store'
        });
        
        if (response.ok) {
            const html = await response.text();
            
            // Extract text content from HTML
            const text = html
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            
            return {
                success: true,
                content: text,
                status: response.status
            };
        } else {
            return {
                success: false,
                error: `HTTP ${response.status}`,
                status: response.status
            };
        }
    } catch (error) {
        return {
            success: false,
            error: error.message,
            status: 0
        };
    }
}