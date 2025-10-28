import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface AIConfig {
  'model' : string,
  'costLimits' : CostLimits,
  'apiKey' : string,
}
export interface ConversionRequest {
  'id' : string,
  'status' : string,
  'userId' : Principal,
  'walletAddress' : string,
  'tokensGross' : bigint,
  'tokensFee' : bigint,
  'tokensNet' : bigint,
  'pointsAmount' : bigint,
  'requestedAt' : bigint,
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
export interface PointsRecord {
  'source' : string,
  'earnedAt' : bigint,
  'amount' : bigint,
}
export interface ReferralUse {
  'pointsAwarded' : bigint,
  'userPrincipal' : Principal,
  'timestamp' : bigint,
}
export type Result = { 'ok' : string } |
  { 'err' : string };
export type Result_1 = { 'ok' : null } |
  { 'err' : string };
export type Result_10 = {
    'ok' : {
      'profiles' : Array<[Principal, UserProfileBackup]>,
      'conversionRequests' : Array<[string, ConversionRequest]>,
      'pointsHistory' : Array<[Principal, Array<PointsRecord>]>,
    }
  } |
  { 'err' : string };
export type Result_11 = { 'ok' : ConversionRequest } |
  { 'err' : string };
export type Result_12 = { 'ok' : bigint } |
  { 'err' : string };
export type Result_2 = { 'ok' : null } |
  { 'err' : Error };
export type Result_3 = { 'ok' : UserProfile } |
  { 'err' : string };
export type Result_4 = { 'ok' : Array<ScrapingTopic> } |
  { 'err' : string };
export type Result_5 = { 'ok' : Array<ScrapingTopic> } |
  { 'err' : Error };
export type Result_6 = { 'ok' : Array<ScrapedData> } |
  { 'err' : Error };
export type Result_7 = { 'ok' : UserProfile } |
  { 'err' : Error };
export type Result_8 = { 'ok' : Array<PointsRecord> } |
  { 'err' : string };
export type Result_9 = { 'ok' : Array<ConversionRequest> } |
  { 'err' : string };
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
  'totalPagesScraped' : bigint,
  'latitude' : [] | [number],
  'created' : bigint,
  'principal' : Principal,
  'referralCode' : string,
  'country' : [] | [string],
  'referralHistory' : Array<ReferralUse>,
  'scrapedUrls' : Array<string>,
  'city' : [] | [string],
  'referralCount' : bigint,
  'isActive' : boolean,
  'preferences' : { 'theme' : string, 'notificationsEnabled' : boolean },
  'referredBy' : [] | [Principal],
  'totalDataScraped' : bigint,
  'pointsFromReferrals' : bigint,
  'totalBandwidthUsed' : bigint,
  'longitude' : [] | [number],
  'dataVolumeKB' : bigint,
  'sessionBandwidthUsed' : bigint,
  'lastLogin' : bigint,
  'devices' : Array<string>,
  'lastActive' : bigint,
  'sessionPagesScraped' : bigint,
  'ipAddress' : [] | [string],
  'points' : bigint,
  'pointsFromScraping' : bigint,
}
export interface UserProfileBackup {
  'totalPagesScraped' : bigint,
  'created' : bigint,
  'principal' : Principal,
  'referralCode' : string,
  'referralCount' : bigint,
  'referredBy' : [] | [Principal],
  'totalDataScraped' : bigint,
  'pointsFromReferrals' : bigint,
  'totalBandwidthUsed' : bigint,
  'lastLogin' : bigint,
  'devices' : Array<string>,
  'points' : bigint,
  'pointsFromScraping' : bigint,
}
export interface _SERVICE {
  'awardPoints' : ActorMethod<[Principal, bigint], Result_1>,
  'createBackupSnapshot' : ActorMethod<[string], Result_12>,
  'createConversionRequest' : ActorMethod<[bigint, string], Result_11>,
  'exportForBackup' : ActorMethod<[], Result_10>,
  'fixAllKazakhstanUsers' : ActorMethod<[], Result>,
  'fixExistingUsersData' : ActorMethod<[], Result>,
  'fixUserGeolocation' : ActorMethod<[Principal], Result_1>,
  'getAllConversionRequests' : ActorMethod<[], Result_9>,
  'getAllUsers' : ActorMethod<[], Array<[Principal, UserProfile]>>,
  'getBackupInfo' : ActorMethod<
    [],
    {
      'totalPointsRecords' : bigint,
      'totalProfiles' : bigint,
      'totalConversionRequests' : bigint,
    }
  >,
  'getConversionRequests' : ActorMethod<[Principal], Result_9>,
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
  'getPointsHistory' : ActorMethod<[Principal], Result_8>,
  'getProfile' : ActorMethod<[], Result_7>,
  'getReferralCode' : ActorMethod<[], Result>,
  'getRhinoScanStats' : ActorMethod<[], RhinoScanStats>,
  'getScrapedData' : ActorMethod<[Array<string>], Result_6>,
  'getTopContributors' : ActorMethod<[bigint], Array<[Principal, bigint]>>,
  'getTopics' : ActorMethod<[], Result_5>,
  'getTopicsForUser' : ActorMethod<[Principal], Result_4>,
  'getUserData' : ActorMethod<[], Result_3>,
  'getUserScrapedUrls' : ActorMethod<[], Array<string>>,
  'hasUserScrapedUrl' : ActorMethod<[string], boolean>,
  'mergeDuplicateUsers' : ActorMethod<[Principal], Result>,
  'populateReferralCodes' : ActorMethod<[], Result>,
  'recalculateAllUsersPoints' : ActorMethod<[], Result>,
  'recalculatePointsBreakdown' : ActorMethod<[], Result>,
  'refreshAllEmptyLocations' : ActorMethod<[], Result>,
  'refreshUserGeolocation' : ActorMethod<[Principal], Result>,
  'registerDevice' : ActorMethod<[string], Result_2>,
  'submitScrapedData' : ActorMethod<[ScrapedData], Result_2>,
  'updateAllUsersGeoFromAPI' : ActorMethod<[], Result>,
  'updatePreferences' : ActorMethod<[boolean, string], Result_2>,
  'updateUserLocationByIP' : ActorMethod<
    [string, string, string, string],
    Result
  >,
  'updateUserLogin' : ActorMethod<[string], Result_1>,
  'updateUserLoginForPrincipal' : ActorMethod<[Principal, string], Result>,
  'useReferralCode' : ActorMethod<[string], Result_1>,
  'useReferralCodeForPrincipal' : ActorMethod<[Principal, string], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
