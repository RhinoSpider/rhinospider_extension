import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "./referral.did.js";

export const createActor = (canisterId, options) => {
  const agent = new HttpAgent({ ...options?.agent });

  // Fetch root key for certificate validation during development
  if (process.env.DFX_NETWORK !== "ic") {
    agent.fetchRootKey().catch(err => {
      console.warn("Unable to fetch root key. Check to ensure that your local replica is running");
      console.error(err);
    });
  }

  // Creates an actor with the did interface and the HttpAgent
  return Actor.createActor(idlFactory, {
    agent,
    canisterId,
    ...options?.actor,
  });
};

export const canisterId = process.env.REFERRAL_CANISTER_ID;
export { idlFactory } from "./referral.did.js";