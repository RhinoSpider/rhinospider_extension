import React, { useState, useEffect } from 'react';
import { getAdminActor, getScrapedData } from '../lib/admin';
import { Principal } from '@dfinity/principal';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type ScrapingTopic = {
  id: string;
  name: string;
  description: string;
  urlPatterns: string[];
  active: boolean;
  geolocationFilter?: string;
  percentageNodes?: number;
  randomizationMode?: string;
};

type ScrapedData = {
  id: string;
  url: string;
  topic: string;
  source: string;
  content: string;
  timestamp: bigint;
  client_id: Principal;
  status: string;
  scraping_time: bigint;
};

type TopicStats = {
  name: string;
  count: number;
  totalBytes: number;
  clients: Set<string>;
  avgScrapingTime: number;
  successRate: number;
};

const ITEMS_PER_PAGE = 10;

export const ScrapedData: React.FC = () => {
  const [data, setData] = useState<ScrapedData[]>([]);
  const [topics, setTopics] = useState<ScrapingTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedGeo, setSelectedGeo] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1); // 1-based pagination
  const [itemsPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [topicStats, setTopicStats] = useState<Record<string, TopicStats>>({});
  const [viewMode, setViewMode] = useState<'list' | 'analytics'>('list');
  const [selectedItem, setSelectedItem] = useState<ScrapedData | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Load topics when component mounts
  useEffect(() => {
    loadTopics();
  }, []);
  
  // Load data when topics are loaded, selectedTopic changes, geo filter changes, sort order changes, or page changes
  useEffect(() => {
    if (topics.length > 0) {
      console.log('[ScrapedData] Topics loaded or selection changed, loading data...');
      loadData();
    }
  }, [topics, selectedTopic, selectedGeo, currentPage, sortOrder]);

  const loadTopics = async () => {
    try {
      const actor = await getAdminActor();
      const result = await actor.getTopics();
      if ('ok' in result) {
        setTopics(result.ok);
      }
    } catch (error) {
      console.error('Failed to load topics:', error);
    }
  };

  // Add error state
  const [error, setError] = useState<string | null>(null);
  
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      
      let allData: ScrapedData[] = [];
      
      console.log(`[ScrapedData] Starting data fetch, selectedTopic: ${selectedTopic || 'none'}`);
      
      try {
        if (selectedTopic) {
          // Get ALL data for the selected topic (no pagination from server for topic-specific data)
          console.log(`[ScrapedData] Fetching ALL data for topic: ${selectedTopic}`);
          const result = await getScrapedData(selectedTopic, 0, 1000); // Get up to 1000 items
          allData = result.data;
          console.log(`[ScrapedData] Received ${allData.length} items for topic ${selectedTopic}`);
        } else {
          // Fetch ALL data for filtering and client-side pagination
          console.log('[ScrapedData] No topic selected, fetching ALL data for client-side filtering');
          // Fetch in batches to get all data
          let offset = 0;
          const batchSize = 100;
          let hasMore = true;
          
          while (hasMore) {
            const result = await getScrapedData(undefined, offset / batchSize, batchSize);
            allData = allData.concat(result.data);
            offset += batchSize;
            hasMore = result.data.length === batchSize && offset < result.totalCount;
            
            // Safety limit to prevent infinite loop
            if (offset >= 1000) break;
          }
          console.log(`[ScrapedData] Received total of ${allData.length} items`);
        }
      } catch (error: any) { // Type assertion for error
        console.error(`[ScrapedData] Failed to load data:`, error);
        // Set error message for UI with more details
        setError(`Error loading scraped data from storage canister: ${error.message || 'Unknown error'}. Please ensure the storage canister methods are properly implemented.`);
        setLoading(false);
        return; // Exit early if there's an error
      }
      
      // Filter by geo if selected
      let filteredData = allData;
      if (selectedGeo) {
        // Filter based on topic's geolocation settings
        filteredData = allData.filter(item => {
          const topic = topics.find(t => t.id === item.topic);
          if (!topic) return false;
          
          // Handle different types of geolocationFilter
          let topicGeoFilter = topic.geolocationFilter;
          
          // Convert to string if it's an array or object
          if (Array.isArray(topicGeoFilter)) {
            topicGeoFilter = topicGeoFilter.join(',');
          } else if (typeof topicGeoFilter === 'object' && topicGeoFilter !== null) {
            // If it's an object, try to extract a value
            topicGeoFilter = topicGeoFilter.toString();
          }
          
          // If topic has no geo filter or it's empty, it's global
          if (!topicGeoFilter || topicGeoFilter === '') {
            return selectedGeo === 'GLOBAL';
          }
          
          // Ensure it's a string before splitting
          const geoFilterStr = String(topicGeoFilter);
          
          // Check if topic's geo matches selected geo
          const topicGeos = geoFilterStr.split(',').map(g => g.trim());
          const selectedGeos = selectedGeo.split(',').map(g => g.trim());
          
          // Check for overlap between topic's geos and selected geos
          return topicGeos.some(tg => selectedGeos.includes(tg));
        });
      }
      
      // Sort by timestamp based on sortOrder
      const sortedData = filteredData.sort((a: ScrapedData, b: ScrapedData) => {
        // Convert timestamps to numbers for comparison
        // Handle both nanoseconds and milliseconds formats
        let aTime = Number(a.timestamp);
        let bTime = Number(b.timestamp);
        
        // Debug log to see what formats we're getting
        if (filteredData.length > 0 && filteredData.length < 5) {
          console.log('[ScrapedData] Sample timestamps:', {
            a: { raw: a.timestamp, number: aTime, url: a.url.substring(0, 30) },
            b: { raw: b.timestamp, number: bTime, url: b.url.substring(0, 30) }
          });
        }
        
        // Normalize to milliseconds if in nanoseconds (> 1e15)
        if (aTime > 1e15) aTime = aTime / 1_000_000;
        if (bTime > 1e15) bTime = bTime / 1_000_000;
        
        // Sort based on order
        if (sortOrder === 'newest') {
          return bTime - aTime;
        } else {
          return aTime - bTime;
        }
      });
      
      setTotalItems(sortedData.length);
      setTotalPages(Math.ceil(sortedData.length / ITEMS_PER_PAGE));
      
      // Calculate topic statistics
      const stats: Record<string, TopicStats> = {};
      sortedData.forEach((item: ScrapedData) => {
        const topic = topics.find(t => t.id === item.topic);
        if (!stats[item.topic]) {
          stats[item.topic] = {
            name: topic?.name || 'Unknown Topic',
            count: 0,
            totalBytes: 0,
            clients: new Set<string>(),
            avgScrapingTime: 0,
            successRate: 0
          };
        }
          stats[item.topic].count++;
          stats[item.topic].totalBytes += item.content.length;
          stats[item.topic].clients.add(item.client_id.toText());
          
          // Update scraping stats
          const scrapingTime = Number(item.scraping_time);
          stats[item.topic].avgScrapingTime = 
            ((stats[item.topic].avgScrapingTime * (stats[item.topic].count - 1)) + scrapingTime) / 
            stats[item.topic].count;
          
          stats[item.topic].successRate = 
            ((stats[item.topic].successRate * (stats[item.topic].count - 1)) + 
            ((item.status === 'success' || item.status === 'completed') ? 1 : 0)) / stats[item.topic].count;
        });
        setTopicStats(stats);
        
        // Apply client-side pagination on the filtered and sorted data
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const paginatedData = sortedData.slice(start, start + ITEMS_PER_PAGE);
        setData(paginatedData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTopic = (topicId: string) => {
    return topics.find(t => t.id === topicId);
  };

  const formatDate = (timestamp: bigint) => {
    // Convert timestamp - handle both nanoseconds and milliseconds
    let timestampNum = Number(timestamp);
    
    // If timestamp is in nanoseconds (> 1e15), convert to milliseconds
    if (timestampNum > 1e15) {
      timestampNum = timestampNum / 1_000_000; // Convert nanoseconds to milliseconds
    } else if (timestampNum < 1e12) {
      // If timestamp is too small (seconds), convert to milliseconds
      timestampNum = timestampNum * 1000;
    }
    
    return new Date(timestampNum).toLocaleString();
  };

  const formatBytes = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  // Removed - totalPages is now a state variable

  const chartData = {
    labels: Object.values(topicStats).map(stat => stat.name),
    datasets: [
      {
        label: 'Number of Items',
        data: Object.values(topicStats).map(stat => stat.count),
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Scraped Data</h2>
        <div className="flex items-center space-x-4">
          <div className="flex bg-[#131217] rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded ${
                viewMode === 'list'
                  ? 'bg-[#B692F6] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('analytics')}
              className={`px-4 py-2 rounded ${
                viewMode === 'analytics'
                  ? 'bg-[#B692F6] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Analytics
            </button>
          </div>
          <div className="flex gap-4">
            <select
              value={selectedTopic}
              onChange={(e) => {
                setSelectedTopic(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#131217] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#B692F6]"
            >
              <option value="">All Topics</option>
              {topics.map(topic => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>
            
            <select
              value={selectedGeo}
              onChange={(e) => {
                setSelectedGeo(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#131217] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#B692F6]"
            >
              <option value="">All Regions</option>
              <option value="KZ,RU,UZ,KG,TJ">Eurasia (KZ/RU/UZ)</option>
              <option value="AE,SA,QA,KW,BH,OM">Gulf Region (UAE/SA)</option>
              <option value="CA,US">North America (CA/US)</option>
              <option value="US,UK">US/UK</option>
              <option value="EU">Europe</option>
              <option value="ASIA">Asia</option>
              <option value="GLOBAL">Global (No Filter)</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
              className="bg-[#131217] text-white rounded-lg px-4 py-2 hover:bg-[#360D68] transition-colors focus:outline-none focus:ring-2 focus:ring-[#B692F6] flex items-center gap-2"
            >
              <span>📅</span>
              <span>{sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
              <span>{sortOrder === 'newest' ? '↓' : '↑'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Display error message if there is one */}
      {error && (
        <div className="bg-red-900 border border-red-700 text-white px-4 py-3 rounded-lg mb-4">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#B692F6] mx-auto"></div>
        </div>
      ) : viewMode === 'analytics' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#131217] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Data Distribution by Topic</h3>
            <div className="h-64">
              <Pie data={chartData} options={{ maintainAspectRatio: false }} />
            </div>
          </div>
          <div className="bg-[#131217] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Topic Statistics</h3>
            <div className="space-y-4">
              {Object.entries(topicStats).map(([topicId, stats]) => (
                <div key={topicId} className="border-b border-gray-700 pb-4">
                  <h4 className="font-medium text-white">{stats.name}</h4>
                  <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                    <div>
                      <div className="text-gray-400">Items</div>
                      <div className="text-white">{stats.count}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Total Size</div>
                      <div className="text-white">{formatBytes(stats.totalBytes)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Unique Clients</div>
                      <div className="text-white">{stats.clients.size}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Avg. Scraping Time</div>
                      <div className="text-white">{(stats.avgScrapingTime / 1000).toFixed(2)}s</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Success Rate</div>
                      <div className="text-white">{(stats.successRate * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No data found
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((item, index) => {
            const topic = getTopic(item.topic);
            // Check if item is from last 24 hours
            const timestampNum = Number(item.timestamp) > 1e15 ? Number(item.timestamp) / 1_000_000 : Number(item.timestamp);
            const isNew = (Date.now() - timestampNum) < (24 * 60 * 60 * 1000);
            const isVeryRecent = (Date.now() - timestampNum) < (60 * 60 * 1000); // Last hour
            
            return (
              <div
                key={item.id}
                className="bg-[#131217] rounded-lg p-4 space-y-3 cursor-pointer hover:bg-[#1a1922] transition-colors relative"
                onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
              >
                {/* Add position indicator for first 3 items */}
                {index < 3 && sortOrder === 'newest' && (
                  <div className="absolute -left-1 top-4 bg-[#B692F6] text-[#131217] text-xs font-bold px-2 py-1 rounded-r">
                    #{index + 1}
                  </div>
                )}
                
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">
                          {topic?.name || 'Unknown Topic'}
                        </h3>
                        {isVeryRecent && (
                          <span className="bg-green-400 text-[#131217] text-xs font-bold px-2 py-0.5 rounded">
                            HOT
                          </span>
                        )}
                        {!isVeryRecent && isNew && (
                          <span className="bg-yellow-400 text-[#131217] text-xs font-bold px-2 py-0.5 rounded">
                            NEW
                          </span>
                        )}
                        {/* Add geo location badge */}
                        {(() => {
                          let geoFilter = topic?.geolocationFilter;
                          // Handle different types of geolocationFilter
                          if (Array.isArray(geoFilter)) {
                            geoFilter = geoFilter.join(', ');
                          } else if (typeof geoFilter === 'object' && geoFilter !== null) {
                            geoFilter = geoFilter.toString();
                          }
                          
                          if (geoFilter && geoFilter !== '') {
                            return (
                              <span className="bg-blue-500 text-white text-xs font-semibold px-2 py-0.5 rounded">
                                📍 {geoFilter}
                              </span>
                            );
                          } else {
                            return (
                              <span className="bg-gray-600 text-white text-xs font-semibold px-2 py-0.5 rounded">
                                🌍 Global
                              </span>
                            );
                          }
                        })()}
                      </div>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#B692F6] hover:underline text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.url}
                      </a>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">
                      {formatDate(item.timestamp)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Size: {formatBytes(item.content.length)}
                    </div>
                    <div className="text-xs text-green-400">
                      +{Math.floor(item.content.length / 1024) * 10} pts
                    </div>
                  </div>
                </div>

                {selectedItem?.id === item.id && (
                  <div className="mt-4 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-sm text-[#B692F6] mb-1">Content Preview</div>
                        <div className="text-white text-sm bg-black/30 p-3 rounded max-h-40 overflow-auto">
                          {item.content.substring(0, 500)}...
                        </div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          // Create a modal or expand view for full content
                          const modal = document.createElement('div');
                          modal.className = 'fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8';
                          modal.innerHTML = `
                            <div class="bg-[#131217] rounded-lg max-w-4xl w-full max-h-[80vh] overflow-auto p-6">
                              <div class="flex justify-between items-start mb-4">
                                <h2 class="text-xl font-bold text-white">Full Details</h2>
                                <button class="text-gray-400 hover:text-white" onclick="this.parentElement.parentElement.parentElement.remove()">✕</button>
                              </div>
                              <div class="space-y-4">
                                <div>
                                  <div class="text-[#B692F6] font-semibold mb-2">URL</div>
                                  <div class="text-white">${item.url}</div>
                                </div>
                                <div>
                                  <div class="text-[#B692F6] font-semibold mb-2">Full Content</div>
                                  <div class="text-white bg-black/30 p-4 rounded max-h-96 overflow-auto whitespace-pre-wrap">${item.content}</div>
                                </div>
                                <div class="grid grid-cols-2 gap-4">
                                  <div>
                                    <div class="text-[#B692F6] font-semibold mb-2">Metadata</div>
                                    <div class="text-white text-sm">
                                      <div>ID: ${item.id}</div>
                                      <div>Topic: ${topic?.name || item.topic}</div>
                                      <div>Client: ${item.client_id.toText()}</div>
                                      <div>Source: ${item.source}</div>
                                      <div>Status: ${item.status}</div>
                                      <div>Timestamp: ${formatDate(item.timestamp)}</div>
                                      <div>Scraping Time: ${(Number(item.scraping_time) / 1000).toFixed(2)}s</div>
                                    </div>
                                  </div>
                                  <div>
                                    <div class="text-[#B692F6] font-semibold mb-2">Metrics</div>
                                    <div class="text-white text-sm">
                                      <div>Content Size: ${formatBytes(item.content.length)}</div>
                                      <div>Points Generated: ${Math.floor(item.content.length / 1024) * 10} points</div>
                                      <div>Bandwidth Used: ${formatBytes(item.content.length)}</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          `;
                          document.body.appendChild(modal);
                        }}
                        className="ml-4 px-3 py-1 bg-[#B692F6] text-[#131217] text-sm font-semibold rounded hover:bg-[#A580F5] transition-colors"
                      >
                        View Full Details
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-[#B692F6] mb-1">Client ID</div>
                        <div className="text-white text-sm font-mono text-xs">{item.client_id.toText().substring(0, 20)}...</div>
                      </div>
                      <div>
                        <div className="text-sm text-[#B692F6] mb-1">Source</div>
                        <div className="text-white text-sm">{item.source}</div>
                      </div>
                      <div>
                        <div className="text-sm text-[#B692F6] mb-1">Status</div>
                        <div className={`text-sm ${
                          item.status === 'success' || item.status === 'completed' ? 'text-green-400' : 
                          item.status === 'error' || item.status === 'failed' ? 'text-red-400' : 
                          'text-yellow-400'
                        }`}>
                          {item.status === 'completed' ? 'success' : item.status}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-[#B692F6] mb-1">Scraping Time</div>
                        <div className="text-white text-sm">
                          {(Number(item.scraping_time) / 1000).toFixed(2)}s
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-[#B692F6] mb-1">Points Generated</div>
                        <div className="text-white text-sm">
                          {Math.floor(item.content.length / 1024) * 10} pts
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-[#B692F6] mb-1">Bandwidth Used</div>
                        <div className="text-white text-sm">
                          {formatBytes(item.content.length)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-400">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems} items
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-[#131217] text-white rounded disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-[#131217] text-white rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
