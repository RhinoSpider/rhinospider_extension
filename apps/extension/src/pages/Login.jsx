import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@rhinospider/web3-client';
import { theme } from '../styles/theme';

const Login = () => {
  const navigate = useNavigate();
  const { identity, login, isLoading } = useAuthContext();

  useEffect(() => {
    if (isLoading) return;

    // If we have identity, redirect to dashboard
    if (identity) {
      navigate('/');
      return;
    }

    // Check stored auth state
    const storedAuth = localStorage.getItem('rhinospider_auth');
    if (storedAuth) {
      const { isAuthenticated } = JSON.parse(storedAuth);
      if (isAuthenticated) {
        navigate('/');
      }
    }
  }, [identity, isLoading, navigate]);

  const handleLogin = async () => {
    try {
      await login();
      // Navigation will happen automatically through the auth state change
    } catch (error) {
      console.error('Login failed:', error);
      localStorage.removeItem('rhinospider_auth');
    }
  };

  // Don't render anything while checking auth
  if (isLoading) return null;

  return (
    <div 
      className="w-full h-full flex flex-col items-center justify-center p-6"
      style={{ background: theme.colors.background.gradient }}
    >
      <div className="text-center mb-8">
        <div className="text-white text-4xl font-mono tracking-wider mb-2">
          {'>^<'}
        </div>
        <h1 className="text-white text-2xl font-semibold">RhinoSpider</h1>
        <p className="text-white/60 mt-2">
          Connect with Internet Identity to continue
        </p>
      </div>

      <button
        onClick={handleLogin}
        className="px-6 py-3 bg-[#B692F6] text-white rounded-full hover:bg-[#B692F6]/90 transition-colors"
      >
        Connect with Internet Identity
      </button>

      <div className="mt-8 text-center">
        <p className="text-white/40 text-sm">
          By connecting, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Login;