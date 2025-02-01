// API configuration management

class APIConfig {
  constructor() {
    this.initialized = false;
    this.apiKey = null;
  }

  async init() {
    if (this.initialized) return;
    
    try {
      const result = await chrome.storage.sync.get('openai_api_key');
      this.apiKey = result.openai_api_key;
      this.initialized = true;
    } catch (error) {
      console.error('Error loading API key:', error);
    }
  }

  async setAPIKey(key) {
    try {
      await chrome.storage.sync.set({ openai_api_key: key });
      this.apiKey = key;
      return true;
    } catch (error) {
      console.error('Error saving API key:', error);
      return false;
    }
  }

  async getAPIKey() {
    if (!this.initialized) {
      await this.init();
    }
    return this.apiKey;
  }

  async validateAPIKey(key) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{
            role: "user",
            content: "Test message"
          }],
          max_tokens: 5
        })
      });

      if (response.status === 401) {
        return { valid: false, error: 'Invalid API key' };
      } else if (response.status === 429) {
        return { valid: true, error: 'Rate limited' };
      } else if (response.ok) {
        return { valid: true };
      } else {
        const error = await response.json();
        return { valid: false, error: error.error?.message || 'Unknown error' };
      }
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  async clearAPIKey() {
    try {
      await chrome.storage.sync.remove('openai_api_key');
      this.apiKey = null;
      return true;
    } catch (error) {
      console.error('Error clearing API key:', error);
      return false;
    }
  }
}

export const apiConfig = new APIConfig();
