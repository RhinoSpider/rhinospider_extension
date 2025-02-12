// Content script to handle page scraping
console.log('RhinoSpider content script loaded');

// Wait for content to be ready
async function waitForContent() {
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve();
    } else {
      window.addEventListener('load', resolve);
    }
  });
}

// Extract content based on topic rules
function extractContent(topic) {
  const content = {
    url: window.location.href,
    title: document.title,
    timestamp: new Date().toISOString(),
    content: '',
    metadata: {}
  };

  try {
    // Apply topic-specific selectors
    if (topic.selectors) {
      for (const [key, selector] of Object.entries(topic.selectors)) {
        const elements = document.querySelectorAll(selector);
        content.metadata[key] = Array.from(elements).map(el => el.textContent.trim());
      }
    }

    // Extract main content
    const mainContent = document.querySelector('main, article, .content, #content') || document.body;
    content.content = mainContent.textContent.trim();

    // Add metadata
    content.metadata.wordCount = content.content.split(/\s+/).length;
    content.metadata.characterCount = content.content.length;
    content.metadata.language = document.documentElement.lang || 'en';

    return content;
  } catch (error) {
    console.error('Error extracting content:', error);
    return content;
  }
}

// Check if URL matches any topic
async function checkUrl() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CHECK_URL',
      url: window.location.href
    });

    if (response && response.topic) {
      console.log('Found matching topic:', response.topic);
      return response.topic;
    }
  } catch (error) {
    console.error('Error checking URL:', error);
  }
  return null;
}

// Start scraping process
async function startScraping() {
  try {
    // Wait for page to load
    await waitForContent();

    // Check if URL matches any topic
    const topic = await checkUrl();
    if (!topic) {
      console.log('No matching topic for URL:', window.location.href);
      return;
    }

    // Extract content
    console.log('Starting content extraction for topic:', topic.name);
    const content = extractContent(topic);

    // Send to background script
    await chrome.runtime.sendMessage({
      type: 'PROCESS_CONTENT',
      content,
      topic
    });

    console.log('Content processed successfully');
  } catch (error) {
    console.error('Error in scraping process:', error);
  }
}

// Initialize
(async () => {
  try {
    await startScraping();
  } catch (error) {
    console.error('Failed to initialize content script:', error);
  }
})();
