const express = require('express');
const cors = require('cors');
const { HttpAgent, Actor } = require('@dfinity/agent');
const { IDL } = require('@dfinity/candid');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

// Handle BigInt serialization
const JSONBig = {
    parse: JSON.parse,
    stringify: (obj) => JSON.stringify(obj, (_, value) =>
        typeof value === 'bigint'
            ? value.toString()
            : value
    )
};

// Local canister IDs - these should match your dfx.json
const STORAGE_CANISTER_ID = process.env.STORAGE_CANISTER_ID || 'bkyz2-fmaaa-aaaaa-qaaaq-cai';
const ADMIN_CANISTER_ID = process.env.ADMIN_CANISTER_ID || 'br5f7-7uaaa-aaaaa-qaaca-cai';

// Import the admin canister interface
const adminIdlFactory = require('../../../src/declarations/admin/admin.did.js').idlFactory;

// Create an agent for local development
const agent = new HttpAgent({
    host: 'http://localhost:64012',
    fetch
});

// In local development, we need to call this method
agent.fetchRootKey().catch(err => {
    console.warn("Unable to fetch root key. Check to ensure that your local replica is running");
    console.error(err);
});

// Create actor instances
const storageActor = Actor.createActor(storageInterface, {
    agent,
    canisterId: STORAGE_CANISTER_ID,
});

const adminActor = Actor.createActor(adminIdlFactory, {
    agent,
    canisterId: ADMIN_CANISTER_ID,
});

// API Routes
app.get('/api/content/topic/:topic', async (req, res) => {
    try {
        const { topic } = req.params;
        const limit = parseInt(req.query.limit) || 10;
        
        const content = await storageActor.getContentByTopic(topic, limit);
        res.send(JSONBig.stringify(content));
    } catch (error) {
        console.error('Error fetching content:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/topics', async (req, res) => {
    try {
        const { nodeCharacteristics } = req.body;
        console.log('Received request for /api/topics with nodeCharacteristics:', nodeCharacteristics);

        const result = await adminActor.getAssignedTopics(nodeCharacteristics);

        if ('ok' in result) {
            res.json(result.ok);
        } else {
            console.error('Error from adminActor.getAssignedTopics:', result.err);
            res.status(500).json({ error: result.err });
        }
    } catch (error) {
        console.error('Error in /api/topics:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
