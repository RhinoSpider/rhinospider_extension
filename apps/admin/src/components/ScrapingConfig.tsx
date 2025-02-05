import React, { useState, useEffect } from 'react';
import { Actor } from '@dfinity/agent';
import type { ScrapingTopic, AIConfig } from '../types';
import { TopicModal } from './TopicModal';
import { AIConfigModal } from './AIConfigModal';
import { getAdminActor } from '../lib/admin';
import { getAuthClient } from '../lib/auth';

export const ScrapingConfig: React.FC = () => {
  const [topics, setTopics] = useState<ScrapingTopic[]>([]);
  const [aiConfig, setAIConfig] = useState<AIConfig | null>(null);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<ScrapingTopic | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiConfigLoading, setAIConfigLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAIConfig = async () => {
      try {
        setAIConfigLoading(true);
        const actor = await getAdminActor();
        if (!actor) {
          console.error('Failed to initialize admin actor');
          return;
        }

        const result = await actor.getAIConfig();
        console.log('Loaded AI config:', {
          ok: result.ok ? {
            model: result.ok.model,
            costLimits: result.ok.costLimits,
            apiKey: '[HIDDEN]'
          } : undefined,
          err: result.err
        });

        if ('ok' in result) {
          setAIConfig(result.ok);
        } else {
          console.error('Failed to load AI config:', result.err);
        }
      } catch (error) {
        console.error('Error loading AI config:', error);
      } finally {
        setAIConfigLoading(false);
      }
    };

    loadAIConfig();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const authClient = getAuthClient();
        const isAuth = await authClient.isAuthenticated();
        
        if (!isAuth) {
          setError('Please log in to view the configuration');
          await authClient.login();
          return;
        }

        const actor = await getAdminActor();
        if (!actor) {
          setError('Failed to initialize connection');
          return;
        }

        try {
          // Load config
          const configResult = await actor.getConfig();
          if (configResult) {
            setTopics(configResult.topics.map((topic, index) => ({
              id: index.toString(),
              name: topic,
              description: '',
              urlPatterns: [],
              active: true,
              extractionRules: {
                fields: []
              }
            })));
          }
        } catch (error) {
          console.error('Failed to load topics:', error);
        }

      } catch (error) {
        console.error('Failed to load data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSaveTopic = async (topic: ScrapingTopic) => {
    try {
      const actor = await getAdminActor();
      if (!actor) {
        throw new Error('Failed to initialize connection');
      }

      // Get current config
      const currentConfig = await actor.getConfig();
      
      // Update topics
      const updatedTopics = topic.id 
        ? topics.map(t => t.id === topic.id ? topic : t)
        : [...topics, { ...topic, id: Date.now().toString() }];
      
      // Update config in canister
      const result = await actor.updateConfig({
        ...currentConfig,
        topics: updatedTopics.map(t => t.name)
      });

      if ('Ok' in result) {
        setTopics(updatedTopics);
        setIsTopicModalOpen(false);
        setSelectedTopic(null);
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      console.error('Failed to save topic:', error);
      // TODO: Show error to user
    }
  };

  const handleDeleteTopic = async (id: string) => {
    try {
      const actor = await getAdminActor();
      if (!actor) {
        throw new Error('Failed to initialize connection');
      }

      // Get current config
      const currentConfig = await actor.getConfig();
      
      // Remove topic
      const updatedTopics = topics.filter(t => t.id !== id);
      
      // Update config in canister
      const result = await actor.updateConfig({
        ...currentConfig,
        topics: updatedTopics.map(t => t.name)
      });

      if ('Ok' in result) {
        setTopics(updatedTopics);
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      console.error('Failed to delete topic:', error);
      // TODO: Show error to user
    }
  };

  const handleSaveAIConfig = async (config: AIConfig) => {
    try {
      setUpdating(true);
      console.log('Saving AI config:', {
        model: config.model,
        costLimits: config.costLimits,
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
            costLimits: result.ok.costLimits,
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
    if (aiConfigLoading || updating) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2">
            <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-gray-300">{updating ? 'Updating configuration...' : 'Loading configuration...'}</span>
          </div>
        </div>
      );
    }

    if (!aiConfig) {
      return (
        <div className="text-gray-400 text-center py-8">
          No configuration set
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div>
          <label className="text-gray-400">API Key</label>
          <div className="text-white font-mono">••••••••</div>
        </div>
        <div>
          <label className="text-gray-400">Model</label>
          <div className="text-white">{aiConfig.model}</div>
        </div>
        <div>
          <label className="text-gray-400">Daily Cost Limit</label>
          <div className="text-white">${Number(aiConfig.costLimits?.dailyUSD || 0).toFixed(2)} USD</div>
        </div>
        <div>
          <label className="text-gray-400">Monthly Cost Limit</label>
          <div className="text-white">${Number(aiConfig.costLimits?.monthlyUSD || 0).toFixed(2)} USD</div>
        </div>
        <div>
          <label className="text-gray-400">Max Concurrent Requests</label>
          <div className="text-white">{Number(aiConfig.costLimits?.maxConcurrent || 1)}</div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error: {error}
        <button 
          onClick={() => {
            const loadData = async () => {
              try {
                setLoading(true);
                setError(null);

                const authClient = getAuthClient();
                const isAuth = await authClient.isAuthenticated();
                
                if (!isAuth) {
                  setError('Please log in to view the configuration');
                  await authClient.login();
                  return;
                }

                const actor = await getAdminActor();
                if (!actor) {
                  setError('Failed to initialize connection');
                  return;
                }

                try {
                  // Load config
                  const configResult = await actor.getConfig();
                  if (configResult) {
                    setTopics(configResult.topics.map((topic, index) => ({
                      id: index.toString(),
                      name: topic,
                      description: '',
                      urlPatterns: [],
                      active: true,
                      extractionRules: {
                        fields: []
                      }
                    })));
                  }
                } catch (error) {
                  console.error('Failed to load topics:', error);
                }

              } catch (error) {
                console.error('Failed to load data:', error);
                setError(error instanceof Error ? error.message : 'Failed to load data');
              } finally {
                setLoading(false);
              }
            };
            loadData();
          }}
          className="ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Scraping Topics</h2>
          <button
            onClick={() => {
              setSelectedTopic(null);
              setIsTopicModalOpen(true);
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add Topic
          </button>
        </div>

        <div className="grid gap-4">
          {topics.map(topic => (
            <div
              key={topic.id}
              className="p-4 border rounded-lg bg-white shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">{topic.name}</h3>
                  <p className="text-gray-600">{topic.description}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedTopic(topic);
                      setIsTopicModalOpen(true);
                    }}
                    className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteTopic(topic.id)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">AI Configuration</h2>
          <button
            onClick={() => setIsAIModalOpen(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={aiConfigLoading || updating}
          >
            Configure AI
          </button>
        </div>

        {error ? (
          <div className="p-3 bg-red-900/50 border border-red-500 text-red-200 rounded">
            {error}
          </div>
        ) : (
          <div className="p-4 bg-[#1E1E1E] rounded-lg border border-gray-700">
            {renderAIConfig()}
          </div>
        )}
      </div>

      {isTopicModalOpen && (
        <TopicModal
          isOpen={isTopicModalOpen}
          onClose={() => {
            setIsTopicModalOpen(false);
            setSelectedTopic(null);
          }}
          topic={selectedTopic}
          onSave={handleSaveTopic}
        />
      )}

      <AIConfigModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onSave={handleSaveAIConfig}
        initialConfig={aiConfig}
      />
    </div>
  );
};
