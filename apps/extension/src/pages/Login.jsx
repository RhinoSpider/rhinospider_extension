import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password, keepLoggedIn);
      navigate('/');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="w-80 min-h-[400px] bg-gradient-to-b from-gray-900 to-purple-900 p-6 text-white">
      <div className="flex items-center mb-8">
        <div className="flex items-center space-x-2">
  <span className="text-xl font-mono text-white">{">^<"}</span>
  <span className="text-xl font-semibold">RhinoSpider</span>
</div>
      </div>
      
      <h1 className="text-4xl font-bold mb-3">Sign in</h1>
      <p className="text-gray-400 text-lg mb-8">Please login to continue to your account.</p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="email"
            placeholder="Username or Email"
            className="w-full bg-gray-800/30 border border-purple-500/30 rounded-lg p-3 text-white placeholder-gray-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        
        <div>
          <input
            type="password"
            placeholder="Password"
            className="w-full bg-gray-800/30 border border-purple-500/30 rounded-lg p-3 text-white placeholder-gray-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="keepLoggedIn"
            checked={keepLoggedIn}
            onChange={(e) => setKeepLoggedIn(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="keepLoggedIn" className="text-gray-400 cursor-pointer">Keep me logged in</label>
        </div>
        
        <button
          type="submit"
          className="w-full bg-purple-500 hover:bg-purple-600 rounded-lg p-3 font-medium mt-6 transition-colors"
        >
          Sign in
        </button>
      </form>
    </div>
  );
};

export default Login;