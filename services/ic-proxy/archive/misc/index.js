import { Actor, HttpAgent } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';

const ConsumerInterface = IDL.Service({
  getTopics: IDL.Func([], [IDL.Vec(IDL.Record({
    id: IDL.Text,
    status: IDL.Text,
    name: IDL.Text,
    description: IDL.Text,
    scrapingInterval: IDL.Nat,
    maxRetries: IDL.Nat,
    activeHours: IDL.Record({
      start: IDL.Nat,
      end: IDL.Nat
    })
  }))], ['query']),
  submitScrapedContent: IDL.Func([IDL.Text, IDL.Text], [IDL.Variant({
    Ok: IDL.Null,
    Err: IDL.Variant({
      NotFound: IDL.Null,
      AlreadyExists: IDL.Null,
      NotAuthorized: IDL.Null,
      InvalidInput: IDL.Text,
      SystemError: IDL.Text
    })
  })], [])
});

export const createActor = (canisterId, options = {}) => {
  const agent = options.agent || new HttpAgent({ ...options.agentOptions });
  return Actor.createActor(ConsumerInterface, {
    agent,
    canisterId,
    ...options.actorOptions
  });
};