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

// Create an agent for local development
const agent = new HttpAgent({
    host: 'https://icp0.io', // Point to the public Internet Computer network
    fetch
});

// In local development, we need to call this method
agent.fetchRootKey().catch(err => {
    console.warn("Unable to fetch root key. Check to ensure that your local replica is running");
    console.error(err);
});

// Storage canister interface (updated to match SharedTypes.ScrapedData)
const storageInterface = ({ IDL }) => {
    const ScrapedData = IDL.Record({
        'id': IDL.Text,
        'url': IDL.Text,
        'topic': IDL.Text,
        'content': IDL.Text,
        'source': IDL.Text,
        'timestamp': IDL.Int,
        'client_id': IDL.Principal,
        'status': IDL.Text,
        'scraping_time': IDL.Int,
    });

    return IDL.Service({
        'getContentByTopic': IDL.Func(
            [IDL.Text, IDL.Nat],
            [IDL.Vec(ScrapedData)],
            ['query'],
        ),
    });
};

// Create actor instances
const storageActor = Actor.createActor(storageInterface, {
    agent,
    canisterId: STORAGE_CANISTER_ID,
});

// Admin actor will be initialized asynchronously before the server starts
let adminActor;

async function initializeAdminActor() {
    try {
        // Dynamic import for admin.did.js (ES Module)
        // This path must be absolute on the Digital Ocean droplet
        const module = await import('/root/rhinospider/src/declarations/admin/admin.did.js');
        const adminIdlFactory = module.idlFactory;
        adminActor = Actor.createActor(adminIdlFactory, {
            agent,
            canisterId: ADMIN_CANISTER_ID,
        });
        console.log("Admin actor initialized successfully.");
    } catch (err) {
        console.error("Failed to initialize admin actor:", err);
        // If a critical actor fails to initialize, it's better to exit and let PM2 restart
        process.exit(1);
    }
}

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

        // Ensure adminActor is initialized before calling its methods
        if (!adminActor) {
            console.error('Admin actor not initialized yet. Service unavailable.');
            return res.status(503).json({ error: 'Admin service not ready. Please try again shortly.' });
        }

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

async function startServer() {
    await initializeAdminActor(); // Ensure adminActor is ready before listening
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

startServer(); // Call the async function to start the server
