import { AuthClient } from '@dfinity/auth-client';
import { HttpAgent } from '@dfinity/agent';
import { DelegationIdentity, DelegationChain, Ed25519KeyIdentity } from '@dfinity/identity';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { Principal } from '@dfinity/principal';

const II_URL = import.meta.env.VITE_II_URL;
const IC_HOST = import.meta.env.VITE_IC_HOST;

// Store delegation chain in correct format
export async function storeDelegationChain(chain) {
  try {
    // Convert to storage format - CRITICAL: store expiration as hex string
    const storageFormat = {
      publicKey: Array.from(chain.publicKey), // Store raw public key bytes
      delegations: chain.delegations.map(d => ({
        delegation: {
          pubkey: Array.from(d.delegation.pubkey),
          expiration: d.delegation.expiration.toString(16), // Store as hex string
          targets: d.delegation.targets || []
        },
        signature: Array.from(d.signature)
      }))
    };

    // Store in identityInfo.delegationChain to match retrieval path
    await chrome.storage.local.set({
      identityInfo: {
        delegationChain: storageFormat,
        principal: chain.toJSON().delegations[0].delegation.pubkey // Store principal for reference
      }
    });

    console.log('Stored delegation chain:', {
      publicKeyLength: storageFormat.publicKey.length,
      delegationsCount: storageFormat.delegations.length,
      firstDelegation: storageFormat.delegations[0] ? {
        pubkeyLength: storageFormat.delegations[0].delegation.pubkey.length,
        expiration: storageFormat.delegations[0].delegation.expiration,
        signatureLength: storageFormat.delegations[0].signature.length
      } : null
    });
  } catch (error) {
    console.error('Failed to store delegation chain:', error);
    throw error;
  }
}

// Create delegation chain from stored data
const createDelegationChain = (storedChain) => {
  try {
    if (!storedChain || !storedChain.delegations) {
      throw new Error('Invalid stored chain structure');
    }

    // Convert public key to Uint8Array
    const publicKey = new Uint8Array(storedChain.publicKey);

    // Process each delegation with proper CBOR structure
    const delegations = storedChain.delegations.map((d, i) => {
      // Convert binary data to Uint8Array first
      const pubkey = new Uint8Array(d.delegation.pubkey);
      const signature = new Uint8Array(d.signature);

      // Create proper SignedDelegation structure
      return {
        delegation: {
          pubkey: pubkey, // Keep as Uint8Array
          expiration: BigInt('0x' + d.delegation.expiration),
          targets: [] // Empty array instead of null
        },
        signature: signature // Keep as Uint8Array
      };
    });

    // Create chain with proper types
    return DelegationChain.fromDelegations(publicKey, delegations);
  } catch (error) {
    console.error('Failed to create delegation chain:', error);
    throw error;
  }
};

// Create identity from delegation chain
export async function createBackgroundIdentity(storedChain) {
  try {
    // Create base key identity with signing capability
    const secretKey = crypto.getRandomValues(new Uint8Array(32));
    const baseIdentity = Secp256k1KeyIdentity.fromSecretKey(secretKey);

    // Create delegation chain
    const chain = createDelegationChain(storedChain);

    // Create delegation identity
    return new DelegationIdentity(baseIdentity, chain);
  } catch (error) {
    console.error('Failed to create background identity:', error);
    throw error;
  }
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
        const stored = await chrome.storage.local.get(['authState', 'identityInfo']);
        if (stored.authState && stored.identityInfo?.delegationChain) {
          const authState = JSON.parse(stored.authState);
          const storedChain = stored.identityInfo.delegationChain;
          
          if (authState.isAuthenticated && storedChain) {
            // Verify delegation chain expiration
            const now = BigInt(Date.now()) * BigInt(1000_000);
            const chain = createDelegationChain(storedChain);
            if (chain.delegations.some(d => d.delegation.expiration < now)) {
              console.log('Delegation chain expired, clearing auth state');
              await chrome.storage.local.remove(['authState', 'identityInfo']);
              return { isAuthenticated: false };
            }

            // Create base identity with signing capability
            const identity = await createBackgroundIdentity(storedChain);
            
            // Create agent with delegation identity and custom fetch handler
            this.agent = new HttpAgent({
              identity,
              host: IC_HOST,
              fetch: (...args) => {
                const [resource, init = {}] = args;
                // Ensure proper CBOR content type
                init.headers = {
                  ...init.headers,
                  'Content-Type': 'application/cbor'
                };
                // Log request for debugging
                console.log('Making request:', {
                  resource,
                  method: init.method,
                  headers: init.headers
                });
                return fetch(resource, init).then(async response => {
                  // Log response for debugging
                  console.log('Got response:', {
                    status: response.status,
                    headers: Object.fromEntries(response.headers.entries())
                  });
                  return response;
                }).catch(error => {
                  console.error('Request failed:', error);
                  throw error;
                });
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
            
            return authState;
          }
        }
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
        await storeDelegationChain(chain);

        // Create agent with identity and custom fetch handler
        this.agent = new HttpAgent({
          identity,
          host: IC_HOST,
          fetch: (...args) => {
            const [resource, init = {}] = args;
            // Ensure proper CBOR content type
            init.headers = {
              ...init.headers,
              'Content-Type': 'application/cbor'
            };
            // Log request for debugging
            console.log('Making request:', {
              resource,
              method: init.method,
              headers: init.headers
            });
            return fetch(resource, init).then(async response => {
              // Log response for debugging
              console.log('Got response:', {
                status: response.status,
                headers: Object.fromEntries(response.headers.entries())
              });
              return response;
            }).catch(error => {
              console.error('Request failed:', error);
              throw error;
            });
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
        const stored = await chrome.storage.local.get(['authState', 'identityInfo']);
        if (!stored.authState || !stored.identityInfo?.delegationChain) {
          return { isAuthenticated: false };
        }

        // Background authentication
        const identity = await createBackgroundIdentity(stored.identityInfo.delegationChain);
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
        await chrome.storage.local.remove(['authState', 'identityInfo']);
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
      await storeDelegationChain(chain);

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
      await storeDelegationChain(chain);

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
    await chrome.storage.local.remove(['authState', 'identityInfo']);
  }
}

export { BackgroundAuthManager };
