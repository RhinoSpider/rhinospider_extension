import { AuthClient } from '@dfinity/auth-client';
import { HttpAgent, AnonymousIdentity } from '@dfinity/agent';
import { DelegationIdentity, DelegationChain } from '@dfinity/identity';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { Principal } from '@dfinity/principal';

const II_URL = import.meta.env.VITE_II_URL;
const IC_HOST = import.meta.env.VITE_IC_HOST;

// Create base identity with signing capability for background context
export function createBackgroundIdentity(storedChain) {
  // If no stored chain, return anonymous identity
  if (!storedChain) {
    return new AnonymousIdentity();
  }

  const secretKey = crypto.getRandomValues(new Uint8Array(32));
  const baseIdentity = Secp256k1KeyIdentity.fromSecretKey(secretKey);
  
  // Convert stored expiration to BigInt
  const delegations = storedChain.delegations.map(d => ({
    delegation: {
      pubkey: Uint8Array.from(d.delegation.pubkey),
      expiration: BigInt('0x' + d.delegation.expiration),
      targets: d.delegation.targets
    },
    signature: Uint8Array.from(d.signature)
  }));

  const delegationChain = DelegationChain.fromDelegations(
    Uint8Array.from(storedChain.publicKey),
    delegations
  );

  // Create delegation identity with base identity and chain
  return new DelegationIdentity(baseIdentity, delegationChain);
}

class BackgroundAuthManager {
  static instance = null;
  
  constructor() {
    this.authClient = null;
    this.agent = null;
    this.consumerActor = null;
    this.isBackground = !globalThis.window;
  }

  static getInstance() {
    if (!BackgroundAuthManager.instance) {
      BackgroundAuthManager.instance = new BackgroundAuthManager();
    }
    return BackgroundAuthManager.instance;
  }

  async initialize() {
    try {
      // In background script, try to restore auth state from storage
      if (this.isBackground) {
        const stored = await chrome.storage.local.get(['authState', 'delegationChain']);
        if (stored.authState && stored.delegationChain) {
          const authState = JSON.parse(stored.authState);
          const storedChain = JSON.parse(stored.delegationChain);
          
          if (authState.isAuthenticated && storedChain) {
            // Verify delegation chain expiration
            const now = BigInt(Date.now()) * BigInt(1000_000);
            if (storedChain.delegations.some(d => BigInt('0x' + d.delegation.expiration) < now)) {
              console.log('Delegation chain expired, clearing auth state');
              await chrome.storage.local.remove(['authState', 'delegationChain']);
              return { isAuthenticated: false };
            }

            // Create base identity with signing capability
            const identity = createBackgroundIdentity(storedChain);
            
            // Create agent with delegation identity
            this.agent = new HttpAgent({
              identity,
              host: IC_HOST,
              fetch: (...args) => {
                const [resource, init = {}] = args;
                init.headers = {
                  ...init.headers,
                  'Content-Type': 'application/cbor'
                };
                return fetch(resource, init);
              }
            });

            // Only fetch root key in development
            if (import.meta.env.DEV) {
              await this.agent.fetchRootKey();
            }

            // Create consumer actor with proper candid interface
            const { createActor } = await import('../declarations/consumer');
            this.consumerActor = await createActor(import.meta.env.VITE_CONSUMER_CANISTER_ID, {
              agent: this.agent
            });
            
            // Notify about successful restoration
            chrome.runtime.sendMessage({
              type: 'AUTH_STATE_CHANGED',
              data: {
                isAuthenticated: true,
                principal: authState.principal,
                isInitialized: true,
                error: null
              }
            }).catch(() => {});
            
            return {
              isAuthenticated: true,
              principal: authState.principal
            };
          }
          return { isAuthenticated: false };
        }
        return { isAuthenticated: false };
      }

      // In popup/content script, create auth client normally
      if (!this.authClient) {
        this.authClient = await AuthClient.create({
          idleOptions: {
            disableDefaultIdleCallback: true, // Disable default idle behavior
            disableIdle: true // Completely disable idle timeout
          }
        });
      }

      const isAuthenticated = await this.isAuthenticated();

      if (isAuthenticated) {
        const identity = this.authClient.getIdentity();
        const chain = identity.getDelegation();
        
        // Store delegation chain
        await chrome.storage.local.set({
          delegationChain: JSON.stringify({
            publicKey: Array.from(chain.publicKey),
            delegations: chain.delegations.map(d => ({
              delegation: {
                pubkey: Array.from(d.delegation.pubkey),
                expiration: d.delegation.expiration.toString(16), // Store as hex string
                targets: d.delegation.targets || []
              },
              signature: Array.from(d.signature)
            }))
          }),
          authState: JSON.stringify({
            isAuthenticated: true,
            principal: identity.getPrincipal().toText(),
            isInitialized: true,
            error: null
          })
        });
        
        // Create agent with identity
        this.agent = new HttpAgent({
          identity,
          host: IC_HOST
        });

        // Only fetch root key in development
        if (import.meta.env.DEV) {
          await this.agent.fetchRootKey();
        }

        // Create consumer actor with proper candid interface
        const { createActor } = await import('../declarations/consumer');
        this.consumerActor = await createActor(import.meta.env.VITE_CONSUMER_CANISTER_ID, {
          agent: this.agent
        });
      }

      return {
        isAuthenticated,
        principal: isAuthenticated ? this.authClient.getIdentity().getPrincipal().toText() : null
      };
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      return { isAuthenticated: false, error: error.message };
    }
  }

  async createAgent(identity) {
    this.agent = new HttpAgent({
      identity,
      host: IC_HOST
    });

    // Only fetch root key in development
    if (import.meta.env.DEV) {
      await this.agent.fetchRootKey();
    }
  }

  async checkAuthentication() {
    if (this.isBackground) {
      try {
        const stored = await chrome.storage.local.get(['authState', 'delegationChain']);
        if (!stored.authState || !stored.delegationChain) {
          return { isAuthenticated: false };
        }

        // Background authentication
        const identity = createBackgroundIdentity(JSON.parse(stored.delegationChain));
        this.agent = new HttpAgent({ identity, host: IC_HOST });
        
        if (import.meta.env.DEV) {
          await this.agent.fetchRootKey();
        }

        return {
          isAuthenticated: true,
          principal: identity.getPrincipal().toText()
        };
      } catch (error) {
        console.error('Background auth failed:', error);
        await chrome.storage.local.remove(['authState', 'delegationChain']);
        return { isAuthenticated: false };
      }
    }

    // Popup authentication
    try {
      if (!this.authClient) {
        this.authClient = await AuthClient.create({
          idleOptions: {
            disableDefaultIdleCallback: true,
            disableIdle: true
          }
        });
      }

      const isAuthenticated = await this.isAuthenticated();
      if (!isAuthenticated) {
        return { isAuthenticated: false };
      }

      const identity = this.authClient.getIdentity();
      const chain = identity.getDelegation();
      
      // Store delegation chain
      await chrome.storage.local.set({
        delegationChain: JSON.stringify({
          publicKey: Array.from(chain.publicKey),
          delegations: chain.delegations.map(d => ({
            delegation: {
              pubkey: Array.from(d.delegation.pubkey),
              expiration: d.delegation.expiration.toString(16),
              targets: d.delegation.targets || []
            },
            signature: Array.from(d.signature)
          }))
        })
      });

      // Create agent
      this.agent = new HttpAgent({ identity, host: IC_HOST });
      
      if (import.meta.env.DEV) {
        await this.agent.fetchRootKey();
      }

      // Create consumer actor
      const { createActor } = await import('../declarations/consumer');
      this.consumerActor = await createActor(import.meta.env.VITE_CONSUMER_CANISTER_ID, {
        agent: this.agent
      });

      return {
        isAuthenticated: true,
        principal: identity.getPrincipal().toText()
      };
    } catch (error) {
      console.error('Popup auth failed:', error);
      return { 
        isAuthenticated: false,
        error: error.message 
      };
    }
  }

  async handlePopupAuth() {
    const isAuthenticated = await this.isAuthenticated();
    
    if (isAuthenticated) {
      const identity = this.authClient.getIdentity();
      const chain = identity.getDelegation();
      
      // Store delegation chain
      await chrome.storage.local.set({
        delegationChain: JSON.stringify({
          publicKey: Array.from(chain.publicKey),
          delegations: chain.delegations.map(d => ({
            delegation: {
              pubkey: Array.from(d.delegation.pubkey),
              expiration: d.delegation.expiration.toString(16),
              targets: d.delegation.targets || []
            },
            signature: Array.from(d.signature)
          }))
        })
      });

      // Create agent
      this.agent = new HttpAgent({ identity, host: IC_HOST });
      
      if (import.meta.env.DEV) {
        await this.agent.fetchRootKey();
      }

      // Create consumer actor
      const { createActor } = await import('../declarations/consumer');
      this.consumerActor = await createActor(import.meta.env.VITE_CONSUMER_CANISTER_ID, {
        agent: this.agent
      });
    }

    return {
      isAuthenticated,
      principal: isAuthenticated ? this.authClient.getIdentity().getPrincipal().toText() : null
    };
  }

  async isAuthenticated() {
    if (this.isBackground) {
      const stored = await chrome.storage.local.get(['authState']);
      return stored.authState ? JSON.parse(stored.authState).isAuthenticated : false;
    }
    return this.authClient ? this.authClient.isAuthenticated() : false;
  }

  getAgent() {
    return this.agent;
  }

  getConsumerActor() {
    return this.consumerActor;
  }

  async logout() {
    if (this.authClient) {
      await this.authClient.logout();
    }
    this.agent = null;
    this.consumerActor = null;
    await chrome.storage.local.remove(['authState', 'delegationChain']);
  }
}

export { BackgroundAuthManager };
