#!/usr/bin/env node

const { Actor, HttpAgent } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');
const { Ed25519KeyIdentity } = require('@dfinity/identity');

// Topic data
const topics = [
  {
    name: "DePIN Infrastructure News",
    description: "News and updates about decentralized physical infrastructure networks, including helium, filecoin, render network, and new DePIN projects",
    searchQueries: [
      "DePIN infrastructure blockchain",
      "decentralized physical infrastructure network",
      "helium network news",
      "filecoin storage network",
      "render network GPU",
      "DePIN projects 2024"
    ],
    preferredDomains: ["coindesk.com", "cryptoslate.com", "theblock.co", "decrypt.co"],
    excludeDomains: [],
    requiredKeywords: ["DePIN", "infrastructure", "network"],
    excludeKeywords: ["scam", "hack", "rug pull"],
    contentSelectors: ["article", "main", ".content", "#content"],
    titleSelectors: ["h1", "title", ".title"],
    excludeSelectors: ["nav", "footer", "header", ".sidebar", ".ads"],
    minContentLength: 200,
    maxContentLength: 50000,
    maxUrlsPerBatch: 15,
    scrapingInterval: 3600,
    priority: 8
  },
  {
    name: "AI Agents Development",
    description: "Latest developments in AI agents, autonomous systems, LangChain, AutoGPT, and multi-agent frameworks",
    searchQueries: [
      "AI agents development",
      "LangChain tutorial",
      "AutoGPT updates",
      "multi-agent systems",
      "AI agent frameworks",
      "autonomous AI agents"
    ],
    preferredDomains: ["arxiv.org", "github.com", "medium.com", "towards datascience.com"],
    excludeDomains: [],
    requiredKeywords: ["AI", "agent"],
    excludeKeywords: ["crypto", "NFT", "token"],
    contentSelectors: ["article", "main", ".post-content", "#readme"],
    titleSelectors: ["h1", ".article-title"],
    excludeSelectors: ["nav", "footer", ".comments"],
    minContentLength: 300,
    maxContentLength: 50000,
    maxUrlsPerBatch: 12,
    scrapingInterval: 3600,
    priority: 7
  },
  {
    name: "Web3 Security Exploits",
    description: "Security incidents, smart contract exploits, and vulnerability reports in Web3 ecosystem",
    searchQueries: [
      "Web3 security exploit",
      "smart contract hack",
      "DeFi protocol attack",
      "blockchain vulnerability",
      "crypto security incident"
    ],
    preferredDomains: ["rekt.news", "certik.com", "slowmist.com", "peckshield.com"],
    excludeDomains: [],
    requiredKeywords: ["security", "exploit"],
    excludeKeywords: [],
    contentSelectors: ["article", ".post-content", "main"],
    titleSelectors: ["h1", ".post-title"],
    excludeSelectors: ["nav", "footer", ".sidebar"],
    minContentLength: 500,
    maxContentLength: 50000,
    maxUrlsPerBatch: 10,
    scrapingInterval: 1800,
    priority: 9
  },
  {
    name: "Decentralized Data Storage",
    description: "Updates on decentralized storage solutions like IPFS, Arweave, Storj, and related technologies",
    searchQueries: [
      "IPFS updates",
      "Arweave permanent storage",
      "Storj decentralized storage",
      "decentralized data storage",
      "Web3 storage solutions"
    ],
    preferredDomains: ["ipfs.tech", "arweave.org", "storj.io", "github.com"],
    excludeDomains: [],
    requiredKeywords: ["storage", "decentralized"],
    excludeKeywords: [],
    contentSelectors: ["article", "main", ".content"],
    titleSelectors: ["h1", "title"],
    excludeSelectors: ["nav", "footer"],
    minContentLength: 200,
    maxContentLength: 50000,
    maxUrlsPerBatch: 10,
    scrapingInterval: 7200,
    priority: 6
  },
  {
    name: "Blockchain Interoperability",
    description: "Cross-chain bridges, interoperability protocols, and multi-chain solutions",
    searchQueries: [
      "blockchain interoperability",
      "cross-chain bridge",
      "Polkadot parachain",
      "Cosmos IBC",
      "LayerZero protocol"
    ],
    preferredDomains: ["polkadot.network", "cosmos.network", "layerzero.network"],
    excludeDomains: [],
    requiredKeywords: ["blockchain", "interoperability"],
    excludeKeywords: ["scam", "hack"],
    contentSelectors: ["article", "main", ".blog-content"],
    titleSelectors: ["h1", ".title"],
    excludeSelectors: ["nav", "footer", ".ads"],
    minContentLength: 300,
    maxContentLength: 50000,
    maxUrlsPerBatch: 10,
    scrapingInterval: 3600,
    priority: 7
  }
];

// Admin canister interface
const idlFactory = ({ IDL }) => {
  const ScrapingTopic = IDL.Record({
    id: IDL.Text,
    name: IDL.Text,
    description: IDL.Text,
    status: IDL.Text,
    searchQueries: IDL.Vec(IDL.Text),
    preferredDomains: IDL.Opt(IDL.Vec(IDL.Text)),
    excludeDomains: IDL.Opt(IDL.Vec(IDL.Text)),
    requiredKeywords: IDL.Vec(IDL.Text),
    excludeKeywords: IDL.Opt(IDL.Vec(IDL.Text)),
    contentSelectors: IDL.Vec(IDL.Text),
    titleSelectors: IDL.Opt(IDL.Vec(IDL.Text)),
    excludeSelectors: IDL.Vec(IDL.Text),
    minContentLength: IDL.Nat,
    maxContentLength: IDL.Nat,
    maxUrlsPerBatch: IDL.Nat,
    scrapingInterval: IDL.Nat,
    priority: IDL.Nat,
    createdAt: IDL.Nat,
    lastScraped: IDL.Nat,
    totalUrlsScraped: IDL.Nat,
  });

  return IDL.Service({
    createTopic: IDL.Func([ScrapingTopic], [IDL.Variant({ 
      Ok: IDL.Text, 
      Err: IDL.Text 
    })], []),
  });
};

async function createTopics() {
  try {
    // Create agent
    const agent = new HttpAgent({
      host: 'https://ic0.app'
    });

    // Create actor
    const canisterId = 'sxsvc-aqaaa-aaaaj-az4ta-cai';
    const actor = Actor.createActor(idlFactory, {
      agent,
      canisterId,
    });

    console.log('🚀 Creating topics in admin backend...\n');

    for (const topicData of topics) {
      const topic = {
        id: 'topic_' + Math.random().toString(36).substr(2, 9),
        name: topicData.name,
        description: topicData.description,
        status: 'active',
        searchQueries: topicData.searchQueries,
        preferredDomains: topicData.preferredDomains.length > 0 ? [topicData.preferredDomains] : [],
        excludeDomains: topicData.excludeDomains.length > 0 ? [topicData.excludeDomains] : [],
        requiredKeywords: topicData.requiredKeywords,
        excludeKeywords: topicData.excludeKeywords.length > 0 ? [topicData.excludeKeywords] : [],
        contentSelectors: topicData.contentSelectors,
        titleSelectors: topicData.titleSelectors.length > 0 ? [topicData.titleSelectors] : [],
        excludeSelectors: topicData.excludeSelectors,
        minContentLength: BigInt(topicData.minContentLength),
        maxContentLength: BigInt(topicData.maxContentLength),
        maxUrlsPerBatch: BigInt(topicData.maxUrlsPerBatch),
        scrapingInterval: BigInt(topicData.scrapingInterval),
        priority: BigInt(topicData.priority),
        createdAt: BigInt(Date.now()),
        lastScraped: BigInt(0),
        totalUrlsScraped: BigInt(0),
      };

      console.log(`Creating topic: ${topicData.name}`);
      const result = await actor.createTopic(topic);
      
      if ('Ok' in result) {
        console.log(`✅ Created: ${topicData.name}`);
      } else {
        console.log(`❌ Failed to create ${topicData.name}: ${result.Err}`);
      }
    }

    console.log('\n✅ All topics created successfully!');
    console.log('You can now test the extension with these topics.');

  } catch (error) {
    console.error('Error creating topics:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  createTopics();
}

module.exports = { topics, createTopics };