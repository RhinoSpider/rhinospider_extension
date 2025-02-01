// Budget control system for OpenAI API usage

const MONTHLY_BUDGET = 10; // dollars for testing
const COST_PER_1K_TOKENS = {
  input: 0.0010,
  output: 0.0020
};

// Daily limits for extension instances
const EXTENSION_LIMITS = {
  MAX_DAILY_CONFIGS: 231,    // For $10 budget
  MAX_HOURLY_CONFIGS: 10,    // Prevent spikes
  MIN_CACHE_DURATION: 3600   // 1 hour minimum between same searches
};

// Optimized token usage
const TOKEN_ESTIMATES = {
  systemPrompt: 200,
  userQuery: 20,
  configResponse: 300
};

class BudgetController {
  constructor() {
    this.monthlyBudget = MONTHLY_BUDGET;
    this.monthStart = new Date().setDate(1);
    this.currentSpend = 0;
    this.activeExtensions = new Map(); // Track extension instances
    this.configRequests = {
      daily: new Map(),  // Track daily requests per extension
      hourly: new Map()  // Track hourly requests per extension
    };
    
    // Load saved state
    this.loadState();
    
    // Start periodic cleanup
    this.startPeriodicCleanup();
  }

  async loadState() {
    try {
      const saved = await chrome.storage.local.get('budgetState');
      if (saved.budgetState) {
        const { monthStart, currentSpend, activeExtensions, configRequests } = saved.budgetState;
        
        if (new Date(monthStart).getMonth() === new Date().getMonth()) {
          this.monthStart = monthStart;
          this.currentSpend = currentSpend;
          this.activeExtensions = new Map(activeExtensions);
          this.configRequests = {
            daily: new Map(configRequests.daily),
            hourly: new Map(configRequests.hourly)
          };
        }
      }
    } catch (error) {
      console.error('Error loading budget state:', error);
    }
  }

  async saveState() {
    try {
      await chrome.storage.local.set({
        budgetState: {
          monthStart: this.monthStart,
          currentSpend: this.currentSpend,
          activeExtensions: Array.from(this.activeExtensions.entries()),
          configRequests: {
            daily: Array.from(this.configRequests.daily.entries()),
            hourly: Array.from(this.configRequests.hourly.entries())
          }
        }
      });
    } catch (error) {
      console.error('Error saving budget state:', error);
    }
  }

  registerExtension(extensionId) {
    if (!this.activeExtensions.has(extensionId)) {
      this.activeExtensions.set(extensionId, {
        registeredAt: Date.now(),
        totalRequests: 0,
        lastRequest: null
      });
      this.saveState();
    }
  }

  async canMakeRequest(extensionId, searchTerm) {
    // Register extension if new
    this.registerExtension(extensionId);
    
    // Check if we're under budget
    const requestCost = this.calculateRequestCost();
    if (this.currentSpend + requestCost > this.monthlyBudget) {
      return false;
    }

    // Get or initialize daily counts
    const today = new Date().toISOString().split('T')[0];
    const hourKey = new Date().toISOString().split(':')[0];
    
    const dailyCount = this.configRequests.daily.get(extensionId)?.[today] || 0;
    const hourlyCount = this.configRequests.hourly.get(extensionId)?.[hourKey] || 0;

    // Check limits
    if (dailyCount >= EXTENSION_LIMITS.MAX_DAILY_CONFIGS / this.activeExtensions.size) {
      return false;
    }
    
    if (hourlyCount >= EXTENSION_LIMITS.MAX_HOURLY_CONFIGS) {
      return false;
    }

    // Update counts
    this.updateRequestCounts(extensionId, today, hourKey);
    
    return true;
  }

  updateRequestCounts(extensionId, today, hourKey) {
    // Update daily counts
    const dailyStats = this.configRequests.daily.get(extensionId) || {};
    dailyStats[today] = (dailyStats[today] || 0) + 1;
    this.configRequests.daily.set(extensionId, dailyStats);

    // Update hourly counts
    const hourlyStats = this.configRequests.hourly.get(extensionId) || {};
    hourlyStats[hourKey] = (hourlyStats[hourKey] || 0) + 1;
    this.configRequests.hourly.set(extensionId, hourlyStats);

    // Update extension stats
    const extStats = this.activeExtensions.get(extensionId);
    extStats.totalRequests++;
    extStats.lastRequest = Date.now();
    
    this.saveState();
  }

  startPeriodicCleanup() {
    setInterval(() => {
      const now = Date.now();
      
      // Clean up inactive extensions (no requests in 24 hours)
      for (const [id, stats] of this.activeExtensions) {
        if (now - stats.lastRequest > 24 * 60 * 60 * 1000) {
          this.activeExtensions.delete(id);
        }
      }

      // Clean up old hourly stats (keep last 24 hours)
      for (const [extId, hourlyStats] of this.configRequests.hourly) {
        const cleanedStats = {};
        const cutoff = new Date(now - 24 * 60 * 60 * 1000).toISOString().split(':')[0];
        
        for (const [hour, count] of Object.entries(hourlyStats)) {
          if (hour >= cutoff) {
            cleanedStats[hour] = count;
          }
        }
        this.configRequests.hourly.set(extId, cleanedStats);
      }

      // Clean up old daily stats (keep last 30 days)
      for (const [extId, dailyStats] of this.configRequests.daily) {
        const cleanedStats = {};
        const cutoff = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        for (const [day, count] of Object.entries(dailyStats)) {
          if (day >= cutoff) {
            cleanedStats[day] = count;
          }
        }
        this.configRequests.daily.set(extId, cleanedStats);
      }

      this.saveState();
    }, 60 * 60 * 1000); // Run every hour
  }

  getUsageStats() {
    const activeCount = this.activeExtensions.size;
    const today = new Date().toISOString().split('T')[0];
    const hourKey = new Date().toISOString().split(':')[0];

    // Calculate total requests today
    let totalRequestsToday = 0;
    for (const [_, stats] of this.configRequests.daily) {
      totalRequestsToday += stats[today] || 0;
    }

    // Calculate current hour requests
    let currentHourRequests = 0;
    for (const [_, stats] of this.configRequests.hourly) {
      currentHourRequests += stats[hourKey] || 0;
    }

    return {
      monthStart: new Date(this.monthStart),
      currentSpend: this.currentSpend,
      remainingBudget: this.monthlyBudget - this.currentSpend,
      activeExtensions: activeCount,
      requestsToday: totalRequestsToday,
      requestsThisHour: currentHourRequests,
      averageRequestsPerExtension: totalRequestsToday / activeCount || 0,
      maxDailyRequestsPerExtension: EXTENSION_LIMITS.MAX_DAILY_CONFIGS / activeCount,
      projectedMonthEnd: this.projectMonthEndUsage()
    };
  }

  projectMonthEndUsage() {
    const daysIntoMonth = (Date.now() - this.monthStart) / (24 * 60 * 60 * 1000);
    const daysInMonth = new Date(this.monthStart).getDate();
    const dailyRate = this.currentSpend / daysIntoMonth;
    
    return dailyRate * daysInMonth;
  }

  calculateRequestCost(tokens = {
    input: TOKEN_ESTIMATES.systemPrompt + TOKEN_ESTIMATES.userQuery,
    output: TOKEN_ESTIMATES.configResponse
  }) {
    return (
      (tokens.input * COST_PER_1K_TOKENS.input / 1000) +
      (tokens.output * COST_PER_1K_TOKENS.output / 1000)
    );
  }
}

export const budgetController = new BudgetController();
