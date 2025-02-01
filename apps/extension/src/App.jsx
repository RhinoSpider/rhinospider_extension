import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuthContext } from '@rhinospider/web3-client';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';

const AuthWrapper = ({ children }) => {
  const { identity, isLoading } = useAuthContext();
  const navigate = useNavigate();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // Wait for auth state to be fully loaded
        if (isLoading) return;

        const storedAuth = localStorage.getItem('rhinospider_auth');
        const isAuthenticated = storedAuth ? JSON.parse(storedAuth).isAuthenticated : false;

        if (!isAuthenticated && !identity) {
          navigate('/login');
        } else if (isAuthenticated && !identity) {
          // If we have stored auth but no identity, clear it (invalid state)
          localStorage.removeItem('rhinospider_auth');
          navigate('/login');
        } else if (identity && window.location.pathname === '/login') {
          // If we're authenticated but on login page, redirect to dashboard
          navigate('/');
        }

        setInitialized(true);
      } catch (error) {
        console.error('Auth initialization failed:', error);
        localStorage.removeItem('rhinospider_auth');
        navigate('/login');
      }
    };

    init();
  }, [identity, isLoading, navigate]);

  // Show nothing while initializing
  if (!initialized || isLoading) {
    return null;
  }

  return children;
};

const PrivateRoute = ({ children }) => {
  const { identity } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!identity) {
      const storedAuth = localStorage.getItem('rhinospider_auth');
      if (!storedAuth) {
        navigate('/login');
      }
    }
  }, [identity, navigate]);

  return identity ? children : null;
};

const App = () => {
  return (
    <Router>
      <AuthProvider
        config={{
          appName: "RhinoSpider",
          logo: "/icons/icon128.png",
          iiUrl: import.meta.env.VITE_II_URL || "https://identity.ic0.app",
          storage: {
            type: 'localStorage',
            key: 'rhinospider_auth'
          },
          persistLogin: true,
          onSignup: async (identity) => {
            try {
              // Store auth state
              localStorage.setItem('rhinospider_auth', JSON.stringify({
                isAuthenticated: true,
                timestamp: Date.now()
              }));

              // Here you would typically create a user account
              console.log('New user signed up:', identity);
            } catch (error) {
              console.error('Error during signup:', error);
              localStorage.removeItem('rhinospider_auth');
            }
          },
          onLogin: async (identity) => {
            try {
              localStorage.setItem('rhinospider_auth', JSON.stringify({
                isAuthenticated: true,
                timestamp: Date.now()
              }));
            } catch (error) {
              console.error('Error during login:', error);
              localStorage.removeItem('rhinospider_auth');
            }
          },
          onLogout: async () => {
            try {
              localStorage.removeItem('rhinospider_auth');
            } catch (error) {
              console.error('Error during logout:', error);
            }
          }
        }}
      >
        <AuthWrapper>
          <div className="w-[400px] h-[600px] bg-gray-100">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <PrivateRoute>
                    <Analytics />
                  </PrivateRoute>
                }
              />
            </Routes>
          </div>
        </AuthWrapper>
      </AuthProvider>
    </Router>
  );
};

export default App;