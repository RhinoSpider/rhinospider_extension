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
  const delegations = storedChain.delegations.map(d => ({
    delegation: {
      pubkey: new Uint8Array(d.delegation.pubkey),
      expiration: BigInt('0x' + d.delegation.expiration), // Critical: convert hex to BigInt
      targets: d.delegation.targets || []
    },
    signature: new Uint8Array(d.signature)
  }));
  
  const publicKey = new Uint8Array(storedChain.publicKey);
  return DelegationChain.fromDelegations(publicKey, delegations);
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

// Cached instances
let authClient = null;
let actor = null;

// Time before expiry to trigger renewal (1 day in nanoseconds)
const RENEWAL_THRESHOLD = BigInt(24 * 60 * 60 * 1000 * 1000 * 1000);

export class AuthManager {
  constructor(isBackground = false) {
    this.isBackground = isBackground;
  }

  async init() {
    if (!authClient) {
      console.log('Creating new auth client...');
      authClient = await AuthClient.create({
        idleOptions: {
          disableDefaultIdleCallback: true,
          disableIdle: true
        }
      });
      console.log('Auth client created');
    }
    return authClient;
  }

  async isAuthenticated() {
    const client = await this.init();
    const isAuth = await client.isAuthenticated();
    
    if (isAuth) {
      // Check if identity needs renewal
      const identity = client.getIdentity();
      const delegationChain = identity.getDelegation();
      
      if (delegationChain) {
        const timeUntilExpiry = delegationChain.delegations[0].delegation.expiration - BigInt(Date.now()) * BigInt(1000_000);
        
        if (timeUntilExpiry < RENEWAL_THRESHOLD) {
          console.log('Identity expiring soon, attempting renewal...');
          await this.renewIdentity();
        }
      }
    }
    
    return isAuth;
  }

  async getIdentity() {
    const client = await this.init();
    if (await this.isAuthenticated()) {
      return client.getIdentity();
    }
    return null;
  }

  async createActor() {
    try {
      // Get identity
      const identity = await this.getIdentity();
      if (!identity) {
        console.error('No identity found');
        throw new Error('No identity found');
      }

      console.log('Got identity:', identity.getPrincipal().toString());

      // Create new actor if it doesn't exist or if we have a new identity
      if (!actor || !actor._identity || actor._identity.getPrincipal().toString() !== identity.getPrincipal().toString()) {
        const agent = new HttpAgent({ 
          identity,
          host: IC_HOST
        });

        // Initialize agent for non-local environments
        if (!IC_HOST.includes('localhost')) {
          await agent.fetchRootKey();
        }

        const { createActor } = await import('../declarations/consumer');
        actor = await createActor(import.meta.env.VITE_CONSUMER_CANISTER_ID, {
          agent
        });
      }

      return actor;
    } catch (error) {
      console.error('Error getting consumer actor:', error);
      throw error;
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
        const principal = identity.getPrincipal().toText();
        console.log('Background identity principal:', principal);

        // Create actor with identity
        actor = await this.createActor();

        return {
          isAuthenticated: true,
          principal
        };
      } catch (error) {
        console.error('Background auth failed:', error);
        await chrome.storage.local.remove(['authState', 'identityInfo']);
        return { isAuthenticated: false };
      }
    }

    // Popup authentication
    try {
      const isAuthenticated = await this.isAuthenticated();
      if (!isAuthenticated) {
        return { isAuthenticated: false };
      }

      const identity = await this.getIdentity();
      const chain = identity.getDelegation();
      
      // Store delegation chain with proper format
      await storeDelegationChain(chain);

      // Create actor with identity
      actor = await this.createActor();

      return {
        isAuthenticated: true,
        principal: identity.getPrincipal().toText()
      };
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      return { isAuthenticated: false, error: error.message };
    }
  }

  async login() {
    const client = await this.init();
    await new Promise((resolve, reject) => {
      client.login({
        identityProvider: import.meta.env.VITE_II_URL,
        onSuccess: async () => {
          console.log('Login successful');
          // Verify delegation chain
          const identity = client.getIdentity();
          const delegationChain = identity.getDelegation();
          
          if (!delegationChain) {
            console.error('No delegation chain found after login');
            reject(new Error('Invalid delegation chain'));
            return;
          }

          // Store delegation chain
          await storeDelegationChain(delegationChain);
          resolve();
        },
        onError: (error) => {
          console.error('Login failed:', error);
          reject(error);
        }
      });
    });
  }

  async logout() {
    if (!authClient) {
      console.warn('No auth client to logout from');
      return;
    }
    await authClient.logout();
    authClient = null;
    actor = null;
  }
}
