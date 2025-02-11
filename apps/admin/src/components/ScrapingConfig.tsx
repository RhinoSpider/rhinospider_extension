import React, { useState, useEffect } from 'react';
import { Actor } from '@dfinity/agent';
import type { ScrapingTopic, AIConfig, CreateTopicRequest } from '../types';
import { TopicModal } from './TopicModal';
import { AIConfigModal } from './AIConfigModal';
import { getAdminActor } from '../lib/admin';
import { getAuthClient } from '../lib/auth';
import { getStorageActor } from '../lib/storage'; // Import getStorageActor

export const ScrapingConfig: React.FC = () => {
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
        const topics = await actor.getTopics();
        // Ensure optional fields are arrays
        const processedTopics = topics.map(topic => ({
          ...topic,
          validation: topic.validation || [],
          rateLimit: topic.rateLimit || [],
          extractionRules: {
            ...topic.extractionRules,
            fields: topic.extractionRules.fields.map(f => ({
              ...f,
              description: f.description || [],
              example: f.example || [],
            })),
            customPrompt: topic.extractionRules.customPrompt || [],
          },
        }));
        console.log('Fetched topics:', processedTopics);
        setTopics(processedTopics);
      } catch (error) {
        console.error('Failed to fetch topics:', error);
        setTopicsError('Failed to fetch topics');
      } finally {
        setTopicsLoading(false);
      }
    };

    loadData();
  }, []);

  // Fetch AI config on mount
  useEffect(() => {
    const loadAIConfig = async () => {
      try {
        setAIConfigLoading(true);
        const actor = await getAdminActor();
        const result = await actor.getAIConfig();
        if ('ok' in result) {
          // Convert BigInt to Number for the frontend
          const config = result.ok;
          setAIConfig({
            ...config,
            costLimits: {
              ...config.costLimits,
              dailyUSD: Number(config.costLimits.dailyUSD),
              monthlyUSD: Number(config.costLimits.monthlyUSD),
              maxConcurrent: Number(config.costLimits.maxConcurrent)
            }
          });
        }
      } catch (error) {
        console.error('Failed to load AI config:', error);
        setError('Failed to load AI configuration');
      } finally {
        setAIConfigLoading(false);
      }
    };

    loadAIConfig();
  }, [isAIModalOpen]); // Reload when modal closes

  const handleSaveTopic = async (topic: ScrapingTopic) => {
    try {
      setUpdating(true);
      setTopicsStatus('Saving topic...');
      const actor = await getAdminActor();
      
      // If topic exists, update it, otherwise create new
      const result = topic.id && topics.some(t => t.id === topic.id)
        ? await actor.updateTopic(topic.id, topic)
        : await actor.createTopic(topic);

      if ('ok' in result) {
        // Close modal first to avoid state issues
        setIsTopicModalOpen(false);
        setTopicsStatus('Topic saved successfully!');
        // Then reload topics
        await loadTopics();
      } else {
        console.error('Failed to save topic:', result.err);
        setTopicsError('Failed to save topic: ' + result.err);
      }
    } catch (error) {
      console.error('Failed to save topic:', error);
      setTopicsError('Failed to save topic: ' + error);
    } finally {
      setUpdating(false);
      // Clear status after 3 seconds
      setTimeout(() => {
        setTopicsStatus(null);
        setTopicsError(null);
      }, 3000);
    }
  };

  const handleDeleteTopic = async (id: string) => {
    try {
      console.log(`Deleting topic ${id}...`);
      setDeletingTopics(prev => ({ ...prev, [id]: true }));
      const actor = await getAdminActor();
      const result = await actor.deleteTopic(id);
      console.log('Delete result:', result);

      if ('err' in result) {
        console.error('Failed to delete topic:', result.err);
        setTopicsError('Failed to delete topic: ' + result.err);
        return;
      }

      console.log('Successfully deleted topic, refreshing list...');
      // Refresh topics list
      const updatedTopics = await actor.getTopics();
      console.log('Got updated topics:', updatedTopics);
      setTopics(updatedTopics);
      setTopicsStatus('Topic deleted successfully!');
    } catch (error) {
      console.error('Failed to delete topic:', error);
      setTopicsError('Failed to delete topic');
    } finally {
      setDeletingTopics(prev => ({ ...prev, [id]: false }));
      // Clear status after 3 seconds
      setTimeout(() => {
        setTopicsStatus(null);
        setTopicsError(null);
      }, 3000);
    }
  };

  const handleSaveAIConfig = async (newConfig: AIConfig) => {
    try {
      setAIConfigLoading(true);
      const actor = await getAdminActor();
      const result = await actor.updateAIConfig(newConfig);
      if ('err' in result) {
        setError(result.err);
      } else {
        setAIConfig(newConfig);
      }
    } catch (error) {
      console.error('Failed to save AI config:', error);
      setError('Failed to save AI configuration');
    } finally {
      setAIConfigLoading(false);
    }
  };

  const renderAIConfig = () => {
    if (aiConfigLoading) {
      return (
        <div className="bg-[#1C1B23] rounded-lg p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-[#2C2B33] rounded w-1/4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-[#2C2B33] rounded w-1/2"></div>
              <div className="h-4 bg-[#2C2B33] rounded w-1/3"></div>
              <div className="h-4 bg-[#2C2B33] rounded w-2/5"></div>
            </div>
          </div>
        </div>
      );
    }

    if (!aiConfig) {
      return (
        <div className="bg-[#1C1B23] rounded-lg p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-lg font-medium text-white mb-1">AI Configuration</h2>
              <p className="text-sm text-gray-400">OpenAI API settings and cost limits</p>
            </div>
            <button
              onClick={() => setIsAIModalOpen(true)}
              className="px-4 py-2 bg-[#B692F6] text-[#131217] rounded-lg hover:opacity-90 transition-opacity"
              disabled={aiConfigLoading}
            >
              Configure
            </button>
          </div>
          <p className="text-gray-400">No AI configuration found. Click Configure to set one up.</p>
        </div>
      );
    }

    return (
      <div className="bg-[#1C1B23] rounded-lg p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-lg font-medium text-white mb-1">AI Configuration</h2>
            <p className="text-sm text-gray-400">OpenAI API settings and cost limits</p>
          </div>
          <button
            onClick={() => setIsAIModalOpen(true)}
            className="px-4 py-2 bg-[#B692F6] text-[#131217] rounded-lg hover:opacity-90 transition-opacity"
            disabled={aiConfigLoading}
          >
            Configure
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-200 mb-4">API Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400">API Key</label>
                <div className="text-white font-mono">
                  {aiConfig.apiKey ? '••••••••' : 'Not set'}
                </div>
              </div>
              <div>
                <label className="text-gray-400">Model</label>
                <div className="text-white">{aiConfig.model}</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-200 mb-4">Cost Limits</h3>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400">Daily Limit</label>
                <div className="text-white">${typeof aiConfig.costLimits.dailyUSD === 'number' ? aiConfig.costLimits.dailyUSD.toFixed(2) : '0.00'} USD</div>
              </div>
              <div>
                <label className="text-gray-400">Monthly Limit</label>
                <div className="text-white">${typeof aiConfig.costLimits.monthlyUSD === 'number' ? aiConfig.costLimits.monthlyUSD.toFixed(2) : '0.00'} USD</div>
              </div>
              <div>
                <label className="text-gray-400">Max Concurrent</label>
                <div className="text-white">{aiConfig.costLimits.maxConcurrent}</div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-900/20 border border-red-400 text-red-400 px-4 py-3 rounded">
            {error}
          </div>
        )}
      </div>
    );
  };

  const handleCreateTopic = () => {
    setSelectedTopic(null);
    setIsTopicModalOpen(true);
  };

  const handleEditTopic = (topic: ScrapingTopic) => {
    setSelectedTopic(topic);
    setIsTopicModalOpen(true);
  };

  const handleTopicModalClose = () => {
    setIsTopicModalOpen(false);
    setSelectedTopic(null);
    // Refresh topics after modal closes
    const loadData = async () => {
      try {
        setTopicsLoading(true);
        setTopicsError(null);
        const actor = await getAdminActor();
        console.log('Refreshing topics...');
        const topics = await actor.getTopics();
        // Ensure optional fields are arrays
        const processedTopics = topics.map(topic => ({
          ...topic,
          validation: topic.validation || [],
          rateLimit: topic.rateLimit || [],
          extractionRules: {
            ...topic.extractionRules,
            fields: topic.extractionRules.fields.map(f => ({
              ...f,
              description: f.description || [],
              example: f.example || [],
            })),
            customPrompt: topic.extractionRules.customPrompt || [],
          },
        }));
        console.log('Refreshed topics:', processedTopics);
        setTopics(processedTopics);
      } catch (error) {
        console.error('Failed to refresh topics:', error);
        setTopicsError('Failed to refresh topics');
      } finally {
        setTopicsLoading(false);
      }
    };
    loadData();
  };

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        setError(null);

        const authClient = getAuthClient();
        const isAuth = await authClient.isAuthenticated();
        
        if (!isAuth) {
          setError('Please log in to view the configuration');
          await authClient.login();
        }
      } catch (error) {
        console.error('Failed to check auth:', error);
        setError(error instanceof Error ? error.message : 'Failed to check authentication');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const loadTopics = async () => {
    try {
      setTopicsLoading(true);
      setTopicsError(null);
      const actor = await getAdminActor();
      console.log('Fetching topics...');
      const topics = await actor.getTopics();
      // Ensure optional fields are arrays
      const processedTopics = topics.map(topic => ({
        ...topic,
        validation: topic.validation || [],
        rateLimit: topic.rateLimit || [],
        extractionRules: {
          ...topic.extractionRules,
          fields: topic.extractionRules.fields.map(f => ({
            ...f,
            description: f.description || [],
            example: f.example || [],
          })),
          customPrompt: topic.extractionRules.customPrompt || [],
        },
      }));
      console.log('Fetched topics:', processedTopics);
      setTopics(processedTopics);
    } catch (error) {
      console.error('Failed to fetch topics:', error);
      setTopicsError('Failed to fetch topics');
    } finally {
      setTopicsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Topics Section */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Topics</h2>
            <p className="text-gray-400">Configure scraping topics and their extraction rules</p>
          </div>
          <div className="flex items-center gap-4">
            {topicsStatus && (
              <span className="text-green-400 text-sm">{topicsStatus}</span>
            )}
            {topicsError && (
              <span className="text-red-400 text-sm">{topicsError}</span>
            )}
            <button
              onClick={() => {
                setSelectedTopic(null);
                setIsTopicModalOpen(true);
              }}
              className="px-4 py-2 bg-[#B692F6] text-[#131217] rounded-lg hover:opacity-90 transition-opacity"
              disabled={updating}
            >
              {updating ? 'Adding...' : 'Add Topic'}
            </button>
          </div>
        </div>

        {/* Topics List */}
        <div className="space-y-4">
          {topicsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B692F6] mx-auto"></div>
              <p className="text-gray-400 mt-2">Loading topics...</p>
            </div>
          ) : topicsError ? (
            <div className="text-red-500 text-center py-8">
              <p>{topicsError}</p>
              <button
                onClick={() => {
                  setTopicsLoading(true);
                  setTopicsError(null);
                  loadTopics();
                }}
                className="mt-2 text-[#B692F6] hover:text-white transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : topics.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No topics created yet.</p>
              <p className="mt-2">Click the button above to create your first topic.</p>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {topics.map((topic) => (
                <div
                  key={topic.id}
                  className="bg-[#1C1B23] rounded-lg p-4 hover:bg-[#2C2B33] transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-medium text-white">{topic.name}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to delete this topic?')) {
                            handleDeleteTopic(topic.id);
                          }
                        }}
                        disabled={deletingTopics[topic.id]}
                        className={`text-sm text-red-500 hover:text-red-400 ${deletingTopics[topic.id] ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {deletingTopics[topic.id] ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">{topic.description}</p>
                  <div className="space-y-2 mb-4">
                    <div className="text-sm text-gray-400">
                      <span className="font-medium">URL Patterns:</span>{' '}
                      {topic.urlPatterns.length}
                    </div>
                    <div className="text-sm text-gray-400">
                      <span className="font-medium">Fields:</span>{' '}
                      {topic.extractionRules.fields.length}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                      Created {new Date(Number(topic.createdAt) / 1_000_000).toLocaleDateString()}
                    </div>
                    <div className="flex gap-2 items-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={topic.active}
                          disabled={togglingTopics[topic.id]}
                          onChange={async (e) => {
                            e.stopPropagation();
                            try {
                              const newActive = e.target.checked;
                              console.log(`Toggling topic ${topic.id} to ${newActive}`);
                              setTogglingTopics(prev => ({ ...prev, [topic.id]: true }));
                              
                              const actor = await getAdminActor();
                              console.log('Got admin actor, calling setTopicActive...');
                              const result = await actor.setTopicActive(topic.id, newActive);
                              console.log('setTopicActive result:', result);
                              
                              if ('err' in result) {
                                console.error('Failed to update topic status:', result.err);
                                setTopicsError('Failed to update topic status: ' + result.err);
                                return;
                              }

                              console.log('Successfully updated topic, refreshing list...');
                              // Refresh topics list
                              const updatedTopics = await actor.getTopics();
                              console.log('Got updated topics:', updatedTopics);
                              setTopics(updatedTopics);
                              console.log('Updated topics state');
                            } catch (error) {
                              console.error('Failed to update topic status:', error);
                              setTopicsError('Failed to update topic status');
                            } finally {
                              setTogglingTopics(prev => ({ ...prev, [topic.id]: false }));
                            }
                          }}
                        />
                        <div className={`w-9 h-5 ${togglingTopics[topic.id] ? 'opacity-50' : ''} bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#B692F6]`}></div>
                      </label>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTopic(topic);
                          setIsTopicModalOpen(true);
                        }}
                        className="text-sm text-blue-500 hover:text-blue-400"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Configuration Section */}
      <div>
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-white">AI Configuration</h2>
          <p className="text-gray-400 text-sm mt-1">
            Configure AI settings for content extraction
          </p>
        </div>

        {renderAIConfig()}
      </div>

      {/* Modals */}
      <TopicModal
        isOpen={isTopicModalOpen}
        onClose={handleTopicModalClose}
        topic={selectedTopic}
        onSave={handleSaveTopic}
      />

      <AIConfigModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        config={aiConfig}
        onSave={handleSaveAIConfig}
      />
    </div>
  );
};
