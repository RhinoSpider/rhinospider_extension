import { Actor } from "@dfinity/agent";

// Imports and re-exports candid interface
import { idlFactory } from "./admin.did.js";
export { idlFactory } from "./admin.did.js";

/* CANISTER_ID is replaced by webpack based on node environment
 * Note: canister environment variable will be standardized as
 * process.env.CANISTER_ID_<CANISTER_NAME_UPPERCASE>
 * beginning in dfx 0.15.0
 */
export const canisterId =
  process.env.CANISTER_ID_ADMIN ||
  process.env.ADMIN_CANISTER_ID;

export const createActor = (canisterId, options = {}) => {
  if (!options.agent) {
    throw new Error("Agent is required for actor creation");
  }

  return Actor.createActor(idlFactory, {
    agent: options.agent,
    canisterId,
    ...options.actorOptions,
  });
};
