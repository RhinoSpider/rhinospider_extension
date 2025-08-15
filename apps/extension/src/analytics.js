// Google Analytics for Chrome Extension
// Using GA4 Collection Endpoint for CSP compliance

const GA_MEASUREMENT_ID = 'G-4RKCDJC94M';
const GA_ENDPOINT = 'https://www.google-analytics.com/g/collect';

class Analytics {
    constructor() {
        this.clientId = this.getClientId();
        this.sessionId = this.getSessionId();
    }

    getClientId() {
        let clientId = localStorage.getItem('ga_client_id');
        if (!clientId) {
            clientId = this.generateId();
            localStorage.setItem('ga_client_id', clientId);
        }
        return clientId;
    }

    getSessionId() {
        let sessionId = sessionStorage.getItem('ga_session_id');
        if (!sessionId) {
            sessionId = this.generateId();
            sessionStorage.setItem('ga_session_id', sessionId);
        }
        return sessionId;
    }

    generateId() {
        return Date.now() + '.' + Math.random().toString(36).substring(2);
    }

    async sendEvent(eventName, parameters = {}) {
        try {
            console.log('[Analytics]', eventName, parameters);
            
            // Store events locally for debugging
            const events = JSON.parse(localStorage.getItem('ga_events') || '[]');
            events.push({
                event: eventName,
                parameters: parameters,
                timestamp: Date.now()
            });
            
            // Keep only last 100 events
            if (events.length > 100) {
                events.shift();
            }
            localStorage.setItem('ga_events', JSON.stringify(events));
            
            // Send to GA4 using the collection endpoint
            const params = new URLSearchParams({
                v: '2',
                tid: GA_MEASUREMENT_ID,
                cid: this.clientId,
                sid: this.sessionId,
                en: eventName,
                _p: Date.now(),
                sr: `${screen.width}x${screen.height}`,
                ul: navigator.language || 'en-us',
                dl: window.location.href,
                dt: document.title || 'RhinoSpider Extension',
                ...parameters
            });

            // Send as a beacon (fire and forget)
            const url = `${GA_ENDPOINT}?${params.toString()}`;
            
            // Try navigator.sendBeacon first (most reliable)
            if (navigator.sendBeacon) {
                navigator.sendBeacon(url);
            } else {
                // Fallback to fetch
                fetch(url, {
                    method: 'POST',
                    mode: 'no-cors',
                    keepalive: true
                });
            }
            
        } catch (error) {
            console.error('[Analytics] Error sending event:', error);
        }
    }

    // Convenience methods
    trackPageView(pageName) {
        this.sendEvent('page_view', {
            page_title: pageName,
            page_location: window.location.href
        });
    }

    trackLogin(method = 'internet_identity') {
        this.sendEvent('login', {
            method: method
        });
    }

    trackExtensionToggle(enabled) {
        this.sendEvent(enabled ? 'extension_enabled' : 'extension_disabled', {
            value: enabled ? 1 : 0
        });
    }

    trackDashboardOpen() {
        this.sendEvent('dashboard_opened', {
            source: 'popup'
        });
    }
}

// Create global analytics instance
window.analytics = new Analytics();

// Auto-track page views
document.addEventListener('DOMContentLoaded', () => {
    const pageName = document.title || 'Unknown Page';
    window.analytics.trackPageView(pageName);
});

export default Analytics;