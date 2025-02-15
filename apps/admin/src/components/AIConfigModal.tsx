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
    maxDailyCost: 1.0,
    maxMonthlyCost: 10.0,
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
    } else {
      setConfig(DEFAULT_CONFIG);
    }
    setError(null);
    setValidationErrors({});
  }, [initialConfig, isOpen]);

  const validateConfig = (config: AIConfig): boolean => {
    const errors: { [key: string]: string } = {};

    if (!config.apiKey) {
      errors.apiKey = 'API key is required';
    }
    if (!config.model) {
      errors.model = 'Model is required';
    }
    if (config.costLimits.maxDailyCost <= 0 || config.costLimits.maxDailyCost > 100) {
      errors.maxDailyCost = 'Daily limit must be between 0 and 100 USD';
    }
    if (config.costLimits.maxMonthlyCost <= 0 || config.costLimits.maxMonthlyCost > 1000) {
      errors.maxMonthlyCost = 'Monthly limit must be between 0 and 1000 USD';
    }
    
    if (config.costLimits.maxMonthlyCost < config.costLimits.maxDailyCost) {
      errors.maxMonthlyCost = 'Monthly limit must be greater than daily limit';
    }

    if (config.costLimits.maxConcurrent <= 0) {
      errors.maxConcurrent = 'Max concurrent API calls must be greater than 0';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateConfig(config)) {
      return;
    }

    try {
      setSaving(true);
      const actor = await getAdminActor();
      const result = await actor.updateAIConfig(config);
      if ('err' in result) {
        setError(result.err);
      } else {
        onSave?.(config);
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
      case 'maxDailyCost':
        finalValue = Math.min(100, Math.max(0, numValue));
        break;
      case 'maxMonthlyCost':
        finalValue = Math.min(1000, Math.max(0, numValue));
        break;
      case 'maxConcurrent':
        finalValue = Math.max(1, numValue);
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
                    value={config.costLimits.maxDailyCost}
                    onChange={(e) => handleInputChange('maxDailyCost', e.target.value)}
                    className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                    placeholder="Daily limit in USD"
                  />
                  {validationErrors.maxDailyCost && (
                    <p className="text-red-400 text-xs mt-1">{validationErrors.maxDailyCost}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Monthly Limit (USD)</label>
                  <input
                    type="text"
                    value={config.costLimits.maxMonthlyCost}
                    onChange={(e) => handleInputChange('maxMonthlyCost', e.target.value)}
                    className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                    placeholder="Monthly limit in USD"
                  />
                  {validationErrors.maxMonthlyCost && (
                    <p className="text-red-400 text-xs mt-1">{validationErrors.maxMonthlyCost}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Max Concurrent API Calls</label>
                  <input
                    type="text"
                    value={config.costLimits.maxConcurrent}
                    onChange={(e) => handleInputChange('maxConcurrent', e.target.value)}
                    className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                    placeholder="Max concurrent calls"
                  />
                  {validationErrors.maxConcurrent && (
                    <p className="text-red-400 text-xs mt-1">{validationErrors.maxConcurrent}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-4">
            {error && (
              <p className="text-red-400 text-sm mr-auto self-center">{error}</p>
            )}
            <button
              onClick={(e) => {
                e.preventDefault();
                onClose();
              }}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
