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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const retryTimeout = useRef<number>();
  const [config, setConfig] = useState<AIConfig>({
    apiKey: '',
    model: '',
    costLimits: {
      dailyUSD: 0,
      monthlyUSD: 0,
      maxConcurrent: 0
    }
  });

  const validateConfig = (config: AIConfig): string | null => {
    if (!config.apiKey) {
      return 'API Key is required';
    }
    if (!config.model) {
      return 'Model is required';
    }
    if (config.costLimits.maxConcurrent < 1 || config.costLimits.maxConcurrent > 10) {
      return 'Max concurrent requests must be between 1 and 10';
    }
    if (config.costLimits.dailyUSD < 0) {
      return 'Daily cost limit must be positive';
    }
    if (config.costLimits.monthlyUSD < 0) {
      return 'Monthly cost limit must be positive';
    }
    if (config.costLimits.monthlyUSD < config.costLimits.dailyUSD) {
      return 'Monthly cost limit must be greater than or equal to daily cost limit';
    }
    return null;
  };

  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const value = e.target.value;
    
    // Allow empty value while typing
    if (value === '') {
      setConfig({
        ...config,
        costLimits: {
          ...config.costLimits,
          [field]: value
        }
      });
      return;
    }

    const numValue = Number(value);
    if (!isNaN(numValue)) {
      // For maxConcurrent, ensure it's between 1 and 10
      if (field === 'maxConcurrent' && (numValue < 1 || numValue > 10)) {
        return;
      }
      
      setConfig({
        ...config,
        costLimits: {
          ...config.costLimits,
          [field]: numValue
        }
      });
    }
  };

  useEffect(() => {
    const loadInitialConfig = async () => {
      if (!isOpen) return;

      try {
        setLoading(true);
        
        // Load current config from canister if not provided
        let currentConfig = initialConfig;
        if (!currentConfig) {
          const actor = await getAdminActor();
          if (!actor) throw new Error('Failed to initialize connection');
          
          const result = await actor.getAIConfig();
          if ('ok' in result) {
            currentConfig = result.ok;
          }
        }

        // Set initial values
        const initialValues = {
          apiKey: currentConfig?.apiKey || '',
          model: currentConfig?.model || 'gpt-3.5-turbo',
          costLimits: {
            dailyUSD: Number(currentConfig?.costLimits?.dailyUSD || 5),
            monthlyUSD: Number(currentConfig?.costLimits?.monthlyUSD || 100),
            maxConcurrent: Number(currentConfig?.costLimits?.maxConcurrent || 1)
          }
        };

        console.log('Setting initial modal values:', {
          model: initialValues.model,
          costLimits: initialValues.costLimits,
          apiKey: initialValues.apiKey ? '[HIDDEN]' : ''
        });
        
        setConfig(initialValues);
        setError(null);
      } catch (error) {
        console.error('Failed to load initial config:', error);
        setError('Failed to load configuration');
      } finally {
        setLoading(false);
      }
    };

    loadInitialConfig();
  }, [isOpen, initialConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate maxConcurrent before submitting
    if (!config.costLimits.maxConcurrent || config.costLimits.maxConcurrent < 1) {
      setConfig({
        ...config,
        costLimits: {
          ...config.costLimits,
          maxConcurrent: 1
        }
      });
      return;
    }
    
    if (!config.apiKey?.trim()) {
      setError('API Key is required');
      return;
    }
    
    try {
      setLoading(true);
      console.log('Submitting config:', {
        model: config.model,
        costLimits: config.costLimits,
        apiKey: '[HIDDEN]'
      });

      const actor = await getAdminActor();
      if (!actor) {
        throw new Error('Failed to initialize connection');
      }

      const result = await actor.updateAIConfig(config);
      if ('ok' in result) {
        onSave(config);
        onClose();
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      console.error('Failed to save AI config:', error);
      setError(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#1E1E1E] rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">AI Configuration</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300"
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="flex items-center space-x-2">
              <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Loading configuration...</span>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-500 text-red-200 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-white mb-2">API Key</label>
                <input
                  type="password"
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  className="w-full bg-[#2D2D2D] text-white p-2 rounded border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-white mb-2">Model</label>
                <select
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  className="w-full bg-[#2D2D2D] text-white p-2 rounded border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  disabled={loading}
                >
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="gpt-4">GPT-4</option>
                </select>
              </div>

              <div>
                <label className="block text-white mb-2">Daily Cost Limit (USD)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={config.costLimits.dailyUSD}
                  onChange={(e) => handleNumberInput(e, 'dailyUSD')}
                  className="w-full bg-[#2D2D2D] text-white p-2 rounded border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  disabled={loading}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-white mb-2">Monthly Cost Limit (USD)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={config.costLimits.monthlyUSD}
                  onChange={(e) => handleNumberInput(e, 'monthlyUSD')}
                  className="w-full bg-[#2D2D2D] text-white p-2 rounded border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  disabled={loading}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-white mb-2">Max Concurrent Requests</label>
                <input
                  type="text"
                  value={config.costLimits.maxConcurrent}
                  onChange={(e) => handleNumberInput(e, 'maxConcurrent')}
                  onBlur={() => {
                    // Only validate on blur
                    const value = config.costLimits.maxConcurrent;
                    if (!value || value < 1) {
                      setConfig({
                        ...config,
                        costLimits: {
                          ...config.costLimits,
                          maxConcurrent: 1
                        }
                      });
                    }
                  }}
                  className="w-full bg-[#2D2D2D] text-white p-2 rounded border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  disabled={loading}
                  placeholder="1"
                />
                <p className="mt-1 text-sm text-gray-400">Maximum number of concurrent AI requests (1-10)</p>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-300 hover:text-white border border-gray-600 rounded hover:bg-gray-700"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
