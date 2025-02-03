import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Login as LoginComponent } from '@rhinospider/ui';

const Login = () => {
  const navigate = useNavigate();
  
  return (
    <LoginComponent
      title="RhinoSpider Extension"
      onSuccess={() => navigate('/dashboard')}
      onError={(error) => console.error('Login failed:', error)}
    />
  );
};

export default Login;