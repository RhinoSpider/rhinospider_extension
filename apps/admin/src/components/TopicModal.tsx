import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { getAdminActor } from '../lib/admin';
import type { ScrapingTopic, ExtractionField, CreateTopicRequest } from '../types';
import { validateUrlPattern } from '../lib/validation';
import { ExtractionTester } from './ExtractionTester';

interface TopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic?: ScrapingTopic;
  onSave?: (topic: ScrapingTopic) => void;
}

const FIELD_TYPES = ['text', 'number', 'date', 'list', 'boolean'] as const;

const DEFAULT_FIELD: ExtractionField = {
  name: '',
  fieldType: 'text',
  required: true,
  aiPrompt: '',
  description: [],
  example: [],
  validation: {
    minLength: 1,
    maxLength: 1000
  }
};

// Helper function to generate a unique ID
const generateId = () => {
  return 'topic_' + Math.random().toString(36).substr(2, 9);
};

export const TopicModal: React.FC<TopicModalProps> = ({ isOpen, onClose, topic, onSave }) => {
  const [name, setName] = useState(topic?.name || '');
  const [description, setDescription] = useState(topic?.description || '');
  const [urlPatterns, setUrlPatterns] = useState<string[]>(topic?.urlPatterns || ['']);
  const [fields, setFields] = useState<ExtractionField[]>(
    topic?.extractionRules?.fields.map(f => ({
      ...f,
      description: f.description || [],
      example: f.example || [],
    })) || [{ 
      name: '',
      fieldType: 'text',
      required: true,
      aiPrompt: '',
      description: [],
      example: [],
      validation: {
        minLength: 1,
        maxLength: 1000
      }
    }]
  );
  const [urlErrors, setUrlErrors] = useState<{ [key: number]: string[] }>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [showTester, setShowTester] = useState(false);
  const [customPrompt, setCustomPrompt] = useState<string>(topic?.extractionRules?.customPrompt?.[0] || '');
  const [useAutoPrompt, setUseAutoPrompt] = useState(false);

  useEffect(() => {
    if (topic) {
      setName(topic.name);
      setDescription(topic.description);
      setUrlPatterns(topic.urlPatterns);
      setFields(topic.extractionRules.fields.map(f => ({
        ...f,
        description: f.description || [],
        example: f.example || [],
      })));
      setCustomPrompt(topic.extractionRules.customPrompt?.[0] || '');
    } else {
      setName('');
      setDescription('');
      setUrlPatterns(['']);
      setFields([{ 
        name: '',
        fieldType: 'text',
        required: true,
        aiPrompt: '',
        description: [],
        example: [],
        validation: {
          minLength: 1,
          maxLength: 1000
        }
      }]);
      setCustomPrompt('');
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

  const generateCustomPrompt = () => {
    const prompt = `This webpage contains ${name.toLowerCase()} information. ${description}\n\nPlease extract the requested information from the relevant sections of the webpage. If the information is not found, return "Not found".`;
    setCustomPrompt(prompt);
  };

  useEffect(() => {
    if (useAutoPrompt) {
      generateCustomPrompt();
    }
  }, [name, description, useAutoPrompt]);

  const handleSave = () => {
    // Validate required fields
    if (!name) {
      setError('Name is required');
      return;
    }

    // Validate URL patterns
    for (const [index, pattern] of urlPatterns.entries()) {
      const result = validateUrlPattern(pattern);
      if (result.errors.length > 0) {
        setUrlErrors({ ...urlErrors, [index]: result.errors });
        return;
      }
    }

    // Create a ScrapingTopic with createdAt
    const newTopic: ScrapingTopic = {
      id: topic?.id || generateId(),  // Use existing ID when editing, generate new one when creating
      name,
      description: description || '',
      urlPatterns,
      active: true,
      extractionRules: {
        fields: fields.map(f => ({
          name: f.name,
          fieldType: f.fieldType,
          required: f.required,
          aiPrompt: f.aiPrompt,
          description: [],  // Empty array for no description
          example: [],     // Empty array for no example
        })),
        customPrompt: customPrompt ? [customPrompt] : [],
      },
      validation: [],  // Empty array for no validation
      rateLimit: [],  // Empty array for no rate limit
      createdAt: topic?.createdAt || BigInt(Date.now()),
    };

    // If editing, preserve existing optional fields
    if (topic) {
      newTopic.validation = topic.validation || [];
      newTopic.rateLimit = topic.rateLimit || [];
    }

    onSave(newTopic);
    onClose();
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

  const handleFieldChange = (index: number, field: keyof ExtractionField, value: string | boolean) => {
    const newFields = [...fields];
    newFields[index] = { ...fields[index], [field]: value };
    setFields(newFields);
  };

  const removeField = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index);
    setFields(newFields);
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

            {/* Custom Prompt Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Custom Prompt</label>
                <div className="flex items-center">
                  <label className="text-sm text-gray-400 mr-2">Auto-generate</label>
                  <input
                    type="checkbox"
                    checked={useAutoPrompt}
                    onChange={(e) => setUseAutoPrompt(e.target.checked)}
                    className="rounded bg-[#131217] border-[#2C2B33] text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <textarea
                value={customPrompt}
                onChange={(e) => {
                  setUseAutoPrompt(false);
                  setCustomPrompt(e.target.value);
                }}
                className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                rows={3}
                placeholder="Optional: Add context about the webpage structure or specific instructions for all fields"
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

            {/* Extraction Rules */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <div>
                  <label className="block text-sm font-medium">Fields to Extract</label>
                  <p className="text-xs text-gray-400">Define what data should be extracted from each webpage</p>
                </div>
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
                    Add New Field
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={field.name}
                        onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                        placeholder="Field Name"
                        className="bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white w-full"
                      />
                      <select
                        value={field.fieldType}
                        onChange={(e) => handleFieldChange(index, 'fieldType', e.target.value)}
                        className="bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                      >
                        {FIELD_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => handleFieldChange(index, 'required', e.target.checked)}
                          className="bg-[#131217] text-[#B692F6]"
                        />
                        <label className="text-sm text-gray-400">Required</label>
                      </div>
                      <button
                        onClick={() => removeField(index)}
                        className="text-red-500 hover:text-red-400"
                      >
                        Remove
                      </button>
                    </div>
                    <textarea
                      value={field.aiPrompt}
                      onChange={(e) => handleFieldChange(index, 'aiPrompt', e.target.value)}
                      placeholder="AI Prompt"
                      className="bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white w-full h-20"
                    />
                  </div>
                ))}
              </div>
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
