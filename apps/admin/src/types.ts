export interface ExtractionField {
  name: string;
  description: string;
  required: boolean;
  type: string;
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
  costLimits: CostLimits;
  temperature: number;
  maxTokens: number;
}

export interface ScrapingTopic {
  id: string;
  name: string;
  description: string;
  url: string;
  status: string;
  extractionRules: ExtractionRules;
  aiConfig: AIConfig;
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
  timestamp: number;
  client_id: string;
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
  url: string;
  status: string;
  extractionRules: ExtractionRules;
  aiConfig: AIConfig;
}

export interface UpdateTopicRequest {
  name?: string[];
  description?: string[];
  url?: string[];
  status?: string[];
  extractionRules?: ExtractionRules[];
  aiConfig?: AIConfig;
}
