// Test simulator for multiple extensions

import { v4 as uuidv4 } from 'uuid';
import { TEST_TASKS } from './testTasks';
import { systemStatus, DEGRADATION_REASONS } from './systemStatus';

class TestSimulator {
  constructor() {
    this.extensions = new Map();
    this.running = false;
    this.startTime = null;
    this.config = null;
  }

  async start(config = {
    extensionCount: 5,
    requestsPerHour: 10,
    runTime: '1h',
    budgetLimit: 10,
    failureRate: 0.1
  }) {
    if (this.running) return;
    
    this.config = config;
    this.running = true;
    this.startTime = Date.now();

    // Create simulated extensions
    for (let i = 0; i < config.extensionCount; i++) {
      const extensionId = uuidv4();
      this.extensions.set(extensionId, {
        id: extensionId,
        requests: 0,
        lastRequest: null,
        errors: 0
      });
    }

    // Start simulation loop
    this.simulationLoop();
  }

  async stop() {
    this.running = false;
    this.extensions.clear();
    this.startTime = null;
    this.config = null;
  }

  async simulationLoop() {
    while (this.running) {
      // Check runtime
      if (this.hasReachedRuntime()) {
        await this.stop();
        return;
      }

      // Simulate requests from each extension
      for (const [extensionId, stats] of this.extensions) {
        if (this.shouldMakeRequest(stats)) {
          await this.simulateRequest(extensionId);
        }
      }

      // Add random delays between 1-5 seconds
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 4000));
    }
  }

  hasReachedRuntime() {
    const runtime = this.parseTime(this.config.runTime);
    return Date.now() - this.startTime >= runtime;
  }

  parseTime(timeStr) {
    const unit = timeStr.slice(-1);
    const value = parseInt(timeStr.slice(0, -1));
    
    switch (unit) {
      case 'h': return value * 60 * 60 * 1000;
      case 'm': return value * 60 * 1000;
      case 's': return value * 1000;
      default: return value;
    }
  }

  shouldMakeRequest(stats) {
    if (!stats.lastRequest) return true;
    
    const timeSinceLastRequest = Date.now() - stats.lastRequest;
    const minInterval = (60 * 60 * 1000) / this.config.requestsPerHour;
    
    return timeSinceLastRequest >= minInterval;
  }

  async simulateRequest(extensionId) {
    const stats = this.extensions.get(extensionId);
    if (!stats) return;

    // Update stats
    stats.requests++;
    stats.lastRequest = Date.now();

    // Simulate random failures
    if (Math.random() < this.config.failureRate) {
      stats.errors++;
      this.handleError(extensionId);
      return;
    }

    // Get random task
    const task = TEST_TASKS[Math.floor(Math.random() * TEST_TASKS.length)];

    // Simulate API call
    try {
      const response = await this.simulateAPICall(task);
      this.handleSuccess(extensionId, response);
    } catch (error) {
      stats.errors++;
      this.handleError(extensionId, error);
    }
  }

  async simulateAPICall(task) {
    // Simulate API latency (100-500ms)
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));

    // Simulate rate limiting
    if (this.shouldSimulateRateLimit()) {
      throw new Error('RATE_LIMIT');
    }

    // Simulate budget exhaustion
    if (this.shouldSimulateBudgetLimit()) {
      throw new Error('BUDGET_LIMIT');
    }

    // Return mock response
    return {
      task,
      timestamp: new Date().toISOString(),
      data: this.generateMockData(task)
    };
  }

  shouldSimulateRateLimit() {
    // 5% chance of rate limit
    return Math.random() < 0.05;
  }

  shouldSimulateBudgetLimit() {
    // Calculate simulated budget usage
    const totalRequests = Array.from(this.extensions.values())
      .reduce((sum, stats) => sum + stats.requests, 0);
    
    const estimatedCost = totalRequests * 0.00144; // Cost per request
    return estimatedCost >= this.config.budgetLimit;
  }

  generateMockData(task) {
    // Generate realistic-looking mock data based on task type
    switch (task.type) {
      case 'e-commerce':
        return {
          products: Array(5).fill(null).map(() => ({
            id: uuidv4(),
            name: `Product ${Math.floor(Math.random() * 1000)}`,
            price: Math.round(Math.random() * 1000 * 100) / 100,
            rating: Math.round(Math.random() * 5 * 10) / 10
          }))
        };

      case 'news':
        return {
          articles: Array(3).fill(null).map(() => ({
            id: uuidv4(),
            title: `News Article ${Math.floor(Math.random() * 1000)}`,
            date: new Date(Date.now() - Math.random() * 86400000).toISOString()
          }))
        };

      default:
        return {
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          value: Math.random()
        };
    }
  }

  handleSuccess(extensionId, response) {
    // Emit success event
    chrome.runtime.sendMessage({
      type: 'TEST_SUCCESS',
      data: {
        extensionId,
        response,
        timestamp: new Date().toISOString()
      }
    });
  }

  handleError(extensionId, error) {
    // Handle different error types
    if (error?.message === 'RATE_LIMIT') {
      systemStatus.setState('degraded', DEGRADATION_REASONS.RATE_LIMITED, '1m');
    } else if (error?.message === 'BUDGET_LIMIT') {
      systemStatus.setState('degraded', DEGRADATION_REASONS.BUDGET_LOW, '1h');
    }

    // Emit error event
    chrome.runtime.sendMessage({
      type: 'TEST_ERROR',
      data: {
        extensionId,
        error: error?.message || 'Unknown error',
        timestamp: new Date().toISOString()
      }
    });
  }

  getStats() {
    const stats = {
      extensions: this.extensions.size,
      totalRequests: 0,
      totalErrors: 0,
      requestsPerHour: {},
      errorRates: {}
    };

    for (const [id, extStats] of this.extensions) {
      stats.totalRequests += extStats.requests;
      stats.totalErrors += extStats.errors;
      stats.requestsPerHour[id] = this.calculateRequestsPerHour(extStats);
      stats.errorRates[id] = extStats.errors / extStats.requests || 0;
    }

    return stats;
  }

  calculateRequestsPerHour(stats) {
    const runningTime = (Date.now() - this.startTime) / (60 * 60 * 1000);
    return stats.requests / runningTime;
  }
}

export const testSimulator = new TestSimulator();
