import React, { useState, useEffect } from 'react';
import { login, logout, isAuthenticated, getScrapingConfig, updateScrapingConfig } from '../services/api';
import './Popup.css';

const Popup = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [scrapingConfig, setScrapingConfig] = useState(null);
    const [currentPoints, setCurrentPoints] = useState(9130);
    const [uptime, setUptime] = useState('2 hrs 45 mins');

    useEffect(() => {
        checkAuthStatus();
        
        // Listen for config updates
        const handleConfigUpdate = (event) => {
            setScrapingConfig(event.detail);
        };
        window.addEventListener('scrapingConfigUpdate', handleConfigUpdate);
        
        return () => {
            window.removeEventListener('scrapingConfigUpdate', handleConfigUpdate);
        };
    }, []);

    useEffect(() => {
        if (isLoggedIn) {
            loadScrapingConfig();
        }
    }, [isLoggedIn]);

    const checkAuthStatus = async () => {
        const authenticated = await isAuthenticated();
        setIsLoggedIn(authenticated);
    };

    const loadScrapingConfig = async () => {
        try {
            const config = await getScrapingConfig();
            setScrapingConfig(config);
        } catch (error) {
            console.error('Failed to load scraping config:', error);
            setError('Failed to load scraping configuration');
        }
    };

    const handleLogin = async () => {
        setLoading(true);
        try {
            const success = await login();
            if (success) {
                setIsLoggedIn(true);
            }
        } catch (err) {
            setError('Failed to login. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        setIsLoggedIn(false);
        setScrapingConfig(null);
    };

    const renderLoggedInContent = () => (
        <>
            <div className="header-actions">
                <div className="settings-icon">⚙️</div>
                <div className="profile-icon">👤</div>
            </div>
            <div className="earnings-container">
                <h2>Current Earnings</h2>
                <div className="points">{currentPoints} Points</div>
                <div className="status-circle">
                    <div className="power-icon">⏻</div>
                </div>
                <div className="status-message">
                    Your plugin is active. No action required.
                </div>
                <div className="uptime-container">
                    <span>Uptime</span>
                    <span>{uptime}</span>
                </div>
                <div className="milestone-message">
                    Great job! Keep contributing to secure your next milestone reward
                </div>
                <div className="action-buttons">
                    <button className="secondary-button">Copy Your Referral Link</button>
                    <button className="secondary-button">View My Referrals</button>
                </div>
                <button className="dashboard-button">
                    Desktop Dashboard <span>↗</span>
                </button>
            </div>
        </>
    );

    const renderLoginContent = () => (
        <div className="login-container">
          <h1>Sign in</h1>
          <p className="login-subtitle">Please login to continue to your account.</p>
          <button
            className="auth-button"
            onClick={handleLogin}
            disabled={loading}
          >
            Sign in with Internet Identity
          </button>
          <p className="consent-text">
            By signing in, you agree to RhinoSpider's <a href="#" className="consent-link">Terms of Service</a> and acknowledge that you have read our <a href="#" className="consent-link">Privacy Policy</a>
          </p>
        </div>
    );

    const renderScrapingConfig = () => {
        if (!scrapingConfig) return null;

        return (
            <div className="config-container">
                <h2>Scraping Configuration</h2>
                <div className="config-info">
                    <p>Version: {scrapingConfig.version}</p>
                    <p>Last Updated: {new Date(Number(scrapingConfig.lastUpdated) / 1000000).toLocaleString()}</p>
                </div>
                <div className="instructions-list">
                    <h3>Active Instructions</h3>
                    {scrapingConfig.instructions.map((instruction) => (
                        <div key={instruction.id} className="instruction-item">
                            <div className="instruction-header">
                                <span className="source">{instruction.source}</span>
                                <span className={`status ${instruction.isActive ? 'active' : 'inactive'}`}>
                                    {instruction.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <div className="instruction-details">
                                <p>Query: {instruction.searchQuery}</p>
                                <p>Frequency: {instruction.frequency}s</p>
                                {instruction.filters && (
                                    <div className="filters">
                                        <p>Filters:</p>
                                        <ul>
                                            {instruction.filters.minUpvotes && (
                                                <li>Min Upvotes: {instruction.filters.minUpvotes}</li>
                                            )}
                                            {instruction.filters.minComments && (
                                                <li>Min Comments: {instruction.filters.minComments}</li>
                                            )}
                                            {instruction.filters.timeRange && (
                                                <li>Time Range: {instruction.filters.timeRange}</li>
                                            )}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="popup-container">
            <div className="header">
                <div className="logo">&gt;^&lt;</div>
                <div className="project-name">RhinoSpider</div>
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <div className="main-content">
                {isLoggedIn ? (
                    <>
                        {renderLoggedInContent()}
                        {renderScrapingConfig()}
                        <button onClick={handleLogout} className="auth-button">Logout</button>
                    </>
                ) : (
                    renderLoginContent()
                )}
            </div>
        </div>
    );
};

export default Popup;
