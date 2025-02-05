import React, { useState, useEffect } from 'react';
import { getAdminActor } from '../lib/admin';
import type { ScrapedData as ScrapedDataType, ScrapingTopic } from '../types';

const ITEMS_PER_PAGE = 10;

export const ScrapedData: React.FC = () => {
  const [data, setData] = useState<ScrapedDataType[]>([]);
  const [topics, setTopics] = useState<ScrapingTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    loadTopics();
    loadData();
  }, [selectedTopic, currentPage]);

  const loadTopics = async () => {
    try {
      const actor = await getAdminActor();
      const result = await actor.getTopics();
      if ('Ok' in result) {
        setTopics(result.Ok);
      }
    } catch (error) {
      console.error('Failed to load topics:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const actor = await getAdminActor();
      const result = await actor.getScrapedData(selectedTopic || null);
      if ('Ok' in result) {
        // Sort by timestamp descending
        const sortedData = result.Ok.sort((a, b) => 
          Number(b.timestamp - a.timestamp)
        );
        setTotalItems(sortedData.length);
        
        // Paginate
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const paginatedData = sortedData.slice(start, start + ITEMS_PER_PAGE);
        setData(paginatedData);
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

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Scraped Data</h2>
        <div className="flex items-center space-x-4">
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
      ) : data.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No data found
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((item) => {
            const topic = getTopic(item.topicId);
            return (
              <div
                key={item.id}
                className="bg-[#131217] rounded-lg p-4 space-y-3"
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
                    >
                      {item.url}
                    </a>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">
                      {formatDate(item.timestamp)}
                    </div>
                    <div className="text-sm">
                      Quality: {(item.quality.score * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(item.data).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <div className="text-sm text-[#B692F6]">{key}</div>
                      <div className="text-white break-words">{value}</div>
                    </div>
                  ))}
                </div>

                {item.quality.issues && item.quality.issues.length > 0 && (
                  <div className="mt-2">
                    <div className="text-sm text-red-400">Issues:</div>
                    <ul className="list-disc list-inside text-sm text-red-400">
                      {item.quality.issues.map((issue, index) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </ul>
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
