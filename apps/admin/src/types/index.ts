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

export interface ScrapingTopic {
  id: string;
  name: string;
  description: string;
  urlPatterns: string[];
  active: boolean;
  extractionRules: ExtractionRules;
  validation?: ValidationRules;
  rateLimit?: RateLimit;
}

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

export interface QualityMetrics {
  score: number;
  issues?: string[];
}

export interface ScrapedData {
  id: string;
  topicId: string;
  url: string;
  timestamp: bigint;
  extractedBy: string;
  data: Record<string, string>;
  quality: QualityMetrics;
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
