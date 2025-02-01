// System status and degradation handler

export const SYSTEM_STATES = {
  NORMAL: 'normal',
  DEGRADED: 'degraded',
  MAINTENANCE: 'maintenance',
  ERROR: 'error'
};

export const DEGRADATION_REASONS = {
  BUDGET_LOW: 'budget_low',
  RATE_LIMITED: 'rate_limited',
  HIGH_LOAD: 'high_load',
  API_ISSUES: 'api_issues'
};

class SystemStatus {
  constructor() {
    this.state = SYSTEM_STATES.NORMAL;
    this.reason = null;
    this.retryAfter = null;
    this.listeners = new Set();
  }

  setState(state, reason, retryAfter = null) {
    this.state = state;
    this.reason = reason;
    this.retryAfter = retryAfter;
    
    // Notify all listeners
    this.notifyListeners();
    
    // Save state
    this.saveState();
  }

  async saveState() {
    await chrome.storage.local.set({
      systemState: {
        state: this.state,
        reason: this.reason,
        retryAfter: this.retryAfter,
        timestamp: Date.now()
      }
    });
  }

  async loadState() {
    const { systemState } = await chrome.storage.local.get('systemState');
    if (systemState) {
      // Only restore if state is less than 1 hour old
      if (Date.now() - systemState.timestamp < 60 * 60 * 1000) {
        this.state = systemState.state;
        this.reason = systemState.reason;
        this.retryAfter = systemState.retryAfter;
      }
    }
  }

  addListener(callback) {
    this.listeners.add(callback);
  }

  removeListener(callback) {
    this.listeners.delete(callback);
  }

  notifyListeners() {
    const status = {
      state: this.state,
      reason: this.reason,
      retryAfter: this.retryAfter
    };

    this.listeners.forEach(callback => callback(status));
  }

  getUserMessage() {
    switch (this.reason) {
      case DEGRADATION_REASONS.BUDGET_LOW:
        return {
          title: 'System Operating in Limited Mode',
          message: 'Due to high usage, we\'re temporarily limiting new requests. Please try again later.',
          retryIn: this.retryAfter || '1 hour'
        };
      
      case DEGRADATION_REASONS.RATE_LIMITED:
        return {
          title: 'Rate Limit Reached',
          message: 'We\'ve hit our API rate limit. System will resume shortly.',
          retryIn: this.retryAfter || '1 minute'
        };
      
      case DEGRADATION_REASONS.HIGH_LOAD:
        return {
          title: 'High System Load',
          message: 'System is experiencing high load. Some features may be temporarily unavailable.',
          retryIn: this.retryAfter || '5 minutes'
        };
      
      case DEGRADATION_REASONS.API_ISSUES:
        return {
          title: 'API Service Issues',
          message: 'We\'re experiencing issues with our API service. Our team has been notified.',
          retryIn: this.retryAfter || '15 minutes'
        };
      
      default:
        return {
          title: 'System Status Update',
          message: 'System is operating in a degraded state. Some features may be unavailable.',
          retryIn: this.retryAfter || '10 minutes'
        };
    }
  }

  isOperational() {
    return this.state === SYSTEM_STATES.NORMAL;
  }

  isDegraded() {
    return this.state === SYSTEM_STATES.DEGRADED;
  }

  isInMaintenance() {
    return this.state === SYSTEM_STATES.MAINTENANCE;
  }

  isInError() {
    return this.state === SYSTEM_STATES.ERROR;
  }
}

export const systemStatus = new SystemStatus();
