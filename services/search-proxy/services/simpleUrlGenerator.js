/**
 * Simple URL Generator for Testing
 * Generates realistic URLs based on topics
 */

const urlTemplates = {
  'ai_agents_1': [
    'https://techcrunch.com/2025/01/ai-agents-revolutionize-workflow',
    'https://www.wired.com/story/autonomous-ai-agents-2025',
    'https://venturebeat.com/ai/openai-launches-new-agent-framework',
    'https://arstechnica.com/ai/2025/01/microsoft-ai-agents-enterprise',
    'https://www.theverge.com/2025/1/google-ai-agents-update',
    'https://www.reuters.com/technology/ai-agents-transform-business',
    'https://www.bloomberg.com/news/ai-agent-startups-funding',
    'https://www.forbes.com/sites/ai/autonomous-agents-breakthrough',
    'https://spectrum.ieee.org/ai-agents-engineering',
    'https://www.nature.com/articles/ai-agents-research-2025'
  ],
  'web3_security_1': [
    'https://cointelegraph.com/news/defi-protocol-hack-2025',
    'https://theblock.co/post/web3-security-vulnerability',
    'https://decrypt.co/web3-exploit-millions-stolen',
    'https://coindesk.com/tech/2025/01/smart-contract-vulnerability',
    'https://www.bleepingcomputer.com/news/security/crypto-exchange-breach',
    'https://rekt.news/latest-defi-hack-analysis',
    'https://blog.chainalysis.com/reports/web3-security-2025',
    'https://medium.com/immunefi/critical-vulnerability-disclosure',
    'https://hacken.io/insights/web3-security-audit-findings',
    'https://slowmist.com/en/security-incident-analysis'
  ],
  'depin_infra_1': [
    'https://messari.io/report/depin-infrastructure-growth',
    'https://www.coindesk.com/tech/depin-networks-expansion',
    'https://cointelegraph.com/news/helium-network-update-2025',
    'https://theblock.co/post/filecoin-storage-milestone',
    'https://decrypt.co/depin-projects-funding-round',
    'https://www.theblock.co/post/render-network-gpu-computing',
    'https://venturebeat.com/ai/decentralized-compute-infrastructure',
    'https://techcrunch.com/2025/01/depin-startup-raises-funding',
    'https://www.forbes.com/crypto-assets/depin-revolution',
    'https://medium.com/@depin/infrastructure-update-2025'
  ]
};

// Add timestamp and randomization to make URLs unique
function generateUniqueUrl(baseUrl) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}t=${timestamp}&r=${random}`;
}

/**
 * Generate URLs for a topic
 * @param {string} topicId - Topic ID
 * @param {number} count - Number of URLs to generate
 * @returns {Array<string>} Array of URLs
 */
function generateUrlsForTopic(topicId, count = 5) {
  const templates = urlTemplates[topicId] || urlTemplates['ai_agents_1']; // Default to AI agents
  const urls = [];
  
  for (let i = 0; i < count; i++) {
    const template = templates[i % templates.length];
    urls.push(generateUniqueUrl(template));
  }
  
  return urls;
}

/**
 * Simple search function that returns URLs immediately
 * @param {string} topic - Topic name
 * @param {Array} keywords - Keywords (ignored for now)
 * @param {number} page - Page number (ignored for now)
 * @param {string} userId - User ID
 * @param {string} topicId - Topic ID
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Search results
 */
async function simpleSearchForUrls(topic, keywords = [], page = 0, userId = 'anonymous', topicId = '', options = {}) {
  console.log(`[SimpleUrlGenerator] Generating URLs for topic: ${topicId || topic}`);
  
  // Generate 5-10 URLs per request
  const urlCount = 5 + Math.floor(Math.random() * 5);
  const urls = generateUrlsForTopic(topicId, urlCount);
  
  console.log(`[SimpleUrlGenerator] Generated ${urls.length} URLs for topic: ${topicId}`);
  
  return {
    urls: urls,
    source: 'simple_generator',
    quotaInfo: {
      userId: userId,
      quotaExceeded: false,
      dailyUrlsScraped: urls.length,
      dailyLimit: 1000,
      resetTime: Date.now() + 86400000
    }
  };
}

module.exports = {
  simpleSearchForUrls,
  generateUrlsForTopic
};