export interface ScrapingField {
  name: string;
  description: string;
  aiPrompt: string;
  required: boolean;
  type: 'text' | 'number' | 'url' | 'image' | 'list';
  example?: string;
}

export interface ExtractionRules {
  fields: ScrapingField[];
  customPrompt?: string;
}

export interface ValidationRules {
  rules: string[];
  aiValidation?: string;
}

export interface RateLimit {
  requestsPerHour: number;
  maxConcurrent: number;
}

export interface AIConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  costLimits: {
    maxDailyCost: number;
    maxMonthlyCost: number;
  };
}

export interface ExtractionField {
  name: string;
  description: string;
  required: boolean;
}

export interface ActiveHours {
  start: number;  // Hour in UTC (0-23)
  end: number;    // Hour in UTC (0-23)
}

export interface ScrapingTopic {
  id: string;
  name: string;
  description: string;
  url: string;
  status: string;
  extractionRules: ExtractionRules;
}

export interface CreateTopicRequest {
  id: string;
  name: string;
  description: string;
  url: string;
  status: string;
  extractionRules: ExtractionRules;
  scrapingInterval: number;
  activeHours: ActiveHours;
  maxRetries: number;
}

export interface ScrapedData {
  id: string;
  url: string;
  topicId: string;
  data: Record<string, any>;
  timestamp: number;
  status: string;
  error?: string;
}

export interface CostLimits {
  dailyUSD: number;
  monthlyUSD: number;
  maxConcurrent: number;
}

export interface QualityMetrics {
  score: number;
  issues?: string[];
}

export interface UserStats {
  pagesScraped: number;
  dataPoints: number;
  qualityScore: number;
}

export interface ExtensionUser {
  principalId: string;
  status: 'active' | 'suspended' | 'pending';
  lastActive: bigint;
  stats: UserStats;
  rateLimit: RateLimit;
}
