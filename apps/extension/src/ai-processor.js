/**
 * AI Content Processor
 * Processes raw scraped content with OpenRouter AI
 * Returns analyzed data (summary, keywords, category, sentiment)
 */

const IC_PROXY_URL = 'https://ic-proxy.rhinospider.com';
const OPENROUTER_MODEL = 'meta-llama/llama-3.1-8b-instruct';

// NO API KEY IN EXTENSION!
// The IC proxy server handles authentication and has the API key
// Extension just sends content, server processes with AI

// Logger
const logger = {
    log: (msg, data) => console.log(`🤖 [AI Processor] ${msg}`, data || ''),
    error: (msg, error) => console.error(`🤖 [AI Processor] ERROR: ${msg}`, error || ''),
};

/**
 * Process content with AI via IC Proxy
 * NO API KEY NEEDED - IC proxy handles authentication server-side
 * @param {string} content - Raw HTML/text content
 * @returns {Promise<Object>} Analyzed data
 */
export async function processWithAI(content) {
    try {
        logger.log('Processing content with AI...', {
            contentLength: content.length,
            model: OPENROUTER_MODEL
        });

        // Send to IC proxy's new endpoint that uses server-side API key
        const response = await fetch(`${IC_PROXY_URL}/api/process-content-with-ai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: content,
                model: OPENROUTER_MODEL
            })
        });

        if (!response.ok) {
            throw new Error(`AI processing failed: ${response.status}`);
        }

        const result = await response.json();

        if (result.ok) {
            logger.log('AI processing successful', {
                summaryLength: result.ok.summary.length,
                keywordCount: result.ok.keywords.length,
                category: result.ok.category,
                sentiment: result.ok.sentiment
            });

            return {
                success: true,
                summary: result.ok.summary,
                keywords: Array.isArray(result.ok.keywords) ? result.ok.keywords : [result.ok.keywords],
                category: result.ok.category,
                sentiment: result.ok.sentiment,
                originalSize: content.length,
                analyzedSize: JSON.stringify(result.ok).length
            };
        } else {
            throw new Error('AI processing returned error');
        }

    } catch (error) {
        logger.error('Failed to process with AI', error);

        // Return fallback data if AI fails
        return {
            success: false,
            summary: 'AI processing failed - storing raw content',
            keywords: [],
            category: 'Unknown',
            sentiment: 'neutral',
            originalSize: content.length,
            analyzedSize: 0,
            error: error.message
        };
    }
}

/**
 * Check if AI processing is enabled
 * @returns {Promise<Object>} { enabled: boolean }
 */
export async function getAIConfig() {
    try {
        // Get user preference from storage
        const result = await chrome.storage.local.get(['aiProcessingEnabled']);

        return {
            enabled: result.aiProcessingEnabled !== false // Default to TRUE (opt-out)
        };
    } catch (error) {
        logger.error('Failed to get AI config', error);
        return {
            enabled: false
        };
    }
}

/**
 * Set AI processing configuration
 * @param {boolean} enabled - Enable AI processing
 */
export async function setAIConfig(enabled) {
    try {
        await chrome.storage.local.set({ aiProcessingEnabled: enabled });
        logger.log('AI processing ' + (enabled ? 'ENABLED' : 'DISABLED'));
    } catch (error) {
        logger.error('Failed to set AI config', error);
    }
}
