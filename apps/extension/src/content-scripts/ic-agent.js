// IC Agent Interface
console.log('[Content Script] IC Agent loaded');

// Expose IC agent interface
window.rhinoSpiderIC = {
    // Will implement these functions soon
    initializeIC: () => {
        console.log('[Content Script] initializeIC called');
        return Promise.resolve();
    },
    getCurrentActor: () => {
        console.log('[Content Script] getCurrentActor called');
        return Promise.resolve();
    },
    clearSession: () => {
        console.log('[Content Script] clearSession called');
        return Promise.resolve();
    }
};
