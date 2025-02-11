import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface AIConfig {
  'model' : string,
  'costLimits' : CostLimits,
  'apiKey' : string,
}
export interface CostLimits {
  'maxConcurrent' : bigint,
  'dailyUSD' : bigint,
  'monthlyUSD' : bigint,
}
export interface ExtractionField {
  'name' : string,
  'aiPrompt' : string,
  'required' : boolean,
  'fieldType' : string,
}
export interface ExtractionRules {
  'fields' : Array<ExtractionField>,
  'customPrompt' : [] | [string],
}
export interface Request {
  'id' : string,
  'url' : string,
  'content_id' : string,
  'topic_id' : string,
  'timestamp' : bigint,
  'extraction_rules' : ExtractionRules,
}
export type Result = { 'ok' : null } |
  { 'err' : string };
export type Result_1 = { 'ok' : { 'data' : Array<[string, string]> } } |
  { 'err' : string };
export type Result_2 = { 'ok' : Array<[string, string]> } |
  { 'err' : string };
export type Result_3 = { 'ok' : Array<ScrapedContent> } |
  { 'err' : string };
export type Result_4 = { 'ok' : ScrapedContent } |
  { 'err' : string };
export type Result_5 = { 'ok' : AIConfig } |
  { 'err' : string };
export interface ScrapedContent {
  'id' : string,
  'url' : string,
  'title' : string,
  'content' : string,
  'source' : string,
  'metadata' : {
    'language' : [] | [string],
    'license' : [] | [string],
    'tech_stack' : Array<string>,
    'reading_time' : [] | [bigint],
  },
  'update_date' : bigint,
  'author' : string,
  'summary' : string,
  'topics' : Array<string>,
  'ai_analysis' : {
    'key_points' : Array<string>,
    'code_snippets' : Array<{ 'code' : string, 'language' : string }>,
    'relevance_score' : bigint,
  },
  'engagement' : {
    'claps' : [] | [bigint],
    'stars' : [] | [bigint],
    'comments' : bigint,
    'reactions' : [] | [bigint],
  },
  'publish_date' : bigint,
}
export interface ScrapedData {
  'id' : string,
  'url' : string,
  'topic' : string,
  'content' : string,
  'source' : string,
  'timestamp' : bigint,
  'client_id' : Principal,
}
export interface ScrapingTopic {
  'id' : string,
  'name' : string,
  'createdAt' : bigint,
  'description' : [] | [string],
  'updatedAt' : bigint,
  'urlPatterns' : Array<string>,
  'extractionRules' : [] | [ExtractionRules],
}
export interface Storage {
  'createTopic' : ActorMethod<[ScrapingTopic], Result>,
  'deleteTopic' : ActorMethod<[string], Result>,
  'getAIConfig' : ActorMethod<[], Result_5>,
  'getBySource' : ActorMethod<[string], Array<ScrapedData>>,
  'getContent' : ActorMethod<[string], Result_4>,
  'getContentBySource' : ActorMethod<[string], Result_3>,
  'getContentByTopic' : ActorMethod<[string, bigint], Result_3>,
  'getNextPendingUrl' : ActorMethod<
    [],
    [] | [{ 'id' : string, 'url' : string }]
  >,
  'getScrapedData' : ActorMethod<[Array<string>], Array<ScrapedData>>,
  'getTopics' : ActorMethod<[], Array<ScrapingTopic>>,
  'processWithAI' : ActorMethod<[Request], Result_2>,
  'queueUrlForProcessing' : ActorMethod<[string, string], Result>,
  'storeContent' : ActorMethod<[ScrapedContent], Result>,
  'storeHtmlContent' : ActorMethod<[string, string], undefined>,
  'storeRequest' : ActorMethod<[Request], Result>,
  'testExtraction' : ActorMethod<
    [{ 'url' : string, 'extractionRules' : ExtractionRules }],
    Result_1
  >,
  'testExtractionLocal' : ActorMethod<
    [{ 'htmlContent' : string, 'extractionRules' : ExtractionRules }],
    Result_1
  >,
  'updateAIConfig' : ActorMethod<[AIConfig], Result>,
  'updateTopic' : ActorMethod<[ScrapingTopic], Result>,
}
export interface _SERVICE extends Storage {}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
