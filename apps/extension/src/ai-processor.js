/**
 * AI Content Processor
 * Processes raw scraped content with OpenRouter AI
 * Returns analyzed data (summary, keywords, category, sentiment)
 */

const IC_PROXY_URL = 'http://143.244.133.154:3001';
const OPENROUTER_MODEL = 'meta-llama/llama-3.1-8b-instruct';

// Centralized API key (you control this, users don't see it)
// This key is safe here because requests go through YOUR IC proxy, not directly to OpenRouter
const MASTER_API_KEY = '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';

// Logger
const logger = {
    log: (msg, data) => console.log(`🤖 [AI Processor] ${msg}`, data || ''),
    error: (msg, error) => console.error(`🤖 [AI Processor] ERROR: ${msg}`, error || ''),
};

/**
 * Process content with AI
 * @param {string} content - Raw HTML/text content
 * @param {string} apiKey - OpenRouter API key
 * @returns {Promise<Object>} Analyzed data
 */
export async function processWithAI(content, apiKey) {
    try {
        logger.log('Processing content with AI...', {
            contentLength: content.length,
            model: OPENROUTER_MODEL
        });

        const response = await fetch(`${IC_PROXY_URL}/api/process-with-ai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: content,
                aiConfig: {
                    enabled: true,
                    apiKey: apiKey,
                    model: OPENROUTER_MODEL,
                    provider: 'openrouter',
                    maxTokensPerRequest: 150,
                    features: {
                        summarization: true,
                        keywordExtraction: true,
                        categorization: true,
                        sentimentAnalysis: true
                    }
                }
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
 * Uses centralized master API key (no user input needed)
 * @returns {Promise<Object>} { enabled: boolean, apiKey: string }
 */
export async function getAIConfig() {
    try {
        // Get user preference from storage
        const result = await chrome.storage.local.get(['aiProcessingEnabled']);

        return {
            enabled: result.aiProcessingEnabled === true, // Default to FALSE (opt-in)
            apiKey: MASTER_API_KEY // Always use master key
        };
    } catch (error) {
        logger.error('Failed to get AI config', error);
        return {
            enabled: false,
            apiKey: MASTER_API_KEY
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
