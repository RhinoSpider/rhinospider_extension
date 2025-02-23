import { Actor, HttpAgent } from "@dfinity/agent";
import { IDL } from '@dfinity/candid';

export const idlFactory = ({ IDL }) => {
  const Error = IDL.Variant({
    'InvalidInput' : IDL.Text,
    'SystemError' : IDL.Text,
    'NotFound' : IDL.Null,
    'NotAuthorized' : IDL.Null,
    'AlreadyExists' : IDL.Null,
  });

  const Result = IDL.Variant({ 'ok' : IDL.Null, 'err' : Error });

  const UserProfile = IDL.Record({
    'created' : IDL.Nat64,
    'principal' : IDL.Principal,
    'preferences' : IDL.Record({
      'theme' : IDL.Text,
      'notificationsEnabled' : IDL.Bool,
    }),
    'lastLogin' : IDL.Nat64,
    'devices' : IDL.Vec(IDL.Text),
  });

  const Result_2 = IDL.Variant({ 'ok' : UserProfile, 'err' : Error });

  return IDL.Service({
    'getProfile' : IDL.Func([], [Result_2], ['query']),
    'registerDevice' : IDL.Func([IDL.Text], [Result], []),
  });
};

export const init = ({ IDL }) => { return []; };

/* CANISTER_ID is replaced by webpack based on node environment
 * Note: canister environment variable will be standardized as
 * process.env.CANISTER_ID_<CANISTER_NAME_UPPERCASE>
 * beginning in dfx 0.15.0
 */
export const canisterId =
  process.env.CANISTER_ID_CONSUMER ||
  process.env.CONSUMER_CANISTER_ID;

export const createActor = (canisterId, options = {}) => {
  const agent = options.agent || new HttpAgent({ ...options.agentOptions });

  if (options.agent && options.agentOptions) {
    console.warn(
      "Detected both agent and agentOptions passed to createActor. Ignoring agentOptions and proceeding with the provided agent."
    );
  }

  // Fetch root key for certificate validation during development
  if (process.env.DFX_NETWORK !== "ic") {
    agent.fetchRootKey().catch((err) => {
      console.warn(
        "Unable to fetch root key. Check to ensure that your local replica is running"
      );
      console.error(err);
    });
  }

  // Creates an actor with using the candid interface and the HttpAgent
  return Actor.createActor(idlFactory, {
    agent,
    canisterId,
    ...options.actorOptions,
  });
};
