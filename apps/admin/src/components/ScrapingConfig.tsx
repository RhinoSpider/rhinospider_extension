import React, { useState, useEffect } from 'react';
import { Actor } from '@dfinity/agent';
import type { ScrapingTopic, AIConfig } from '../types';
import { TopicModal } from './TopicModal';
import { AIConfigModal } from './AIConfigModal';
import { getAdminActor } from '../lib/admin';
import { getAuthClient } from '../lib/auth';

export const ScrapingConfig: React.FC = () => {
  const [topics, setTopics] = useState<ScrapingTopic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true); // Start with loading true
  const [topicsError, setTopicsError] = useState<string | null>(null);
  const [aiConfig, setAIConfig] = useState<AIConfig | null>(null);
  const [aiConfigLoading, setAIConfigLoading] = useState(true); // Start with loading true
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<ScrapingTopic | undefined>();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch topics on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setTopicsLoading(true);
        setTopicsError(null);
        const actor = await getAdminActor();
        console.log('Fetching topics...');
        const topics = await actor.getTopics();
        console.log('Fetched topics:', topics);
        setTopics(topics);
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
      } finally {
        setAIConfigLoading(false);
      }
    };

    loadAIConfig();
  }, []);

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

  const handleSaveTopic = async (topic: ScrapingTopic) => {
    try {
      setUpdating(true);
      const actor = await getAdminActor();
      
      if (topic.id) {
        // Update existing topic
        await actor.updateTopic(topic);
      } else {
        // Create new topic
        await actor.createTopic(topic);
      }

      // Refresh topics list
      const topics = await actor.getTopics();
      setTopics(topics);
      setIsTopicModalOpen(false);
      setSelectedTopic(undefined);
    } catch (error) {
      console.error('Failed to save topic:', error);
      // TODO: Show error to user
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteTopic = async (id: string) => {
    try {
      setUpdating(true);
      const actor = await getAdminActor();
      await actor.deleteTopic(id);

      // Refresh topics list
      const topics = await actor.getTopics();
      setTopics(topics);
    } catch (error) {
      console.error('Failed to delete topic:', error);
      // TODO: Show error to user
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveAIConfig = async (config: AIConfig) => {
    try {
      setUpdating(true);
      console.log('Saving AI config:', {
        model: config.model,
        dailyLimitUSD: config.dailyLimitUSD,
        monthlyLimitUSD: config.monthlyLimitUSD,
        maxConcurrent: config.maxConcurrent,
        apiKey: '[HIDDEN]'
      });

      const actor = await getAdminActor();
      if (!actor) {
        throw new Error('Failed to initialize connection');
      }

      const result = await actor.updateAIConfig(config);
      if ('ok' in result) {
        // Wait a bit before reloading to ensure canister state is updated
        await new Promise(resolve => setTimeout(resolve, 1000));
        const result = await actor.getAIConfig();
        console.log('Loaded AI config:', {
          ok: result.ok ? {
            model: result.ok.model,
            dailyLimitUSD: result.ok.dailyLimitUSD,
            monthlyLimitUSD: result.ok.monthlyLimitUSD,
            maxConcurrent: result.ok.maxConcurrent,
            apiKey: '[HIDDEN]'
          } : undefined,
          err: result.err
        });

        if ('ok' in result) {
          setAIConfig(result.ok);
        } else {
          console.error('Failed to load AI config:', result.err);
        }
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      console.error('Failed to save AI config:', error);
      // We'll let the modal handle the error display
      throw error;
    } finally {
      setUpdating(false);
      setIsAIModalOpen(false);
    }
  };

  const renderAIConfig = () => {
    if (aiConfigLoading) {
      return (
        <div className="bg-[#1C1B23] rounded-lg p-6 animate-pulse">
          <div className="h-6 w-48 bg-[#2C2B33] rounded mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 w-32 bg-[#2C2B33] rounded"></div>
            <div className="h-4 w-36 bg-[#2C2B33] rounded"></div>
            <div className="h-4 w-40 bg-[#2C2B33] rounded"></div>
          </div>
        </div>
      );
    }

    if (!aiConfig) {
      return (
        <div className="bg-[#1C1B23] rounded-lg p-6">
          <p className="text-gray-400">AI configuration not found</p>
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
                <div className="text-white">${aiConfig.costLimits.dailyUSD.toFixed(2)} USD</div>
              </div>
              <div>
                <label className="text-gray-400">Monthly Limit</label>
                <div className="text-white">${aiConfig.costLimits.monthlyUSD.toFixed(2)} USD</div>
              </div>
              <div>
                <label className="text-gray-400">Max Concurrent</label>
                <div className="text-white">{aiConfig.costLimits.maxConcurrent}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleCreateTopic = () => {
    setSelectedTopic(undefined);
    setIsTopicModalOpen(true);
  };

  const handleEditTopic = (topic: ScrapingTopic) => {
    setSelectedTopic(topic);
    setIsTopicModalOpen(true);
  };

  const handleTopicModalClose = () => {
    setIsTopicModalOpen(false);
    setSelectedTopic(undefined);
    // Refresh topics after modal closes
    const loadData = async () => {
      try {
        setTopicsLoading(true);
        setTopicsError(null);
        const actor = await getAdminActor();
        console.log('Refreshing topics...');
        const topics = await actor.getTopics();
        console.log('Refreshed topics:', topics);
        setTopics(topics);
      } catch (error) {
        console.error('Failed to refresh topics:', error);
        setTopicsError('Failed to refresh topics');
      } finally {
        setTopicsLoading(false);
      }
    };
    loadData();
  };

  return (
    <div className="space-y-8">
      {/* Topics Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Topics</h2>
            <p className="text-gray-400 text-sm mt-1">
              Configure scraping topics and their extraction rules
            </p>
          </div>
          <button
            onClick={() => setIsTopicModalOpen(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Add Topic
          </button>
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
                  const loadData = async () => {
                    try {
                      const actor = await getAdminActor();
                      console.log('Fetching topics...');
                      const topics = await actor.getTopics();
                      console.log('Fetched topics:', topics);
                      setTopics(topics);
                    } catch (error) {
                      console.error('Failed to fetch topics:', error);
                      setTopicsError('Failed to fetch topics');
                    } finally {
                      setTopicsLoading(false);
                    }
                  };
                  loadData();
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
                  <h3 className="text-lg font-medium text-white mb-2">{topic.name}</h3>
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
                      Created {new Date(Number(topic.createdAt)).toLocaleDateString()}
                    </div>
                    <div className="flex gap-2">
                      <div
                        className={`px-2 py-1 rounded text-xs ${
                          topic.active
                            ? 'bg-green-900/20 text-green-400'
                            : 'bg-red-900/20 text-red-400'
                        }`}
                      >
                        {topic.active ? 'Active' : 'Inactive'}
                      </div>
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
          <h2 className="text-xl font-semibold text-white">AI Configuration</h2>
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
