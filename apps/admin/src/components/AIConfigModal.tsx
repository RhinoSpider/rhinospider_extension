import React, { useState, useEffect } from 'react';
import { getAdminActor } from '../lib/admin';
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
  const [config, setConfig] = useState<AIConfig>({
    apiKey: '',
    model: 'gpt-3.5-turbo',  // Cheaper model
    costLimits: {
      dailyUSD: 5,     // Default daily limit $5
      monthlyUSD: 100, // Default monthly limit $100
      maxConcurrent: 5
    }
  });

  useEffect(() => {
    if (isOpen) {
      if (initialConfig) {
        setConfig(initialConfig);
      } else {
        loadConfig();
      }
    } else {
      // Reset to defaults when modal closes
      setConfig({
        apiKey: '',
        model: 'gpt-3.5-turbo',
        costLimits: {
          dailyUSD: 5,
          monthlyUSD: 100,
          maxConcurrent: 5
        }
      });
    }
  }, [isOpen, initialConfig]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const actor = await getAdminActor();
      const result = await actor.getAIConfig();
      if ('Ok' in result) {
        setConfig(result.Ok);
      }
    } catch (error) {
      console.error('Failed to load AI config:', error);
      setError('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      setLoading(true);
      const actor = await getAdminActor();
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
      setError('Failed to save configuration');
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
              ✕
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500 bg-opacity-10 text-red-500 px-4 py-2 rounded">
                {error}
              </div>
            )}

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-[#B692F6] mb-2">
                OpenAI API Key
              </label>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                className="w-full bg-[#131217] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#B692F6]"
                placeholder="sk-..."
                required
              />
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium text-[#B692F6] mb-2">
                Model
              </label>
              <select
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                className="w-full bg-[#131217] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#B692F6]"
              >
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo ($0.002/1K tokens)</option>
                <option value="gpt-4">GPT-4 ($0.03/1K tokens)</option>
              </select>
            </div>

            {/* Cost Limits */}
            <div>
              <label className="block text-sm font-medium text-[#B692F6] mb-2">
                Cost Limits
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Daily Limit (USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={config.costLimits.dailyUSD}
                    onChange={(e) => setConfig({
                      ...config,
                      costLimits: {
                        ...config.costLimits,
                        dailyUSD: parseFloat(e.target.value)
                      }
                    })}
                    className="w-full bg-[#131217] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#B692F6]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Monthly Limit (USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={config.costLimits.monthlyUSD}
                    onChange={(e) => setConfig({
                      ...config,
                      costLimits: {
                        ...config.costLimits,
                        monthlyUSD: parseFloat(e.target.value)
                      }
                    })}
                    className="w-full bg-[#131217] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#B692F6]"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-[#B692F6] text-[#131217] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
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
