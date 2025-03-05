import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Actor } from '@dfinity/agent';
import type { ScrapingTopic, AIConfig, CreateTopicRequest } from '../types';
import { TopicModal } from './TopicModal';
import { AIConfigModal } from './AIConfigModal';
import { getAdminActor } from '../lib/admin';
import { initAuthClient } from '../lib/auth';
import { getStorageActor } from '../lib/storage';

export const ScrapingConfig: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [topics, setTopics] = useState<ScrapingTopic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState<string | null>(null);
  const [topicsStatus, setTopicsStatus] = useState<string | null>(null);
  const [aiConfig, setAIConfig] = useState<AIConfig | null>(null);
  const [aiConfigLoading, setAIConfigLoading] = useState(true);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<ScrapingTopic | null>();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingTopics, setTogglingTopics] = useState<{ [key: string]: boolean }>({});
  const [deletingTopics, setDeletingTopics] = useState<{ [key: string]: boolean }>({});

  // Fetch topics on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setTopicsLoading(true);
        setTopicsError(null);
        const actor = await getAdminActor();
        console.log('Fetching topics...');
        const result = await actor.getTopics();
        if ('err' in result) {
          throw new Error(result.err);
        }
        const processedTopics = result.ok.map(topic => ({
          ...topic,
          extractionRules: {
            ...topic.extractionRules,
            fields: topic.extractionRules.fields.map(f => ({
              ...f,
              description: f.description || '',
              type: f.type || 'text',
            })),
            customPrompt: topic.extractionRules.customPrompt || '',
          },
        }));
        console.log('Fetched topics:', processedTopics);
        setTopics(processedTopics);
      } catch (error) {
        console.error('Failed to fetch topics:', error);
        setTopicsError(error instanceof Error ? error.message : 'Failed to fetch topics');
      } finally {
        setTopicsLoading(false);
      }
    };

    loadData();
  }, []);

  // Fetch AI config on mount and when modal closes
  useEffect(() => {
    const loadAIConfig = async () => {
      try {
        setAIConfigLoading(true);
        const actor = await getAdminActor();
        const result = await actor.getAIConfig();
        if ('err' in result) {
          throw new Error(result.err);
        }
        const config = result.ok;
        setAIConfig({
          apiKey: config.apiKey,
          model: config.model,
          costLimits: {
            maxDailyCost: Number(config.costLimits.maxDailyCost) || 0,
            maxMonthlyCost: Number(config.costLimits.maxMonthlyCost) || 0,
            maxConcurrent: Number(config.costLimits.maxConcurrent) || 0
          }
        });
      } catch (error) {
        console.error('Failed to load AI config:', error);
        setError(error instanceof Error ? error.message : 'Failed to load AI configuration');
      } finally {
        setAIConfigLoading(false);
      }
    };

    if (isAuthenticated) {
      loadAIConfig();
    }
  }, [isAuthenticated, isAIModalOpen]); // Reload when modal closes or auth state changes

  const handleSaveTopic = async (topic: ScrapingTopic) => {
    try {
      setUpdating(true);
      setTopicsStatus('Saving topic...');
      const actor = await getAdminActor();
      
      if (selectedTopic) {
        // Update existing topic
        console.log('Updating topic with ID:', topic.id);
        console.log('Topic data:', JSON.stringify(topic, null, 2));
        
        const updateRequest = {
          name: [topic.name],
          description: [topic.description],
          urlPatterns: [topic.urlPatterns],
          status: [topic.status],
          extractionRules: [{
            fields: topic.extractionRules.fields.map(field => ({
              name: field.name,
              fieldType: field.fieldType,
              required: field.required,
              aiPrompt: field.aiPrompt ? [field.aiPrompt] : []
            })),
            customPrompt: topic.extractionRules.customPrompt ? [topic.extractionRules.customPrompt] : []
          }],
          siteTypeClassification: [topic.siteTypeClassification || 'blog'],
          urlGenerationStrategy: [topic.urlGenerationStrategy || 'pattern_based'],
          articleUrlPatterns: topic.articleUrlPatterns && topic.articleUrlPatterns.length > 0 
            ? [topic.articleUrlPatterns.filter(p => typeof p === 'string' ? p.trim() !== '' : false)] 
            : []
        };
        
        console.log('Update request with articleUrlPatterns:', JSON.stringify(updateRequest, null, 2));
        
        try {
          const result = await actor.updateTopic(topic.id, updateRequest);
          console.log('Update result:', result);
          if ('err' in result) {
            throw new Error(result.err);
          }
          setTopics(prev => prev.map(t => t.id === topic.id ? result.ok : t));
        } catch (error) {
          console.error('Error in updateTopic call:', error);
          throw error;
        }
      } else {
        // Create new topic
        console.log('Creating new topic with ID:', topic.id);
        console.log('Topic data:', JSON.stringify(topic, null, 2));
        
        const createRequest = {
          id: topic.id,
          name: topic.name,
          description: topic.description,
          urlPatterns: topic.urlPatterns,
          status: topic.status,
          extractionRules: {
            fields: topic.extractionRules.fields.map(field => ({
              name: field.name,
              fieldType: field.fieldType,
              required: field.required,
              aiPrompt: field.aiPrompt ? [field.aiPrompt] : []
            })),
            customPrompt: topic.extractionRules.customPrompt ? [topic.extractionRules.customPrompt] : []
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
          maxRetries: 3,
          siteTypeClassification: topic.siteTypeClassification || 'blog',
          urlGenerationStrategy: topic.urlGenerationStrategy || 'pattern_based',
          articleUrlPatterns: topic.articleUrlPatterns && topic.articleUrlPatterns.length > 0 
            ? [topic.articleUrlPatterns.filter(p => typeof p === 'string' ? p.trim() !== '' : false)] 
            : []
        };
        
        console.log('Create request:', JSON.stringify(createRequest, null, 2));
        
        try {
          const result = await actor.createTopic(createRequest);
          console.log('Create result:', result);
          if ('err' in result) {
            throw new Error(result.err);
          }
          setTopics(prev => [...prev, result.ok]);
        } catch (error) {
          console.error('Error in createTopic call:', error);
          throw error;
        }
      }
      setTopicsStatus('Topic saved successfully');
      setIsTopicModalOpen(false);
    } catch (error) {
      console.error('Failed to save topic:', error);
      setTopicsError(error instanceof Error ? error.message : 'Failed to save topic');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteTopic = async (id: string) => {
    try {
      setDeletingTopics(prev => ({ ...prev, [id]: true }));
      const actor = await getAdminActor();
      const result = await actor.deleteTopic(id);
      if ('err' in result) {
        throw new Error(result.err);
      }
      setTopics(prev => prev.filter(t => t.id !== id));
      setTopicsStatus('Topic deleted successfully');
    } catch (error) {
      console.error('Failed to delete topic:', error);
      setTopicsError(error instanceof Error ? error.message : 'Failed to delete topic');
    } finally {
      setDeletingTopics(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleToggleTopic = async (id: string, active: boolean) => {
    try {
      setTogglingTopics(prev => ({ ...prev, [id]: true }));
      const actor = await getAdminActor();
      const result = await actor.setTopicActive(id, active);
      if ('err' in result) {
        throw new Error(result.err);
      }
      setTopics(prev => prev.map(t => t.id === id ? { ...t, status: active ? 'active' : 'inactive' } : t));
      setTopicsStatus(`Topic ${active ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Failed to toggle topic:', error);
      setTopicsError(error instanceof Error ? error.message : 'Failed to toggle topic');
    } finally {
      setTogglingTopics(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Scraping Configuration</h1>
        <button
          onClick={() => {
            setSelectedTopic(null);
            setIsTopicModalOpen(true);
          }}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
        >
          Add Topic
        </button>
      </div>

      {/* Status Messages */}
      {topicsError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {topicsError}
        </div>
      )}
      {topicsStatus && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {topicsStatus}
        </div>
      )}

      {/* Topics List */}
      {topicsLoading ? (
        <div className="text-center py-8 text-gray-400">Loading topics...</div>
      ) : (
        <div className="mb-8">
          {topics.length === 0 ? (
            <div className="bg-[#1C1B23] rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-400 mb-4">No topics have been created yet.</p>
              <button
                onClick={() => {
                  setSelectedTopic(null);
                  setIsTopicModalOpen(true);
                }}
                className="text-purple-400 hover:text-purple-300"
              >
                Create your first topic
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topics.map(topic => (
                <div key={topic.id} className="bg-[#1C1B23] rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-semibold text-white">{topic.name}</h2>
                    <div className="space-x-2">
                      <button
                        onClick={() => {
                          setSelectedTopic(topic);
                          setIsTopicModalOpen(true);
                        }}
                        className="text-purple-400 hover:text-purple-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTopic(topic.id)}
                        disabled={deletingTopics[topic.id]}
                        className="text-red-400 hover:text-red-300"
                      >
                        {deletingTopics[topic.id] ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-400 mb-4">{topic.description}</p>
                  <div className="flex justify-between items-center">
                    <span className={`px-2 py-1 rounded text-sm ${
                      topic.status === 'active' ? 'bg-green-900 text-green-200' : 'bg-gray-800 text-gray-300'
                    }`}>
                      {topic.status}
                    </span>
                    <button
                      onClick={() => handleToggleTopic(topic.id, topic.status !== 'active')}
                      disabled={togglingTopics[topic.id]}
                      className={`text-sm ${
                        topic.status === 'active'
                          ? 'text-red-400 hover:text-red-300'
                          : 'text-purple-400 hover:text-purple-300'
                      }`}
                    >
                      {togglingTopics[topic.id]
                        ? 'Updating...'
                        : topic.status === 'active'
                        ? 'Deactivate'
                        : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Configuration Box */}
      <div className="p-6 bg-gray-800 rounded-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-white">AI Configuration</h2>
          <button
            onClick={() => setIsAIModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Configure
          </button>
        </div>
        {aiConfigLoading ? (
          <div className="text-gray-400 mt-4">Loading AI configuration...</div>
        ) : aiConfig ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-400">Model</span>
                <span className="text-base text-white mt-1">{aiConfig.model}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-400">Daily Cost Limit</span>
                <span className="text-base text-white mt-1">${aiConfig.costLimits.maxDailyCost || 0}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-400">Monthly Cost Limit</span>
                <span className="text-base text-white mt-1">${aiConfig.costLimits.maxMonthlyCost || 0}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-400">Max Concurrent API Calls</span>
                <span className="text-base text-white mt-1">{aiConfig.costLimits.maxConcurrent || 0}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-400 mt-4">No AI configuration found</div>
        )}
      </div>

      {/* Topic Modal */}
      {isTopicModalOpen && (
        <TopicModal
          isOpen={isTopicModalOpen}
          topic={selectedTopic}
          onSave={handleSaveTopic}
          onClose={() => {
            setIsTopicModalOpen(false);
            setSelectedTopic(null);
          }}
          saving={updating}
        />
      )}

      {/* AI Config Modal */}
      {isAIModalOpen && (
        <AIConfigModal
          isOpen={isAIModalOpen}
          config={aiConfig}
          onClose={() => {
            setIsAIModalOpen(false);
          }}
          onSave={async (config) => {
            try {
              const actor = await getAdminActor();
              const result = await actor.updateAIConfig(config);
              if ('err' in result) {
                throw new Error(result.err);
              }
              setAIConfig(config);
              setIsAIModalOpen(false);
            } catch (error) {
              console.error('Failed to update AI config:', error);
              setError(error instanceof Error ? error.message : 'Failed to update AI configuration');
            }
          }}
        />
      )}
    </div>
  );
};
