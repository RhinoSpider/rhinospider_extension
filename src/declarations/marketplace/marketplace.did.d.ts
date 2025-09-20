import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface ApiKey {
  'user_principal' : Principal,
  'dataset_id' : string,
  'api_key' : string,
  'key_id' : string,
  'allowed_ips' : Array<string>,
  'created_at' : bigint,
  'last_reset' : bigint,
  'usage_today' : bigint,
  'last_used' : [] | [bigint],
  'is_active' : boolean,
  'request_count' : bigint,
  'expires_at' : [] | [bigint],
  'rate_limit_per_minute' : bigint,
  'daily_limit' : bigint,
}
export interface Dataset {
  'region' : string,
  'status' : string,
  'on_chain_hash' : string,
  'data_source' : string,
  'provider' : string,
  'dataset_id' : string,
  'size_gb' : number,
  'name' : string,
  'tags' : Array<string>,
  'row_count' : bigint,
  'description' : string,
  'update_frequency' : string,
  'file_url' : string,
  'sample_rows' : Array<string>,
  'api_endpoint' : [] | [string],
  'category' : string,
  'preview_available' : boolean,
  'price_api' : number,
  'last_update' : bigint,
  'price_bulk' : number,
  'format' : string,
}
export interface DatasetStats {
  'unique_buyers' : bigint,
  'dataset_id' : string,
  'api_subscriptions' : bigint,
  'avg_rating' : number,
  'bulk_downloads' : bigint,
  'total_api_calls' : bigint,
  'total_revenue' : number,
  'total_purchases' : bigint,
}
export interface Purchase {
  'download_count' : bigint,
  'status' : string,
  'user_principal' : Principal,
  'dataset_id' : string,
  'download_url' : [] | [string],
  'created_at' : bigint,
  'purchase_id' : string,
  'currency' : string,
  'purchase_type' : string,
  'amount' : number,
  'expires_at' : [] | [bigint],
  'payment_tx_id' : string,
}
export type Result = { 'ok' : string } |
  { 'err' : string };
export type Result_1 = { 'ok' : User } |
  { 'err' : string };
export type Result_2 = { 'ok' : Purchase } |
  { 'err' : string };
export type Result_3 = { 'ok' : UsageMetrics } |
  { 'err' : string };
export type Result_4 = { 'ok' : DatasetStats } |
  { 'err' : string };
export type Result_5 = { 'ok' : Array<string> } |
  { 'err' : string };
export type Result_6 = { 'ok' : Dataset } |
  { 'err' : string };
export type Result_7 = { 'ok' : null } |
  { 'err' : string };
export interface UsageMetrics {
  'user_principal' : Principal,
  'data_transferred_gb' : number,
  'dataset_id' : string,
  'api_calls_month' : bigint,
  'api_calls_today' : bigint,
  'downloads_count' : bigint,
  'last_access' : bigint,
}
export interface User {
  'last_login' : bigint,
  'total_spent' : number,
  'principal' : Principal,
  'kyc_verified' : boolean,
  'use_case' : [] | [string],
  'api_calls_total' : bigint,
  'company_size' : [] | [string],
  'email' : [] | [string],
  'company' : [] | [string],
  'purchase_count' : bigint,
  'registered_at' : bigint,
  'preferred_payment' : string,
  'account_tier' : string,
  'industry' : [] | [string],
}
export interface _SERVICE {
  'addAdmin' : ActorMethod<[Principal], Result_7>,
  'createDataset' : ActorMethod<[Dataset], Result>,
  'getAdmins' : ActorMethod<[], Array<Principal>>,
  'getAllDatasets' : ActorMethod<[], Array<Dataset>>,
  'getDataset' : ActorMethod<[string], Result_6>,
  'getDatasetData' : ActorMethod<[string, string, bigint, bigint], Result_5>,
  'getDatasetStats' : ActorMethod<[string], Result_4>,
  'getTopDatasets' : ActorMethod<[bigint], Array<Dataset>>,
  'getUserApiKeys' : ActorMethod<[], Array<ApiKey>>,
  'getUserProfile' : ActorMethod<[], Result_1>,
  'getUserPurchases' : ActorMethod<[], Array<Purchase>>,
  'getUserUsageMetrics' : ActorMethod<[string], Result_3>,
  'init' : ActorMethod<[], undefined>,
  'purchaseDataset' : ActorMethod<
    [string, string, string, number, string],
    Result_2
  >,
  'regenerateApiKey' : ActorMethod<[string], Result>,
  'registerUser' : ActorMethod<
    [[] | [string], [] | [string], [] | [string], [] | [string], [] | [string]],
    Result_1
  >,
  'searchDatasets' : ActorMethod<
    [[] | [string], [] | [string], [] | [string], [] | [number], [] | [number]],
    Array<Dataset>
  >,
  'syncDatasets' : ActorMethod<[], Result>,
  'syncWithAdmin' : ActorMethod<[], string>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
