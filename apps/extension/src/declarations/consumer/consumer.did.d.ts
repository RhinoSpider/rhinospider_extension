import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';

export interface AIConfig {
  'model' : string,
  'costLimits' : CostLimits,
  'apiKey' : string,
}
export interface CostLimits {
  'maxConcurrent' : bigint,
  'maxDailyCost' : number,
  'maxMonthlyCost' : number,
}
export type Error = { 'InvalidInput' : string } |
  { 'SystemError' : string } |
  { 'NotFound' : null } |
  { 'NotAuthorized' : null } |
  { 'AlreadyExists' : null };
export interface ExtractionRules {
  'fields' : Array<ScrapingField>,
  'customPrompt' : [] | [string],
}
export type Result = { 'ok' : null } |
  { 'err' : Error };
export type Result_1 = { 'ok' : Array<ScrapingTopic> } |
  { 'err' : Error };
export type Result_2 = { 'ok' : UserProfile } |
  { 'err' : Error };
export type Result_3 = { 'ok' : AIConfig } |
  { 'err' : Error };
export interface ScrapedData {
  'id' : string,
  'url' : string,
  'status' : string,
  'content' : { 'raw' : string, 'extracted' : Array<[string, string]> },
  'error' : [] | [string],
  'timestamp' : bigint,
  'topicId' : string,
  'retries' : bigint,
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
}
export interface UserProfile {
  'created' : bigint,
  'principal' : Principal,
  'preferences' : { 'theme' : string, 'notificationsEnabled' : boolean },
  'lastLogin' : bigint,
  'devices' : Array<string>,
}
export interface _SERVICE {
  'getAIConfig' : ActorMethod<[], Result_3>,
  'getProfile' : ActorMethod<[], Result_2>,
  'getTopics' : ActorMethod<[], Result_1>,
  'registerDevice' : ActorMethod<[string], Result>,
  'submitScrapedData' : ActorMethod<[ScrapedData], Result>,
  'updatePreferences' : ActorMethod<[boolean, string], Result>,
}
