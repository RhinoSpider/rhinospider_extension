import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

// Admin canister IDL
const idlFactory = ({ IDL }) => {
  const CreateTopicRequest = IDL.Record({
    id: IDL.Text,
    name: IDL.Text,
    description: IDL.Text,
    status: IDL.Text,
    searchQueries: IDL.Vec(IDL.Text),
    preferredDomains: IDL.Vec(IDL.Text),
    excludeDomains: IDL.Vec(IDL.Text),
    requiredKeywords: IDL.Vec(IDL.Text),
    excludeKeywords: IDL.Vec(IDL.Text),
    contentSelectors: IDL.Vec(IDL.Text),
    titleSelectors: IDL.Vec(IDL.Text),
    excludeSelectors: IDL.Vec(IDL.Text),
    minContentLength: IDL.Nat,
    maxContentLength: IDL.Nat,
    maxUrlsPerBatch: IDL.Nat,
    scrapingInterval: IDL.Nat,
    priority: IDL.Nat,
    createdAt: IDL.Int,
    lastScraped: IDL.Int,
    totalUrlsScraped: IDL.Nat
  });
  
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
    createdAt: IDL.Int,
    lastScraped: IDL.Int,
    totalUrlsScraped: IDL.Nat
  });
  
  const Result = IDL.Variant({
    ok: ScrapingTopic,
    err: IDL.Text
  });
  
  return IDL.Service({
    createTopic: IDL.Func([CreateTopicRequest], [Result], [])
  });
};

async function createTestTopic() {
  try {
    const agent = new HttpAgent({ host: 'https://icp0.io' });
    
    const adminCanisterId = 'wvset-niaaa-aaaao-a4osa-cai';
    const actor = Actor.createActor(idlFactory, {
      agent,
      canisterId: Principal.fromText(adminCanisterId)
    });
    
    const topic = {
      id: 'depin-infrastructure-news',
      name: 'DePIN Infrastructure News',
      description: 'Track latest developments in Decentralized Physical Infrastructure Networks',
      status: 'active',
      searchQueries: [
        'DePIN blockchain infrastructure',
        'decentralized physical infrastructure networks',
        'Helium network IoT',
        'Filecoin storage mining'
      ],
      preferredDomains: ['coindesk.com', 'decrypt.co', 'theblock.co'],
      excludeDomains: ['reddit.com', 'twitter.com'],
      requiredKeywords: ['DePIN', 'infrastructure', 'decentralized'],
      excludeKeywords: ['scam', 'rug pull', 'hack'],
      contentSelectors: ['article', 'main', '.content', '.post-content'],
      titleSelectors: ['h1', '.article-title', '.post-title'],
      excludeSelectors: ['nav', 'footer', '.comments', '.ads', '.sidebar'],
      minContentLength: BigInt(200),
      maxContentLength: BigInt(50000),
      maxUrlsPerBatch: BigInt(10),
      scrapingInterval: BigInt(1800),
      priority: BigInt(8),
      createdAt: BigInt(Date.now()),
      lastScraped: BigInt(0),
      totalUrlsScraped: BigInt(0)
    };
    
    console.log('Creating topic:', topic.name);
    const result = await actor.createTopic(topic);
    
    if ('ok' in result) {
      console.log('Topic created successfully!');
      console.log('Topic ID:', result.ok.id);
      console.log('Status:', result.ok.status);
    } else {
      console.log('Error creating topic:', result.err);
    }
  } catch (error) {
    console.error('Failed to create topic:', error);
  }
}

createTestTopic();