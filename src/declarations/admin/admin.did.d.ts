import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';

export interface AIConfig {
  'model' : string,
  'costLimits' : CostLimits,
  'apiKey' : string,
}
export interface AIConfig__1 {
  'model' : string,
  'costLimits' : CostLimits,
  'apiKey' : string,
}
export interface CostLimits {
  'maxConcurrent' : bigint,
  'maxDailyCost' : number,
  'maxMonthlyCost' : number,
}
export interface CreateTopicRequest {
  'id' : string,
  'status' : string,
  'name' : string,
  'description' : string,
  'urlPatterns' : Array<string>,
  'extractionRules' : ExtractionRules,
  'siteTypeClassification' : string,
}
export interface ExtractionRules {
  'fields' : Array<ScrapingField>,
  'customPrompt' : [] | [string],
}
export type Result = { 'ok' : ScrapingTopic } |
  { 'err' : string };
export type Result_1 = { 'ok' : string } |
  { 'err' : string };
export type Result_2 = { 'ok' : AIConfig__1 } |
  { 'err' : string };
export type Result_3 = { 'ok' : null } |
  { 'err' : string };
export type Result_4 = { 'ok' : Array<User> } |
  { 'err' : string };
export type Result_5 = { 'ok' : Array<ScrapingTopic> } |
  { 'err' : string };
export type Result_6 = { 'ok' : Array<ScrapedData> } |
  { 'err' : string };
export interface ScrapedData {
  'id' : string,
  'url' : string,
  'status' : string,
  'topic' : string,
  'content' : string,
  'source' : string,
  'timestamp' : bigint,
  'client_id' : Principal,
  'scraping_time' : bigint,
}
export interface ScrapingField {
  'name' : string,
  'aiPrompt' : [] | [string],
  'required' : boolean,
  'fieldType' : string,
}
export interface ScrapingTopic {
  'id' : string,
  'status' : string,
  'name' : string,
  'createdAt' : bigint,
  'scrapingInterval' : bigint,
  'description' : string,
  'maxRetries' : bigint,
  'activeHours' : { 'end' : bigint, 'start' : bigint },
  'urlPatterns' : Array<string>,
  'extractionRules' : ExtractionRules,
  'aiConfig' : AIConfig,
  'lastScraped' : bigint,
  'siteTypeClassification' : string,
}
export type Time = bigint;
export interface User {
  'principal' : Principal,
  'role' : UserRole,
  'addedAt' : Time,
  'addedBy' : Principal,
}
export type UserRole = { 'Operator' : null } |
  { 'SuperAdmin' : null } |
  { 'Admin' : null };
export interface _SERVICE {
  'add_user' : ActorMethod<[Principal, UserRole], Result_3>,
  'createTopic' : ActorMethod<[CreateTopicRequest], Result>,
  'deleteTopic' : ActorMethod<[string], Result_3>,
  'getAIConfig' : ActorMethod<[], Result_2>,
  'getScrapedData' : ActorMethod<[Array<string>], Result_6>,
  'getTopics' : ActorMethod<[], Result_5>,
  'getTopics_with_caller' : ActorMethod<[Principal], Result_5>,
  'get_users' : ActorMethod<[], Result_4>,
  'remove_user' : ActorMethod<[Principal], Result_3>,
  'setTopicActive' : ActorMethod<[string, boolean], Result_3>,
  'testExtraction' : ActorMethod<
    [
      {
        'url' : string,
        'extraction_rules' : {
          'fields' : Array<ScrapingField>,
          'customPrompt' : [] | [string],
        },
      },
    ],
    Result_1
  >,
  'updateAIConfig' : ActorMethod<[AIConfig__1], Result_2>,
  'updateLastScraped' : ActorMethod<[string, bigint], Result_1>,
  'updateTopic' : ActorMethod<
    [
      string,
      {
        'status' : [] | [string],
        'name' : [] | [string],
        'description' : [] | [string],
        'urlPatterns' : [] | [Array<string>],
        'extractionRules' : [] | [ExtractionRules],
        'siteTypeClassification' : [] | [string],
      },
    ],
    Result
  >,
}
