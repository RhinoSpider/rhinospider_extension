// Dependencies for IC agent
import { Actor, HttpAgent } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';
import { idlFactory } from './declarations/consumer/index.js';

// Export to window
window.dfx = {
    Actor,
    HttpAgent,
    AuthClient
};

window.CONSUMER_CANISTER_ID = import.meta.env.VITE_CONSUMER_CANISTER_ID;
window.idlFactory = idlFactory;
