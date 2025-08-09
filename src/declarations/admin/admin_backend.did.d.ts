import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface GlobalAIConfig {
  'model' : string,
  'features' : {
    'keywordExtraction' : boolean,
    'summarization' : boolean,
    'categorization' : boolean,
    'sentimentAnalysis' : boolean,
  },
  'provider' : string,
  'maxTokensPerRequest' : bigint,
  'enabled' : boolean,
  'apiKey' : [] | [string],
}
export interface NodeCharacteristics {
  'region' : string,
  'randomizationMode' : [] | [string],
  'percentageNodes' : [] | [bigint],
  'ipAddress' : string,
}
export type Result = { 'ok' : ScrapingTopic } |
  { 'err' : string };
export type Result_1 = { 'ok' : string } |
  { 'err' : string };
export type Result_2 = { 'ok' : null } |
  { 'err' : string };
export type Result_3 = { 'ok' : Array<User> } |
  { 'err' : string };
export type Result_4 = { 'ok' : Array<ScrapingTopic> } |
  { 'err' : string };
export type Result_5 = { 'ok' : Array<ScrapedData> } |
  { 'err' : string };
export type Result_6 = { 'ok' : Array<[Principal, NodeCharacteristics]> } |
  { 'err' : string };
export type Result_7 = { 'ok' : [] | [GlobalAIConfig] } |
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
export interface ScrapingTopic {
  'id' : string,
  'status' : string,
  'titleSelectors' : [] | [Array<string>],
  'preferredDomains' : [] | [Array<string>],
  'maxUrlsPerBatch' : bigint,
  'maxContentLength' : bigint,
  'requiredKeywords' : Array<string>,
  'name' : string,
  'createdAt' : bigint,
  'totalUrlsScraped' : bigint,
  'minContentLength' : bigint,
  'excludeKeywords' : [] | [Array<string>],
  'scrapingInterval' : bigint,
  'description' : string,
  'contentSelectors' : Array<string>,
  'excludeSelectors' : Array<string>,
  'excludeDomains' : [] | [Array<string>],
  'priority' : bigint,
  'lastScraped' : bigint,
  'searchQueries' : Array<string>,
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
  'add_user' : ActorMethod<[Principal, UserRole], Result_2>,
  'createTopic' : ActorMethod<[ScrapingTopic], Result>,
  'deleteTopic' : ActorMethod<[string], Result_2>,
  'getAIConfig' : ActorMethod<[], Result_7>,
  'getAllTopics' : ActorMethod<[], Array<ScrapingTopic>>,
  'getAssignedTopics' : ActorMethod<[NodeCharacteristics], Result_4>,
  'getGlobalAIConfig' : ActorMethod<[], Result_7>,
  'getRegisteredNodes' : ActorMethod<[], Result_6>,
  'getScrapedData' : ActorMethod<[Array<string>], Result_5>,
  'getTopics' : ActorMethod<[], Result_4>,
  'getTopics_with_caller' : ActorMethod<[Principal], Result_4>,
  'get_users' : ActorMethod<[], Result_3>,
  'registerNode' : ActorMethod<[Principal, NodeCharacteristics], Result_2>,
  'remove_user' : ActorMethod<[Principal], Result_2>,
  'setGlobalAIConfig' : ActorMethod<[[] | [GlobalAIConfig]], Result_2>,
  'setTopicActive' : ActorMethod<[string, boolean], Result_2>,
  'testExtraction' : ActorMethod<[string, string], Result_1>,
  'updateTopic' : ActorMethod<
    [
      string,
      {
        'status' : [] | [string],
        'titleSelectors' : [] | [Array<string>],
        'preferredDomains' : [] | [Array<string>],
        'maxUrlsPerBatch' : [] | [bigint],
        'maxContentLength' : [] | [bigint],
        'requiredKeywords' : [] | [Array<string>],
        'name' : [] | [string],
        'minContentLength' : [] | [bigint],
        'excludeKeywords' : [] | [Array<string>],
        'scrapingInterval' : [] | [bigint],
        'description' : [] | [string],
        'contentSelectors' : [] | [Array<string>],
        'excludeSelectors' : [] | [Array<string>],
        'excludeDomains' : [] | [Array<string>],
        'priority' : [] | [bigint],
        'searchQueries' : [] | [Array<string>],
      },
    ],
    Result
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
