import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { getAdminActor } from '../lib/admin';
import type { ScrapingTopic, ExtractionField, CreateTopicRequest } from '../types';
import { ExtractionTester } from './ExtractionTester';

interface TopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic?: ScrapingTopic;
  onSave?: (topic: ScrapingTopic) => void;
}

// Helper function to generate a unique ID
const generateId = () => {
  return 'topic_' + Math.random().toString(36).substr(2, 9);
};

// Helper function to generate custom prompt
const generateCustomPrompt = (name: string, description: string) => {
  if (!name && !description) return '';
  return `Extract information from the webpage about ${name}. ${description}`;
};

export const TopicModal: React.FC<TopicModalProps> = ({ isOpen, onClose, topic, onSave }) => {
  const [formData, setFormData] = useState<Partial<CreateTopicRequest>>({
    id: topic?.id || generateId(),
    name: topic?.name || '',
    description: topic?.description || '',
    urlPatterns: topic?.urlPatterns || [''],
    status: topic?.status || 'active',
    extractionRules: {
      fields: [{
        name: '',
        fieldType: 'text',
        required: true,
        aiPrompt: ''
      }],
      customPrompt: ''
    },
    aiConfig: {
      apiKey: "",
      model: "gpt-3.5-turbo",
      costLimits: {
        maxDailyCost: 1.0,
        maxMonthlyCost: 10.0,
        maxConcurrent: 5
      }
    },
    scrapingInterval: 3600,
    activeHours: {
      start: 0,
      end: 24
    },
    maxRetries: 3
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showTestRules, setShowTestRules] = useState(false);

  useEffect(() => {
    if (topic) {
      setFormData({
        id: topic.id,
        name: topic.name,
        description: topic.description,
        urlPatterns: topic.urlPatterns,
        status: topic.status,
        extractionRules: {
          fields: topic.extractionRules.fields.map(field => ({
            ...field,
            aiPrompt: field.aiPrompt || ''
          })),
          customPrompt: topic.extractionRules.customPrompt || ''
        },
        aiConfig: topic.aiConfig,
        scrapingInterval: topic.scrapingInterval,
        activeHours: topic.activeHours,
        maxRetries: topic.maxRetries
      });
    } else {
      setFormData({
        id: generateId(),
        name: '',
        description: '',
        urlPatterns: [''],
        status: 'active',
        extractionRules: {
          fields: [{
            name: '',
            fieldType: 'text',
            required: true,
            aiPrompt: ''
          }],
          customPrompt: ''
        },
        aiConfig: {
          apiKey: "",
          model: "gpt-3.5-turbo",
          costLimits: {
            maxDailyCost: 1.0,
            maxMonthlyCost: 10.0,
            maxConcurrent: 5
          }
        },
        scrapingInterval: 3600,
        activeHours: {
          start: 0,
          end: 24
        },
        maxRetries: 3
      });
    }
    setError(null);
  }, [topic, isOpen]);

  useEffect(() => {
    if (!topic && (formData.name || formData.description)) {
      setFormData(prev => ({
        ...prev,
        extractionRules: {
          ...prev.extractionRules!,
          customPrompt: generateCustomPrompt(formData.name || '', formData.description || '')
        }
      }));
    }
  }, [formData.name, formData.description, topic]);

  const handleFieldChange = (index: number, field: Partial<ExtractionField>) => {
    const updatedFields = [...(formData.extractionRules?.fields || [])];
    console.log('Field before update:', JSON.stringify(field, null, 2));
    
    // Create the updated field
    const updatedField = {
      ...updatedFields[index],
      ...field,
      // Handle aiPrompt as string only if it's a non-empty string
      ...(field.aiPrompt !== undefined && {
        aiPrompt: typeof field.aiPrompt === 'string' && field.aiPrompt.length > 0 
          ? field.aiPrompt 
          : undefined
      })
    };
    
    updatedFields[index] = updatedField;
    console.log('Updated field:', JSON.stringify(updatedField, null, 2));
    
    setFormData({
      ...formData,
      extractionRules: {
        ...formData.extractionRules,
        fields: updatedFields,
      },
    });
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      setError('Name is required');
      return;
    }

    if (!formData.urlPatterns?.some(pattern => pattern.trim())) {
      setError('At least one URL pattern is required');
      return;
    }

    if (!formData.extractionRules?.fields?.length) {
      setError('At least one extraction field is required');
      return;
    }

    setSaving(true);
    try {
      // Normalize the extraction rules before saving
      const normalizedFields = formData.extractionRules.fields.map(field => {
        // Ensure aiPrompt is a single string or undefined
        let aiPrompt = field.aiPrompt;
        if (Array.isArray(aiPrompt)) {
          aiPrompt = aiPrompt[0];
          if (Array.isArray(aiPrompt)) {
            aiPrompt = aiPrompt[0];
          }
        }

        return {
          ...field,
          aiPrompt: typeof aiPrompt === 'string' && aiPrompt.trim() 
            ? aiPrompt.trim() 
            : undefined
        };
      });

      // Normalize customPrompt
      let customPrompt = formData.extractionRules.customPrompt;
      if (Array.isArray(customPrompt)) {
        customPrompt = customPrompt[0];
        if (Array.isArray(customPrompt)) {
          customPrompt = customPrompt[0];
        }
      }

      const newTopic: ScrapingTopic = {
        id: formData.id!,
        name: formData.name!,
        description: formData.description || '',
        urlPatterns: formData.urlPatterns!,
        status: formData.status!,
        extractionRules: {
          ...formData.extractionRules!,
          fields: normalizedFields,
          customPrompt: typeof customPrompt === 'string' && customPrompt.trim()
            ? customPrompt.trim()
            : undefined
        }
      };

      await onSave?.(newTopic);
      onClose();
    } catch (err) {
      console.error('Error saving topic:', err);
      setError('Failed to save topic');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
        
        <div className="relative bg-[#1C1B23] rounded-lg w-full max-w-2xl p-6 text-white">
          <div className="flex justify-between items-center mb-6">
            <Dialog.Title className="text-lg font-medium">
              {topic ? 'Edit Topic' : 'New Topic'}
            </Dialog.Title>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                placeholder="Topic name"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                placeholder="Topic description"
              />
            </div>

            {/* URL Patterns */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-xs text-gray-400">URL Patterns</label>
                <button
                  onClick={() => {
                    setFormData({
                      ...formData,
                      urlPatterns: [...formData.urlPatterns!, '']
                    });
                  }}
                  className="text-[#B692F6] hover:text-white transition-colors text-xs"
                >
                  Add URL Pattern
                </button>
              </div>
              {formData.urlPatterns?.map((pattern, index) => (
                <div key={index} className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={pattern}
                    onChange={(e) => {
                      const newPatterns = [...formData.urlPatterns!];
                      newPatterns[index] = e.target.value;
                      setFormData({
                        ...formData,
                        urlPatterns: newPatterns
                      });
                    }}
                    className="flex-1 bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                    placeholder="e.g., https://example.com/products/*"
                  />
                  {formData.urlPatterns!.length > 1 && (
                    <button
                      onClick={() => {
                        const newPatterns = formData.urlPatterns!.filter((_, i) => i !== index);
                        setFormData({
                          ...formData,
                          urlPatterns: newPatterns
                        });
                      }}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Extraction Rules */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-xs text-gray-400">Extraction Fields</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowTestRules(true)}
                    className="text-[#B692F6] hover:text-white transition-colors text-xs"
                  >
                    Test Rules
                  </button>
                  <button
                    onClick={() => {
                      setFormData({
                        ...formData,
                        extractionRules: {
                          ...formData.extractionRules!,
                          fields: [...formData.extractionRules!.fields, { name: '', fieldType: 'text', required: true, aiPrompt: '' }],
                        },
                      });
                    }}
                    className="text-[#B692F6] hover:text-white transition-colors text-xs"
                  >
                    Add Field
                  </button>
                </div>
              </div>
              {formData.extractionRules?.fields.map((field, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-400 mb-1">Field Name</label>
                      <input
                        type="text"
                        value={field.name}
                        onChange={(e) => handleFieldChange(index, { name: e.target.value })}
                        className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                        placeholder="e.g., price"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-400 mb-1">Field Type</label>
                      <select
                        value={field.fieldType}
                        onChange={(e) => handleFieldChange(index, { fieldType: e.target.value })}
                        className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="url">URL</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => handleFieldChange(index, { required: e.target.checked })}
                        className="bg-[#131217] border border-[#2C2B33] rounded text-[#B692F6] focus:ring-[#B692F6]"
                      />
                      <label className="text-xs text-gray-400">Required</label>
                    </div>
                    {formData.extractionRules!.fields.length > 1 && (
                      <button
                        onClick={() => {
                          const newFields = formData.extractionRules!.fields.filter((_, i) => i !== index);
                          setFormData({
                            ...formData,
                            extractionRules: {
                              ...formData.extractionRules!,
                              fields: newFields
                            }
                          });
                        }}
                        className="text-red-400 hover:text-red-300 transition-colors pt-6"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">AI Prompt</label>
                    <input
                      type="text"
                      value={field.aiPrompt || ''}
                      onChange={(e) => handleFieldChange(index, { aiPrompt: e.target.value })}
                      className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                      placeholder="Custom AI prompt for this field"
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={() => {
                  setFormData({
                    ...formData,
                    extractionRules: {
                      ...formData.extractionRules!,
                      fields: [
                        ...formData.extractionRules!.fields,
                        {
                          name: '',
                          fieldType: 'text',
                          required: true,
                          aiPrompt: ''
                        }
                      ]
                    }
                  });
                }}
                className="text-[#B692F6] hover:text-white transition-colors text-xs"
              >
                Add Field
              </button>
            </div>

            {/* Custom AI Prompt */}
            <div className="mt-4">
              <label className="block text-xs text-gray-400 mb-1">Custom AI Prompt</label>
              <textarea
                value={formData.extractionRules?.customPrompt}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    extractionRules: {
                      ...formData.extractionRules!,
                      customPrompt: e.target.value,
                    },
                  });
                }}
                rows={3}
                className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white text-sm"
                placeholder="Custom prompt for AI extraction"
              />
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
                disabled={saving}
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
      {showTestRules && (
        <ExtractionTester
          isOpen={showTestRules}
          onClose={() => setShowTestRules(false)}
          rules={formData.extractionRules!}
        />
      )}
    </Dialog>
  );
};
