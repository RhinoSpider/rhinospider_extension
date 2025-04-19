import React, { useState, useEffect } from 'react';
import { AuthClient } from '@rhinospider/web3-client';

export function Dashboard() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    console.log('Dashboard mounted');
    
    // Get initial state
    chrome.storage.local.get(['enabled', 'startTime'], (result) => {
      console.log('Got storage state:', result);
      setIsEnabled(result.enabled !== false);
      if (result.startTime) {
        setUptime(Math.floor((Date.now() - result.startTime) / 1000));
      }
    });

    // Listen for speed updates
    const handleMessage = (message) => {
      console.log('Received message:', message);
      if (message.type === 'SPEED_UPDATE') {
        console.log('Updating speed:', message.speed);
        setSpeed(message.speed);
      }
    };
    
    console.log('Adding message listener');
    chrome.runtime.onMessage.addListener(handleMessage);

    // Update uptime every second
    const uptimeInterval = setInterval(() => {
      setUptime(prev => prev + 1);
    }, 1000);

    return () => {
      console.log('Removing message listener');
      chrome.runtime.onMessage.removeListener(handleMessage);
      clearInterval(uptimeInterval);
    };
  }, []);

  const handleToggle = () => {
    console.log('Toggle clicked, current state:', isEnabled);
    const newState = !isEnabled;
    setIsEnabled(newState);
    
    const startTime = newState ? Date.now() : null;
    chrome.storage.local.set({ 
      enabled: newState,
      startTime
    }, () => {
      console.log('Saved new state:', { enabled: newState, startTime });
    });
  };

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours} hrs ${minutes} mins`;
  };

  const handleLogout = async () => {
    const authClient = AuthClient.getInstance();
    await authClient.logout();
    window.location.reload();
  };
  
  const testUrlFetching = () => {
    console.log('Testing URL fetching process directly...');
    chrome.runtime.sendMessage({ type: 'TEST_URL_FETCHING' }, (response) => {
      if (response && response.success) {
        console.log(`Successfully fetched URL for topic ${response.topic}: ${response.url}`);
        alert(`Successfully fetched URL for topic ${response.topic}: ${response.url}`);
      } else {
        console.error('URL fetching test failed:', response?.error || 'Unknown error');
        alert('URL fetching test failed. Check console for details.');
      }
    });
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>RhinoSpider Dashboard</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label 
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          onClick={handleToggle}
        >
          <div
            style={{
              width: '50px',
              height: '24px',
              backgroundColor: isEnabled ? '#4CAF50' : '#ccc',
              borderRadius: '12px',
              position: 'relative',
              transition: 'background-color 0.2s',
              marginRight: '10px'
            }}
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                backgroundColor: 'white',
                borderRadius: '50%',
                position: 'absolute',
                top: '2px',
                left: isEnabled ? '28px' : '2px',
                transition: 'left 0.2s'
              }}
            />
          </div>
          <span>Enable Background Scraping</span>
        </label>
      </div>

      <div style={{ 
        backgroundColor: '#f5f5f5',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <div style={{ marginBottom: '15px' }}>
          <h3 style={{ margin: '0 0 5px 0' }}>Status</h3>
          <div style={{ color: isEnabled ? '#4CAF50' : '#666' }}>
            {isEnabled ? 'Your plugin is active' : 'Plugin is inactive'}
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <h3 style={{ margin: '0 0 5px 0' }}>Uptime</h3>
          <div>{formatUptime(uptime)}</div>
        </div>

        <div>
          <h3 style={{ margin: '0 0 5px 0' }}>Current Speed</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196F3' }}>
            {speed > 0 ? `${speed.toFixed(2)} pages/sec` : 'Waiting for data...'}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={handleLogout}
          style={{
            backgroundColor: '#f44336',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Logout
        </button>
        
        <button 
          onClick={testUrlFetching}
          style={{
            backgroundColor: '#FFA500',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test URL Fetching
        </button>
      </div>
    </div>
  );
}
