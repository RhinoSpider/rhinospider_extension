/**
 * Error Handler for RhinoSpider Extension
 * Handles all error scenarios gracefully
 */

class ErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = 50;
        this.errorListeners = [];
        this.networkStatus = 'unknown';
        this.serviceStatus = {
            icProxy: 'unknown',
            searchProxy: 'unknown'
        };
        this.lastHealthCheck = null;
        this.isOnline = navigator.onLine;
        
        // Start monitoring
        this.initializeMonitoring();
    }

    initializeMonitoring() {
        // Monitor online/offline status
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Monitor page visibility (laptop sleep/wake)
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
        
        // Check health periodically
        setInterval(() => this.checkServicesHealth(), 60000); // Every minute
        
        // Initial health check
        this.checkServicesHealth();
    }

    handleOnline() {
        console.log('[ErrorHandler] Network is back online');
        this.isOnline = true;
        this.notifyListeners({
            type: 'network',
            status: 'online',
            message: 'Internet connection restored'
        });
        
        // Recheck services when coming online
        setTimeout(() => this.checkServicesHealth(), 2000);
    }

    handleOffline() {
        console.log('[ErrorHandler] Network went offline');
        this.isOnline = false;
        this.notifyListeners({
            type: 'network',
            status: 'offline',
            message: 'No internet connection',
            severity: 'warning'
        });
    }

    handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            console.log('[ErrorHandler] Page became visible (wake from sleep/switch back)');
            // Computer might have woken from sleep
            this.checkServicesHealth();
            
            // Notify that we're checking status
            this.notifyListeners({
                type: 'status',
                message: 'Checking connection status...',
                severity: 'info'
            });
        }
    }

    async checkServicesHealth() {
        const checks = [
            this.checkService('icProxy', 'https://ic-proxy.rhinospider.com/api/health'),
            this.checkService('searchProxy', 'https://search-proxy.rhinospider.com/api/health')
        ];
        
        const results = await Promise.allSettled(checks);
        
        // Update overall status
        const allHealthy = results.every(r => r.status === 'fulfilled' && r.value);
        
        if (allHealthy) {
            this.notifyListeners({
                type: 'services',
                status: 'healthy',
                message: 'All services operational'
            });
        }
        
        this.lastHealthCheck = Date.now();
    }

    async checkService(serviceName, healthUrl) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            const response = await fetch(healthUrl, {
                method: 'GET',
                signal: controller.signal,
                mode: 'cors'
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                this.serviceStatus[serviceName] = 'healthy';
                return true;
            } else {
                this.handleServiceError(serviceName, `Service returned ${response.status}`);
                return false;
            }
        } catch (error) {
            this.handleServiceError(serviceName, error.message);
            return false;
        }
    }

    handleServiceError(serviceName, errorMessage) {
        this.serviceStatus[serviceName] = 'error';
        
        let userMessage = '';
        let severity = 'error';
        
        // Determine user-friendly message based on error
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
            userMessage = `Cannot connect to ${serviceName === 'icProxy' ? 'blockchain' : 'search'} service`;
            severity = 'error';
        } else if (errorMessage.includes('429')) {
            userMessage = 'Service rate limit reached. Please wait a moment.';
            severity = 'warning';
        } else if (errorMessage.includes('timeout')) {
            userMessage = `${serviceName === 'icProxy' ? 'Blockchain' : 'Search'} service is slow to respond`;
            severity = 'warning';
        } else if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
            userMessage = 'Service temporarily unavailable. Please try again later.';
            severity = 'error';
        }
        
        this.notifyListeners({
            type: 'service',
            service: serviceName,
            status: 'error',
            message: userMessage,
            severity: severity,
            technical: errorMessage
        });
    }

    handleFetchError(error, context = {}) {
        // Log the error
        this.logError(error, context);
        
        // Determine the type of error and appropriate response
        let userMessage = 'Something went wrong. Please try again.';
        let severity = 'error';
        let shouldRetry = false;
        
        if (!this.isOnline) {
            userMessage = 'No internet connection. Please check your network.';
            severity = 'warning';
            shouldRetry = false;
        } else if (error.message.includes('Failed to fetch')) {
            userMessage = 'Cannot connect to RhinoSpider services. They may be temporarily down.';
            severity = 'error';
            shouldRetry = true;
        } else if (error.message.includes('429')) {
            userMessage = 'Too many requests. Please wait a moment before trying again.';
            severity = 'warning';
            shouldRetry = false;
        } else if (error.message.includes('timeout')) {
            userMessage = 'Request timed out. The service may be slow or unavailable.';
            severity = 'warning';
            shouldRetry = true;
        } else if (error.message.includes('CORS')) {
            userMessage = 'Security error. Please reload the extension.';
            severity = 'error';
            shouldRetry = false;
        }
        
        return {
            userMessage,
            severity,
            shouldRetry,
            originalError: error,
            context
        };
    }

    logError(error, context = {}) {
        const errorEntry = {
            timestamp: Date.now(),
            message: error.message,
            stack: error.stack,
            context,
            networkStatus: this.isOnline,
            serviceStatus: { ...this.serviceStatus }
        };
        
        this.errors.push(errorEntry);
        
        // Keep only recent errors
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }
        
        // Store in localStorage for persistence
        try {
            chrome.storage.local.set({
                errorLog: this.errors.slice(-10) // Keep last 10 errors in storage
            });
        } catch (e) {
            console.error('[ErrorHandler] Failed to store error log:', e);
        }
    }

    addListener(callback) {
        this.errorListeners.push(callback);
    }

    removeListener(callback) {
        this.errorListeners = this.errorListeners.filter(l => l !== callback);
    }

    notifyListeners(event) {
        this.errorListeners.forEach(listener => {
            try {
                listener(event);
            } catch (e) {
                console.error('[ErrorHandler] Error notifying listener:', e);
            }
        });
    }

    // Get user-friendly status message
    getStatusMessage() {
        if (!this.isOnline) {
            return {
                message: 'Offline - No internet connection',
                severity: 'warning',
                icon: '🔴'
            };
        }
        
        const icProxyHealthy = this.serviceStatus.icProxy === 'healthy';
        const searchProxyHealthy = this.serviceStatus.searchProxy === 'healthy';
        
        if (icProxyHealthy && searchProxyHealthy) {
            return {
                message: 'All systems operational',
                severity: 'success',
                icon: '🟢'
            };
        } else if (!icProxyHealthy && !searchProxyHealthy) {
            return {
                message: 'Services unavailable',
                severity: 'error',
                icon: '🔴'
            };
        } else {
            return {
                message: 'Some services degraded',
                severity: 'warning',
                icon: '🟡'
            };
        }
    }

    // Clear errors
    clearErrors() {
        this.errors = [];
        chrome.storage.local.remove('errorLog');
    }

    // Get recent errors for display
    getRecentErrors(count = 5) {
        return this.errors.slice(-count).reverse();
    }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = errorHandler;
} else {
    window.errorHandler = errorHandler;
}

export default errorHandler;