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
export type Result = { 'ok' : ScrapingTopic } |
  { 'err' : string };
export type Result_1 = { 'ok' : null } |
  { 'err' : string };
export type Result_2 = { 'ok' : { 'data' : Array<[string, string]> } } |
  { 'err' : string };
export type Result_3 = { 'ok' : Array<ScrapedData> } |
  { 'err' : string };
export type Result_4 = { 'ok' : AIConfig } |
  { 'err' : string };
export type Result_5 = { 'ok' : bigint } |
  { 'err' : string };
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
  'description' : [] | [string],
  'example' : [] | [string],
  'aiPrompt' : string,
  'required' : boolean,
  'fieldType' : string,
}
export interface ScrapingField__1 {
  'name' : string,
  'description' : [] | [string],
  'example' : [] | [string],
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
  'extractionRules' : {
    'fields' : Array<ScrapingField>,
    'customPrompt' : [] | [string],
  },
  'rateLimit' : [] | [{ 'maxConcurrent' : bigint, 'requestsPerHour' : bigint }],
  'validation' : [] | [
    { 'aiValidation' : [] | [string], 'rules' : Array<string> }
  ],
}
export interface Task {
  'id' : string,
  'url' : string,
  'status' : string,
  'topic' : string,
  'assignedTo' : [] | [Principal],
  'createdAt' : bigint,
  'priority' : bigint,
}
export interface TaskConfig {
  'targetSites' : Array<string>,
  'maxBandwidthPerDay' : bigint,
  'topics' : Array<string>,
  'scanInterval' : bigint,
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
  'addTasks' : ActorMethod<[Array<Task>], Result_5>,
  'addUser' : ActorMethod<[Principal, UserRole], Result_1>,
  'clearAllData' : ActorMethod<[], string>,
  'createTopic' : ActorMethod<[ScrapingTopic], Result>,
  'deleteTopic' : ActorMethod<[string], Result_1>,
  'getAIConfig' : ActorMethod<[], Result_4>,
  'getConfig' : ActorMethod<[], TaskConfig>,
  'getScrapedData' : ActorMethod<[[] | [string]], Result_3>,
  'getTasks' : ActorMethod<[bigint], Array<Task>>,
  'getTopics' : ActorMethod<[], Array<ScrapingTopic>>,
  'getUsers' : ActorMethod<[], Array<User>>,
  'removeUser' : ActorMethod<[Principal], Result_1>,
  'testExtraction' : ActorMethod<
    [
      {
        'url' : string,
        'extraction_rules' : {
          'custom_prompt' : [] | [string],
          'fields' : Array<ScrapingField__1>,
        },
      },
    ],
    Result_2
  >,
  'updateAIConfig' : ActorMethod<[AIConfig], Result_1>,
  'updateConfig' : ActorMethod<[TaskConfig], Result_1>,
  'updateTaskStatus' : ActorMethod<[string, string], Result_1>,
  'updateTopic' : ActorMethod<[string, ScrapingTopic], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
