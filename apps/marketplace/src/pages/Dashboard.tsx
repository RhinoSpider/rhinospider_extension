import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Purchase, Dataset } from '../types';
import marketplaceService from '../services/marketplace';
import { useAuth } from '../hooks/useAuth';
import {
  DocumentArrowDownIcon,
  KeyIcon,
  CalendarIcon,
  CreditCardIcon,
  ChartBarIcon,
  CircleStackIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShoppingBagIcon,
  CloudArrowDownIcon
} from '@heroicons/react/24/outline';

export default function Dashboard() {
  const { principal, identity } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [datasets, setDatasets] = useState<{ [key: string]: Dataset }>({});
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPurchases: 0,
    totalSpent: 0,
    activeDatasets: 0,
    apiSubscriptions: 0
  });

  useEffect(() => {
    const loadData = async () => {
      if (identity) {
        await marketplaceService.setIdentity(identity);

        // Fetch user's purchases
        const userPurchases = await marketplaceService.getUserPurchases();
        setPurchases(userPurchases);

        // Fetch dataset details for each purchase
        const datasetMap: { [key: string]: Dataset } = {};
        for (const purchase of userPurchases) {
          const dataset = await marketplaceService.getDataset(purchase.dataset_id);
          if (dataset) {
            datasetMap[purchase.dataset_id] = dataset;
          }
        }
        setDatasets(datasetMap);

        // Calculate stats
        const totalSpent = userPurchases.reduce((sum, p) => sum + p.amount, 0);
        const activeDatasets = userPurchases.filter(p => p.status === 'active').length;
        const apiSubscriptions = userPurchases.filter(p => p.purchase_type === 'API').length;

        setStats({
          totalPurchases: userPurchases.length,
          totalSpent,
          activeDatasets,
          apiSubscriptions
        });
      }
      setLoading(false);
    };

    loadData();
  }, [identity]);

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000); // Convert nanoseconds to milliseconds
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'expired':
        return 'bg-red-100 text-red-700';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Manage your data purchases and API access
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Purchases</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPurchases}</p>
            </div>
            <ShoppingBagIcon className="h-8 w-8 text-primary-600 opacity-50" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalSpent.toLocaleString()} ICP
              </p>
            </div>
            <CreditCardIcon className="h-8 w-8 text-green-600 opacity-50" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Datasets</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeDatasets}</p>
            </div>
            <CircleStackIcon className="h-8 w-8 text-blue-600 opacity-50" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">API Subscriptions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.apiSubscriptions}</p>
            </div>
            <KeyIcon className="h-8 w-8 text-purple-600 opacity-50" />
          </div>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Your Purchases</h2>
        </div>

        {purchases.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CircleStackIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No purchases yet</h3>
            <p className="text-gray-500 mb-6">
              Start by browsing our catalog of enterprise datasets
            </p>
            <Link to="/catalog" className="btn-primary">
              Browse Catalog
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dataset
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purchase Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {purchases.map((purchase) => {
                  const dataset = datasets[purchase.dataset_id];
                  return (
                    <tr key={purchase.purchase_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          to={`/dataset/${purchase.dataset_id}`}
                          className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                          {dataset?.name || purchase.dataset_id}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          {purchase.purchase_type === 'API' ? (
                            <>
                              <KeyIcon className="h-4 w-4 text-purple-600" />
                              <span className="text-sm text-gray-900">API Access</span>
                            </>
                          ) : (
                            <>
                              <CloudArrowDownIcon className="h-4 w-4 text-blue-600" />
                              <span className="text-sm text-gray-900">Bulk Download</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(purchase.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {purchase.amount.toLocaleString()} {purchase.currency}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(purchase.status)}`}>
                          {purchase.status === 'active' ? (
                            <CheckCircleIcon className="h-3 w-3" />
                          ) : (
                            <XCircleIcon className="h-3 w-3" />
                          )}
                          {purchase.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {purchase.purchase_type === 'BULK' && purchase.download_url ? (
                          <a
                            href={purchase.download_url}
                            className="text-primary-600 hover:text-primary-700 font-medium"
                            download
                          >
                            Download
                          </a>
                        ) : purchase.purchase_type === 'API' ? (
                          <Link
                            to={`/dataset/${purchase.dataset_id}`}
                            className="text-primary-600 hover:text-primary-700 font-medium"
                          >
                            View API Docs
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* API Keys Section for Active API Purchases */}
      {purchases.filter(p => p.purchase_type === 'API' && p.status === 'active').length > 0 && (
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">API Access</h2>
          </div>
          <div className="p-6 space-y-4">
            {purchases
              .filter(p => p.purchase_type === 'API' && p.status === 'active')
              .map(purchase => {
                const dataset = datasets[purchase.dataset_id];
                return (
                  <div key={purchase.purchase_id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {dataset?.name || purchase.dataset_id}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Purchase ID: {purchase.purchase_id}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {purchase.expires_at && `Expires: ${formatDate(purchase.expires_at)}`}
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-xs text-gray-600 mb-2">API Endpoint:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-sm bg-white px-3 py-2 rounded border">
                          {dataset?.api_endpoint || 'https://api.rhinospider.io/v1/data'}
                        </code>
                        <button
                          onClick={() => copyToClipboard(dataset?.api_endpoint || '')}
                          className="btn-secondary text-sm"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}