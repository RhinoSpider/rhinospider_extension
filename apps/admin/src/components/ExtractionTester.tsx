import React, { useState } from 'react';
import { ScrapingTopic } from '../types';
import { getStorageActor, IS_LOCAL } from '../lib/storage';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ExtractionTesterProps {
  topic: Partial<ScrapingTopic>;
  onClose: () => void;
}

export const ExtractionTester: React.FC<ExtractionTesterProps> = ({ topic, onClose }) => {
  const [testUrl, setTestUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    if (!testUrl) {
      setError('Please enter a URL to test');
      return;
    }

    if (!topic.extractionRules?.fields?.length) {
      setError('No extraction fields defined');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const actor = await getStorageActor();
      if (!actor) {
        setError('Failed to initialize storage actor');
        return;
      }

      // Convert the custom prompt to proper optional format
      const customPrompt = topic.extractionRules.customPrompt?.[0] 
        ? [topic.extractionRules.customPrompt[0]]
        : [];

      // Only include fields that are marked as required
      const fields = topic.extractionRules.fields.map(f => ({
        name: f.name,
        fieldType: f.fieldType,
        required: f.required,
        aiPrompt: f.aiPrompt,
      }));

      console.log('Testing extraction with fields:', fields);

      // Use testExtractionLocal for local development
      const extractionRules = {
        fields,
        customPrompt: customPrompt.length > 0 ? [customPrompt[0]] : [],
      };

      console.log('Sending extraction rules:', extractionRules);

      const result = IS_LOCAL 
        ? await actor.testExtractionLocal({
            htmlContent: testUrl,
            extractionRules: extractionRules,
          })
        : await actor.testExtraction({
            url: testUrl,
            extractionRules: extractionRules,
          });

      if ('ok' in result) {
        // Result is a data array
        const extractedData = result.ok.data;
        const formattedResults = extractedData.map(([key, value]: [string, string]) => `${key}: ${value}`).join('\n');
        setResults(formattedResults);
        setError(null);
      } else {
        setError(result.err);
        setResults(null);
      }
    } catch (err) {
      console.error('Test extraction error:', err);
      setError(err instanceof Error ? err.message : 'Failed to test extraction');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-6 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-lg bg-[#1C1B23] text-white">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-medium">Test Extraction Rules</h3>
            <div className="flex items-center mt-1">
              <div className={`h-2 w-2 rounded-full mr-2 ${IS_LOCAL ? 'bg-yellow-400' : 'bg-green-400'}`} />
              <span className="text-sm text-gray-400">
                {IS_LOCAL ? 'Local Testing Mode' : 'Production Mode'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Mode Info */}
          {IS_LOCAL && (
            <div className="text-sm bg-yellow-500/10 border border-yellow-500/20 rounded-md p-3">
              <strong>Local Testing Mode:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Enter a URL to test with real data from the storage canister</li>
                <li>Or paste HTML content directly to test extraction rules</li>
                <li>No cycles required for testing</li>
              </ul>
            </div>
          )}

          {/* URL/HTML Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {IS_LOCAL ? 'Test URL or HTML Content' : 'Test URL'}
            </label>
            <div className="flex gap-4">
              <input
                type={IS_LOCAL ? 'text' : 'url'}
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                placeholder={IS_LOCAL ? 'Enter URL or paste HTML content' : 'Enter URL to test'}
                className="flex-1 bg-gray-800 rounded px-3 py-2 text-white placeholder-gray-400"
              />
              <button
                onClick={handleTest}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test'}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-400 text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Results */}
          {results && (
            <div>
              <h4 className="text-sm font-medium mb-2">Extraction Results</h4>
              <div className="bg-[#131217] border border-[#2C2B33] rounded-lg p-4">
                <pre className="text-sm overflow-auto whitespace-pre-wrap">
                  {results}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
