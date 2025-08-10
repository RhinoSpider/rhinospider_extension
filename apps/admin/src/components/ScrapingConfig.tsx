import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { ScrapingTopic, AIConfig, ScrapedData } from '../types';
import { TopicModal } from './TopicModal';
import { AIConfigModal } from './AIConfigModal';
import { getAdminActor, getTopics, createTopic, updateTopic, deleteTopic, setTopicActive, getAIConfig, updateAIConfig, getScrapedData } from '../lib/admin';
import { getIdentity } from '../lib/auth';
import { Actor, HttpAgent } from '@dfinity/agent';
// import StorageAuthorization from './StorageAuthorization';

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
  
  // Pagination and search states
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const topicsPerPage = 10;
  const [, setUpdating] = useState(false);
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
        console.log('Fetching topics...');
        const fetchedTopics = await getTopics();
        console.log('Fetched topics:', fetchedTopics);
        setTopics(fetchedTopics);
        console.log('Processed topics:', fetchedTopics);
      } catch (error) {
        console.error('Error fetching topics:', error);
        setTopicsError('Failed to fetch topics');
        setTopics([]);
      } finally {
        setTopicsLoading(false);
      }
    };

    const loadAIConfig = async () => {
      try {
        const config = await getAIConfig();
        console.log('Fetched AI config:', config);
        setAIConfig(config);
      } catch (error) {
        console.log('Not authorized to get AI config, using defaults');
        setError('Failed to load AI configuration');
      } finally {
        setAIConfigLoading(false);
      }
    };

    if (isAuthenticated) {
      loadData();
      loadAIConfig();
    }
  }, [isAuthenticated]);

  const handleToggleTopic = async (topicId: string, currentStatus: string) => {
    try {
      setTogglingTopics(prev => ({ ...prev, [topicId]: true }));
      const newStatus = currentStatus === 'active' ? false : true;
      await setTopicActive(topicId, newStatus);
      
      // Update local state
      setTopics(prevTopics => 
        prevTopics.map(t => 
          t.id === topicId 
            ? { ...t, status: newStatus ? 'active' : 'inactive' } 
            : t
        )
      );
      
      setTopicsStatus(`Topic ${newStatus ? 'activated' : 'deactivated'} successfully`);
      setTimeout(() => setTopicsStatus(null), 3000);
    } catch (error) {
      console.error('Error toggling topic:', error);
      setTopicsError(`Failed to toggle topic: ${error}`);
    } finally {
      setTogglingTopics(prev => ({ ...prev, [topicId]: false }));
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (!confirm('Are you sure you want to delete this topic?')) {
      return;
    }

    try {
      setDeletingTopics(prev => ({ ...prev, [topicId]: true }));
      await deleteTopic(topicId);
      
      // Update local state
      setTopics(prevTopics => prevTopics.filter(t => t.id !== topicId));
      
      setTopicsStatus('Topic deleted successfully');
      setTimeout(() => setTopicsStatus(null), 3000);
    } catch (error) {
      console.error('Error deleting topic:', error);
      setTopicsError(`Failed to delete topic: ${error}`);
    } finally {
      setDeletingTopics(prev => ({ ...prev, [topicId]: false }));
    }
  };

  const handleFetchStorageData = async (topicId?: string) => {
    try {
      setFetchingData(true);
      setFetchDataError(null);
      setFetchDataStatus('Fetching data from storage canister...');
      
      // Call the storage access function - pass undefined for all data
      const data = await getScrapedData(topicId);
      setScrapedData(data);
      
      setFetchDataStatus(`Successfully fetched ${data.length} items from storage canister`);
      console.log('Fetched data from storage canister:', data);
      
      // Display the data in a more readable format
      if (data.length > 0) {
        console.table(data.map(item => ({
          id: item.id,
          topic: item.topic,
          url: item.url,
          contentLength: item.content?.length || 0,
          timestamp: new Date(Number(item.timestamp) / 1000000).toLocaleString()
        })));
      }
      
      setTimeout(() => setFetchDataStatus(null), 5000);
    } catch (error) {
      console.error('Error fetching data from storage canister:', error);
      setFetchDataError(`Failed to fetch data: ${error}`);
    } finally {
      setFetchingData(false);
    }
  };

  const handleSaveTopic = async (topic: ScrapingTopic) => {
    try {
      setUpdating(true);
      setTopicsStatus('Saving topic...');
      
      let savedTopic;
      if (selectedTopic) {
        // Update existing topic
        console.log('Updating topic with ID:', topic.id);
        savedTopic = await updateTopic(topic.id, topic);
      } else {
        // Create new topic
        console.log('Creating new topic with ID:', topic.id);
        savedTopic = await createTopic(topic);
      }
      
      // Update local state
      setTopics(prevTopics => {
        if (selectedTopic) {
          return prevTopics.map(t => t.id === topic.id ? savedTopic : t);
        } else {
          return [...prevTopics, savedTopic];
        }
      });
      
      setTopicsStatus('Topic saved successfully');
      setTimeout(() => setTopicsStatus(null), 3000);
      
      // Close modal
      setIsTopicModalOpen(false);
      setSelectedTopic(null);
    } catch (error) {
      console.error('Error saving topic:', error);
      setTopicsError(`Failed to save topic: ${error}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveAIConfig = async (config: AIConfig | null) => {
    try {
      await updateAIConfig(config || {
        enabled: false,
        provider: 'openai',
        apiKey: '',
        model: 'gpt-3.5-turbo',
        maxTokensPerRequest: 150,
        features: {
          summarization: false,
          categorization: false,
          sentimentAnalysis: false,
          keywordExtraction: false
        }
      });
      
      setAIConfig(config);
      setTopicsStatus('AI configuration saved successfully');
      setTimeout(() => setTopicsStatus(null), 3000);
      setIsAIModalOpen(false);
    } catch (error) {
      console.error('Error saving AI config:', error);
      setTopicsError(`Failed to save AI configuration: ${error}`);
    }
  };

  // Filter and paginate topics
  const filteredTopics = topics.filter(topic => {
    const matchesSearch = searchTerm === '' || 
      topic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      topic.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      topic.searchQueries?.some(q => q.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && topic.status === 'active') ||
      (statusFilter === 'inactive' && topic.status === 'inactive');
    
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredTopics.length / topicsPerPage);
  const startIndex = (currentPage - 1) * topicsPerPage;
  const endIndex = startIndex + topicsPerPage;
  const paginatedTopics = filteredTopics.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Scraping Configuration</h2>
        <div className="space-x-4">
          <button
            onClick={() => {
              setSelectedTopic(null);
              setIsTopicModalOpen(true);
            }}
            className="bg-[#B692F6] text-[#131217] px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            Add Topic
          </button>
          <button
            onClick={() => setIsAIModalOpen(true)}
            className="bg-[#2C2B33] text-white px-4 py-2 rounded-lg hover:bg-[#3C3B43] transition-colors"
          >
            AI Settings
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {topicsError && (
        <div className="bg-red-900/20 border border-red-400 text-red-400 px-4 py-3 rounded">
          {topicsError}
        </div>
      )}
      
      {topicsStatus && (
        <div className="bg-green-900/20 border border-green-400 text-green-400 px-4 py-3 rounded">
          {topicsStatus}
        </div>
      )}

      {/* AI Configuration Status */}
      {aiConfigLoading ? (
        <div className="bg-[#1C1B23] rounded-lg p-4">
          <div className="text-gray-400">Loading AI configuration...</div>
        </div>
      ) : (
        <div className="bg-[#1C1B23] rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-400">AI Enhancement: </span>
              <span className={`text-sm font-medium ${aiConfig?.enabled ? 'text-green-400' : 'text-gray-500'}`}>
                {aiConfig?.enabled ? 'Enabled' : 'Disabled'}
              </span>
              {aiConfig?.enabled && (
                <span className="text-sm text-gray-400 ml-2">
                  ({aiConfig.provider} - {aiConfig.model})
                </span>
              )}
            </div>
            <button
              onClick={() => setIsAIModalOpen(true)}
              className="text-[#B692F6] hover:text-white transition-colors text-sm"
            >
              Configure
            </button>
          </div>
        </div>
      )}

      {/* Search and Filter Controls */}
      {topics.length > 0 && (
        <div className="bg-[#1C1B23] rounded-lg p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search topics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-[#131217] border border-[#2C2B33] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#B692F6]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-4 py-2 bg-[#131217] border border-[#2C2B33] rounded-lg text-white focus:outline-none focus:border-[#B692F6]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <div className="text-sm text-gray-400 flex items-center">
              {filteredTopics.length} {filteredTopics.length === 1 ? 'topic' : 'topics'} found
            </div>
          </div>
        </div>
      )}

      {/* Topics List */}
      {topicsLoading ? (
        <div className="text-center py-8 text-gray-400">Loading topics...</div>
      ) : (
        <div className="space-y-4">
          {filteredTopics.length === 0 ? (
            <div className="bg-[#1C1B23] rounded-lg p-8 text-center">
              <p className="text-gray-400 mb-4">
                {topics.length === 0 ? 'No topics have been created yet.' : 'No topics match your search criteria.'}
              </p>
              {topics.length === 0 && (
                <button
                  onClick={() => {
                    setSelectedTopic(null);
                    setIsTopicModalOpen(true);
                  }}
                  className="text-[#B692F6] hover:text-white transition-colors"
                >
                  Create your first topic
                </button>
              )}
            </div>
          ) : (
            paginatedTopics.map(topic => (
              <div key={topic.id} className="bg-[#1C1B23] rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-white mb-2">{topic.name}</h3>
                    <p className="text-sm text-gray-400 mb-3">{topic.description}</p>
                    
                    <div className="flex flex-wrap gap-4 text-xs">
                      <span className={`px-2 py-1 rounded ${
                        topic.status === 'active' 
                          ? 'bg-green-900/20 text-green-400 border border-green-400/20' 
                          : 'bg-gray-900/20 text-gray-400 border border-gray-400/20'
                      }`}>
                        {topic.status}
                      </span>
                      <span className="text-gray-400">
                        Priority: {topic.priority}/10
                      </span>
                      <span className="text-gray-400">
                        Batch Size: {topic.maxUrlsPerBatch} URLs
                      </span>
                      <span className="text-gray-400">
                        Interval: {Math.round(topic.scrapingInterval / 60)}min
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleToggleTopic(topic.id, topic.status)}
                      disabled={togglingTopics[topic.id]}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        topic.status === 'active'
                          ? 'bg-yellow-900/20 text-yellow-400 hover:bg-yellow-900/30'
                          : 'bg-green-900/20 text-green-400 hover:bg-green-900/30'
                      } disabled:opacity-50`}
                    >
                      {togglingTopics[topic.id] ? '...' : (topic.status === 'active' ? 'Deactivate' : 'Activate')}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTopic(topic);
                        setIsTopicModalOpen(true);
                      }}
                      className="text-[#B692F6] hover:text-white transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTopic(topic.id)}
                      disabled={deletingTopics[topic.id]}
                      className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                    >
                      {deletingTopics[topic.id] ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
                
                {/* Search Queries */}
                {topic.searchQueries && topic.searchQueries.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-xs text-gray-400 mb-2">Search Queries:</h4>
                    <div className="flex flex-wrap gap-2">
                      {topic.searchQueries.map((query, idx) => (
                        <span key={idx} className="px-2 py-1 bg-[#131217] rounded text-xs text-gray-300">
                          {query}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Required Keywords */}
                {topic.requiredKeywords && topic.requiredKeywords.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-xs text-gray-400 mb-2">Required Keywords:</h4>
                    <div className="flex flex-wrap gap-2">
                      {topic.requiredKeywords.map((keyword, idx) => (
                        <span key={idx} className="px-2 py-1 bg-green-900/20 rounded text-xs text-green-400">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Stats */}
                <div className="mt-4 pt-4 border-t border-[#2C2B33] text-xs text-gray-400">
                  <div className="flex justify-between">
                    <span>Created: {new Date(topic.createdAt).toLocaleDateString()}</span>
                    <span>Total URLs Scraped: {topic.totalUrlsScraped}</span>
                    <span>
                      Last Scraped: {
                        topic.lastScraped > 0 
                          ? new Date(topic.lastScraped).toLocaleString() 
                          : 'Never'
                      }
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 pt-4">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-[#2C2B33] text-white rounded-lg hover:bg-[#3C3B43] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              
              <div className="flex space-x-1">
                {[...Array(totalPages)].map((_, index) => {
                  const page = index + 1;
                  // Show first page, last page, current page, and pages around current
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded-lg transition-colors ${
                          currentPage === page
                            ? 'bg-[#B692F6] text-[#131217]'
                            : 'bg-[#2C2B33] text-white hover:bg-[#3C3B43]'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (
                    page === currentPage - 2 ||
                    page === currentPage + 2
                  ) {
                    return (
                      <span key={page} className="px-2 text-gray-500">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-[#2C2B33] text-white rounded-lg hover:bg-[#3C3B43] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Storage Data Fetch Section */}
      <div className="bg-[#1C1B23] rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-white">Storage Canister Data</h3>
          <button
            onClick={() => handleFetchStorageData()}
            disabled={fetchingData}
            className="bg-[#B692F6] text-[#131217] px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {fetchingData ? 'Fetching...' : 'Fetch All Data'}
          </button>
        </div>
        
        {fetchDataStatus && (
          <div className="bg-green-900/20 border border-green-400 text-green-400 px-4 py-3 rounded mb-4">
            {fetchDataStatus}
          </div>
        )}
        
        {fetchDataError && (
          <div className="bg-red-900/20 border border-red-400 text-red-400 px-4 py-3 rounded mb-4">
            {fetchDataError}
          </div>
        )}
        
        {scrapedData.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-400 mb-2">Found {scrapedData.length} items</p>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-400 border-b border-[#2C2B33]">
                  <tr>
                    <th className="pb-2">Topic</th>
                    <th className="pb-2">URL</th>
                    <th className="pb-2">Content Size</th>
                    <th className="pb-2">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  {scrapedData.slice(0, 20).map((item, idx) => (
                    <tr key={idx} className="border-b border-[#2C2B33]/50">
                      <td className="py-2">{item.topic}</td>
                      <td className="py-2 truncate max-w-xs" title={item.url}>
                        {item.url}
                      </td>
                      <td className="py-2">{item.content?.length || 0} chars</td>
                      <td className="py-2">
                        {new Date(Number(item.timestamp) / 1000000).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
          onSave={handleSaveAIConfig}
        />
      )}
    </div>
  );
};