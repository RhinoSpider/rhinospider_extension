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
const STORAGE_CANISTER_ID = 'bkyz2-fmaaa-aaaaa-qaaaq-cai';
const ADMIN_CANISTER_ID = 'br5f7-7uaaa-aaaaa-qaaca-cai';

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

// Storage canister interface
const storageInterface = ({ IDL }) => {
    const ScrapedContent = IDL.Record({
        'id': IDL.Text,
        'source': IDL.Text,
        'url': IDL.Text,
        'title': IDL.Text,
        'author': IDL.Text,
        'publishDate': IDL.Int,
        'updateDate': IDL.Int,
        'content': IDL.Text,
        'summary': IDL.Text,
        'topics': IDL.Vec(IDL.Text),
        'engagement': IDL.Record({
            'stars': IDL.Opt(IDL.Nat),
            'reactions': IDL.Opt(IDL.Nat),
            'claps': IDL.Opt(IDL.Nat),
            'comments': IDL.Nat,
        }),
        'metadata': IDL.Record({
            'readingTime': IDL.Opt(IDL.Nat),
            'language': IDL.Opt(IDL.Text),
            'license': IDL.Opt(IDL.Text),
            'techStack': IDL.Vec(IDL.Text),
        }),
        'aiAnalysis': IDL.Record({
            'relevanceScore': IDL.Nat,
            'keyPoints': IDL.Vec(IDL.Text),
            'codeSnippets': IDL.Vec(IDL.Record({
                'language': IDL.Text,
                'code': IDL.Text,
            })),
        }),
    });

    return IDL.Service({
        'getContentByTopic': IDL.Func(
            [IDL.Text, IDL.Nat],
            [IDL.Vec(ScrapedContent)],
            ['query'],
        ),
    });
};

// Create actor instances
const storageActor = Actor.createActor(storageInterface, {
    agent,
    canisterId: STORAGE_CANISTER_ID,
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

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
