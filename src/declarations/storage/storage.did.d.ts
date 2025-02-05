import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type Result = { 'ok' : null } |
  { 'err' : string };
export interface ScrapedContent {
  'id' : string,
  'url' : string,
  'aiAnalysis' : {
    'relevanceScore' : bigint,
    'keyPoints' : Array<string>,
    'codeSnippets' : Array<{ 'code' : string, 'language' : string }>,
  },
  'title' : string,
  'content' : string,
  'source' : string,
  'publishDate' : bigint,
  'metadata' : {
    'readingTime' : [] | [bigint],
    'language' : [] | [string],
    'license' : [] | [string],
    'techStack' : Array<string>,
  },
  'author' : string,
  'summary' : string,
  'topics' : Array<string>,
  'engagement' : {
    'claps' : [] | [bigint],
    'stars' : [] | [bigint],
    'comments' : bigint,
    'reactions' : [] | [bigint],
  },
  'updateDate' : bigint,
}
export interface ScrapedData {
  'id' : string,
  'url' : string,
  'topic' : string,
  'clientId' : Principal,
  'content' : string,
  'source' : string,
  'timestamp' : bigint,
}
export interface _SERVICE {
  'getBySource' : ActorMethod<[string], Array<ScrapedData>>,
  'getContent' : ActorMethod<[string], [] | [ScrapedContent]>,
  'getContentBySource' : ActorMethod<[string], Array<ScrapedContent>>,
  'getContentByTopic' : ActorMethod<[string, bigint], Array<ScrapedContent>>,
  'storeContent' : ActorMethod<[ScrapedContent], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
