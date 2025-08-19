/**
 * Test script for error handling edge cases
 * Run this to simulate various failure scenarios
 */

const scenarios = {
    // Network failures
    networkOffline: () => {
        console.log('🔴 Testing: Network offline...');
        window.dispatchEvent(new Event('offline'));
    },
    
    networkOnline: () => {
        console.log('🟢 Testing: Network restored...');
        window.dispatchEvent(new Event('online'));
    },
    
    // Service failures
    icProxyDown: () => {
        console.log('🔴 Testing: IC Proxy service down (502)...');
        // Simulate 502 response
        return {
            service: 'icProxy',
            status: 502,
            message: 'Bad Gateway'
        };
    },
    
    searchProxyDown: () => {
        console.log('🔴 Testing: Search Proxy service down (503)...');
        // Simulate 503 response
        return {
            service: 'searchProxy',
            status: 503,
            message: 'Service Unavailable'
        };
    },
    
    rateLimited: () => {
        console.log('🟠 Testing: Rate limited (429)...');
        // Simulate 429 response
        return {
            service: 'searchProxy',
            status: 429,
            message: 'Too Many Requests',
            retryAfter: 60
        };
    },
    
    // Laptop sleep/wake
    laptopSleep: () => {
        console.log('💤 Testing: Laptop going to sleep...');
        document.hidden = true;
        window.dispatchEvent(new Event('visibilitychange'));
    },
    
    laptopWake: () => {
        console.log('⏰ Testing: Laptop waking up...');
        document.hidden = false;
        window.dispatchEvent(new Event('visibilitychange'));
    },
    
    // Chrome restart
    chromeRestart: () => {
        console.log('🔄 Testing: Chrome restart simulation...');
        // Simulate storage clearing and reload
        chrome.storage.local.get(['principalId', 'enabled'], (state) => {
            console.log('State before restart:', state);
            // Extension should restore this state on restart
        });
    },
    
    // Timeout scenarios
    requestTimeout: () => {
        console.log('⏱️ Testing: Request timeout...');
        // Simulate timeout after 10 seconds
        return new Promise((resolve, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 10000);
        });
    },
    
    // Authentication failures
    authExpired: () => {
        console.log('🔐 Testing: Authentication expired...');
        chrome.storage.local.remove(['principalId', 'isAuthenticated']);
    },
    
    // Combined scenario: Close laptop without closing Chrome
    closeLaptopWithChrome: async () => {
        console.log('💻 Testing: Closing laptop with Chrome open...');
        
        // Step 1: Simulate going to sleep
        scenarios.laptopSleep();
        
        // Step 2: Wait (simulating sleep time)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Step 3: Wake up
        scenarios.laptopWake();
        
        // Step 4: Check if scraping resumes
        chrome.storage.local.get(['enabled'], (state) => {
            if (state.enabled) {
                console.log('✅ Extension should resume scraping');
            }
        });
    }
};

// Run test suite
async function runTests() {
    console.log('🧪 Starting error handling tests...\n');
    
    // Test 1: Network failures
    console.log('--- Test 1: Network Failures ---');
    scenarios.networkOffline();
    await wait(2000);
    scenarios.networkOnline();
    await wait(2000);
    
    // Test 2: Service failures
    console.log('\n--- Test 2: Service Failures ---');
    console.log(scenarios.icProxyDown());
    await wait(2000);
    console.log(scenarios.searchProxyDown());
    await wait(2000);
    console.log(scenarios.rateLimited());
    await wait(2000);
    
    // Test 3: Laptop sleep/wake
    console.log('\n--- Test 3: Laptop Sleep/Wake ---');
    scenarios.laptopSleep();
    await wait(3000);
    scenarios.laptopWake();
    await wait(2000);
    
    // Test 4: Combined scenario
    console.log('\n--- Test 4: Close Laptop Without Closing Chrome ---');
    await scenarios.closeLaptopWithChrome();
    await wait(2000);
    
    // Test 5: Authentication
    console.log('\n--- Test 5: Authentication Failures ---');
    scenarios.authExpired();
    await wait(2000);
    
    console.log('\n✅ All tests completed!');
    console.log('Check the popup and dashboard for error messages.');
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Make functions available globally for manual testing
window.testScenarios = scenarios;
window.runAllTests = runTests;

console.log('🧪 Error test suite loaded!');
console.log('Run window.runAllTests() to test all scenarios');
console.log('Or test individual scenarios with window.testScenarios.networkOffline() etc.');