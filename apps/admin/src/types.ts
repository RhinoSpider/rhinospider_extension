export interface ExtractionField {
  name: string;
  fieldType: string;
  required: boolean;
  aiPrompt: string | undefined;
}

export interface ExtractionRules {
  fields: ExtractionField[];
  customPrompt?: string;
}

export interface CostLimits {
  maxDailyCost: number;
  maxMonthlyCost: number;
  maxConcurrent: number;
}

export interface AIConfig {
  apiKey: string;
  model: string;
  costLimits: {
    maxDailyCost: number;
    maxMonthlyCost: number;
    maxConcurrent: number;
  };
  temperature: number;
  maxTokens: number;
}

export interface ContentIdentifiers {
  selectors: string[];
  keywords: string[];
}

export interface ScrapingTopic {
  id: string;
  name: string;
  description: string;
  urlPatterns: string[];
  status: string;
  extractionRules: ExtractionRules;
  aiConfig: AIConfig;
  scrapingInterval: number;
  activeHours: {
    start: number;
    end: number;
  };
  maxRetries: number;
  articleUrlPatterns?: string[];
  siteTypeClassification?: string;
  contentIdentifiers?: ContentIdentifiers;
  paginationPatterns?: string[];
  sampleArticleUrls?: string[];
  urlGenerationStrategy?: string;
  excludePatterns?: string[];
}

export type UserRole = 'Admin' | 'User' | 'None';

export interface ExtensionUser {
  role: UserRole;
}

export interface ScrapedData {
  id: string;
  url: string;
  topic: string;
  content: string;
  source: string;
  timestamp: bigint;
  client_id: Principal;
  status: string;
  scraping_time: bigint;
}

// Response types from the canister
export interface Result<T> {
  ok?: T;
  err?: string;
}

export interface CreateTopicRequest {
  id: string;
  name: string;
  description: string;
  urlPatterns: string[];
  status: string;
  extractionRules: ExtractionRules;
  articleUrlPatterns?: string[];
  siteTypeClassification?: string;
  contentIdentifiers?: ContentIdentifiers;
  paginationPatterns?: string[];
  sampleArticleUrls?: string[];
  urlGenerationStrategy?: string;
  excludePatterns?: string[];
}

export interface UpdateTopicRequest {
  name?: string[];
  description?: string[];
  url?: string[];
  status?: string[];
  extractionRules?: ExtractionRules[];
  aiConfig?: AIConfig;
  articleUrlPatterns?: string[][];
  siteTypeClassification?: string[];
  contentIdentifiers?: ContentIdentifiers[];
  paginationPatterns?: string[][];
  sampleArticleUrls?: string[][];
  urlGenerationStrategy?: string[];
  excludePatterns?: string[][];
}
