import React, { useState, useEffect } from 'react';
import { Actor } from '@dfinity/agent';
import type { ScrapingTopic, AIConfig } from '../types';
import { TopicModal } from './TopicModal';
import { AIConfigModal } from './AIConfigModal';
import { getAdminActor } from '../lib/admin';

export const ScrapingConfig: React.FC = () => {
  const [topics, setTopics] = useState<ScrapingTopic[]>([]);
  const [aiConfig, setAIConfig] = useState<AIConfig | null>(null);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<ScrapingTopic | null>(null);

  useEffect(() => {
    loadTopics();
    loadAIConfig();
  }, []);

  const loadTopics = async () => {
    try {
      // TODO: Replace with actual canister call
      setTopics([{
        id: '1',
        name: 'Products',
        description: 'Extract product information from e-commerce sites',
        urlPatterns: ['*/product/*', '*/item/*'],
        active: true,
        extractionRules: {
          fields: [{
            name: 'title',
            description: 'Product title/name',
            aiPrompt: 'Extract the main product title or name',
            required: true,
            type: 'text'
          }, {
            name: 'price',
            description: 'Product price',
            aiPrompt: 'Extract the current price. If there are multiple prices, get the main selling price',
            required: true,
            type: 'number'
          }]
        }
      }]);
    } catch (error) {
      console.error('Failed to load topics:', error);
    }
  };

  const loadAIConfig = async () => {
    try {
      // TODO: Replace with actual canister call
      setAIConfig({
        provider: 'openai',
        apiKey: '****',
        model: 'gpt-4',
        maxTokens: 2000,
        temperature: 0.7,
        costLimits: {
          dailyUSD: 50,
          monthlyUSD: 1000
        }
      });
    } catch (error) {
      console.error('Failed to load AI config:', error);
    }
  };

  const handleSaveTopic = async (topic: ScrapingTopic) => {
    try {
      // TODO: Replace with actual canister call
      if (topic.id) {
        // Update existing topic
        const updatedTopics = topics.map(t => 
          t.id === topic.id ? topic : t
        );
        setTopics(updatedTopics);
      } else {
        // Add new topic
        const newTopic = {
          ...topic,
          id: Date.now().toString() // Temporary ID
        };
        setTopics([...topics, newTopic]);
      }
      setIsTopicModalOpen(false);
      setSelectedTopic(null);
    } catch (error) {
      console.error('Failed to save topic:', error);
    }
  };

  const handleDeleteTopic = async (id: string) => {
    try {
      // TODO: Replace with actual canister call
      setTopics(topics.filter(t => t.id !== id));
    } catch (error) {
      console.error('Failed to delete topic:', error);
    }
  };

  const handleSaveAIConfig = async (config: AIConfig) => {
    try {
      const actor = await getAdminActor();
      const result = await actor.updateAIConfig(config);
      if ('Ok' in result) {
        setAIConfig(result.Ok);
      }
      setIsAIModalOpen(false);
    } catch (error) {
      console.error('Failed to save AI config:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Scraping Configuration</h1>
        <div className="space-x-4">
          <button
            onClick={() => setIsAIModalOpen(true)}
            className="px-4 py-2 bg-[#B692F6] text-[#131217] rounded-lg hover:opacity-90 transition-opacity"
          >
            Configure AI
          </button>
          <button
            onClick={() => {
              setSelectedTopic(null);
              setIsTopicModalOpen(true);
            }}
            className="px-4 py-2 bg-[#B692F6] text-[#131217] rounded-lg hover:opacity-90 transition-opacity"
          >
            Add New Topic
          </button>
        </div>
      </div>

      {/* Topics List */}
      <div className="bg-[#360D68] rounded-lg shadow-lg">
        <div className="p-6">
          <h2 className="text-lg font-medium text-white mb-4">Topics</h2>
          
          <div className="space-y-4">
            {topics.map((topic) => (
              <div
                key={topic.id}
                className="bg-[#131217] rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      topic.active ? 'bg-green-400' : 'bg-gray-400'
                    }`} />
                    <div>
                      <h3 className="text-lg font-medium text-white">{topic.name}</h3>
                      <p className="text-sm text-[#B692F6]">{topic.description}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => {
                        setIsTopicModalOpen(true);
                        setSelectedTopic(topic);
                      }}
                      className="text-[#B692F6] hover:text-white transition-colors"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteTopic(topic.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-[#B692F6]">URL Patterns</div>
                    <div className="text-white mt-1">
                      {topic.urlPatterns.join(', ')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#B692F6]">Fields</div>
                    <div className="text-white mt-1">
                      {topic.extractionRules.fields.map(f => f.name).join(', ')}
                    </div>
                  </div>
                </div>

                {/* Field Details */}
                <div className="mt-4 space-y-2">
                  {topic.extractionRules.fields.map((field) => (
                    <div key={field.name} className="bg-[#360D68] rounded p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-white font-medium">{field.name}</span>
                          <span className="ml-2 text-sm text-[#B692F6]">({field.type})</span>
                        </div>
                        {field.required && (
                          <span className="text-xs bg-[#B692F6] text-[#131217] px-2 py-1 rounded">Required</span>
                        )}
                      </div>
                      <p className="text-sm text-[#B692F6] mt-1">{field.description}</p>
                      <p className="text-xs text-white mt-1">AI Prompt: {field.aiPrompt}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Configuration */}
      {aiConfig && (
        <div className="bg-[#360D68] rounded-lg shadow-lg">
          <div className="p-6">
            <h2 className="text-lg font-medium text-white mb-4">AI Configuration</h2>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-[#B692F6] text-sm">Provider</div>
                <div className="text-white mt-1 capitalize">{aiConfig.provider}</div>
              </div>
              <div>
                <div className="text-[#B692F6] text-sm">Model</div>
                <div className="text-white mt-1">{aiConfig.model}</div>
              </div>
              <div>
                <div className="text-[#B692F6] text-sm">Daily Cost Limit</div>
                <div className="text-white mt-1">${aiConfig.costLimits.dailyUSD}</div>
              </div>
              <div>
                <div className="text-[#B692F6] text-sm">Monthly Cost Limit</div>
                <div className="text-white mt-1">${aiConfig.costLimits.monthlyUSD}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Topic Modal */}
      <TopicModal
        isOpen={isTopicModalOpen}
        onClose={() => setIsTopicModalOpen(false)}
        topic={selectedTopic}
        onSave={handleSaveTopic}
      />

      {/* AI Config Modal */}
      <AIConfigModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        config={aiConfig}
        onSave={handleSaveAIConfig}
      />
    </div>
  );
};
