import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { getAdminActor } from '../lib/admin';

interface GlobalAIConfig {
  enabled: boolean;
  provider: string;
  apiKey?: string;
  model: string;
  maxTokensPerRequest: number;
  features: {
    summarization: boolean;
    categorization: boolean;
    sentimentAnalysis: boolean;
    keywordExtraction: boolean;
  };
}

interface AIConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: GlobalAIConfig | null;
  onSave?: (config: GlobalAIConfig | null) => void;
}

const DEFAULT_CONFIG: GlobalAIConfig = {
  enabled: false,
  provider: 'openai',
  apiKey: '',
  model: 'gpt-3.5-turbo',
  maxTokensPerRequest: 150,
  features: {
    summarization: true,
    categorization: false,
    sentimentAnalysis: false,
    keywordExtraction: true
  }
};

export const AIConfigModal: React.FC<AIConfigModalProps> = ({ 
  isOpen, 
  onClose,
  config: initialConfig,
  onSave
}) => {
  const [config, setConfig] = useState<GlobalAIConfig>(DEFAULT_CONFIG);
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

  const validateConfig = (config: GlobalAIConfig): boolean => {
    const errors: { [key: string]: string } = {};

    if (config.enabled) {
      if (!config.apiKey) {
        errors.apiKey = 'API key is required when AI is enabled';
      }
      if (!config.model) {
        errors.model = 'Model is required';
      }
      if (!config.provider) {
        errors.provider = 'Provider is required';
      }
      if (config.maxTokensPerRequest <= 0 || config.maxTokensPerRequest > 4000) {
        errors.maxTokens = 'Max tokens must be between 1 and 4000';
      }
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
      
      // If AI is disabled, we can pass null to remove the config
      const configToSave = config.enabled ? config : null;
      
      const result = await actor.setGlobalAIConfig(configToSave ? [configToSave] : []);
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

  const handleFeatureToggle = (feature: keyof GlobalAIConfig['features']) => {
    setConfig({
      ...config,
      features: {
        ...config.features,
        [feature]: !config.features[feature]
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
              Global AI Configuration
            </Dialog.Title>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Enable/Disable AI */}
            <div className="flex items-center justify-between p-4 bg-[#131217] rounded-lg border border-[#2C2B33]">
              <div>
                <label className="text-sm font-medium">Enable AI Enhancement</label>
                <p className="text-xs text-gray-400 mt-1">
                  When enabled, AI will enhance scraped content with summaries and keywords
                </p>
              </div>
              <button
                onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.enabled ? 'bg-[#B692F6]' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {config.enabled && (
              <>
                {/* Provider Selection */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">AI Provider</label>
                  <select
                    value={config.provider}
                    onChange={(e) => setConfig({ ...config, provider: e.target.value })}
                    className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                  </select>
                  {validationErrors.provider && (
                    <p className="text-red-400 text-xs mt-1">{validationErrors.provider}</p>
                  )}
                </div>

                {/* API Key */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">API Key</label>
                  <input
                    type="password"
                    value={config.apiKey || ''}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                    placeholder="sk-..."
                  />
                  {validationErrors.apiKey && (
                    <p className="text-red-400 text-xs mt-1">{validationErrors.apiKey}</p>
                  )}
                </div>

                {/* Model */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Model</label>
                  {config.provider === 'openai' ? (
                    <select
                      value={config.model}
                      onChange={(e) => setConfig({ ...config, model: e.target.value })}
                      className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                    >
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Cheapest)</option>
                      <option value="gpt-4-turbo-preview">GPT-4 Turbo</option>
                      <option value="gpt-4">GPT-4</option>
                    </select>
                  ) : config.provider === 'anthropic' ? (
                    <select
                      value={config.model}
                      onChange={(e) => setConfig({ ...config, model: e.target.value })}
                      className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                    >
                      <option value="claude-3-haiku">Claude 3 Haiku (Cheapest)</option>
                      <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                      <option value="claude-3-opus">Claude 3 Opus</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={config.model}
                      onChange={(e) => setConfig({ ...config, model: e.target.value })}
                      className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                      placeholder="Model name"
                    />
                  )}
                  {validationErrors.model && (
                    <p className="text-red-400 text-xs mt-1">{validationErrors.model}</p>
                  )}
                </div>

                {/* Max Tokens */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Max Tokens per Request</label>
                  <input
                    type="number"
                    value={config.maxTokensPerRequest}
                    onChange={(e) => setConfig({ 
                      ...config, 
                      maxTokensPerRequest: parseInt(e.target.value) || 150 
                    })}
                    className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                    min="1"
                    max="4000"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Lower values reduce costs. Recommended: 150 for summaries
                  </p>
                  {validationErrors.maxTokens && (
                    <p className="text-red-400 text-xs mt-1">{validationErrors.maxTokens}</p>
                  )}
                </div>

                {/* AI Features */}
                <div>
                  <h3 className="text-sm font-medium text-gray-200 mb-4">AI Features</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-[#131217] rounded-lg">
                      <div>
                        <label className="text-sm">Summarization</label>
                        <p className="text-xs text-gray-400">Generate concise summaries of content</p>
                      </div>
                      <button
                        onClick={() => handleFeatureToggle('summarization')}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          config.features.summarization ? 'bg-[#B692F6]' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            config.features.summarization ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-[#131217] rounded-lg">
                      <div>
                        <label className="text-sm">Categorization</label>
                        <p className="text-xs text-gray-400">Automatically categorize content</p>
                      </div>
                      <button
                        onClick={() => handleFeatureToggle('categorization')}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          config.features.categorization ? 'bg-[#B692F6]' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            config.features.categorization ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-[#131217] rounded-lg">
                      <div>
                        <label className="text-sm">Sentiment Analysis</label>
                        <p className="text-xs text-gray-400">Analyze content sentiment</p>
                      </div>
                      <button
                        onClick={() => handleFeatureToggle('sentimentAnalysis')}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          config.features.sentimentAnalysis ? 'bg-[#B692F6]' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            config.features.sentimentAnalysis ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-[#131217] rounded-lg">
                      <div>
                        <label className="text-sm">Keyword Extraction</label>
                        <p className="text-xs text-gray-400">Extract key terms and topics</p>
                      </div>
                      <button
                        onClick={() => handleFeatureToggle('keywordExtraction')}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          config.features.keywordExtraction ? 'bg-[#B692F6]' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            config.features.keywordExtraction ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
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
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};