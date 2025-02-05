import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Client {
  'id' : string,
  'principal' : Principal,
  'bandwidthLimit' : bigint,
  'isActive' : boolean,
  'registeredAt' : bigint,
  'lastActive' : bigint,
}
export interface ClientStats {
  'lastUpdate' : bigint,
  'bytesUploaded' : bigint,
  'bytesDownloaded' : bigint,
}
export type Result = { 'ok' : null } |
  { 'err' : string };
export type Result_1 = { 'ok' : Client } |
  { 'err' : string };
export type Result_2 = { 'ok' : ClientStats } |
  { 'err' : string };
export type Result_3 = { 'ok' : Array<Client> } |
  { 'err' : string };
export interface _SERVICE {
  'deactivateClient' : ActorMethod<[Principal], Result>,
  'getAllClients' : ActorMethod<[], Result_3>,
  'getClientStats' : ActorMethod<[], Result_2>,
  'init' : ActorMethod<[], undefined>,
  'isAuthorized' : ActorMethod<[Principal], boolean>,
  'registerClient' : ActorMethod<[bigint], Result_1>,
  'updateBandwidthLimit' : ActorMethod<[Principal, bigint], Result>,
  'updateStats' : ActorMethod<[bigint, bigint], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
