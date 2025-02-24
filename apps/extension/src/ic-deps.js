import { Actor, HttpAgent } from '@dfinity/agent';
import { DelegationIdentity } from '@dfinity/identity';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { idlFactory } from './declarations/consumer/consumer.did.js';

// Export to window
window.dfx = {
    Actor,
    HttpAgent,
    DelegationIdentity,
    Secp256k1KeyIdentity
};

window.CONSUMER_CANISTER_ID = import.meta.env.VITE_CONSUMER_CANISTER_ID;
window.idlFactory = idlFactory;
