import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { getAdminActor } from '../lib/admin';
import type { AIConfig } from '../types';

interface AIConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: AIConfig | null;
  onSave?: (config: AIConfig) => void;
}

const DEFAULT_CONFIG: AIConfig = {
  apiKey: '',
  model: 'gpt-3.5-turbo',
  costLimits: {
    dailyUSD: 10,
    monthlyUSD: 100,
    maxConcurrent: 5
  }
};

export const AIConfigModal: React.FC<AIConfigModalProps> = ({ 
  isOpen, 
  onClose,
  config: initialConfig,
  onSave
}) => {
  const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    }
    setError(null);
    setValidationErrors({});
  }, [initialConfig]);

  const validateConfig = (config: AIConfig): boolean => {
    const errors: { [key: string]: string } = {};

    if (!config.apiKey) {
      errors.apiKey = 'API key is required';
    }
    if (!config.model) {
      errors.model = 'Model is required';
    }
    if (config.costLimits.dailyUSD <= 0 || config.costLimits.dailyUSD > 100) {
      errors.dailyUSD = 'Daily limit must be between 0 and 100 USD';
    }
    if (config.costLimits.monthlyUSD <= 0 || config.costLimits.monthlyUSD > 1000) {
      errors.monthlyUSD = 'Monthly limit must be between 0 and 1000 USD';
    }
    
    // For maxConcurrent, convert to number and validate
    const maxConcurrent = Number(config.costLimits.maxConcurrent);
    if (isNaN(maxConcurrent) || maxConcurrent < 1 || maxConcurrent > 10 || !Number.isInteger(maxConcurrent)) {
      errors.maxConcurrent = 'Max concurrent must be a whole number between 1 and 10';
    }
    
    if (config.costLimits.monthlyUSD < config.costLimits.dailyUSD) {
      errors.monthlyUSD = 'Monthly limit must be greater than daily limit';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    // Convert maxConcurrent to integer before saving
    const configToSave = {
      ...config,
      costLimits: {
        ...config.costLimits,
        maxConcurrent: Math.floor(Number(config.costLimits.maxConcurrent))
      }
    };

    if (!validateConfig(configToSave)) {
      return;
    }

    try {
      setSaving(true);
      const actor = await getAdminActor();
      const result = await actor.updateAIConfig(configToSave);
      if ('err' in result) {
        setError(result.err);
      } else {
        onSave?.(configToSave);
        onClose();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof AIConfig['costLimits'], value: string) => {
    // Allow empty string for better editing experience
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
    if (isNaN(numValue)) return;

    let finalValue: number | string = numValue;
    switch (field) {
      case 'dailyUSD':
        finalValue = Math.min(100, Math.max(0, numValue));
        break;
      case 'monthlyUSD':
        finalValue = Math.min(1000, Math.max(0, numValue));
        break;
      case 'maxConcurrent':
        // Don't floor the value immediately to allow decimal point editing
        if (numValue > 10) {
          finalValue = 10;
        } else if (numValue < 0) {
          finalValue = 0;
        } else {
          finalValue = value;
        }
        break;
    }

    setConfig({
      ...config,
      costLimits: {
        ...config.costLimits,
        [field]: finalValue
      }
    });
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
        
        <div className="relative bg-[#1C1B23] rounded-lg w-full max-w-2xl p-6 text-white">
          <div className="flex justify-between items-center mb-6">
            <Dialog.Title className="text-lg font-medium">
              AI Configuration
            </Dialog.Title>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs text-gray-400 mb-1">API Key</label>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                placeholder="sk-..."
              />
              {validationErrors.apiKey && (
                <p className="text-red-400 text-xs mt-1">{validationErrors.apiKey}</p>
              )}
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Model</label>
              <input
                type="text"
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                placeholder="e.g., gpt-3.5-turbo"
              />
              {validationErrors.model && (
                <p className="text-red-400 text-xs mt-1">{validationErrors.model}</p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-200 mb-4">Cost Limits</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Daily Limit (USD)</label>
                  <input
                    type="text"
                    value={config.costLimits.dailyUSD}
                    onChange={(e) => handleInputChange('dailyUSD', e.target.value)}
                    className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                  />
                  <p className="text-gray-500 text-xs mt-1">Max: $100</p>
                  {validationErrors.dailyUSD && (
                    <p className="text-red-400 text-xs mt-1">{validationErrors.dailyUSD}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Monthly Limit (USD)</label>
                  <input
                    type="text"
                    value={config.costLimits.monthlyUSD}
                    onChange={(e) => handleInputChange('monthlyUSD', e.target.value)}
                    className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                  />
                  <p className="text-gray-500 text-xs mt-1">Max: $1,000</p>
                  {validationErrors.monthlyUSD && (
                    <p className="text-red-400 text-xs mt-1">{validationErrors.monthlyUSD}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Max Concurrent Requests</label>
                  <input
                    type="text"
                    value={config.costLimits.maxConcurrent}
                    onChange={(e) => handleInputChange('maxConcurrent', e.target.value)}
                    className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                  />
                  <p className="text-gray-500 text-xs mt-1">Between 1 and 10</p>
                  {validationErrors.maxConcurrent && (
                    <p className="text-red-400 text-xs mt-1">{validationErrors.maxConcurrent}</p>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-400 text-red-400 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-[#B692F6] text-[#131217] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 min-w-[100px] relative"
              >
                {saving ? (
                  <>
                    <span className="opacity-0">Save Changes</span>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-[#131217] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
