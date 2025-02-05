import React, { useState, useEffect } from 'react';
import { getAdminActor } from '../lib/admin';
import type { ScrapingTopic, ExtractionField } from '../types';

interface TopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic?: ScrapingTopic;
}

const FIELD_TYPES = ['text', 'number', 'url', 'image', 'list'] as const;

const DEFAULT_FIELD: ExtractionField = {
  name: '',
  aiPrompt: '',
  required: true,
  type: 'text',
  validation: {
    minLength: 1,
    maxLength: 1000
  }
};

export const TopicModal: React.FC<TopicModalProps> = ({ isOpen, onClose, topic }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(topic?.name || '');
  const [description, setDescription] = useState(topic?.description || '');
  const [urlPatterns, setUrlPatterns] = useState<string[]>(topic?.urlPatterns || ['']);
  const [fields, setFields] = useState<ExtractionField[]>(
    topic?.extractionRules?.fields || [{ ...DEFAULT_FIELD }]
  );

  useEffect(() => {
    if (isOpen && topic) {
      setName(topic.name);
      setDescription(topic.description || '');
      setUrlPatterns(topic.urlPatterns);
      setFields(topic.extractionRules.fields);
    }
  }, [isOpen, topic]);

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

  const validateForm = (): string | null => {
    if (!name.trim()) return 'Topic name is required';
    if (urlPatterns.length === 0) return 'At least one URL pattern is required';
    if (urlPatterns.some(p => !p.trim())) return 'URL patterns cannot be empty';
    if (fields.length === 0) return 'At least one field is required';
    
    for (const field of fields) {
      if (!field.name.trim()) return 'Field names are required';
      if (!field.aiPrompt.trim()) return 'AI prompts are required';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const newTopic: ScrapingTopic = {
        id: topic?.id || crypto.randomUUID(),
        name,
        description,
        urlPatterns: urlPatterns.filter(p => p.trim()),
        extractionRules: {
          fields: fields.map(f => ({
            ...f,
            name: f.name.trim(),
            aiPrompt: f.aiPrompt.trim()
          }))
        },
        active: true,
        createdAt: topic?.createdAt || Date.now()
      };

      const actor = await getAdminActor();
      const result = await actor.updateTopic(newTopic);

      if ('Ok' in result) {
        onClose();
      } else {
        setError(result.Err);
      }
    } catch (error) {
      console.error('Failed to save topic:', error);
      setError('Failed to save topic');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#1C1B23] rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-6">
            {topic ? 'Edit Topic' : 'New Topic'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#B692F6] mb-2">
                  Topic Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#131217] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#B692F6]"
                  placeholder="e.g., Product Details"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#B692F6] mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#131217] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#B692F6]"
                  placeholder="What kind of data will be scraped?"
                  rows={3}
                />
              </div>
            </div>

            {/* URL Patterns */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium text-[#B692F6]">
                  URL Patterns
                </label>
                <button
                  type="button"
                  onClick={handleAddUrlPattern}
                  className="text-[#B692F6] hover:text-white transition-colors"
                >
                  + Add Pattern
                </button>
              </div>
              <div className="space-y-3">
                {urlPatterns.map((pattern, index) => (
                  <div key={index} className="flex space-x-2">
                    <input
                      type="text"
                      value={pattern}
                      onChange={(e) => handleUrlPatternChange(index, e.target.value)}
                      className="flex-1 bg-[#131217] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#B692F6]"
                      placeholder="e.g., https://example.com/products/*"
                      required
                    />
                    {urlPatterns.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveUrlPattern(index)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Extraction Fields */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium text-[#B692F6]">
                  Extraction Fields
                </label>
                <button
                  type="button"
                  onClick={handleAddField}
                  className="text-[#B692F6] hover:text-white transition-colors"
                >
                  + Add Field
                </button>
              </div>
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={index} className="bg-[#131217] p-4 rounded-lg space-y-4">
                    <div className="flex justify-between">
                      <h3 className="text-white font-medium">Field {index + 1}</h3>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveField(index)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">
                          Field Name
                        </label>
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => handleFieldChange(index, { name: e.target.value })}
                          className="w-full bg-[#1C1B23] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#B692F6]"
                          placeholder="e.g., price"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-400 mb-1">
                          Type
                        </label>
                        <select
                          value={field.type}
                          onChange={(e) => handleFieldChange(index, { type: e.target.value as any })}
                          className="w-full bg-[#1C1B23] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#B692F6]"
                        >
                          {FIELD_TYPES.map(type => (
                            <option key={type} value={type}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        AI Prompt
                      </label>
                      <textarea
                        value={field.aiPrompt}
                        onChange={(e) => handleFieldChange(index, { aiPrompt: e.target.value })}
                        className="w-full bg-[#1C1B23] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#B692F6]"
                        placeholder="Instructions for AI to extract this field"
                        rows={2}
                        required
                      />
                    </div>

                    <div className="flex items-center space-x-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => handleFieldChange(index, { required: e.target.checked })}
                          className="form-checkbox bg-[#1C1B23] text-[#B692F6] rounded focus:ring-[#B692F6]"
                        />
                        <span className="text-sm text-gray-400">Required</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-white hover:text-[#B692F6] transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#B692F6] text-[#131217] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Topic'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
