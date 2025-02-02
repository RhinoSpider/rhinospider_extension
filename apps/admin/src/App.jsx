import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthClient } from '@dfinity/auth-client';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Users from './components/Users';
import Tasks from './components/Tasks';
import Navbar from './components/Navbar';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authClient, setAuthClient] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    const client = await AuthClient.create();
    const isLoggedIn = await client.isAuthenticated();
    setAuthClient(client);

    if (isLoggedIn) {
      const identity = client.getIdentity();
      setIdentity(identity);
      setIsAuthenticated(true);
      await checkUserRole(identity);
    }
  };

  const login = async () => {
    await authClient?.login({
      identityProvider: process.env.II_URL || 'https://identity.ic0.app',
      onSuccess: async () => {
        const identity = authClient.getIdentity();
        setIdentity(identity);
        setIsAuthenticated(true);
        await checkUserRole(identity);
      },
    });
  };

  const logout = async () => {
    await authClient?.logout();
    setIsAuthenticated(false);
    setIdentity(null);
    setUserRole(null);
  };

  const checkUserRole = async (identity) => {
    const agent = new HttpAgent({
      host: process.env.DFX_NETWORK || 'http://localhost:8000',
      identity,
    });

    // Create actor
    const adminCanister = Actor.createActor(/* adminCanisterInterface */, {
      agent,
      canisterId: process.env.ADMIN_CANISTER_ID,
    });

    try {
      const role = await adminCanister.getUserRole(identity.getPrincipal());
      setUserRole(role);
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  if (!authClient) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  if (!userRole) {
    return <div>Unauthorized. Please contact an administrator.</div>;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Navbar userRole={userRole} onLogout={logout} />
        
        <main className="py-10">
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<Dashboard userRole={userRole} />} />
              {userRole === 'SuperAdmin' && (
                <Route path="/users" element={<Users />} />
              )}
              {(userRole === 'SuperAdmin' || userRole === 'Admin') && (
                <Route path="/tasks" element={<Tasks userRole={userRole} />} />
              )}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
};

export default App;
