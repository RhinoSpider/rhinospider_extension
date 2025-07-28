import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type Result = { 'ok' : UserData } |
  { 'err' : string };
export type Result_1 = { 'ok' : string } |
  { 'err' : string };
export interface UserData {
  'referralCode' : string,
  'referralCount' : bigint,
  'referredBy' : [] | [Principal],
  'points' : bigint,
}
export interface _SERVICE {
  'getReferralCode' : ActorMethod<[], Result_1>,
  'getUserData' : ActorMethod<[], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
