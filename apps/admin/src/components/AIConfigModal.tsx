import React, { useState, useEffect, useRef } from 'react';
import { getAdminActor } from '../lib/admin';
import { getAuthClient } from '../lib/auth';
import type { AIConfig } from '../types';

interface AIConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: AIConfig | null;
  onSave?: (config: AIConfig) => void;
}

export const AIConfigModal: React.FC<AIConfigModalProps> = ({ 
  isOpen, 
  onClose,
  config: initialConfig,
  onSave
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const retryTimeout = useRef<number>();
  const [config, setConfig] = useState<AIConfig>({
    apiKey: '',
    model: 'gpt-3.5-turbo',
    costLimits: {
      dailyUSD: 5,
      monthlyUSD: 100,
      maxConcurrent: 5
    }
  });

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
    return () => {
      if (retryTimeout.current) {
        clearTimeout(retryTimeout.current);
      }
      setRetryCount(0);
    };
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const authClient = getAuthClient();
      const isAuth = await authClient.isAuthenticated();
      
      if (!isAuth) {
        if (retryCount < 3) {
          setError('Please log in to view the configuration. Redirecting to login...');
          await authClient.login();
          return;
        } else {
          setError('Login timeout. Please refresh the page and try again.');
          return;
        }
      }
      
      const actor = await getAdminActor();
      if (!actor) {
        if (retryCount < 3) {
          setError('Initializing connection. Please wait...');
          retryTimeout.current = window.setTimeout(() => {
            setRetryCount(prev => prev + 1);
            loadConfig();
          }, 2000);
        } else {
          setError('Failed to initialize connection. Please refresh the page and try again.');
        }
        return;
      }

      setRetryCount(0);
      const result = await actor.getAIConfig();
      
      if ('Ok' in result) {
        setConfig(result.Ok);
        setError(null);
      } else {
        setError(result.Err);
      }
    } catch (error) {
      console.error('Failed to load AI config:', error);
      if (error instanceof Error) {
        setError(error.message || 'Failed to load configuration. Please try again.');
      } else {
        setError('Failed to load configuration. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      setLoading(true);

      const authClient = getAuthClient();
      const isAuth = await authClient.isAuthenticated();

      if (!isAuth) {
        setError('Please log in to save the configuration. Redirecting to login...');
        await authClient.login();
        return;
      }

      const actor = await getAdminActor();
      if (!actor) {
        setError('Failed to initialize connection. Please try again.');
        return;
      }

      const result = await actor.updateAIConfig(config);
      
      if ('Ok' in result) {
        if (onSave) {
          onSave(config);
        }
        onClose();
      } else {
        setError(result.Err);
      }
    } catch (error) {
      console.error('Failed to update AI config:', error);
      if (error instanceof Error) {
        setError(error.message || 'Failed to save configuration. Please try again.');
      } else {
        setError('Failed to save configuration. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#1C1B23] rounded-lg w-full max-w-lg">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Configure AI</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="bg-red-500 bg-opacity-10 text-red-500 px-4 py-2 rounded mb-4">
              {error}
            </div>
          )}

          {loading && (
            <div className="bg-blue-500 bg-opacity-10 text-blue-500 px-4 py-2 rounded mb-4">
              Loading...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[#B692F6] mb-2">OpenAI API Key</label>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                className="w-full bg-[#131217] text-white p-2 rounded border border-[#2D2B37] focus:border-[#B692F6] focus:outline-none"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-[#B692F6] mb-2">Model</label>
              <select
                value={config.model}
                onChange={(e) => setConfig(prev => ({ ...prev, model: e.target.value }))}
                className="w-full bg-[#131217] text-white p-2 rounded border border-[#2D2B37] focus:border-[#B692F6] focus:outline-none"
                disabled={loading}
              >
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo ($0.002/1K tokens)</option>
                <option value="gpt-4">GPT-4 ($0.03/1K tokens)</option>
              </select>
            </div>

            <div>
              <label className="block text-[#B692F6] mb-2">Cost Limits</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Daily Limit (USD)</label>
                  <input
                    type="number"
                    value={config.costLimits.dailyUSD}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      costLimits: {
                        ...prev.costLimits,
                        dailyUSD: parseInt(e.target.value)
                      }
                    }))}
                    className="w-full bg-[#131217] text-white p-2 rounded border border-[#2D2B37] focus:border-[#B692F6] focus:outline-none"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Monthly Limit (USD)</label>
                  <input
                    type="number"
                    value={config.costLimits.monthlyUSD}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      costLimits: {
                        ...prev.costLimits,
                        monthlyUSD: parseInt(e.target.value)
                      }
                    }))}
                    className="w-full bg-[#131217] text-white p-2 rounded border border-[#2D2B37] focus:border-[#B692F6] focus:outline-none"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-white hover:bg-[#2D2B37] rounded"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-4 py-2 bg-[#B692F6] text-[#131217] rounded ${
                  loading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
                }`}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
