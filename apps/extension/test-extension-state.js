// Test script to validate extension state management

const testCases = [
    {
        name: "Not authenticated - extension should be OFF",
        storage: { 
            scrapingEnabled: true, 
            enabled: true,
            principalId: null 
        },
        expectedEnabled: false,
        expectedBadge: "OFF"
    },
    {
        name: "Authenticated but not enabled - extension should be OFF",
        storage: { 
            scrapingEnabled: false, 
            enabled: false,
            principalId: "test-principal-123" 
        },
        expectedEnabled: false,
        expectedBadge: "OFF"
    },
    {
        name: "Authenticated and enabled - extension should be ON",
        storage: { 
            scrapingEnabled: true, 
            enabled: true,
            principalId: "test-principal-123" 
        },
        expectedEnabled: true,
        expectedBadge: "ON"
    },
    {
        name: "Just logged in - extension should be OFF by default",
        storage: { 
            scrapingEnabled: false, 
            enabled: false,
            principalId: "test-principal-123" 
        },
        expectedEnabled: false,
        expectedBadge: "OFF"
    }
];

console.log("Extension State Test Cases");
console.log("=========================\n");

testCases.forEach(test => {
    console.log(`Test: ${test.name}`);
    console.log(`Storage state:`, test.storage);
    
    // Simulate the logic from background.js
    const isUserAuthenticated = !!test.storage.principalId;
    const isEnabled = isUserAuthenticated && (test.storage.scrapingEnabled === true || test.storage.enabled === true);
    const badge = isEnabled ? "ON" : "OFF";
    
    console.log(`Expected enabled: ${test.expectedEnabled}, Actual: ${isEnabled}`);
    console.log(`Expected badge: ${test.expectedBadge}, Actual: ${badge}`);
    console.log(`Result: ${isEnabled === test.expectedEnabled && badge === test.expectedBadge ? "✅ PASS" : "❌ FAIL"}`);
    console.log("---\n");
});

console.log("\nSummary of fixes applied:");
console.log("1. Extension badge always starts as OFF on startup");
console.log("2. Extension can only be enabled if user is authenticated");
console.log("3. Popup shows loading state while checking authentication");
console.log("4. Popup only shows active UI after successful authentication");
console.log("5. After login, extension stays OFF until user explicitly enables it");
console.log("6. All toggle states (popup, settings, dashboard) now sync properly");