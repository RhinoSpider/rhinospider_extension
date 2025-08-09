import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { getAdminActor } from '../lib/admin';

interface ScrapingTopic {
  id: string;
  name: string;
  description: string;
  status: string;
  
  // Search Configuration
  searchQueries: string[];
  preferredDomains?: string[];
  excludeDomains?: string[];
  requiredKeywords: string[];
  excludeKeywords?: string[];
  
  // Extraction Configuration  
  contentSelectors: string[];
  titleSelectors?: string[];
  excludeSelectors: string[];
  minContentLength: number;
  maxContentLength: number;
  
  // Operational Settings
  maxUrlsPerBatch: number;
  scrapingInterval: number;
  priority: number;
  
  // Tracking
  createdAt: number;
  lastScraped: number;
  totalUrlsScraped: number;
}

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
  const [formData, setFormData] = useState<Partial<ScrapingTopic>>({
    id: topic?.id || generateId(),
    name: topic?.name || '',
    description: topic?.description || '',
    status: topic?.status || 'active',
    
    // Search Configuration
    searchQueries: topic?.searchQueries || [''],
    preferredDomains: topic?.preferredDomains || [''],
    excludeDomains: topic?.excludeDomains || [''],
    requiredKeywords: topic?.requiredKeywords || [''],
    excludeKeywords: topic?.excludeKeywords || [''],
    
    // Extraction Configuration
    contentSelectors: topic?.contentSelectors || ['article', 'main', '.content', '#content'],
    titleSelectors: topic?.titleSelectors || ['h1', 'title', '.title'],
    excludeSelectors: topic?.excludeSelectors || ['nav', 'footer', 'header', '.sidebar', '.ads'],
    minContentLength: topic?.minContentLength || 100,
    maxContentLength: topic?.maxContentLength || 50000,
    
    // Operational Settings
    maxUrlsPerBatch: topic?.maxUrlsPerBatch || 10,
    scrapingInterval: topic?.scrapingInterval || 3600,
    priority: topic?.priority || 5,
    
    // Tracking
    createdAt: topic?.createdAt || Date.now(),
    lastScraped: topic?.lastScraped || 0,
    totalUrlsScraped: topic?.totalUrlsScraped || 0,
  });
  
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (topic) {
      setFormData(topic);
    } else {
      // Reset to defaults for new topic
      setFormData({
        id: generateId(),
        name: '',
        description: '',
        status: 'active',
        searchQueries: [''],
        preferredDomains: [''],
        excludeDomains: [''],
        requiredKeywords: [''],
        excludeKeywords: [''],
        contentSelectors: ['article', 'main', '.content', '#content'],
        titleSelectors: ['h1', 'title', '.title'],
        excludeSelectors: ['nav', 'footer', 'header', '.sidebar', '.ads'],
        minContentLength: 100,
        maxContentLength: 50000,
        maxUrlsPerBatch: 10,
        scrapingInterval: 3600,
        priority: 5,
        createdAt: Date.now(),
        lastScraped: 0,
        totalUrlsScraped: 0,
      });
    }
    setError(null);
  }, [topic, isOpen]);

  const handleArrayFieldChange = (fieldName: keyof ScrapingTopic, index: number, value: string) => {
    const field = formData[fieldName] as string[];
    const updated = [...field];
    updated[index] = value;
    setFormData({ ...formData, [fieldName]: updated });
  };

  const addArrayField = (fieldName: keyof ScrapingTopic) => {
    const field = formData[fieldName] as string[];
    setFormData({ ...formData, [fieldName]: [...field, ''] });
  };

  const removeArrayField = (fieldName: keyof ScrapingTopic, index: number) => {
    const field = formData[fieldName] as string[];
    if (field.length > 1) {
      setFormData({ ...formData, [fieldName]: field.filter((_, i) => i !== index) });
    }
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      setError('Name is required');
      return;
    }

    if (!formData.searchQueries?.some(q => q.trim())) {
      setError('At least one search query is required');
      return;
    }

    if (!formData.contentSelectors?.some(s => s.trim())) {
      setError('At least one content selector is required');
      return;
    }

    setSaving(true);
    try {
      // Clean up empty strings from arrays
      const cleanedTopic: ScrapingTopic = {
        id: formData.id!,
        name: formData.name!,
        description: formData.description || '',
        status: formData.status!,
        searchQueries: formData.searchQueries!.filter(q => q && typeof q === 'string' && q.trim()),
        preferredDomains: formData.preferredDomains?.filter(d => d && typeof d === 'string' && d.trim()) || undefined,
        excludeDomains: formData.excludeDomains?.filter(d => d && typeof d === 'string' && d.trim()) || undefined,
        requiredKeywords: formData.requiredKeywords!.filter(k => k && typeof k === 'string' && k.trim()),
        excludeKeywords: formData.excludeKeywords?.filter(k => k && typeof k === 'string' && k.trim()) || undefined,
        contentSelectors: formData.contentSelectors!.filter(s => s && typeof s === 'string' && s.trim()),
        titleSelectors: formData.titleSelectors?.filter(s => s && typeof s === 'string' && s.trim()) || undefined,
        excludeSelectors: formData.excludeSelectors!.filter(s => s && typeof s === 'string' && s.trim()),
        minContentLength: formData.minContentLength!,
        maxContentLength: formData.maxContentLength!,
        maxUrlsPerBatch: formData.maxUrlsPerBatch!,
        scrapingInterval: formData.scrapingInterval!,
        priority: formData.priority!,
        createdAt: formData.createdAt!,
        lastScraped: formData.lastScraped!,
        totalUrlsScraped: formData.totalUrlsScraped!,
      };

      await onSave?.(cleanedTopic);
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
        
        <div className="relative bg-[#1C1B23] rounded-lg w-full max-w-4xl p-6 text-white max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <Dialog.Title className="text-lg font-medium">
              {topic ? 'Edit Topic' : 'New Search Topic'}
            </Dialog.Title>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                  placeholder="e.g., DePIN Infrastructure News"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                placeholder="Describe what content this topic should find"
              />
            </div>

            {/* Search Configuration */}
            <div className="border-t border-[#2C2B33] pt-4">
              <h3 className="text-md font-medium mb-4 text-[#B692F6]">Search Configuration</h3>
              
              {/* Search Queries */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs text-gray-400">Search Queries</label>
                  <button
                    onClick={() => addArrayField('searchQueries')}
                    className="text-[#B692F6] hover:text-white transition-colors text-xs"
                  >
                    + Add Query
                  </button>
                </div>
                {formData.searchQueries?.map((query, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => handleArrayFieldChange('searchQueries', index, e.target.value)}
                      className="flex-1 bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                      placeholder="e.g., DePIN infrastructure blockchain"
                    />
                    {formData.searchQueries!.length > 1 && (
                      <button
                        onClick={() => removeArrayField('searchQueries', index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Preferred Domains */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs text-gray-400">Preferred Domains (Optional)</label>
                  <button
                    onClick={() => addArrayField('preferredDomains')}
                    className="text-[#B692F6] hover:text-white transition-colors text-xs"
                  >
                    + Add Domain
                  </button>
                </div>
                {formData.preferredDomains?.map((domain, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => handleArrayFieldChange('preferredDomains', index, e.target.value)}
                      className="flex-1 bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                      placeholder="e.g., techcrunch.com, coindesk.com"
                    />
                    <button
                      onClick={() => removeArrayField('preferredDomains', index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Required Keywords */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs text-gray-400">Required Keywords</label>
                  <button
                    onClick={() => addArrayField('requiredKeywords')}
                    className="text-[#B692F6] hover:text-white transition-colors text-xs"
                  >
                    + Add Keyword
                  </button>
                </div>
                {formData.requiredKeywords?.map((keyword, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={keyword}
                      onChange={(e) => handleArrayFieldChange('requiredKeywords', index, e.target.value)}
                      className="flex-1 bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                      placeholder="e.g., blockchain, infrastructure"
                    />
                    {formData.requiredKeywords!.length > 1 && (
                      <button
                        onClick={() => removeArrayField('requiredKeywords', index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Exclude Keywords */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs text-gray-400">Exclude Keywords (Optional)</label>
                  <button
                    onClick={() => addArrayField('excludeKeywords')}
                    className="text-[#B692F6] hover:text-white transition-colors text-xs"
                  >
                    + Add Keyword
                  </button>
                </div>
                {formData.excludeKeywords?.map((keyword, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={keyword}
                      onChange={(e) => handleArrayFieldChange('excludeKeywords', index, e.target.value)}
                      className="flex-1 bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                      placeholder="e.g., scam, hack, rug pull"
                    />
                    <button
                      onClick={() => removeArrayField('excludeKeywords', index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Extraction Configuration */}
            <div className="border-t border-[#2C2B33] pt-4">
              <h3 className="text-md font-medium mb-4 text-[#B692F6]">Extraction Configuration</h3>
              
              {/* Content Selectors */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs text-gray-400">Content CSS Selectors</label>
                  <button
                    onClick={() => addArrayField('contentSelectors')}
                    className="text-[#B692F6] hover:text-white transition-colors text-xs"
                  >
                    + Add Selector
                  </button>
                </div>
                {formData.contentSelectors?.map((selector, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={selector}
                      onChange={(e) => handleArrayFieldChange('contentSelectors', index, e.target.value)}
                      className="flex-1 bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white font-mono text-sm"
                      placeholder="e.g., article, main, .content"
                    />
                    {formData.contentSelectors!.length > 1 && (
                      <button
                        onClick={() => removeArrayField('contentSelectors', index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Exclude Selectors */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs text-gray-400">Exclude CSS Selectors</label>
                  <button
                    onClick={() => addArrayField('excludeSelectors')}
                    className="text-[#B692F6] hover:text-white transition-colors text-xs"
                  >
                    + Add Selector
                  </button>
                </div>
                {formData.excludeSelectors?.map((selector, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={selector}
                      onChange={(e) => handleArrayFieldChange('excludeSelectors', index, e.target.value)}
                      className="flex-1 bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white font-mono text-sm"
                      placeholder="e.g., nav, .ads, .sidebar"
                    />
                    {formData.excludeSelectors!.length > 1 && (
                      <button
                        onClick={() => removeArrayField('excludeSelectors', index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Content Length */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Min Content Length</label>
                  <input
                    type="number"
                    value={formData.minContentLength}
                    onChange={(e) => setFormData({ ...formData, minContentLength: parseInt(e.target.value) || 100 })}
                    className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Max Content Length</label>
                  <input
                    type="number"
                    value={formData.maxContentLength}
                    onChange={(e) => setFormData({ ...formData, maxContentLength: parseInt(e.target.value) || 50000 })}
                    className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Operational Settings */}
            <div className="border-t border-[#2C2B33] pt-4">
              <h3 className="text-md font-medium mb-4 text-[#B692F6]">Operational Settings</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Max URLs per Batch</label>
                  <input
                    type="number"
                    value={formData.maxUrlsPerBatch}
                    onChange={(e) => setFormData({ ...formData, maxUrlsPerBatch: parseInt(e.target.value) || 10 })}
                    className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                    min="1"
                    max="50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Scraping Interval (seconds)</label>
                  <input
                    type="number"
                    value={formData.scrapingInterval}
                    onChange={(e) => setFormData({ ...formData, scrapingInterval: parseInt(e.target.value) || 3600 })}
                    className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                    min="60"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Priority (1-10)</label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: Math.min(10, Math.max(1, parseInt(e.target.value) || 5)) })}
                    className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
                    min="1"
                    max="10"
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/20 border border-red-400 text-red-400 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-[#2C2B33]">
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