// Export the types needed by admin.ts
export interface ScrapedData {
  id?: string;
  url?: string;
  topic?: string;
  content?: string;
  source?: string;
  timestamp?: bigint | number;
  client_id?: string;
  status?: string;
  scraping_time?: bigint | number;
  topicId?: string;
  
  // Numeric field names that may come from the storage canister
  "3_355_830_415"?: string; // id
  "842_117_339"?: string; // url
  "3_457_862_683"?: string; // topic
  "338_645_423"?: string; // content
  "427_265_337"?: string; // source
  "100_394_802"?: number | bigint; // timestamp
  "2_781_795_542"?: string; // client_id
  "5_843_823"?: string; // status
  "2_464_455_013"?: number | bigint; // scraping_time
  "23_515"?: string; // topicId
  
  // Allow for any other fields that might be present
  [key: string]: any;
}

export interface Result<T> {
  ok?: T;
  err?: string;
}

export interface AIConfig {
  apiKey: string;
  model: string;
  costLimits: {
    maxDailyCost: number;
    maxMonthlyCost: number;
    maxConcurrent: number;
  };
  temperature?: number;
  maxTokens?: number;
}
