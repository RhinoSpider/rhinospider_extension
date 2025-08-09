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
export interface GeographicDistribution {
  'region' : [] | [string],
  'country' : string,
  'dataVolumeKB' : bigint,
  'nodeCount' : bigint,
  'coordinates' : [] | [{ 'lat' : number, 'lng' : number }],
}
export interface NodeActivity {
  'region' : [] | [string],
  'principal' : Principal,
  'country' : [] | [string],
  'city' : [] | [string],
  'dataVolumeKB' : bigint,
  'lastActive' : bigint,
}
export type Result = { 'ok' : null } |
  { 'err' : string };
export type Result_1 = { 'ok' : null } |
  { 'err' : Error };
export type Result_2 = { 'ok' : UserProfile } |
  { 'err' : string };
export type Result_3 = { 'ok' : Array<ScrapingTopic> } |
  { 'err' : Error };
export type Result_4 = { 'ok' : Array<ScrapedData> } |
  { 'err' : Error };
export type Result_5 = { 'ok' : string } |
  { 'err' : string };
export type Result_6 = { 'ok' : UserProfile } |
  { 'err' : Error };
export interface RhinoScanStats {
  'nodesByCountry' : Array<[string, bigint]>,
  'recentActivity' : Array<NodeActivity>,
  'totalNodes' : bigint,
  'countriesCount' : bigint,
  'totalDataVolumeKB' : bigint,
  'activeNodes' : bigint,
}
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
export interface UserProfile {
  'region' : [] | [string],
  'latitude' : [] | [number],
  'created' : bigint,
  'principal' : Principal,
  'referralCode' : string,
  'country' : [] | [string],
  'scrapedUrls' : Array<string>,
  'city' : [] | [string],
  'referralCount' : bigint,
  'isActive' : boolean,
  'preferences' : { 'theme' : string, 'notificationsEnabled' : boolean },
  'referredBy' : [] | [Principal],
  'totalDataScraped' : bigint,
  'longitude' : [] | [number],
  'dataVolumeKB' : bigint,
  'lastLogin' : bigint,
  'devices' : Array<string>,
  'lastActive' : bigint,
  'ipAddress' : [] | [string],
  'points' : bigint,
}
export interface _SERVICE {
  'awardPoints' : ActorMethod<[Principal, bigint], Result>,
  'getNodeGeography' : ActorMethod<[], Array<GeographicDistribution>>,
  'getNodeStatus' : ActorMethod<
    [Principal],
    [] | [
      {
        'country' : [] | [string],
        'isActive' : boolean,
        'dataVolumeKB' : bigint,
        'lastActive' : bigint,
        'points' : bigint,
      }
    ]
  >,
  'getProfile' : ActorMethod<[], Result_6>,
  'getReferralCode' : ActorMethod<[], Result_5>,
  'getRhinoScanStats' : ActorMethod<[], RhinoScanStats>,
  'getScrapedData' : ActorMethod<[Array<string>], Result_4>,
  'getTopContributors' : ActorMethod<[bigint], Array<[Principal, bigint]>>,
  'getTopics' : ActorMethod<[], Result_3>,
  'getUserData' : ActorMethod<[], Result_2>,
  'getUserScrapedUrls' : ActorMethod<[], Array<string>>,
  'hasUserScrapedUrl' : ActorMethod<[string], boolean>,
  'registerDevice' : ActorMethod<[string], Result_1>,
  'submitScrapedData' : ActorMethod<[ScrapedData], Result_1>,
  'updatePreferences' : ActorMethod<[boolean, string], Result_1>,
  'updateUserLogin' : ActorMethod<[string], Result>,
  'useReferralCode' : ActorMethod<[string], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
