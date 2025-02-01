import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Fake login - accepts any email/password
  const login = async (email, password, keepLoggedIn) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Create mock user data
    const mockUser = { 
      email,
      id: 'user-123',
      username: email.split('@')[0],
      points: 9130
    };
    
    setUser(mockUser);
    
    if (keepLoggedIn) {
      chrome.storage.local.set({ user: mockUser });
    }
  };

  const logout = async () => {
    setUser(null);
    await chrome.storage.local.remove(['user', 'isConnected', 'points', 'uptime']);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};