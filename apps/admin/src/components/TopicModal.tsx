import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { getAdminActor } from '../lib/admin';
import type { ScrapingTopic, ExtractionField, CreateTopicRequest } from '../types';

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

export const TopicModal: React.FC<TopicModalProps> = ({ isOpen, onClose, topic, onSave }) => {
  const [formData, setFormData] = useState<Partial<CreateTopicRequest>>({
    id: topic?.id || generateId(),
    name: topic?.name || '',
    description: topic?.description || '',
    url: topic?.url || '',
    status: topic?.status || 'active',
    extractionRules: topic?.extractionRules || {
      fields: [],
      customPrompt: ''
    }
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (topic) {
      setFormData({
        id: topic.id,
        name: topic.name,
        description: topic.description,
        url: topic.url,
        status: topic.status,
        extractionRules: topic.extractionRules
      });
    } else {
      setFormData({
        id: generateId(),
        name: '',
        description: '',
        url: '',
        status: 'active',
        extractionRules: {
          fields: [],
          customPrompt: ''
        }
      });
    }
    setError(null);
  }, [topic, isOpen]);

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      setError('Name is required');
      return;
    }

    if (!formData.url?.trim()) {
      setError('URL is required');
      return;
    }

    if (!formData.extractionRules?.fields?.length) {
      setError('At least one extraction field is required');
      return;
    }

    setSaving(true);
    try {
      const newTopic: ScrapingTopic = {
        id: formData.id!,
        name: formData.name!,
        description: formData.description || '',
        url: formData.url!,
        status: formData.status!,
        extractionRules: formData.extractionRules!
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

            <div>
              <label className="block text-xs text-gray-400 mb-1">URL Pattern</label>
              <input
                type="text"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                placeholder="e.g., https://example.com/products/*"
              />
            </div>

            {/* Extraction Rules */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-xs text-gray-400">Extraction Fields</label>
                <button
                  onClick={() => {
                    setFormData({
                      ...formData,
                      extractionRules: {
                        ...formData.extractionRules!,
                        fields: [...formData.extractionRules!.fields, { name: '', required: true }],
                      },
                    });
                  }}
                  className="text-[#B692F6] hover:text-white transition-colors text-xs"
                >
                  Add Field
                </button>
              </div>
              {formData.extractionRules?.fields.map((field, index) => (
                <div key={index} className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={field.name}
                    onChange={(e) => {
                      const newFields = [...formData.extractionRules!.fields];
                      newFields[index] = { ...field, name: e.target.value };
                      setFormData({
                        ...formData,
                        extractionRules: {
                          ...formData.extractionRules!,
                          fields: newFields,
                        },
                      });
                    }}
                    placeholder="Field name"
                    className="flex-1 bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white text-sm"
                  />
                  <button
                    onClick={() => {
                      const newFields = formData.extractionRules!.fields.filter((_, i) => i !== index);
                      setFormData({
                        ...formData,
                        extractionRules: {
                          ...formData.extractionRules!,
                          fields: newFields,
                        },
                      });
                    }}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
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
    </Dialog>
  );
};
