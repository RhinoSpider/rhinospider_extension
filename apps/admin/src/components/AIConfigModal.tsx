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

  // Load initial config
  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    }
  }, [initialConfig]);

  const validateConfig = (config: AIConfig): string | null => {
    if (!config.apiKey) {
      return 'API key is required';
    }
    if (!config.model) {
      return 'Model is required';
    }
    if (config.costLimits.dailyUSD <= 0) {
      return 'Daily limit must be greater than 0';
    }
    if (config.costLimits.monthlyUSD <= 0) {
      return 'Monthly limit must be greater than 0';
    }
    if (config.costLimits.maxConcurrent <= 0) {
      return 'Max concurrent must be greater than 0';
    }
    return null;
  };

  const handleSave = async () => {
    const validationError = validateConfig(config);
    if (validationError) {
      setError(validationError);
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

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md rounded bg-white p-6 w-full">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-medium">AI Configuration</Dialog.Title>
            <button onClick={onClose}>
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">API Key</label>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Model</label>
              <input
                type="text"
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Daily Limit (USD)</label>
              <input
                type="number"
                value={config.costLimits.dailyUSD}
                onChange={(e) => setConfig({
                  ...config,
                  costLimits: {
                    ...config.costLimits,
                    dailyUSD: Number(e.target.value)
                  }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Monthly Limit (USD)</label>
              <input
                type="number"
                value={config.costLimits.monthlyUSD}
                onChange={(e) => setConfig({
                  ...config,
                  costLimits: {
                    ...config.costLimits,
                    monthlyUSD: Number(e.target.value)
                  }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Max Concurrent</label>
              <input
                type="number"
                value={config.costLimits.maxConcurrent}
                onChange={(e) => setConfig({
                  ...config,
                  costLimits: {
                    ...config.costLimits,
                    maxConcurrent: Number(e.target.value)
                  }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <div className="mt-5 sm:mt-6">
              <button
                type="button"
                className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:text-sm"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
