// Content script to handle page scraping
console.log('RhinoSpider content script loaded');

let isActive = false;

// Initialize state
chrome.storage.local.get(['isActive'], (result) => {
    isActive = result.isActive;
});

// Listen for state changes
chrome.storage.onChanged.addListener((changes) => {
    if (changes.isActive) {
        isActive = changes.isActive.newValue;
    }
});

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
            const extractedFields = {};
            
            for (const field of topic.extractionRules.fields) {
                try {
                    const selector = `.${field.name}, #${field.name}, [name="${field.name}"]`;
                    const elements = document.querySelectorAll(selector);
                    
                    if (elements.length > 0) {
                        let fieldValue = '';
                        
                        switch (field.fieldType.toLowerCase()) {
                            case 'text':
                                fieldValue = Array.from(elements)
                                    .map(el => el.textContent.trim())
                                    .filter(text => text.length > 0)
                                    .join(' ');
                                break;
                            
                            case 'html':
                                fieldValue = Array.from(elements)
                                    .map(el => el.innerHTML.trim())
                                    .filter(html => html.length > 0)
                                    .join(' ');
                                break;
                            
                            case 'attribute':
                                if (field.attributeName) {
                                    fieldValue = Array.from(elements)
                                        .map(el => el.getAttribute(field.attributeName))
                                        .filter(attr => attr && attr.length > 0)
                                        .join(' ');
                                }
                                break;
                        }
                        
                        if (fieldValue) {
                            extractedFields[field.name] = fieldValue;
                        }
                    }
                } catch (fieldError) {
                    console.error(`Error extracting field ${field.name}:`, fieldError);
                }
            }
            
            content.metadata = extractedFields;
        }
        
        // Get main content
        content.content = document.body.textContent;
        return content;
    } catch (error) {
        console.error('Error extracting content:', error);
        return content;
    }
}

// Listen for messages from dashboard
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message);
    
    switch (message.type) {
        case 'EXTRACT_CONTENT':
            if (!isActive) {
                sendResponse({ success: false, error: 'Extension is not active' });
                return;
            }
            
            const content = extractContent(message.topic);
            sendResponse({ success: true, content });
            break;
            
        case 'GET_PAGE_INFO':
            sendResponse({
                success: true,
                info: {
                    url: window.location.href,
                    title: document.title
                }
            });
            break;
    }
    
    return true; // Keep channel open for async response
});
