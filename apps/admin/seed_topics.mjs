import { HttpAgent, Actor, AnonymousIdentity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

// Admin canister IDL - updated to match the backend exactly
const idlFactory = ({ IDL }) => {
  const CreateTopicRequest = IDL.Record({
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
  
  const TopicsResult = IDL.Variant({
    ok: IDL.Vec(ScrapingTopic),
    err: IDL.Text
  });
  
  return IDL.Service({
    createTopic: IDL.Func([CreateTopicRequest], [Result], []),
    getTopics: IDL.Func([], [TopicsResult], ['query'])
  });
};

// Sample topics for different categories
const sampleTopics = [
  {
    id: 'crypto-defi-news',
    name: 'Crypto & DeFi News',
    description: 'Latest news and analysis on cryptocurrency and decentralized finance',
    searchQueries: [
      'cryptocurrency news',
      'DeFi protocols',
      'Bitcoin Ethereum price',
      'blockchain technology',
      'web3 developments'
    ],
    preferredDomains: [
      'coindesk.com', 
      'cointelegraph.com', 
      'decrypt.co',
      'theblock.co',
      'defipulse.com'
    ],
    requiredKeywords: ['crypto', 'blockchain', 'defi', 'bitcoin', 'ethereum'],
    excludeKeywords: ['scam', 'ponzi', 'fake'],
    priority: 9
  },
  {
    id: 'ai-ml-research',
    name: 'AI & Machine Learning Research',
    description: 'Cutting-edge research papers and developments in artificial intelligence',
    searchQueries: [
      'artificial intelligence research',
      'machine learning papers',
      'deep learning algorithms',
      'AI breakthrough',
      'neural network innovations'
    ],
    preferredDomains: [
      'arxiv.org',
      'nature.com',
      'science.org',
      'openai.com',
      'deepmind.com'
    ],
    requiredKeywords: ['AI', 'machine learning', 'neural', 'algorithm'],
    excludeKeywords: ['clickbait', 'sensational'],
    priority: 8
  },
  {
    id: 'tech-startup-news',
    name: 'Tech Startup News',
    description: 'Latest developments in technology startups and venture capital',
    searchQueries: [
      'tech startup funding',
      'venture capital deals',
      'Y Combinator demo day',
      'IPO technology companies',
      'unicorn startups'
    ],
    preferredDomains: [
      'techcrunch.com',
      'venturebeat.com',
      'crunchbase.com',
      'theinformation.com',
      'recode.net'
    ],
    requiredKeywords: ['startup', 'funding', 'venture', 'technology'],
    excludeKeywords: ['spam', 'advertisement'],
    priority: 7
  },
  {
    id: 'sustainability-climate',
    name: 'Sustainability & Climate',
    description: 'Environmental technology, renewable energy, and climate change solutions',
    searchQueries: [
      'renewable energy technology',
      'climate change solutions',
      'sustainable technology',
      'carbon capture',
      'green energy innovations'
    ],
    preferredDomains: [
      'greentechmedia.com',
      'cleantechnica.com',
      'renewableenergyworld.com',
      'energy.gov',
      'iea.org'
    ],
    requiredKeywords: ['sustainability', 'climate', 'renewable', 'green', 'carbon'],
    excludeKeywords: ['politics', 'partisan'],
    priority: 6
  },
  {
    id: 'cybersecurity-privacy',
    name: 'Cybersecurity & Privacy',
    description: 'Information security, data privacy, and cybersecurity threat intelligence',
    searchQueries: [
      'cybersecurity threats',
      'data breach incidents',
      'privacy regulations',
      'zero-day vulnerabilities',
      'security research'
    ],
    preferredDomains: [
      'krebsonsecurity.com',
      'schneier.com',
      'threatpost.com',
      'darkreading.com',
      'securityweek.com'
    ],
    requiredKeywords: ['security', 'privacy', 'breach', 'vulnerability', 'threat'],
    excludeKeywords: ['fear-mongering', 'clickbait'],
    priority: 8
  }
];

async function createTopic(actor, topicData) {
  try {
    const topic = {
      id: topicData.id,
      name: topicData.name,
      description: topicData.description,
      status: 'active',
      searchQueries: topicData.searchQueries,
      preferredDomains: topicData.preferredDomains ? [topicData.preferredDomains] : [],
      excludeDomains: [],
      requiredKeywords: topicData.requiredKeywords || [],
      excludeKeywords: topicData.excludeKeywords ? [topicData.excludeKeywords] : [],
      contentSelectors: ['article', 'main', '.content', '.post-content', '.entry-content'],
      titleSelectors: [['h1', '.article-title', '.post-title', '.entry-title']],
      excludeSelectors: ['nav', 'footer', '.comments', '.ads', '.sidebar', '.related'],
      minContentLength: BigInt(200),
      maxContentLength: BigInt(50000),
      maxUrlsPerBatch: BigInt(10),
      scrapingInterval: BigInt(3600), // 1 hour
      priority: BigInt(topicData.priority || 5),
      createdAt: BigInt(Date.now() * 1_000_000), // Convert to nanoseconds
      lastScraped: BigInt(0),
      totalUrlsScraped: BigInt(0)
    };
    
    console.log(`Creating topic: ${topic.name}`);
    const result = await actor.createTopic(topic);
    
    if ('ok' in result) {
      console.log(`✅ Successfully created: ${result.ok.name}`);
      return true;
    } else {
      console.log(`❌ Error creating ${topic.name}:`, result.err);
      return false;
    }
  } catch (error) {
    console.error(`❌ Failed to create ${topicData.name}:`, error.message);
    return false;
  }
}

async function seedTopics() {
  try {
    console.log('🚀 Starting topic seeding process...\n');
    
    const agent = new HttpAgent({ 
      host: 'https://icp0.io',
      identity: new AnonymousIdentity()
    });
    
    const adminCanisterId = 'wvset-niaaa-aaaao-a4osa-cai';
    const actor = Actor.createActor(idlFactory, {
      agent,
      canisterId: Principal.fromText(adminCanisterId)
    });
    
    // Check existing topics first
    try {
      const existingResult = await actor.getTopics();
      if ('ok' in existingResult) {
        console.log(`📊 Found ${existingResult.ok.length} existing topics\n`);
      }
    } catch (error) {
      console.log('ℹ️  Could not fetch existing topics (this is okay for first run)\n');
    }
    
    let created = 0;
    let failed = 0;
    
    for (const topicData of sampleTopics) {
      const success = await createTopic(actor, topicData);
      if (success) {
        created++;
      } else {
        failed++;
      }
      
      // Small delay between creations
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n📈 Topic Seeding Summary:');
    console.log(`✅ Successfully created: ${created} topics`);
    if (failed > 0) {
      console.log(`❌ Failed to create: ${failed} topics`);
    }
    console.log('\n🎉 Topic seeding process completed!');
    
    // Verify by fetching topics again
    try {
      const finalResult = await actor.getTopics();
      if ('ok' in finalResult) {
        console.log(`\n📊 Total topics now available: ${finalResult.ok.length}`);
        finalResult.ok.forEach(topic => {
          console.log(`   - ${topic.name} (${topic.id})`);
        });
      }
    } catch (error) {
      console.log('\nℹ️  Could not verify final topic count');
    }
    
  } catch (error) {
    console.error('💥 Failed to seed topics:', error);
    process.exit(1);
  }
}

// Run the seeding process
seedTopics();