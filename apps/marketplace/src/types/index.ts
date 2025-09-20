import { Principal } from '@dfinity/principal';

// Enhanced types matching backend PRD implementation
export interface Dataset {
  dataset_id: string;
  name: string;
  description: string;
  region: string;
  category: string;
  file_url: string;
  sample_rows: string[];
  price_bulk: number;
  price_api: number;
  size_gb: number;
  row_count: number;
  last_update: bigint;
  on_chain_hash: string;
  data_source: string;
  update_frequency: string;
  format: string;
  tags: string[];
  provider: Principal;
  status: 'active' | 'archived';
  preview_available: boolean;
  api_endpoint: string;
}

export interface Purchase {
  purchase_id: string;
  user_principal: Principal;
  dataset_id: string;
  purchase_type: 'BULK' | 'API';
  amount: number;
  currency: string;
  payment_tx_id: string;
  created_at: bigint;
  expires_at?: bigint;
  download_url?: string;
  download_count: number;
  status: 'active' | 'expired' | 'cancelled';
}

export interface ApiKey {
  key_id: string;
  api_key: string;
  user_principal: Principal;
  dataset_id: string;
  created_at: bigint;
  last_used?: bigint;
  expires_at?: bigint;
  request_count: number;
  daily_limit: number;
  rate_limit_per_minute: number;
  is_active: boolean;
  allowed_ips: string[];
  usage_today: number;
  last_reset: bigint;
}

export interface User {
  principal: Principal;
  email?: string;
  company?: string;
  company_size?: string;
  industry?: string;
  use_case?: string;
  registered_at: bigint;
  last_login: bigint;
  total_spent: number;
  purchase_count: number;
  api_calls_total: number;
  preferred_payment: string;
  kyc_verified: boolean;
  account_tier: 'free' | 'starter' | 'enterprise';
}

export interface UsageMetrics {
  user_principal: Principal;
  dataset_id: string;
  api_calls_today: number;
  api_calls_month: number;
  downloads_count: number;
  last_access: bigint;
  data_transferred_gb: number;
}

export interface DatasetStats {
  dataset_id: string;
  total_purchases: number;
  total_revenue: number;
  unique_buyers: number;
  api_subscriptions: number;
  bulk_downloads: number;
  avg_rating: number;
  total_api_calls: number;
}

export interface DatasetFilter {
  keyword?: string;
  category?: string;
  region?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface CheckoutData {
  dataset: Dataset;
  purchaseType: 'BULK' | 'API';
  amount: number;
  currency: 'ICP' | 'USDT';
}

export interface OnboardingData {
  email?: string;
  company?: string;
  company_size?: string;
  industry?: string;
  use_case?: string;
}

// Categories and Regions for filtering
export const DATASET_CATEGORIES = [
  'E-commerce',
  'Blockchain',
  'Social Analytics',
  'Logistics',
  'Weather',
  'Finance',
  'Healthcare',
  'Real Estate',
  'Transportation'
];

export const DATASET_REGIONS = [
  'Global',
  'North America',
  'Europe',
  'Asia',
  'Africa',
  'South America',
  'Oceania'
];

export const COMPANY_SIZES = [
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-1000 employees',
  '1000+ employees'
];

export const INDUSTRIES = [
  'Finance & Banking',
  'E-commerce & Retail',
  'Technology',
  'Healthcare',
  'Manufacturing',
  'Logistics & Supply Chain',
  'Marketing & Advertising',
  'Research & Academia',
  'Government',
  'Other'
];

export const USE_CASES = [
  'Market Research',
  'Risk Analysis',
  'Customer Analytics',
  'Supply Chain Optimization',
  'Pricing Strategy',
  'Competitive Intelligence',
  'Academic Research',
  'Product Development',
  'Investment Analysis',
  'Other'
];