import { AuthClient } from '@dfinity/auth-client';
import { HttpAgent } from '@dfinity/agent';
import { DelegationIdentity, Ed25519PublicKey } from '@dfinity/identity';
import { Principal } from '@dfinity/principal';

// Constants
const II_URL = 'https://identity.ic0.app';
const HOST = 'https://icp0.io';

export class BackgroundAuthManager {
  constructor() {
    this.agent = null;
  }

  async initialize() {
    console.log('Initializing background auth manager...');
    try {
      // Check storage for saved state
      const stored = await chrome.storage.local.get('authState');
      const authState = stored.authState;

      if (authState?.isAuthenticated && authState.delegationChain) {
        try {
          // Reconstruct delegation identity
          const chain = authState.delegationChain;
          const publicKey = new Ed25519PublicKey(new Uint8Array(chain.publicKey));
          
          const delegations = chain.delegations.map(d => ({
            delegation: {
              pubkey: new Uint8Array(d.delegation.pubkey),
              expiration: BigInt(d.delegation.expiration),
              targets: d.delegation.targets?.map(t => Principal.fromText(t))
            },
            signature: new Uint8Array(d.signature)
          }));

          const identity = new DelegationIdentity(publicKey, delegations);
          
          // Create agent with reconstructed identity
          this.agent = new HttpAgent({
            host: HOST,
            identity
          });

          await this.agent.fetchRootKey();

          return {
            isAuthenticated: true,
            principal: identity.getPrincipal().toText()
          };
        } catch (error) {
          console.error('Failed to reconstruct identity:', error);
          // Clear invalid state
          await chrome.storage.local.remove('authState');
        }
      }

      return { isAuthenticated: false };
    } catch (error) {
      console.error('Failed to initialize background auth:', error);
      throw error;
    }
  }

  getAgent() {
    if (!this.agent) {
      throw new Error('No agent available. Make sure to initialize first.');
    }
    return this.agent;
  }
}
