// Popup script
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Popup loaded');
    
    // Get stored state
    const { enabled, isScrapingActive } = await chrome.storage.local.get(['enabled', 'isScrapingActive']);
    // Use enabled as the primary state indicator
    const isActive = enabled !== false;
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
                enabled: newState,
                isScrapingActive: newState
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

    // Handle referral button
    const referralButton = document.getElementById('openReferral');
    if (referralButton) {
        referralButton.addEventListener('click', async () => {
            console.log('Referral button clicked');
            try {
                await chrome.runtime.sendMessage({ type: 'OPEN_REFERRAL_PAGE' });
                window.close();
            } catch (error) {
                console.error('Error opening referral page:', error);
            }
        });
    }

    // Authentication elements
    const principalIdSpan = document.getElementById('principal-id');
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');

    // Function to update auth UI
    const updateAuthUI = async () => {
        const response = await chrome.runtime.sendMessage({ type: 'IS_AUTHENTICATED' });
        if (response.authenticated) {
            const principalResponse = await chrome.runtime.sendMessage({ type: 'GET_PRINCIPAL' });
            principalIdSpan.textContent = principalResponse.principal;
            loginButton.style.display = 'none';
            logoutButton.style.display = 'block';
        } else {
            principalIdSpan.textContent = 'Not logged in';
            loginButton.style.display = 'block';
            logoutButton.style.display = 'none';
        }
    };

    // Initial auth UI update
    await updateAuthUI();

    // Handle login button click
    loginButton.addEventListener('click', async () => {
        const response = await chrome.runtime.sendMessage({ type: 'LOGIN' });
        if (response.success) {
            await updateAuthUI();
        } else {
            console.error('Login failed:', response.error);
            alert(`Login failed: ${response.error}`);
        }
    });

    // Handle logout button click
    logoutButton.addEventListener('click', async () => {
        const response = await chrome.runtime.sendMessage({ type: 'LOGOUT' });
        if (response.success) {
            await updateAuthUI();
        } else {
            console.error('Logout failed:', response.error);
            alert(`Logout failed: ${response.error}`);
        }
    });
});