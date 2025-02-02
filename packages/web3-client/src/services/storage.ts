import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory } from '../../../canisters/storage/storage.did';

export interface ScrapedData {
  id: string;
  url: string;
  topic: string;
  source: string;
  content: string;
  timestamp: bigint;
  clientId: Principal;
}

export interface DataBatch {
  items: ScrapedData[];
  clientId: Principal;
  batchId: string;
}

export interface StorageStats {
  totalItems: bigint;
  totalBytes: bigint;
  lastUpdate: bigint;
}

export class StorageService {
  private actor: any;
  private agent: HttpAgent;

  constructor(canisterId: string, host: string = 'https://ic0.app') {
    this.agent = new HttpAgent({ host });
    this.actor = Actor.createActor(idlFactory, {
      agent: this.agent,
      canisterId,
    });
  }

  async storeBatch(batch: DataBatch): Promise<number> {
    try {
      const result = await this.actor.storeBatch(batch);
      if ('ok' in result) {
        return Number(result.ok);
      }
      throw new Error(result.err);
    } catch (error) {
      console.error('Failed to store batch:', error);
      throw error;
    }
  }

  async getByTopic(topic: string): Promise<ScrapedData[]> {
    try {
      return await this.actor.getByTopic(topic);
    } catch (error) {
      console.error('Failed to get data by topic:', error);
      throw error;
    }
  }

  async getBySource(source: string): Promise<ScrapedData[]> {
    try {
      return await this.actor.getBySource(source);
    } catch (error) {
      console.error('Failed to get data by source:', error);
      throw error;
    }
  }

  async getStats(): Promise<StorageStats> {
    try {
      return await this.actor.getStats();
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      throw error;
    }
  }
}
