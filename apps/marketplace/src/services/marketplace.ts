import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory } from '../declarations/marketplace/marketplace.did.js';
import {
  Dataset,
  Purchase,
  ApiKey,
  User,
  DatasetStats,
  UsageMetrics,
  OnboardingData
} from '../types';

const MARKETPLACE_CANISTER_ID = import.meta.env.VITE_MARKETPLACE_CANISTER_ID || 'y64hu-laaaa-aaaao-a4ptq-cai';
const IC_HOST = import.meta.env.VITE_IC_HOST || 'https://ic0.app';

class MarketplaceService {
  private actor: any;
  private agent: HttpAgent;

  constructor() {
    this.agent = new HttpAgent({ host: IC_HOST });

    // Remove in production
    if (import.meta.env.DEV) {
      this.agent.fetchRootKey().catch(console.error);
    }

    this.actor = Actor.createActor(idlFactory, {
      agent: this.agent,
      canisterId: MARKETPLACE_CANISTER_ID,
    });
  }

  async setIdentity(identity: any) {
    this.agent.replaceIdentity(identity);
    this.actor = Actor.createActor(idlFactory, {
      agent: this.agent,
      canisterId: MARKETPLACE_CANISTER_ID,
    });
  }

  // Dataset methods
  async getAllDatasets(): Promise<Dataset[]> {
    try {
      console.log('Calling canister getAllDatasets...');
      const datasets = await this.actor.getAllDatasets();
      console.log('Raw datasets from canister:', datasets);
      const formatted = datasets.map(this.formatDataset);
      console.log('Formatted datasets:', formatted);
      return formatted;
    } catch (error) {
      console.error('Failed to fetch datasets:', error);
      console.error('Actor:', this.actor);
      console.error('Canister ID:', MARKETPLACE_CANISTER_ID);
      return [];
    }
  }

  async getDataset(id: string): Promise<Dataset | null> {
    try {
      const result = await this.actor.getDataset(id);
      if (result.ok) {
        return this.formatDataset(result.ok);
      }
      console.error('Dataset not found:', result.err);
      return null;
    } catch (error) {
      console.error('Failed to fetch dataset:', error);
      return null;
    }
  }

  async searchDatasets(
    keyword?: string,
    category?: string,
    region?: string,
    minPrice?: number,
    maxPrice?: number
  ): Promise<Dataset[]> {
    try {
      const datasets = await this.actor.searchDatasets(
        keyword ? [keyword] : [],
        category ? [category] : [],
        region ? [region] : [],
        minPrice ? [minPrice] : [],
        maxPrice ? [maxPrice] : []
      );
      return datasets.map(this.formatDataset);
    } catch (error) {
      console.error('Failed to search datasets:', error);
      return [];
    }
  }

  async getTopDatasets(limit: number = 5): Promise<Dataset[]> {
    try {
      const datasets = await this.actor.getTopDatasets(limit);
      return datasets.map(this.formatDataset);
    } catch (error) {
      console.error('Failed to fetch top datasets:', error);
      return [];
    }
  }

  async getDatasetStats(datasetId: string): Promise<DatasetStats | null> {
    try {
      const result = await this.actor.getDatasetStats(datasetId);
      if (result.ok) {
        return this.formatDatasetStats(result.ok);
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch dataset stats:', error);
      return null;
    }
  }

  // Purchase methods
  async purchaseDataset(
    datasetId: string,
    purchaseType: 'BULK' | 'API',
    amount: number,
    currency: string = 'ICP'
  ): Promise<Purchase | null> {
    try {
      // Generate mock payment transaction ID (in production, this would come from payment gateway)
      const paymentTxId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const result = await this.actor.purchaseDataset(
        datasetId,
        purchaseType,
        paymentTxId,
        amount,
        currency
      );

      if (result.ok) {
        return this.formatPurchase(result.ok);
      }
      console.error('Purchase failed:', result.err);
      return null;
    } catch (error) {
      console.error('Failed to purchase dataset:', error);
      return null;
    }
  }

  async getUserPurchases(): Promise<Purchase[]> {
    try {
      const purchases = await this.actor.getUserPurchases();
      return purchases.map(this.formatPurchase);
    } catch (error) {
      console.error('Failed to fetch purchases:', error);
      return [];
    }
  }

  // API Key methods
  async getUserApiKeys(): Promise<ApiKey[]> {
    try {
      const keys = await this.actor.getUserApiKeys();
      return keys.map(this.formatApiKey);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
      return [];
    }
  }

  async regenerateApiKey(keyId: string): Promise<string | null> {
    try {
      const result = await this.actor.regenerateApiKey(keyId);
      if (result.ok) {
        return result.ok;
      }
      console.error('Failed to regenerate API key:', result.err);
      return null;
    } catch (error) {
      console.error('Failed to regenerate API key:', error);
      return null;
    }
  }

  async getDatasetData(
    datasetId: string,
    apiKey: string,
    offset: number = 0,
    limit: number = 10
  ): Promise<string[] | null> {
    try {
      const result = await this.actor.getDatasetData(datasetId, apiKey, offset, limit);
      if (result.ok) {
        return result.ok;
      }
      console.error('Failed to fetch data:', result.err);
      return null;
    } catch (error) {
      console.error('Failed to fetch dataset data:', error);
      return null;
    }
  }

  // User methods
  async registerUser(data: OnboardingData): Promise<User | null> {
    try {
      const result = await this.actor.registerUser(
        data.email ? [data.email] : [],
        data.company ? [data.company] : [],
        data.company_size ? [data.company_size] : [],
        data.industry ? [data.industry] : [],
        data.use_case ? [data.use_case] : []
      );

      if (result.ok) {
        return this.formatUser(result.ok);
      }
      console.error('Registration failed:', result.err);
      return null;
    } catch (error) {
      console.error('Failed to register user:', error);
      return null;
    }
  }

  async getUserProfile(): Promise<User | null> {
    try {
      const result = await this.actor.getUserProfile();
      if (result.ok) {
        return this.formatUser(result.ok);
      }
      // User not found, they need to register
      return null;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      return null;
    }
  }

  async getUserUsageMetrics(datasetId: string): Promise<UsageMetrics | null> {
    try {
      const result = await this.actor.getUserUsageMetrics(datasetId);
      if (result.ok) {
        return this.formatUsageMetrics(result.ok);
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch usage metrics:', error);
      return null;
    }
  }

  // Format helpers
  private formatDataset(raw: any): Dataset {
    return {
      dataset_id: raw.dataset_id,
      name: raw.name,
      description: raw.description,
      region: raw.region,
      category: raw.category,
      file_url: raw.file_url,
      sample_rows: raw.sample_rows,
      price_bulk: Number(raw.price_bulk),
      price_api: Number(raw.price_api),
      size_gb: Number(raw.size_gb),
      row_count: Number(raw.row_count),
      last_update: BigInt(raw.last_update),
      on_chain_hash: raw.on_chain_hash,
      data_source: raw.data_source,
      update_frequency: raw.update_frequency,
      format: raw.format,
      tags: raw.tags,
      provider: raw.provider,
      status: raw.status,
      preview_available: raw.preview_available,
      api_endpoint: raw.api_endpoint
    };
  }

  private formatPurchase(raw: any): Purchase {
    return {
      purchase_id: raw.purchase_id,
      user_principal: raw.user_principal,
      dataset_id: raw.dataset_id,
      purchase_type: raw.purchase_type,
      amount: Number(raw.amount),
      currency: raw.currency,
      payment_tx_id: raw.payment_tx_id,
      created_at: BigInt(raw.created_at),
      expires_at: raw.expires_at ? BigInt(raw.expires_at[0]) : undefined,
      download_url: raw.download_url ? raw.download_url[0] : undefined,
      download_count: Number(raw.download_count),
      status: raw.status
    };
  }

  private formatApiKey(raw: any): ApiKey {
    return {
      key_id: raw.key_id,
      api_key: raw.api_key,
      user_principal: raw.user_principal,
      dataset_id: raw.dataset_id,
      created_at: BigInt(raw.created_at),
      last_used: raw.last_used ? BigInt(raw.last_used[0]) : undefined,
      expires_at: raw.expires_at ? BigInt(raw.expires_at[0]) : undefined,
      request_count: Number(raw.request_count),
      daily_limit: Number(raw.daily_limit),
      rate_limit_per_minute: Number(raw.rate_limit_per_minute),
      is_active: raw.is_active,
      allowed_ips: raw.allowed_ips,
      usage_today: Number(raw.usage_today),
      last_reset: BigInt(raw.last_reset)
    };
  }

  private formatUser(raw: any): User {
    return {
      principal: raw.principal,
      email: raw.email ? raw.email[0] : undefined,
      company: raw.company ? raw.company[0] : undefined,
      company_size: raw.company_size ? raw.company_size[0] : undefined,
      industry: raw.industry ? raw.industry[0] : undefined,
      use_case: raw.use_case ? raw.use_case[0] : undefined,
      registered_at: BigInt(raw.registered_at),
      last_login: BigInt(raw.last_login),
      total_spent: Number(raw.total_spent),
      purchase_count: Number(raw.purchase_count),
      api_calls_total: Number(raw.api_calls_total),
      preferred_payment: raw.preferred_payment,
      kyc_verified: raw.kyc_verified,
      account_tier: raw.account_tier
    };
  }

  private formatDatasetStats(raw: any): DatasetStats {
    return {
      dataset_id: raw.dataset_id,
      total_purchases: Number(raw.total_purchases),
      total_revenue: Number(raw.total_revenue),
      unique_buyers: Number(raw.unique_buyers),
      api_subscriptions: Number(raw.api_subscriptions),
      bulk_downloads: Number(raw.bulk_downloads),
      avg_rating: Number(raw.avg_rating),
      total_api_calls: Number(raw.total_api_calls)
    };
  }

  private formatUsageMetrics(raw: any): UsageMetrics {
    return {
      user_principal: raw.user_principal,
      dataset_id: raw.dataset_id,
      api_calls_today: Number(raw.api_calls_today),
      api_calls_month: Number(raw.api_calls_month),
      downloads_count: Number(raw.downloads_count),
      last_access: BigInt(raw.last_access),
      data_transferred_gb: Number(raw.data_transferred_gb)
    };
  }
}

export default new MarketplaceService();