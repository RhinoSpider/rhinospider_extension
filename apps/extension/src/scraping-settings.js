/**
 * Scraping Settings Manager
 * Handles user preferences for scraping behavior
 */

export const DEFAULT_SETTINGS = {
    // Concurrent tabs limit
    maxConcurrentTabs: 3,
    
    // Scheduling
    schedulingEnabled: false,
    scheduleStartHour: 9,  // 9 AM
    scheduleEndHour: 17,   // 5 PM
    scheduleDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], // Weekdays only by default
    
    // Bandwidth limits
    bandwidthLimitEnabled: false,
    maxDailyMB: 1000, // 1GB per day
    maxHourlyMB: 100, // 100MB per hour
    
    // Visual notifications
    showScrapingIndicator: true,
    showTabCount: true,
    playSound: false,
    
    // Privacy
    scrapingConsent: false,
    consentDate: null
};

class ScrapingSettings {
    constructor() {
        this.settings = { ...DEFAULT_SETTINGS };
        this.loadSettings();
    }
    
    async loadSettings() {
        const stored = await chrome.storage.local.get(['scrapingSettings']);
        if (stored.scrapingSettings) {
            this.settings = { ...DEFAULT_SETTINGS, ...stored.scrapingSettings };
        }
        return this.settings;
    }
    
    async saveSettings(updates) {
        this.settings = { ...this.settings, ...updates };
        await chrome.storage.local.set({ scrapingSettings: this.settings });
        
        // Notify background script of changes
        chrome.runtime.sendMessage({ 
            action: 'settings-updated', 
            settings: this.settings 
        });
        
        return this.settings;
    }
    
    async updateConsent(consent) {
        return this.saveSettings({
            scrapingConsent: consent,
            consentDate: consent ? new Date().toISOString() : null
        });
    }
    
    isWithinSchedule() {
        if (!this.settings.schedulingEnabled) {
            return true; // No schedule restriction
        }
        
        const now = new Date();
        const currentHour = now.getHours();
        const currentDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];
        
        // Check day
        if (!this.settings.scheduleDays.includes(currentDay)) {
            return false;
        }
        
        // Check hour
        if (currentHour < this.settings.scheduleStartHour || 
            currentHour >= this.settings.scheduleEndHour) {
            return false;
        }
        
        return true;
    }
    
    async checkBandwidthLimit(bytesUsed) {
        if (!this.settings.bandwidthLimitEnabled) {
            return true; // No bandwidth limit
        }
        
        // Get usage stats
        const stats = await this.getUsageStats();
        const mbUsed = bytesUsed / (1024 * 1024);
        
        // Check hourly limit
        if (stats.hourlyMB + mbUsed > this.settings.maxHourlyMB) {
            return false;
        }
        
        // Check daily limit
        if (stats.dailyMB + mbUsed > this.settings.maxDailyMB) {
            return false;
        }
        
        return true;
    }
    
    async recordBandwidthUsage(bytes) {
        const stats = await this.getUsageStats();
        const mbUsed = bytes / (1024 * 1024);
        
        stats.hourlyMB += mbUsed;
        stats.dailyMB += mbUsed;
        stats.totalMB += mbUsed;
        stats.lastUpdate = Date.now();
        
        await chrome.storage.local.set({ bandwidthStats: stats });
        return stats;
    }
    
    async getUsageStats() {
        const stored = await chrome.storage.local.get(['bandwidthStats']);
        const now = Date.now();
        
        let stats = stored.bandwidthStats || {
            hourlyMB: 0,
            dailyMB: 0,
            totalMB: 0,
            lastUpdate: now,
            hourStart: now,
            dayStart: now
        };
        
        // Reset hourly counter if hour has passed
        if (now - stats.hourStart > 3600000) { // 1 hour in ms
            stats.hourlyMB = 0;
            stats.hourStart = now;
        }
        
        // Reset daily counter if day has passed
        if (now - stats.dayStart > 86400000) { // 24 hours in ms
            stats.dailyMB = 0;
            stats.dayStart = now;
        }
        
        return stats;
    }
    
    getMaxConcurrentTabs() {
        return this.settings.maxConcurrentTabs;
    }
    
    shouldShowIndicator() {
        return this.settings.showScrapingIndicator;
    }
}

export default new ScrapingSettings();