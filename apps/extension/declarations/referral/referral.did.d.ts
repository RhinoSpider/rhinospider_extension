import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type Result = { 'ok' : string } |
  { 'err' : string };
export type Result_1 = { 'ok' : UserData } |
  { 'err' : string };
export type Result_2 = { 'ok' : null } |
  { 'err' : string };
export interface UserData {
  'referralCode' : string,
  'referralCount' : bigint,
  'referredBy' : [] | [Principal],
  'totalDataScraped' : bigint,
  'points' : bigint,
}
export interface _SERVICE {
  'awardPoints' : ActorMethod<[Principal, bigint], Result_2>,
  'getReferralCode' : ActorMethod<[], Result>,
  'getUserData' : ActorMethod<[], Result_1>,
  'useReferralCode' : ActorMethod<[string], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
