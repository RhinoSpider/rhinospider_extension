import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';

export interface ExtractionRequest {
  'url' : string,
  'extractionRules' : ExtractionRules,
}
export interface ExtractionResult {
  'url' : string,
  'data' : Array<[string, string]>,
  'timestamp' : bigint,
}
export interface ExtractionRules {
  'fields' : Array<ScrapingField>,
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
export type Result = { 'ok' : { 'data' : Array<[string, string]> } } |
  { 'err' : string };
export type Result_1 = { 'ok' : ExtractionResult } |
  { 'err' : string };
export type Result_2 = { 'ok' : null } |
  { 'err' : string };
export type Result_3 = { 'ok' : Array<[string, string]> } |
  { 'err' : string };
export type Result_4 = { 'ok' : Array<ScrapedContent> } |
  { 'err' : string };
export type Result_5 = { 'ok' : ScrapedContent } |
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
export interface ScrapingField {
  'name' : string,
  'aiPrompt' : string,
  'required' : boolean,
  'fieldType' : string,
}
export interface ScrapingTopic {
  'id' : string,
  'active' : boolean,
  'name' : string,
  'createdAt' : bigint,
  'description' : string,
  'urlPatterns' : Array<string>,
  'extractionRules' : ExtractionRules,
  'rateLimit' : [] | [{ 'maxConcurrent' : bigint, 'requestsPerHour' : bigint }],
}
export interface Storage {
  'createTopic' : ActorMethod<[ScrapingTopic], Result_2>,
  'deleteTopic' : ActorMethod<[string], Result_2>,
  'extract' : ActorMethod<[ExtractionRequest], Result_1>,
  'getBySource' : ActorMethod<[string], Array<ScrapedData>>,
  'getContent' : ActorMethod<[string], Result_5>,
  'getContentBySource' : ActorMethod<[string], Result_4>,
  'getContentByTopic' : ActorMethod<[string, bigint], Result_4>,
  'getNextPendingUrl' : ActorMethod<
    [],
    [] | [{ 'id' : string, 'url' : string }]
  >,
  'getScrapedData' : ActorMethod<[Array<string>], Array<ScrapedData>>,
  'getTopic' : ActorMethod<[string], [] | [ScrapingTopic]>,
  'getTopics' : ActorMethod<[], Array<ScrapingTopic>>,
  'processWithAI' : ActorMethod<[Request], Result_3>,
  'queueUrlForProcessing' : ActorMethod<[string, string], Result_2>,
  'setTopicActive' : ActorMethod<[string, boolean], Result_2>,
  'storeContent' : ActorMethod<[ScrapedContent], Result_2>,
  'storeHtmlContent' : ActorMethod<[string, string], undefined>,
  'storeRequest' : ActorMethod<[Request], Result_2>,
  'testExtraction' : ActorMethod<[ExtractionRequest], Result_1>,
  'testExtractionLocal' : ActorMethod<
    [{ 'htmlContent' : string, 'extraction_rules' : ExtractionRules }],
    Result
  >,
  'testLocalExtraction' : ActorMethod<
    [{ 'htmlContent' : string, 'extraction_rules' : ExtractionRules }],
    Result
  >,
}
export interface _SERVICE extends Storage {}
