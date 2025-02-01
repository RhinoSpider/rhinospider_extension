// Test mode configuration and management

const TEST_API_KEY = 'test-key-rhino-spider-2024';

export const TEST_MODE_CONFIG = {
  ENABLED: false,
  API_KEY: TEST_API_KEY,
  MAX_REQUESTS: 100,
  SIMULATED_LATENCY: 200, // ms
  ERROR_RATE: 0.1, // 10% error rate
  MOCK_RESPONSES: true
};

class TestMode {
  constructor() {
    this.enabled = false;
    this.requestCount = 0;
    this.errors = [];
    this.startTime = null;
  }

  async enable() {
    this.enabled = true;
    this.startTime = Date.now();
    this.requestCount = 0;
    this.errors = [];
    
    await chrome.storage.local.set({
      testMode: {
        enabled: true,
        startTime: this.startTime
      }
    });

    console.log('🧪 Test Mode Enabled');
  }

  async disable() {
    this.enabled = false;
    await chrome.storage.local.set({
      testMode: {
        enabled: false,
        endTime: Date.now()
      }
    });

    console.log('🧪 Test Mode Disabled');
  }

  isEnabled() {
    return this.enabled;
  }

  getTestApiKey() {
    return TEST_API_KEY;
  }

  async validateTestApiKey(key) {
    await this.simulateLatency();
    return key === TEST_API_KEY;
  }

  async simulateLatency() {
    await new Promise(resolve => 
      setTimeout(resolve, TEST_MODE_CONFIG.SIMULATED_LATENCY)
    );
  }

  shouldSimulateError() {
    return Math.random() < TEST_MODE_CONFIG.ERROR_RATE;
  }

  async handleRequest(config) {
    if (!this.enabled) return null;

    this.requestCount++;
    await this.simulateLatency();

    if (this.requestCount > TEST_MODE_CONFIG.MAX_REQUESTS) {
      throw new Error('Test mode request limit exceeded');
    }

    if (this.shouldSimulateError()) {
      const error = new Error('Simulated test mode error');
      this.errors.push({
        time: Date.now(),
        error: error.message
      });
      throw error;
    }

    return this.generateMockResponse(config);
  }

  generateMockResponse(config) {
    // Generate appropriate mock response based on request config
    return {
      id: `test-${Date.now()}`,
      model: 'gpt-3.5-turbo',
      created: Math.floor(Date.now() / 1000),
      choices: [{
        message: {
          role: 'assistant',
          content: JSON.stringify({
            primaryApi: {
              url: 'https://api.example.com/data',
              method: 'GET',
              headers: {
                'Accept': 'application/json'
              }
            },
            dataExtraction: {
              fields: ['title', 'price', 'description'],
              paths: {
                title: 'data.title',
                price: 'data.price',
                description: 'data.description'
              }
            },
            transform: {
              rules: []
            },
            cacheDuration: 3600
          })
        }
      }],
      usage: {
        prompt_tokens: 50,
        completion_tokens: 100,
        total_tokens: 150
      }
    };
  }

  getStats() {
    if (!this.enabled) return null;

    return {
      enabled: this.enabled,
      startTime: this.startTime,
      runTime: Date.now() - this.startTime,
      requestCount: this.requestCount,
      errorCount: this.errors.length,
      errorRate: this.errors.length / this.requestCount,
      remainingRequests: TEST_MODE_CONFIG.MAX_REQUESTS - this.requestCount
    };
  }

  async logTestResults() {
    const stats = this.getStats();
    if (!stats) return;

    await chrome.storage.local.set({
      testResults: {
        ...stats,
        timestamp: Date.now()
      }
    });

    console.log('🧪 Test Results:', stats);
  }
}

export const testMode = new TestMode();
