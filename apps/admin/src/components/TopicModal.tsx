import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { getAdminActor } from '../lib/admin';
import type { ScrapingTopic, ExtractionField } from '../types';
import { validateUrlPattern, validateRateLimit } from '../lib/validation';

interface TopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic?: ScrapingTopic;
  onSave?: (topic: ScrapingTopic) => void;
}

const FIELD_TYPES = ['text', 'number', 'date', 'list', 'boolean'] as const;

const DEFAULT_FIELD: ExtractionField = {
  name: '',
  description: [],
  example: [],
  aiPrompt: '',
  required: true,
  fieldType: 'text',
  validation: {
    minLength: 1,
    maxLength: 1000
  }
};

const DEFAULT_RATE_LIMIT = {
  requestsPerHour: 60,
  maxConcurrent: 5
};

export const TopicModal: React.FC<TopicModalProps> = ({ isOpen, onClose, topic, onSave }) => {
  const [name, setName] = useState(topic?.name || '');
  const [description, setDescription] = useState(topic?.description || '');
  const [urlPatterns, setUrlPatterns] = useState<string[]>(topic?.urlPatterns || ['']);
  const [fields, setFields] = useState<ExtractionField[]>(
    topic?.extractionRules?.fields || [{ ...DEFAULT_FIELD }]
  );
  const [rateLimit, setRateLimit] = useState(topic?.rateLimit || DEFAULT_RATE_LIMIT);
  const [urlErrors, setUrlErrors] = useState<{ [key: number]: string[] }>({});
  const [rateLimitErrors, setRateLimitErrors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [showTester, setShowTester] = useState(false);

  useEffect(() => {
    if (topic) {
      setName(topic.name);
      setDescription(topic.description);
      setUrlPatterns(topic.urlPatterns);
      setFields(topic.extractionRules.fields);
      setRateLimit(topic.rateLimit || DEFAULT_RATE_LIMIT);
    } else {
      setName('');
      setDescription('');
      setUrlPatterns(['']);
      setFields([{ ...DEFAULT_FIELD }]);
      setRateLimit(DEFAULT_RATE_LIMIT);
    }
    setError(null);
    setSaveStatus('idle');
    setShowTester(false);
  }, [topic, isOpen]);

  const validateUrlPatterns = () => {
    const errors: { [key: number]: string[] } = {};
    let hasErrors = false;

    urlPatterns.forEach((pattern, index) => {
      const result = validateUrlPattern(pattern);
      if (result.errors.length > 0) {
        errors[index] = result.errors;
        if (!result.isValid) {
          hasErrors = true;
        }
      }
    });

    setUrlErrors(errors);
    return !hasErrors;
  };

  const validateRateLimits = () => {
    const result = validateRateLimit(rateLimit.requestsPerHour, rateLimit.maxConcurrent);
    setRateLimitErrors(result.errors);
    return result.isValid;
  };

  const handleSave = async () => {
    if (!validateUrlPatterns() || !validateRateLimits()) {
      return;
    }

    try {
      setSaving(true);
      setSaveStatus('saving');
      setError(null);

      const newTopic: ScrapingTopic = {
        id: topic?.id || '',
        name,
        description,
        urlPatterns,
        active: topic?.active || true,
        extractionRules: {
          fields,
          customPrompt: topic?.extractionRules?.customPrompt || []
        },
        rateLimit: [rateLimit],
        validation: topic?.validation || []
      };

      onSave?.(newTopic);
      setSaveStatus('success');
    } catch (err) {
      console.error('Failed to save topic:', err);
      setError(err instanceof Error ? err.message : 'Failed to save topic');
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddUrlPattern = () => {
    setUrlPatterns([...urlPatterns, '']);
  };

  const handleRemoveUrlPattern = (index: number) => {
    setUrlPatterns(urlPatterns.filter((_, i) => i !== index));
    const { [index]: _, ...rest } = urlErrors;
    setUrlErrors(rest);
  };

  const handleUrlPatternChange = (index: number, value: string) => {
    const newPatterns = [...urlPatterns];
    newPatterns[index] = value;
    setUrlPatterns(newPatterns);

    // Validate the new pattern
    const result = validateUrlPattern(value);
    setUrlErrors({ ...urlErrors, [index]: result.errors });
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

        <div className="relative bg-[#1C1B23] rounded-lg w-full max-w-4xl p-6 text-white">
          <div className="flex justify-between items-center mb-6">
            <Dialog.Title className="text-xl font-semibold">
              {topic ? 'Edit Topic' : 'New Topic'}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                placeholder="Enter topic name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white h-20"
                placeholder="Enter topic description"
              />
            </div>

            {/* URL Patterns */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">URL Patterns</label>
                <button
                  onClick={handleAddUrlPattern}
                  className="text-[#B692F6] hover:text-white transition-colors text-sm"
                >
                  Add Pattern
                </button>
              </div>
              <div className="space-y-3">
                {urlPatterns.map((pattern, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={pattern}
                        onChange={(e) => handleUrlPatternChange(index, e.target.value)}
                        className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                        placeholder="e.g., https://example.com/*"
                      />
                      {urlErrors[index]?.map((error, i) => (
                        <p key={i} className={`text-xs mt-1 ${error.includes('Consider') ? 'text-yellow-400' : 'text-red-400'}`}>
                          {error}
                        </p>
                      ))}
                    </div>
                    {urlPatterns.length > 1 && (
                      <button
                        onClick={() => handleRemoveUrlPattern(index)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Rate Limiting */}
            <div>
              <label className="block text-sm font-medium mb-2">Rate Limiting</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Requests per Hour</label>
                  <input
                    type="number"
                    value={rateLimit.requestsPerHour}
                    onChange={(e) => setRateLimit({ ...rateLimit, requestsPerHour: parseInt(e.target.value) })}
                    className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Max Concurrent</label>
                  <input
                    type="number"
                    value={rateLimit.maxConcurrent}
                    onChange={(e) => setRateLimit({ ...rateLimit, maxConcurrent: parseInt(e.target.value) })}
                    className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                    min="0"
                  />
                </div>
              </div>
              {rateLimitErrors.map((error, i) => (
                <p key={i} className="text-xs mt-1 text-red-400">
                  {error}
                </p>
              ))}
            </div>

            {/* Extraction Rules */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">Extraction Rules</label>
                <div className="space-x-4">
                  <button
                    onClick={() => setShowTester(true)}
                    className="text-[#B692F6] hover:text-white transition-colors text-sm"
                  >
                    Test Rules
                  </button>
                  <button
                    onClick={() => setFields([...fields, { ...DEFAULT_FIELD }])}
                    className="text-[#B692F6] hover:text-white transition-colors text-sm"
                  >
                    Add Field
                  </button>
                </div>
              </div>
              {/* ... rest of the extraction rules UI ... */}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/20 border border-red-400 text-red-400 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Action Buttons */}
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
                className="px-4 py-2 bg-[#B692F6] text-[#131217] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Topic'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Extraction Tester Modal */}
      {showTester && (
        <ExtractionTester
          topic={{
            extractionRules: {
              fields,
              customPrompt: topic?.extractionRules?.customPrompt || []
            }
          }}
          onClose={() => setShowTester(false)}
        />
      )}
    </Dialog>
  );
};
