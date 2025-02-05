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
export type Result = { 'ok' : null } |
  { 'err' : string };
export type Result_1 = { 'ok' : AIConfig } |
  { 'err' : string };
export type Result_2 = { 'ok' : bigint } |
  { 'err' : string };
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
export type UserRole = { 'Operator' : null } |
  { 'SuperAdmin' : null } |
  { 'Admin' : null };
export interface _SERVICE {
  'addTasks' : ActorMethod<[Array<Task>], Result_2>,
  'addUser' : ActorMethod<[Principal, UserRole], Result>,
  'clearAllData' : ActorMethod<[], string>,
  'getAIConfig' : ActorMethod<[], Result_1>,
  'getConfig' : ActorMethod<[], TaskConfig>,
  'getTasks' : ActorMethod<[bigint], Array<Task>>,
  'init' : ActorMethod<[], undefined>,
  'removeUser' : ActorMethod<[Principal], Result>,
  'updateAIConfig' : ActorMethod<[AIConfig], Result>,
  'updateConfig' : ActorMethod<[TaskConfig], Result>,
  'updateTaskStatus' : ActorMethod<[string, string], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
