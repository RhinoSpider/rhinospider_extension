// This script exposes key background script functions to the globalThis object
// so they can be accessed by the storage listener

// Export functions to globalThis object for use by other modules
globalThis.exposeBackgroundFunctions = function(functions) {
    // Only expose the specified functions to avoid polluting the global scope
    const { 
        logger, 
        isAuthenticated, 
        startScraping, 
        stopScraping 
    } = functions;
    
    // Expose to globalThis object
    globalThis.backgroundLogger = logger;
    globalThis.isAuthenticatedState = isAuthenticated;
    globalThis.startScrapingFunc = startScraping;
    globalThis.stopScrapingFunc = stopScraping;
    
    if (logger && logger.log) {
        logger.log('Background functions exposed to globalThis object');
    }
};
