// Popup script
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Popup loaded');
    
    // Get stored state
    const { isActive } = await chrome.storage.local.get(['isActive']);
    console.log('State loaded:', { isActive });
    
    // Update status
    const status = document.querySelector('.status');
    if (status) {
        status.textContent = isActive ? 'Active' : 'Inactive';
        status.classList.toggle('inactive', !isActive);
    }
    
    // Handle dashboard button
    const dashboardButton = document.getElementById('openDashboard');
    console.log('Dashboard button found:', dashboardButton);
    
    if (dashboardButton) {
        dashboardButton.addEventListener('click', async () => {
            console.log('Dashboard button clicked');
            try {
                // Send message to background script to open/focus dashboard
                await chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
                
                // Close the popup
                window.close();
            } catch (error) {
                console.error('Error opening dashboard:', error);
            }
        });
    } else {
        console.error('Dashboard button not found in popup');
    }
});
