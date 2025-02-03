import React, { useState } from 'react';
import { useAuth } from '@rhinospider/web3-client';
import './Popup.css';

export default function Popup() {
  const { isAuthenticated, error, login } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    console.log('Login clicked');
    setIsLoggingIn(true);
    try {
      console.log('Attempting login...');
      await login();
      console.log('Login successful');
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="top-section">
          <div className="logo-section">
            <div className="spider-logo">&gt;^&lt;</div>
            <div className="brand-text">RhinoSpider</div>
          </div>
          <p className="login-text">Login to start managing your scraping settings.</p>
          
          {error && (
            <div className="error-message">
              {error.message}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="login-button"
            type="button"
          >
            {isLoggingIn ? (
              "Connecting..."
            ) : (
              <>
                Login with Internet Identity
                <span className="login-button-arrow">→</span>
              </>
            )}
          </button>
        </div>

        <div className="footer-container">
          <p className="secure-text">
            Secure authentication powered by Internet Computer
          </p>

          <p className="consent-text">
            By logging in, you agree to RhinoSpider's{' '}
            <a 
              href="#" 
              onClick={(e) => { 
                e.preventDefault(); 
                chrome.tabs.create({ url: 'https://rhinospider.com/terms' }); 
              }}
              className="link"
            >
              Terms of Service
            </a>{' '}
            and acknowledge our{' '}
            <a 
              href="#" 
              onClick={(e) => { 
                e.preventDefault(); 
                chrome.tabs.create({ url: 'https://rhinospider.com/privacy' }); 
              }}
              className="link"
            >
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="top-section">
        <div className="logo-section">
          <div className="spider-logo">&gt;^&lt;</div>
          <div className="brand-text">RhinoSpider</div>
        </div>
        <p className="login-text">Your RhinoSpider extension is ready to use.</p>
      </div>
    </div>
  );
}
