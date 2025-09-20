import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Dataset, DatasetStats } from '../types';
import marketplaceService from '../services/marketplace';
import { useAuth } from '../hooks/useAuth';
import {
  ArrowLeftIcon,
  CircleStackIcon,
  ClockIcon,
  GlobeAltIcon,
  TagIcon,
  DocumentTextIcon,
  ShoppingCartIcon,
  CheckCircleIcon,
  CodeBracketIcon,
  ServerStackIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

export default function DatasetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { identity, isAuthenticated } = useAuth();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [datasetStats, setDatasetStats] = useState<DatasetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [selectedAccessType, setSelectedAccessType] = useState<'BULK' | 'API'>('BULK');

  useEffect(() => {
    const loadDataset = async () => {
      if (!id) return;

      setLoading(true);
      try {
        // Set identity if authenticated
        if (identity) {
          await marketplaceService.setIdentity(identity);
        }

        // Fetch dataset details
        const fetchedDataset = await marketplaceService.getDataset(id);
        if (fetchedDataset) {
          setDataset(fetchedDataset);

          // Fetch dataset statistics
          const stats = await marketplaceService.getDatasetStats(id);
          setDatasetStats(stats);
        } else {
          // Dataset not found, redirect to catalog
          navigate('/catalog');
        }
      } catch (error) {
        console.error('Failed to load dataset:', error);
        navigate('/catalog');
      }
      setLoading(false);
    };

    loadDataset();
  }, [id, identity, navigate]);

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      // Store intended purchase in session and redirect to auth
      sessionStorage.setItem('pendingPurchase', JSON.stringify({
        datasetId: id,
        accessType: selectedAccessType
      }));
      navigate('/');
      return;
    }

    if (!dataset) return;

    setIsPurchasing(true);
    try {
      const amount = selectedAccessType === 'API' ? dataset.price_api : dataset.price_bulk;
      const purchase = await marketplaceService.purchaseDataset(
        dataset.dataset_id,
        selectedAccessType,
        amount,
        'ICP'
      );

      if (purchase) {
        setPurchaseSuccess(true);
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      } else {
        alert('Purchase failed. Please try again.');
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      alert('Purchase failed. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Dataset not found</p>
        <button
          onClick={() => navigate('/catalog')}
          className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
        >
          Back to Catalog
        </button>
      </div>
    );
  }

  const formatSize = (sizeGb: number) => {
    if (sizeGb >= 1000) {
      return `${(sizeGb / 1000).toFixed(1)} TB`;
    }
    return `${sizeGb.toFixed(1)} GB`;
  };

  const formatRowCount = (count: number) => {
    if (count >= 1000000000) {
      return `${(count / 1000000000).toFixed(1)}B`;
    }
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(0)}K`;
    }
    return count.toString();
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000); // Convert nanoseconds to milliseconds
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatSampleData = (rows: string[]) => {
    try {
      // Parse and format the first few rows as JSON
      const samples = rows.slice(0, 2).map(row => {
        try {
          return JSON.parse(row);
        } catch {
          return row;
        }
      });
      return JSON.stringify(samples, null, 2);
    } catch {
      return rows.slice(0, 2).join('\n');
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'E-commerce': 'bg-purple-100 text-purple-700',
      'Blockchain': 'bg-blue-100 text-blue-700',
      'Social Analytics': 'bg-pink-100 text-pink-700',
      'Logistics': 'bg-green-100 text-green-700',
      'Weather': 'bg-cyan-100 text-cyan-700',
      'Finance': 'bg-yellow-100 text-yellow-700',
      'Healthcare': 'bg-red-100 text-red-700'
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div>
      {/* Back Navigation */}
      <button
        onClick={() => navigate('/catalog')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        <span>Back to Catalog</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            {/* Category Badge */}
            <div className="flex justify-between items-start mb-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(dataset.category)}`}>
                {dataset.category}
              </span>
              {dataset.status === 'active' && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                  Active
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">{dataset.name}</h1>
            <p className="text-gray-600 mb-6">{dataset.description}</p>

            {/* Dataset Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center gap-2">
                <GlobeAltIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Region</p>
                  <p className="font-medium">{dataset.region}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CircleStackIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Size</p>
                  <p className="font-medium">{formatSize(dataset.size_gb)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ServerStackIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Rows</p>
                  <p className="font-medium">{formatRowCount(dataset.row_count)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Format</p>
                  <p className="font-medium">{dataset.format}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Last Updated</p>
                  <p className="font-medium">{formatDate(dataset.last_update)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ArrowTrendingUpIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Updates</p>
                  <p className="font-medium">{dataset.update_frequency}</p>
                </div>
              </div>
            </div>

            {/* Data Source */}
            <div className="mb-6 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Data Source</p>
              <p className="text-sm font-medium text-gray-700">{dataset.data_source}</p>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              {dataset.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-600"
                >
                  <TagIcon className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>

            {/* Features */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Dataset Features</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
                  <span className="text-gray-700">{dataset.row_count.toLocaleString()} total rows</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
                  <span className="text-gray-700">{dataset.update_frequency} data updates</span>
                </li>
                {dataset.preview_available && (
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
                    <span className="text-gray-700">Sample preview available</span>
                  </li>
                )}
                {dataset.api_endpoint && (
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
                    <span className="text-gray-700">REST API endpoint ready</span>
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
                  <span className="text-gray-700">Enterprise-grade data quality</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
                  <span className="text-gray-700">On-chain data integrity hash</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Sample Data Preview */}
          {dataset.sample_rows && dataset.sample_rows.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <CodeBracketIcon className="h-5 w-5 text-gray-400" />
                <h3 className="text-lg font-semibold">Sample Data Preview</h3>
                <span className="text-xs text-gray-500">({dataset.sample_rows.length} sample rows)</span>
              </div>
              <div className="bg-gray-900 text-gray-300 p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm">
                  <code>{formatSampleData(dataset.sample_rows)}</code>
                </pre>
              </div>
              {dataset.api_endpoint && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600 mb-1">API Endpoint</p>
                  <code className="text-xs font-mono text-blue-800">{dataset.api_endpoint}</code>
                </div>
              )}
            </div>
          )}

          {/* Statistics */}
          {datasetStats && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Dataset Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="flex items-center gap-1 text-gray-500 mb-1">
                    <UserGroupIcon className="h-4 w-4" />
                    <p className="text-xs">Total Purchases</p>
                  </div>
                  <p className="text-lg font-bold">{datasetStats.total_purchases}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-gray-500 mb-1">
                    <CurrencyDollarIcon className="h-4 w-4" />
                    <p className="text-xs">Total Revenue</p>
                  </div>
                  <p className="text-lg font-bold">{datasetStats.total_revenue.toLocaleString()} ICP</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-gray-500 mb-1">
                    <ServerStackIcon className="h-4 w-4" />
                    <p className="text-xs">API Subscriptions</p>
                  </div>
                  <p className="text-lg font-bold">{datasetStats.api_subscriptions}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-gray-500 mb-1">
                    <CircleStackIcon className="h-4 w-4" />
                    <p className="text-xs">Bulk Downloads</p>
                  </div>
                  <p className="text-lg font-bold">{datasetStats.bulk_downloads}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Purchase Card */}
        <div className="lg:col-span-1">
          <div className="card sticky top-6">
            <h3 className="text-lg font-semibold mb-4">Purchase Options</h3>

            {/* Access Type Selection */}
            <div className="space-y-3 mb-6">
              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="access"
                  value="BULK"
                  checked={selectedAccessType === 'BULK'}
                  onChange={() => setSelectedAccessType('BULK')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-medium">Bulk Download</p>
                  <p className="text-sm text-gray-600">One-time download of complete dataset</p>
                  <p className="text-xs text-gray-500 mt-1">Format: {dataset.format}</p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="access"
                  value="API"
                  checked={selectedAccessType === 'API'}
                  onChange={() => setSelectedAccessType('API')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-medium">API Access</p>
                  <p className="text-sm text-gray-600">Monthly subscription with API key</p>
                  <p className="text-xs text-gray-500 mt-1">10,000 requests/day included</p>
                </div>
              </label>
            </div>

            {/* Price Breakdown */}
            <div className="border-t pt-6 mb-6">
              <div className="space-y-2">
                {selectedAccessType === 'BULK' ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Dataset ({formatSize(dataset.size_gb)})</span>
                      <span className="font-medium">{dataset.price_bulk.toLocaleString()} ICP</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Download expires</span>
                      <span className="text-sm text-gray-500">After 7 days</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Monthly subscription</span>
                      <span className="font-medium">{dataset.price_api.toLocaleString()} ICP</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">API rate limit</span>
                      <span className="text-sm text-gray-500">1000 req/min</span>
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-between items-center text-lg font-bold pt-3 mt-3 border-t">
                <span>Total</span>
                <span className="text-primary-600">
                  {selectedAccessType === 'API'
                    ? dataset.price_api.toLocaleString()
                    : dataset.price_bulk.toLocaleString()
                  } ICP
                </span>
              </div>
            </div>

            {/* Purchase Button */}
            {purchaseSuccess ? (
              <div className="text-center py-4">
                <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-green-600 font-medium">Purchase Successful!</p>
                <p className="text-sm text-gray-600 mt-1">Redirecting to dashboard...</p>
              </div>
            ) : (
              <>
                <button
                  onClick={handlePurchase}
                  disabled={isPurchasing}
                  className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                >
                  {isPurchasing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCartIcon className="h-5 w-5" />
                      <span>{isAuthenticated ? 'Purchase Now' : 'Sign In to Purchase'}</span>
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center mt-4">
                  Secure payment via Internet Computer Protocol
                </p>
                {!isAuthenticated && (
                  <p className="text-xs text-amber-600 text-center mt-2">
                    You'll need to sign in with Internet Identity to complete your purchase
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}