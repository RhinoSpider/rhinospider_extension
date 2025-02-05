import { Record, Vec } from 'azle';

// Default AI Configuration
export interface CostLimits {
  dailyUSD: number;
  monthlyUSD: number;
  maxConcurrent: number;
}

export interface AIConfig {
  apiKey: string;
  model: string;
  costLimits: CostLimits;
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  apiKey: '',
  model: 'gpt-3.5-turbo',
  costLimits: {
    dailyUSD: 5,
    monthlyUSD: 100,
    maxConcurrent: 5
  }
};

export interface ScrapingField {
  name: string;
  description: string;
  aiPrompt: string;
  required: boolean;
  type: 'text' | 'number' | 'url' | 'image' | 'list';
  example?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

export interface ScrapingTopic {
  id: string;
  name: string;
  description: string;
  urlPatterns: string[];
  active: boolean;
  extractionRules: {
    fields: ScrapingField[];
    customPrompt?: string;
  };
  validation?: {
    rules: string[];
    aiValidation?: string;
  };
  rateLimit?: {
    requestsPerHour: number;
    maxConcurrent: number;
  };
}

export interface ScrapedData {
  id: string;
  topicId: string;
  url: string;
  timestamp: number;
  extractedBy: string; // Principal ID
  data: Record<string, any>;
  quality: {
    score: number;
    issues?: string[];
  };
}

export interface ExtensionUser {
  principalId: string;
  status: 'active' | 'inactive' | 'blocked';
  lastActive: number;
  stats: {
    pagesScraped: number;
    dataPoints: number;
    qualityScore: number;
  };
  rateLimit: {
    requestsPerHour: number;
    maxConcurrent: number;
  };
}

export interface HTMLContent {
  id: string;
  url: string;
  html: string;
  topicId: string;
  timestamp: number;
}

export interface ProcessRequest {
  url: string;
  topicId: string;
  htmlId: string;
}
