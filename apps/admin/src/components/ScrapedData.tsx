import React, { useState, useEffect } from 'react';
import { getAdminActor } from '../lib/admin';
import { _SERVICE as AdminService } from '../../../declarations/admin/admin.did';
import type { ScrapingTopic } from '../../../declarations/admin/admin.did';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

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
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [topicStats, setTopicStats] = useState<Record<string, TopicStats>>({});
  const [viewMode, setViewMode] = useState<'list' | 'analytics'>('list');
  const [selectedItem, setSelectedItem] = useState<ScrapedData | null>(null);

  useEffect(() => {
    loadTopics();
    loadData();
  }, [selectedTopic, currentPage]);

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

  const loadData = async () => {
    try {
      setLoading(true);
      const actor = await getAdminActor();
      const result = await actor.getScrapedData(selectedTopic ? [selectedTopic] : []);
      
      if ('ok' in result) {
        // Sort by timestamp descending
        const sortedData = result.ok.sort((a, b) => 
          Number(b.timestamp - a.timestamp)
        );
        setTotalItems(sortedData.length);
        
        // Calculate topic statistics
        const stats: Record<string, TopicStats> = {};
        sortedData.forEach(item => {
          const topic = topics.find(t => t.id === item.topic);
          if (!stats[item.topic]) {
            stats[item.topic] = {
              name: topic?.name || 'Unknown Topic',
              count: 0,
              totalBytes: 0,
              clients: new Set(),
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
            (item.status === 'success' ? 1 : 0)) / stats[item.topic].count;
        });
        setTopicStats(stats);
        
        // Paginate
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const paginatedData = sortedData.slice(start, start + ITEMS_PER_PAGE);
        setData(paginatedData);
      } else {
        console.error('Failed to load data:', result.err);
      }
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
    return new Date(Number(timestamp)).toLocaleString();
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

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

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
        </div>
      </div>

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
          {data.map((item) => {
            const topic = getTopic(item.topic);
            return (
              <div
                key={item.id}
                className="bg-[#131217] rounded-lg p-4 space-y-3 cursor-pointer hover:bg-[#1a1922] transition-colors"
                onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {topic?.name || 'Unknown Topic'}
                    </h3>
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
                  <div className="text-right">
                    <div className="text-sm text-gray-400">
                      {formatDate(item.timestamp)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Size: {formatBytes(item.content.length)}
                    </div>
                  </div>
                </div>

                {selectedItem?.id === item.id && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="text-sm text-[#B692F6] mb-1">Content Preview</div>
                      <div className="text-white text-sm bg-black/30 p-3 rounded max-h-40 overflow-auto">
                        {item.content}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-[#B692F6] mb-1">Client ID</div>
                        <div className="text-white text-sm">{item.client_id.toText()}</div>
                      </div>
                      <div>
                        <div className="text-sm text-[#B692F6] mb-1">Source</div>
                        <div className="text-white text-sm">{item.source}</div>
                      </div>
                      <div>
                        <div className="text-sm text-[#B692F6] mb-1">Status</div>
                        <div className={`text-sm ${
                          item.status === 'success' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {item.status}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-[#B692F6] mb-1">Scraping Time</div>
                        <div className="text-white text-sm">
                          {(Number(item.scraping_time) / 1000).toFixed(2)}s
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
