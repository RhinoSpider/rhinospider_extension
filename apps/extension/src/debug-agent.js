// Debug script for IC agent issues
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';

// Constants
const IC_HOST = 'https://icp0.io';
const CONSUMER_CANISTER_ID = 't3pjp-kqaaa-aaaao-a4ooq-cai';

// Define UserProfile type for decoding
const UserProfile = IDL.Record({
  'created': IDL.Int,
  'principal': IDL.Principal,
  'preferences': IDL.Record({
    'theme': IDL.Text,
    'notificationsEnabled': IDL.Bool,
  }),
  'lastLogin': IDL.Int,
  'devices': IDL.Vec(IDL.Text),
});

// Define Error type for decoding
const Error = IDL.Variant({
  'InvalidInput': IDL.Text,
  'SystemError': IDL.Text,
  'NotFound': IDL.Null,
  'NotAuthorized': IDL.Null,
  'AlreadyExists': IDL.Null,
});

// Define Result type for decoding
const Result = IDL.Variant({ 'ok': UserProfile, 'err': Error });

// Set up logger
const logger = {
  debug: (message, ...args) => {
    console.debug(`[${new Date().toISOString()}] [DEBUG] ${message}`, ...args);
  },
  info: (message, ...args) => {
    console.info(`[${new Date().toISOString()}] [INFO] ${message}`, ...args);
  },
  warn: (message, ...args) => {
    console.warn(`[${new Date().toISOString()}] [WARN] ${message}`, ...args);
  },
  error: (message, ...args) => {
    console.error(`[${new Date().toISOString()}] [ERROR] ${message}`, ...args);
  }
};

// Create a custom fetch handler for debugging
const createDebugFetch = () => {
  return async (url, options = {}) => {
    // Log request details
    logger.debug('[Fetch] Request URL:', url);
    logger.debug('[Fetch] Request options:', JSON.stringify({
      method: options.method,
      headers: options.headers,
      credentials: options.credentials,
      body: options.body ? 'Binary data present' : 'No body'
    }));
    
    // Ensure proper headers
    options.headers = options.headers || {};
    options.headers['Content-Type'] = options.headers['Content-Type'] || 'application/cbor';
    options.credentials = 'omit';
    
    try {
      // Make the fetch call
      const response = await fetch(url, options);
      
      // Log response details
      logger.debug('[Fetch] Response status:', response.status);
      logger.debug('[Fetch] Response headers:', [...response.headers.entries()]);
      
      if (!response.ok) {
        const text = await response.text();
        logger.error('[Fetch] Response error:', text);
        return {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: new Headers(response.headers),
          arrayBuffer: async () => {
            throw new Error(`HTTP error: ${response.status} - ${text}`);
          }
        };
      }
      
      const buffer = await response.arrayBuffer();
      logger.debug('[Fetch] Response buffer size:', buffer.byteLength);
      
      // Return a properly formatted response object
      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: new Headers(response.headers),
        arrayBuffer: () => Promise.resolve(buffer)
      };
    } catch (error) {
      logger.error('[Fetch] Fetch error:', error);
      throw error;
    }
  };
};

// Create agent with debugging
async function createDebugAgent(identity) {
  logger.debug('[Agent] Creating debug agent');
  
  try {
    // Create agent with debug configuration
    const agent = new HttpAgent({
      host: IC_HOST,
      identity,
      fetch: createDebugFetch(),
      verifyQuerySignatures: false,
      fetchRootKey: false,
      disableHandshake: true
    });
    
    // Skip root key fetching for mainnet
    logger.debug('[Agent] Debug agent created');
    
    return agent;
  } catch (error) {
    logger.error('[Agent] Failed to create debug agent:', error);
    throw error;
  }
}

// Make a direct call to the canister
async function makeDirectCall(identity) {
  try {
    const agent = await createDebugAgent(identity);
    
    // Create empty request
    const requestBuffer = new Uint8Array();
    
    logger.debug('[Call] Making direct call to getProfile');
    const responseBuffer = await agent.call(
      Principal.fromText(CONSUMER_CANISTER_ID),
      'getProfile',
      requestBuffer
    );
    
    logger.debug('[Call] Response received, size:', responseBuffer.byteLength);
    
    // Decode response
    const result = IDL.decode([Result], responseBuffer)[0];
    logger.debug('[Call] Decoded result:', result);
    
    return result;
  } catch (error) {
    logger.error('[Call] Direct call failed:', error);
    throw error;
  }
}

// Export debug functions
window.debugAgent = {
  createDebugAgent,
  makeDirectCall
};

// Log that the debug script is loaded
logger.info('[Debug] IC Agent debug script loaded');
