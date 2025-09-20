import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Dataset, DATASET_CATEGORIES, DATASET_REGIONS } from '../types';
import marketplaceService from '../services/marketplace';
import { useAuth } from '../hooks/useAuth';
import {
  MagnifyingGlassIcon,
  GlobeAltIcon,
  CircleStackIcon,
  ClockIcon,
  TagIcon,
  ArrowTrendingUpIcon,
  ServerStackIcon
} from '@heroicons/react/24/outline';

export default function Catalog() {
  const { identity } = useAuth();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [filteredDatasets, setFilteredDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 });

  useEffect(() => {
    const loadDatasets = async () => {
      setLoading(true);
      try {
        // Set identity if authenticated
        if (identity) {
          await marketplaceService.setIdentity(identity);
        }

        const fetchedDatasets = await marketplaceService.getAllDatasets();
        console.log('Fetched datasets from canister:', fetchedDatasets);
        setDatasets(fetchedDatasets);
        setFilteredDatasets(fetchedDatasets);
      } catch (error) {
        console.error('Failed to load datasets:', error);
        console.error('Error details:', error);
      }
      setLoading(false);
    };

    loadDatasets();
  }, [identity]);

  useEffect(() => {
    const filterDatasets = async () => {
      if (searchTerm || selectedCategory || selectedRegion || priceRange.min > 0 || priceRange.max < 10000) {
        const filtered = await marketplaceService.searchDatasets(
          searchTerm || undefined,
          selectedCategory || undefined,
          selectedRegion || undefined,
          priceRange.min || undefined,
          priceRange.max < 10000 ? priceRange.max : undefined
        );
        setFilteredDatasets(filtered);
      } else {
        setFilteredDatasets(datasets);
      }
    };

    filterDatasets();
  }, [searchTerm, selectedCategory, selectedRegion, priceRange, datasets]);

  const formatSize = (sizeGb: number) => {
    if (sizeGb >= 1000) {
      return `${(sizeGb / 1000).toFixed(1)} TB`;
    }
    return `${sizeGb.toFixed(1)} GB`;
  };

  const formatRowCount = (count: number) => {
    if (count >= 1000000000) {
      return `${(count / 1000000000).toFixed(1)}B rows`;
    }
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M rows`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(0)}K rows`;
    }
    return `${count} rows`;
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000); // Convert nanoseconds to milliseconds
    const now = new Date();
    const diffHours = Math.abs(now.getTime() - date.getTime()) / 36e5;

    if (diffHours < 24) {
      return `${Math.round(diffHours)} hours ago`;
    }
    if (diffHours < 168) {
      return `${Math.round(diffHours / 24)} days ago`;
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dataset Catalog</h1>
        <p className="mt-2 text-gray-600">
          Browse {datasets.length} enterprise-grade datasets with real-time updates
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, description, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 input"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input"
          >
            <option value="">All Categories</option>
            {DATASET_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="input"
          >
            <option value="">All Regions</option>
            {DATASET_REGIONS.map(reg => (
              <option key={reg} value={reg}>{reg}</option>
            ))}
          </select>
        </div>

        {/* Price Range Filter */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">Price Range (ICP):</span>
          <input
            type="number"
            placeholder="Min"
            value={priceRange.min}
            onChange={(e) => setPriceRange({ ...priceRange, min: Number(e.target.value) })}
            className="w-24 px-2 py-1 border rounded"
          />
          <span>-</span>
          <input
            type="number"
            placeholder="Max"
            value={priceRange.max}
            onChange={(e) => setPriceRange({ ...priceRange, max: Number(e.target.value) })}
            className="w-24 px-2 py-1 border rounded"
          />
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {filteredDatasets.length} of {datasets.length} datasets
      </div>

      {/* Dataset Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDatasets.map((dataset) => (
          <Link
            key={dataset.dataset_id}
            to={`/dataset/${dataset.dataset_id}`}
            className="card hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
          >
            {/* Category Badge */}
            <div className="flex justify-between items-start mb-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(dataset.category)}`}>
                {dataset.category}
              </span>
              <span className="text-xs text-gray-500">
                {formatDate(dataset.last_update)}
              </span>
            </div>

            {/* Title and Description */}
            <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
              {dataset.name}
            </h3>
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
              {dataset.description}
            </p>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <GlobeAltIcon className="h-4 w-4 text-gray-400" />
                <span>{dataset.region}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <CircleStackIcon className="h-4 w-4 text-gray-400" />
                <span>{formatSize(dataset.size_gb)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <ServerStackIcon className="h-4 w-4 text-gray-400" />
                <span>{formatRowCount(dataset.row_count)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <ArrowTrendingUpIcon className="h-4 w-4 text-gray-400" />
                <span>{dataset.update_frequency}</span>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-4">
              {dataset.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600"
                >
                  <TagIcon className="h-3 w-3" />
                  {tag}
                </span>
              ))}
              {dataset.tags.length > 3 && (
                <span className="px-2 py-0.5 text-xs text-gray-500">
                  +{dataset.tags.length - 3} more
                </span>
              )}
            </div>

            {/* Pricing */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Bulk Download</p>
                  <p className="text-lg font-bold text-gray-900">
                    {dataset.price_bulk.toLocaleString()} ICP
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-1">API Access/mo</p>
                  <p className="text-lg font-bold text-primary-600">
                    {dataset.price_api.toLocaleString()} ICP
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-gray-500">Format:</span>
                <span className="text-xs font-medium text-gray-700">{dataset.format}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredDatasets.length === 0 && (
        <div className="text-center py-12">
          <CircleStackIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No datasets found matching your criteria</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('');
              setSelectedRegion('');
              setPriceRange({ min: 0, max: 10000 });
            }}
            className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}