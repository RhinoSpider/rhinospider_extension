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
  console.log('Extracting content with topic rules:', topic);
  const content = {
    url: window.location.href,
    title: document.title,
    timestamp: new Date().toISOString(),
    content: '',
    metadata: {}
  };

  try {
    // Extract content using topic's extraction rules
    if (topic.extractionRules && topic.extractionRules.fields) {
      console.log('Found extraction rules with fields:', topic.extractionRules.fields);
      // Extract each field based on its type
      const extractedFields = {};
      
      for (const field of topic.extractionRules.fields) {
        try {
          // Use field name as CSS selector
          const selector = `.${field.name}, #${field.name}, [name="${field.name}"]`;
          console.log(`Trying selector for ${field.name}:`, selector);
          const elements = document.querySelectorAll(selector);
          console.log(`Found ${elements.length} elements for ${field.name}`);
          
          if (elements.length > 0) {
            let fieldValue = '';
            
            switch (field.fieldType.toLowerCase()) {
              case 'text':
                fieldValue = Array.from(elements)
                  .map(el => el.textContent.trim())
                  .filter(text => text.length > 0)
                  .join(' ');
                break;
                
              case 'number':
                const number = parseFloat(elements[0].textContent.trim());
                if (!isNaN(number)) {
                  fieldValue = number;
                }
                break;
                
              case 'date':
                const date = new Date(elements[0].textContent.trim());
                if (!isNaN(date.getTime())) {
                  fieldValue = date.toISOString();
                }
                break;
                
              default:
                fieldValue = elements[0].textContent.trim();
            }
            
            if (fieldValue) {
              console.log(`Extracted value for ${field.name}:`, fieldValue);
              extractedFields[field.name] = fieldValue;
            } else {
              console.warn(`No value extracted for ${field.name}`);
            }
          }
          
          // Log warning if required field is missing
          if (field.required && !extractedFields[field.name]) {
            console.warn(`Required field ${field.name} not found`);
          }
        } catch (fieldError) {
          console.error(`Error extracting field ${field.name}:`, fieldError);
        }
      }
      
      // Combine extracted fields into content
      content.content = Object.entries(extractedFields)
        .map(([name, value]) => `${name}: ${value}`)
        .join('\n');
      
      console.log('Combined content:', content.content);
    } else {
      console.warn('No extraction rules found in topic');
    }

    // Fallback to main content if no fields extracted
    if (!content.content) {
      console.log('No fields extracted, using fallback content extraction');
      const mainContent = document.querySelector('main, article, .content, #content') || document.body;
      content.content = mainContent.textContent.trim();
      console.log('Fallback content length:', content.content.length);
    }

    // Add metadata
    content.metadata = {
      wordCount: content.content.split(/\s+/).length,
      characterCount: content.content.length,
      language: document.documentElement.lang || 'en',
      extractedFields: Object.keys(extractedFields || {}).length,
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString()
    };
    console.log('Content metadata:', content.metadata);

    return content;
  } catch (error) {
    console.error('Error extracting content:', error);
    return content;
  }
}

// Check if URL matches any topic
async function checkUrl() {
  try {
    console.log('Checking URL:', window.location.href);
    const response = await chrome.runtime.sendMessage({
      type: 'CHECK_URL',
      url: window.location.href
    });
    console.log('URL check response:', response);

    if (response && response.success && response.topic) {
      console.log('Found matching topic:', response.topic);
      return response.topic;
    } else if (response && !response.success) {
      console.error('URL check failed:', response.error);
    }
  } catch (error) {
    console.error('Error checking URL:', error);
  }
  return null;
}

// Start scraping process
async function startScraping() {
  try {
    console.log('Starting scraping process');
    // Wait for page to load
    await waitForContent();
    console.log('Page content loaded');

    // Check if URL matches any topic
    const topic = await checkUrl();
    if (!topic) {
      console.log('No matching topic for URL:', window.location.href);
      return;
    }

    // Extract content
    console.log('Starting content extraction for topic:', topic.name);
    const content = extractContent(topic);
    console.log('Extracted content:', content);

    // Send to background script
    console.log('Sending content to background script');
    const response = await chrome.runtime.sendMessage({
      type: 'PROCESS_CONTENT',
      content,
      topic
    });
    console.log('Background script response:', response);

    if (response && response.success) {
      console.log('Content processed successfully');
    } else if (response && !response.success) {
      console.error('Content processing failed:', response.error);
    }
  } catch (error) {
    console.error('Error in scraping process:', error);
  }
}

// Initialize
(async () => {
  try {
    console.log('Initializing content script');
    await startScraping();
  } catch (error) {
    console.error('Failed to initialize content script:', error);
  }
})();
