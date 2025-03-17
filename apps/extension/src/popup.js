// Popup script
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Popup loaded');
    
    // Get stored state
    const { enabled, isScrapingActive, identityInfo, principalId } = await chrome.storage.local.get(['enabled', 'isScrapingActive', 'identityInfo', 'principalId']);
    
    // Check if user is authenticated by looking for identityInfo or principalId
    const isAuthenticated = !!(identityInfo || principalId);
    console.log('Authentication state:', { isAuthenticated, hasPrincipalId: !!principalId, hasIdentityInfo: !!identityInfo });
    
    // Only consider the extension active if explicitly enabled AND authenticated
    const isActive = enabled === true && isAuthenticated;
    console.log('State loaded:', { isActive, enabled, isAuthenticated });
    
    // Update status
    const status = document.querySelector('.status');
    if (status) {
        status.textContent = isActive ? 'Active' : 'Inactive';
        status.classList.toggle('inactive', !isActive);
    }
    
    // Handle status toggle
    const toggleButton = document.getElementById('toggleStatus');
    if (toggleButton) {
        toggleButton.addEventListener('click', async () => {
            // Only allow toggling if authenticated
            if (!isAuthenticated) {
                // If not authenticated, prompt to login instead
                await chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
                window.close();
                return;
            }
            
            const newState = !isActive;
            await chrome.runtime.sendMessage({ 
                type: 'SET_STATE', 
                enabled: newState,
                isScrapingActive: newState
            });
            window.location.reload();
        });
    }
    
    // Handle dashboard/login button
    const dashboardButton = document.getElementById('openDashboard');
    if (dashboardButton) {
        // Update button text based on authentication state
        dashboardButton.textContent = isAuthenticated ? 'Open Dashboard' : 'Login';
        
        dashboardButton.addEventListener('click', async () => {
            console.log('Dashboard/Login button clicked');
            try {
                await chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
                window.close();
            } catch (error) {
                console.error('Error opening dashboard:', error);
            }
        });
    }
});
