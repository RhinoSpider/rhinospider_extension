import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { ScrapingTopic, AIConfig, ScrapedData } from '../types';
import { TopicModal } from './TopicModal';
import { AIConfigModal } from './AIConfigModal';
import { getAdminActor, getScrapedDataDirect } from '../lib/admin';
import StorageAuthorization from './StorageAuthorization';

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
  const [selectedTopic, setSelectedTopic] = useState<ScrapingTopic | null>(null);
  // We need setUpdating for the handleSaveTopic function
  const [, setUpdating] = useState(false);
  // Keep error state as it's used in the loadAIConfig function
  const [, setError] = useState<string | null>(null);
  const [togglingTopics, setTogglingTopics] = useState<Record<string, boolean>>({});
  const [deletingTopics, setDeletingTopics] = useState<Record<string, boolean>>({});
  
  // New state for direct storage access
  const [scrapedData, setScrapedData] = useState<ScrapedData[]>([]);
  const [fetchingData, setFetchingData] = useState(false);
  const [fetchDataError, setFetchDataError] = useState<string | null>(null);
  const [fetchDataStatus, setFetchDataStatus] = useState<string | null>(null);

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
        
        // Load saved sampleArticleUrls from local storage
        const savedSampleArticleUrls = {};
        try {
          const savedData = localStorage.getItem('rhinoSpiderSampleArticleUrls');
          if (savedData) {
            Object.assign(savedSampleArticleUrls, JSON.parse(savedData));
            console.log('Loaded saved sampleArticleUrls from local storage:', savedSampleArticleUrls);
          }
        } catch (e) {
          console.error('Error loading saved sampleArticleUrls from local storage:', e);
        }
        const processedTopics = result.ok.map((topic: any) => {
          console.log(`Processing topic ${topic.id}, contentIdentifiers:`, topic.contentIdentifiers);
          
          // Ensure contentIdentifiers is properly extracted if it exists
          let contentIdentifiers = undefined;
          if (topic.contentIdentifiers && topic.contentIdentifiers.length > 0) {
            // Extract from array wrapper (since it's an opt type in Candid)
            contentIdentifiers = topic.contentIdentifiers[0];
            console.log('Extracted contentIdentifiers:', JSON.stringify(contentIdentifiers, null, 2));
          }
          
          // Extract excludePatterns from array wrapper if it exists
          let excludePatterns = undefined;
          if (topic.excludePatterns && topic.excludePatterns.length > 0) {
            excludePatterns = topic.excludePatterns[0];
            console.log('Extracted excludePatterns:', JSON.stringify(excludePatterns, null, 2));
          }
          
          // Extract paginationPatterns from array wrapper if it exists
          let paginationPatterns = undefined;
          if (topic.paginationPatterns && topic.paginationPatterns.length > 0) {
            paginationPatterns = topic.paginationPatterns[0];
            console.log('Extracted paginationPatterns:', JSON.stringify(paginationPatterns, null, 2));
          }
          
          // Extract sampleArticleUrls from array wrapper if it exists
          // or from local storage if available
          let sampleArticleUrls = undefined;
          if (topic.sampleArticleUrls && topic.sampleArticleUrls.length > 0) {
            sampleArticleUrls = topic.sampleArticleUrls[0];
            console.log('Extracted sampleArticleUrls from backend:', JSON.stringify(sampleArticleUrls, null, 2));
          } else if (topic.id && savedSampleArticleUrls && typeof savedSampleArticleUrls === 'object' && savedSampleArticleUrls[topic.id as keyof typeof savedSampleArticleUrls]) {
            sampleArticleUrls = savedSampleArticleUrls[topic.id as keyof typeof savedSampleArticleUrls];
            console.log('Using sampleArticleUrls from local storage for topic', topic.id, ':', sampleArticleUrls);
          }
          
          return {
            ...topic,
            extractionRules: {
              ...topic.extractionRules,
              fields: topic.extractionRules.fields.map((f: any) => ({
                ...f,
                description: f.description || '',
                type: f.type || f.fieldType || 'text'
              })),
              customPrompt: topic.extractionRules.customPrompt || []
            },
            contentIdentifiers: contentIdentifiers || { selectors: [], keywords: [] },
            paginationPatterns: paginationPatterns || [],
            // Ensure sampleArticleUrls always exists
            sampleArticleUrls: sampleArticleUrls || [],
            // Ensure excludePatterns always exists
            excludePatterns: topic.excludePatterns || ['']
          };
        });
        console.log('Processed topics:', JSON.stringify(processedTopics, null, 2));
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
          },
          temperature: config.temperature || 0.7,
          maxTokens: config.maxTokens || 2000
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

  // Function to fetch data directly from the storage canister
  const fetchDataFromStorage = async (topicId?: string) => {
    try {
      setFetchingData(true);
      setFetchDataError(null);
      setFetchDataStatus('Fetching data from storage canister...');
      
      // Call the direct storage access function
      const data = await getScrapedDataDirect(topicId);
      setScrapedData(data);
      
      setFetchDataStatus(`Successfully fetched ${data.length} items from storage canister`);
      console.log('Fetched data from storage canister:', data);
      
      // Display the data in a more readable format
      if (data.length > 0) {
        console.table(data.map(item => ({
          id: item.id,
          topic: item.topic,
          url: item.url,
          timestamp: new Date(Number(item.timestamp) / 1000000).toLocaleString(),
          status: item.status
        })));
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching data from storage canister:', error);
      setFetchDataError('Error fetching data: ' + (error as Error).message);
      setFetchDataStatus('Failed to fetch data from storage canister');
      return [];
    } finally {
      setFetchingData(false);
    }
  };

  const handleSaveTopic = async (topic: ScrapingTopic) => {
    try {
      setUpdating(true);
      setTopicsStatus('Saving topic...');
      const actor = await getAdminActor();
      
      if (selectedTopic) {
        // Update existing topic
        console.log('Updating topic with ID:', topic.id);
        console.log('Topic data:', JSON.stringify(topic, null, 2));

        // Format contentIdentifiers correctly
        const contentIdentifiersFormatted = topic.contentIdentifiers ? 
          [{
            selectors: Array.isArray(topic.contentIdentifiers.selectors) 
              ? topic.contentIdentifiers.selectors.filter((s: any) => typeof s === 'string' && s.trim() !== '') 
              : [],
            keywords: Array.isArray(topic.contentIdentifiers.keywords) 
              ? topic.contentIdentifiers.keywords.filter((k: any) => typeof k === 'string' && k.trim() !== '') 
              : []
          }] : [];

        // Prepare update request
        const updateRequest = {
          name: [topic.name],
          description: [topic.description],
          urlPatterns: [topic.urlPatterns],
          status: [topic.status],
          extractionRules: [
            {
              fields: topic.extractionRules.fields.map((field: any) => ({
                name: field.name,
                fieldType: field.fieldType,
                required: field.required,
                aiPrompt: Array.isArray(field.aiPrompt) ? field.aiPrompt : [field.aiPrompt]
              })),
              customPrompt: Array.isArray(topic.extractionRules.customPrompt) 
                ? topic.extractionRules.customPrompt 
                : [topic.extractionRules.customPrompt]
            }
          ],
          siteTypeClassification: [topic.siteTypeClassification || 'blog'],
          urlGenerationStrategy: [topic.urlGenerationStrategy || 'pattern_based'],
          articleUrlPatterns: topic.articleUrlPatterns 
            ? [Array.isArray(topic.articleUrlPatterns[0]) 
                ? [...topic.articleUrlPatterns[0], ...topic.articleUrlPatterns.slice(1).filter(p => typeof p === 'string')] 
                : topic.articleUrlPatterns.filter(p => typeof p === 'string' ? p.trim() !== '' : false)]
            : [],
          contentIdentifiers: contentIdentifiersFormatted.length > 0 ? contentIdentifiersFormatted : [{ selectors: [], keywords: [] }],
          paginationPatterns: topic.paginationPatterns && topic.paginationPatterns.length > 0
              ? [topic.paginationPatterns.filter(p => typeof p === 'string' && p.trim() !== '').map(p => p.trim())]
              : [],
          excludePatterns: topic.excludePatterns && topic.excludePatterns.length > 0
              ? [topic.excludePatterns.filter(p => typeof p === 'string' && p.trim() !== '').map(p => p.trim())]
              : [],
          // For updateTopic, sampleArticleUrls should be wrapped in a single array for opt vec text
          sampleArticleUrls: topic.sampleArticleUrls && topic.sampleArticleUrls.length > 0
              ? [topic.sampleArticleUrls.filter(url => typeof url === 'string' && url.trim() !== '')]
              : []
        };

        console.log('Update request with contentIdentifiers:', JSON.stringify(updateRequest, null, 2));
        console.log('excludePatterns in update request:', JSON.stringify(updateRequest.excludePatterns, null, 2));
        console.log('excludePatterns in topic before update:', JSON.stringify(topic.excludePatterns, null, 2));

        try {
          console.log('Update request with sampleArticleUrls:', JSON.stringify(updateRequest.sampleArticleUrls, null, 2));
          const result = await actor.updateTopic(topic.id, updateRequest);
          console.log('Update result:', result);
          console.log('Update result raw:', JSON.stringify(result));
          console.log('sampleArticleUrls in result:', result.ok?.sampleArticleUrls);
          console.log('excludePatterns in result:', result.ok?.excludePatterns);
          if ('err' in result) {
            throw new Error(result.err);
          }
          // Ensure sampleArticleUrls is preserved in the response
          const updatedTopic = {
            ...result.ok,
            // If sampleArticleUrls is missing in the response, use the value from the original topic
            sampleArticleUrls: result.ok.sampleArticleUrls || topic.sampleArticleUrls
          };
          
          console.log('Updated topic with preserved sampleArticleUrls:', updatedTopic);
          
          // Save sampleArticleUrls to local storage
          try {
            const savedData = localStorage.getItem('rhinoSpiderSampleArticleUrls') || '{}';
            const savedUrls = JSON.parse(savedData);
            savedUrls[topic.id] = updatedTopic.sampleArticleUrls;
            localStorage.setItem('rhinoSpiderSampleArticleUrls', JSON.stringify(savedUrls));
            console.log('Saved sampleArticleUrls to local storage:', savedUrls);
          } catch (e) {
            console.error('Error saving sampleArticleUrls to local storage:', e);
          }
          
          // Update the local state with the updated topic
          setTopics(prev => prev.map(t => t.id === topic.id ? updatedTopic : t));
        } catch (error) {
          console.error('Error in updateTopic call:', error);
          throw error;
        }
      } else {
        // Create new topic
        console.log('Creating new topic with ID:', topic.id);
        console.log('Topic data:', JSON.stringify(topic, null, 2));

        // Format contentIdentifiers correctly for creation
        const contentIdentifiersFormatted = topic.contentIdentifiers ? 
          {
            selectors: Array.isArray(topic.contentIdentifiers.selectors) 
              ? topic.contentIdentifiers.selectors.filter((s: any) => typeof s === 'string' && s.trim() !== '') 
              : [],
            keywords: Array.isArray(topic.contentIdentifiers.keywords) 
              ? topic.contentIdentifiers.keywords.filter((k: any) => typeof k === 'string' && k.trim() !== '') 
              : []
          } : null;

        const createRequest = {
          id: topic.id,
          name: topic.name,
          description: topic.description,
          urlPatterns: topic.urlPatterns,
          status: topic.status,
          extractionRules: {
            fields: topic.extractionRules.fields.map((field: any) => ({
              name: field.name,
              fieldType: field.fieldType,
              required: field.required,
              aiPrompt: Array.isArray(field.aiPrompt) ? field.aiPrompt : [field.aiPrompt]
            })),
            customPrompt: Array.isArray(topic.extractionRules.customPrompt) 
              ? topic.extractionRules.customPrompt 
              : [topic.extractionRules.customPrompt]
          },
          aiConfig: {
            apiKey: topic.aiConfig?.apiKey || "",
            model: topic.aiConfig?.model || "gpt-3.5-turbo",
            costLimits: {
              maxDailyCost: topic.aiConfig?.costLimits?.maxDailyCost || 1.0,
              maxMonthlyCost: topic.aiConfig?.costLimits?.maxMonthlyCost || 10.0,
              maxConcurrent: topic.aiConfig?.costLimits?.maxConcurrent || 5
            }
          },
          scrapingInterval: topic.scrapingInterval || 3600,
          activeHours: {
            start: topic.activeHours?.start || 0,
            end: topic.activeHours?.end || 24
          },
          maxRetries: topic.maxRetries || 3,
          siteTypeClassification: topic.siteTypeClassification || null,
          urlGenerationStrategy: topic.urlGenerationStrategy || null,
          articleUrlPatterns: topic.articleUrlPatterns && 
            topic.articleUrlPatterns.some((p: any) => typeof p === 'string' && p.trim() !== '')
              ? topic.articleUrlPatterns
                  .filter((p: any) => typeof p === 'string' && p.trim() !== '')
                  .map((p: any) => p.trim())
              : null,
          contentIdentifiers: contentIdentifiersFormatted,
          paginationPatterns: topic.paginationPatterns && 
            topic.paginationPatterns.some((p: any) => typeof p === 'string' && p.trim() !== '')
              ? topic.paginationPatterns
                  .filter((p: any) => typeof p === 'string' && p.trim() !== '')
                  .map((p: any) => p.trim())
              : null,
          excludePatterns: topic.excludePatterns && 
            topic.excludePatterns.some((p: any) => typeof p === 'string' && p.trim() !== '')
              ? topic.excludePatterns
                  .filter((p: any) => typeof p === 'string' && p.trim() !== '')
                  .map((p: any) => p.trim())
              : null,
          // For createTopic, sampleArticleUrls should be DOUBLE-WRAPPED for opt vec text
          sampleArticleUrls: topic.sampleArticleUrls && 
            topic.sampleArticleUrls.some((url: any) => typeof url === 'string' && url.trim() !== '')
              ? [[topic.sampleArticleUrls
                  .filter((url: any) => typeof url === 'string' && url.trim() !== '')
                  .map((url: any) => url.trim())]]
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
      <div className="p-6 bg-gray-800 rounded-lg mb-6">
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

      {/* Storage Canister Authorization */}
      <div className="p-6 bg-gray-800 rounded-lg mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-white">Storage Canister Authorization</h2>
        </div>
        <div className="bg-[#1C1B23] rounded-lg p-6">
          <StorageAuthorization />
        </div>
      </div>

      {/* Topic Modal */}
      {isTopicModalOpen && (
        <TopicModal
          isOpen={isTopicModalOpen}
          topic={selectedTopic || undefined}
          onSave={handleSaveTopic}
          onClose={() => {
            setIsTopicModalOpen(false);
            setSelectedTopic(null);
          }}
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
