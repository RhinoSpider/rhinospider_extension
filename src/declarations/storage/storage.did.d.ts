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
export type Result_2 = { 'ok' : Array<Principal> } |
  { 'err' : Error };
export type Result_3 = { 'ok' : AIConfig } |
  { 'err' : Error };
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
  'randomizationMode' : [] | [string],
  'maxRetries' : bigint,
  'percentageNodes' : [] | [bigint],
  'activeHours' : { 'end' : bigint, 'start' : bigint },
  'geolocationFilter' : [] | [string],
  'urlPatterns' : Array<string>,
  'extractionRules' : ExtractionRules,
  'aiConfig' : AIConfig,
}
export interface Storage {
  'addAuthorizedCanister' : ActorMethod<[Principal], Result>,
  'clearAllData' : ActorMethod<[], Result>,
  'deleteScrapedData' : ActorMethod<[string], Result>,
  'deleteTopic' : ActorMethod<[string], Result>,
  'forwardCycles' : ActorMethod<[Principal, bigint], Result>,
  'getAIConfig' : ActorMethod<[], Result_3>,
  'getAuthorizedCanisters' : ActorMethod<[], Result_2>,
  'getCycleBalance' : ActorMethod<[], bigint>,
  'getScrapedData' : ActorMethod<[Array<string>], Array<ScrapedData>>,
  'getTopics' : ActorMethod<[], Result_1>,
  'removeAuthorizedCanister' : ActorMethod<[Principal], Result>,
  'storeScrapedData' : ActorMethod<[ScrapedData], Result>,
  'updateAIConfig' : ActorMethod<[AIConfig], Result>,
  'updateTopic' : ActorMethod<[ScrapingTopic], Result>,
  'wallet_receive' : ActorMethod<[], undefined>,
}
export interface _SERVICE extends Storage {}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
