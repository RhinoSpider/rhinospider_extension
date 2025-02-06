import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { getAdminActor } from '../lib/admin';
import type { ScrapingTopic, ExtractionField } from '../types';

interface TopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic?: ScrapingTopic;
  onSave?: () => void;
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

export const TopicModal: React.FC<TopicModalProps> = ({ isOpen, onClose, topic, onSave }) => {
  const [name, setName] = useState(topic?.name || '');
  const [description, setDescription] = useState(topic?.description || '');
  const [urlPatterns, setUrlPatterns] = useState<string[]>(topic?.urlPatterns || ['']);
  const [fields, setFields] = useState<ExtractionField[]>(
    topic?.extractionRules?.fields || [{ ...DEFAULT_FIELD }]
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (topic) {
      setName(topic.name);
      setDescription(topic.description);
      setUrlPatterns(topic.urlPatterns);
      setFields(topic.extractionRules.fields);
    } else {
      setName('');
      setDescription('');
      setUrlPatterns(['']);
      setFields([{
        name: '',
        description: [],
        example: [],
        aiPrompt: '',
        required: true,
        fieldType: 'text'
      }]);
    }
    setError(null);
    setSaveStatus('idle');
  }, [topic, isOpen]);

  const handleAddUrlPattern = () => {
    setUrlPatterns([...urlPatterns, '']);
  };

  const handleUrlPatternChange = (index: number, value: string) => {
    const newPatterns = [...urlPatterns];
    newPatterns[index] = value;
    setUrlPatterns(newPatterns);
  };

  const handleRemoveUrlPattern = (index: number) => {
    setUrlPatterns(urlPatterns.filter((_, i) => i !== index));
  };

  const handleAddField = () => {
    setFields([...fields, { ...DEFAULT_FIELD }]);
  };

  const handleFieldChange = (index: number, field: Partial<ExtractionField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...field };
    setFields(newFields);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setSaveStatus('saving');
      setError(null);

      if (!name.trim()) {
        throw new Error('Name is required');
      }

      if (!description.trim()) {
        throw new Error('Description is required');
      }

      if (!urlPatterns.some(p => p.trim())) {
        throw new Error('At least one URL pattern is required');
      }

      if (fields.length === 0) {
        throw new Error('At least one field is required');
      }

      for (const field of fields) {
        if (!field.name.trim()) {
          throw new Error('Field names are required');
        }
        if (!field.aiPrompt.trim()) {
          throw new Error('AI prompts are required');
        }
      }

      const newTopic: ScrapingTopic = {
        id: topic?.id || crypto.randomUUID(),
        name: name.trim(),
        description: description.trim(),
        urlPatterns: urlPatterns.filter(p => p.trim()),
        active: true,
        extractionRules: {
          fields: fields.map(f => ({
            name: f.name.trim(),
            description: f.description || [],
            example: f.example || [],
            aiPrompt: f.aiPrompt.trim(),
            required: f.required,
            fieldType: f.fieldType
          })),
          customPrompt: []
        },
        validation: [],
        rateLimit: [],
        createdAt: BigInt(topic?.createdAt || Date.now())
      };

      console.log('Sending topic to canister:', newTopic);

      const actor = await getAdminActor();
      let result;
      
      if (topic) {
        console.log('Updating existing topic:', topic.id);
        result = await actor.updateTopic(topic.id, newTopic);
      } else {
        console.log('Creating new topic');
        result = await actor.createTopic(newTopic);
      }

      console.log('Canister response:', result);

      if ('ok' in result) {
        setSaveStatus('success');
        setTimeout(() => {
          onClose();
        }, 1000);
      } else if ('err' in result) {
        throw new Error(result.err);
      } else {
        throw new Error('Unexpected response from canister');
      }
    } catch (err) {
      console.error('Failed to save topic:', err);
      setSaveStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to save topic');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={() => !saving && onClose()}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="relative mx-auto w-full max-w-2xl rounded-xl bg-[#1C1B23] text-white">
          <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[800px]">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <Dialog.Title className="text-xl font-semibold">
                {topic ? 'Edit Topic' : 'Create New Topic'}
              </Dialog.Title>
              <button
                onClick={() => !saving && onClose()}
                className="text-gray-400 hover:text-white"
                disabled={saving}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-200 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-md bg-[#2C2B33] border-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
                      placeholder="e.g., Amazon Product Details"
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-200 mb-1">
                      Description
                    </label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="w-full rounded-md bg-[#2C2B33] border-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
                      placeholder="e.g., Extracts product information from Amazon product pages"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-1">
                      URL Patterns
                    </label>
                    <div className="space-y-2">
                      {urlPatterns.map((pattern, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={pattern}
                            onChange={(e) => handleUrlPatternChange(index, e.target.value)}
                            className="w-full rounded-md bg-[#2C2B33] border-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
                            placeholder="e.g., https://www.amazon.com/*/dp/*"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveUrlPattern(index)}
                            className="p-2 text-gray-400 hover:text-white"
                            disabled={urlPatterns.length === 1}
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleAddUrlPattern}
                      className="mt-2 text-sm text-blue-500 hover:text-blue-400"
                    >
                      + Add URL Pattern
                    </button>
                  </div>

                  {/* Fields */}
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-1">
                      Extraction Fields
                    </label>
                    <div className="space-y-4">
                      {fields.map((field, index) => (
                        <div
                          key={index}
                          className="p-4 bg-[#1C1B23] rounded-lg space-y-4"
                        >
                          <div className="flex justify-between items-center">
                            <h4 className="text-sm font-medium text-gray-200">Field {index + 1}</h4>
                            <button
                              type="button"
                              onClick={() => handleRemoveField(index)}
                              className="p-1 text-gray-400 hover:text-white"
                              disabled={fields.length === 1}
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-200 mb-1">
                                Field Name
                              </label>
                              <input
                                type="text"
                                value={field.name}
                                onChange={(e) => handleFieldChange(index, { name: e.target.value })}
                                className="w-full rounded-md bg-[#2C2B33] border-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
                                placeholder="e.g., title"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-200 mb-1">
                                Description
                              </label>
                              <input
                                type="text"
                                value={field.description || ''}
                                onChange={(e) => handleFieldChange(index, { description: [e.target.value] })}
                                className="w-full rounded-md bg-[#2C2B33] border-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
                                placeholder="e.g., Product title"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-200 mb-1">
                              Example
                            </label>
                            <input
                              type="text"
                              value={field.example || ''}
                              onChange={(e) => handleFieldChange(index, { example: [e.target.value] })}
                              className="w-full rounded-md bg-[#2C2B33] border-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
                              placeholder="e.g., Apple iPhone 13"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-200 mb-1">
                              AI Prompt
                            </label>
                            <textarea
                              value={field.aiPrompt}
                              onChange={(e) => handleFieldChange(index, { aiPrompt: e.target.value })}
                              rows={3}
                              className="w-full rounded-md bg-[#2C2B33] border-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
                              placeholder="Describe how to extract this field..."
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-200 mb-1">
                              Type
                            </label>
                            <select
                              value={field.fieldType}
                              onChange={(e) => handleFieldChange(index, { fieldType: e.target.value })}
                              className="w-full rounded-md bg-[#2C2B33] border-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
                            >
                              {FIELD_TYPES.map(type => (
                                <option key={type} value={type}>
                                  {type.charAt(0).toUpperCase() + type.slice(1)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => handleFieldChange(index, { required: e.target.checked })}
                              className="rounded border-gray-700 text-blue-500 focus:ring-blue-500 bg-[#2C2B33]"
                            />
                            <label className="text-sm text-gray-200">Required Field</label>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleAddField}
                      className="mt-4 text-sm text-blue-500 hover:text-blue-400"
                    >
                      + Add Field
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-700 bg-[#1C1B23]">
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => !saving && onClose()}
                  className="px-4 py-2 text-gray-300 hover:text-white"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Topic'}
                </button>
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-500">{error}</p>
              )}
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
