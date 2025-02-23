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
    
    // Handle status toggle
    const toggleButton = document.getElementById('toggleStatus');
    if (toggleButton) {
        toggleButton.addEventListener('click', async () => {
            const newState = !isActive;
            await chrome.runtime.sendMessage({ 
                type: 'SET_STATE', 
                isActive: newState 
            });
            window.location.reload();
        });
    }
    
    // Handle dashboard button
    const dashboardButton = document.getElementById('openDashboard');
    if (dashboardButton) {
        dashboardButton.addEventListener('click', async () => {
            console.log('Dashboard button clicked');
            try {
                await chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
                window.close();
            } catch (error) {
                console.error('Error opening dashboard:', error);
            }
        });
    }
});
