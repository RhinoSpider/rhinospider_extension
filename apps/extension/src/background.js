import { Actor, HttpAgent, AnonymousIdentity } from '@dfinity/agent';
import { DelegationChain, DelegationIdentity } from '@dfinity/identity';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { idlFactory as consumerIdlFactory } from './declarations/consumer/consumer.did.js';
import { Principal } from '@dfinity/principal';
import { toHex } from './utils/hex';
import { parsePublicKeyDer, parseSignatureDer } from './utils/der';

// Environment variables
const CONSUMER_CANISTER_ID = import.meta.env.VITE_CONSUMER_CANISTER_ID;
const IC_HOST = import.meta.env.VITE_IC_HOST;

let consumerActor = null;

// Create delegation chain from stored data
const createDelegationChain = (storedChain) => {
  try {
    console.log('Creating delegation chain from:', storedChain);
    
    // Convert stored arrays back to Uint8Arrays
    const delegations = storedChain.delegations.map(d => ({
      delegation: {
        pubkey: new Uint8Array(d.delegation.pubkey),
        expiration: BigInt('0x' + d.delegation.expiration),
        targets: d.delegation.targets || []
      },
      signature: new Uint8Array(d.signature)
    }));
    
    // Get the root public key from the first delegation
    const publicKey = delegations[0].delegation.pubkey;
    
    // Create DelegationChain instance using fromDelegations
    const chain = DelegationChain.fromDelegations(
      publicKey,
      delegations
    );
    
    console.log('Created delegation chain:', chain);
    console.log('Chain delegations:', chain.delegations);
    console.log('Chain public key:', chain.publicKey);
    return chain;
  } catch (error) {
    console.error('Error creating delegation chain:', error);
    throw error;
  }
};

// Helper to serialize delegation chain
const serializeDelegationChain = (chain) => {
  if (!chain || !chain.delegations || !chain.publicKey) {
    console.error('Invalid delegation chain:', chain);
    throw new Error('Invalid delegation chain structure');
  }

  return {
    delegations: chain.delegations.map(d => {
      if (!d.delegation || !d.delegation.pubkey || !d.signature) {
        console.error('Invalid delegation:', d);
        throw new Error('Invalid delegation structure');
      }
      return {
        delegation: {
          pubkey: Array.from(d.delegation.pubkey),
          expiration: d.delegation.expiration.toString(16),
          targets: d.delegation.targets || []
        },
        signature: Array.from(d.signature)
      };
    }),
    publicKey: Array.from(chain.publicKey)
  };
};

// Helper to recursively serialize BigInts
const serializeBigInts = (obj) => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString(16);
  }
  
  if (obj instanceof Uint8Array) {
    return Array.from(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInts);
  }
  
  if (typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeBigInts(value);
    }
    return result;
  }
  
  return obj;
};

const initializeActor = async () => {
  try {
    console.log('Background: Getting stored identity info...');
    const result = await chrome.storage.local.get(['identityInfo']);
    if (!result.identityInfo?.delegationChain) {
      throw new Error('No delegation chain found');
    }

    console.log('Background: Raw stored chain:', JSON.stringify(result.identityInfo.delegationChain, null, 2));
    
    // Create delegation chain
    const delegationChain = createDelegationChain(result.identityInfo.delegationChain);
    
    if (!delegationChain.delegations || !delegationChain.delegations[0]) {
      throw new Error('Invalid delegation chain: missing delegations');
    }
    
    // Create base identity with sign method
    const baseIdentity = {
      _delegationChain: delegationChain,
      getDelegation: () => delegationChain,
      getPrincipal: () => Principal.selfAuthenticating(delegationChain.publicKey),
      sign: async (blob) => {
        try {
          // Get first delegation
          const delegation = delegationChain.delegations[0];
          if (!delegation || !delegation.delegation || !delegation.delegation.pubkey || !delegation.signature) {
            throw new Error('Invalid delegation structure');
          }
          
          return {
            signature: delegation.signature,
            public_key: delegation.delegation.pubkey
          };
        } catch (error) {
          console.error('Error in sign method:', error);
          throw error;
        }
      },
      transformRequest: async (request) => {
        try {
          // Convert request body to proper format
          let bodyBytes;
          if (request.body instanceof ArrayBuffer) {
            bodyBytes = new Uint8Array(request.body);
          } else if (request.body instanceof Uint8Array) {
            bodyBytes = request.body;
          } else {
            const encoder = new TextEncoder();
            bodyBytes = encoder.encode(
              typeof request.body === 'string' 
                ? request.body 
                : JSON.stringify(serializeBigInts(request.body))
            );
          }
          
          // Create request ID
          const requestId = new Uint8Array(
            await crypto.subtle.digest('SHA-256', bodyBytes)
          );
          
          // Get delegation info and signature
          const signed = await baseIdentity.sign(bodyBytes);
          
          // Serialize delegation chain
          const requestDelegation = serializeDelegationChain(delegationChain);
          
          // Create transformed request with all BigInts serialized
          const transformedRequest = serializeBigInts({
            ...request,
            body: Array.from(bodyBytes),
            sender: Array.from(signed.public_key),
            request_id: Array.from(requestId),
            delegation: requestDelegation,
            signature: Array.from(signed.signature)
          });
          
          console.log('Transformed request:', transformedRequest);
          return transformedRequest;
        } catch (error) {
          console.error('Error in transformRequest:', error);
          throw error;
        }
      }
    };
    
    // Create agent with base identity
    console.log('Background: Creating agent...');
    const agent = new HttpAgent({
      identity: baseIdentity,
      host: IC_HOST
    });
    
    console.log('Background: Fetching root key...');
    await agent.fetchRootKey();
    
    console.log('Background: Creating actor...');
    return Actor.createActor(consumerIdlFactory, {
      agent,
      canisterId: CONSUMER_CANISTER_ID,
    });
  } catch (error) {
    console.error('Background: Error in initializeActor:', error);
    console.error('Background: Error stack:', error.stack);
    throw error;
  }
};

async function checkExistingAuth() {
  try {
    console.log('Background: Checking existing auth...');
    const result = await chrome.storage.local.get(['identityInfo', 'authState']);
    
    if (result.identityInfo && result.authState) {
      const authState = JSON.parse(result.authState);
      console.log('Background: Found auth state:', { isAuthenticated: authState.isAuthenticated });
      return authState.isAuthenticated;
    }
    
    console.log('Background: No existing auth found');
    return false;
  } catch (error) {
    console.error('Background: Error checking auth:', error);
    return false;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background: Received message:', message);
  if (message.type === 'LOGIN_COMPLETE') {
    console.log('Background: Login complete, initializing actor...');
    initializeActor();
  } else if (message.type === 'LOGOUT') {
    console.log('Background: Logout received, clearing actor...');
    consumerActor = null;
  }
});

console.log('Background: Starting background script...');
checkExistingAuth();

export { consumerActor };
