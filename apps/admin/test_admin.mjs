import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

// Admin canister IDL
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
    createdAt: IDL.Int,
    lastScraped: IDL.Int,
    totalUrlsScraped: IDL.Nat
  });
  
  const Result = IDL.Variant({
    ok: IDL.Vec(ScrapingTopic),
    err: IDL.Text
  });
  
  return IDL.Service({
    getTopics: IDL.Func([], [Result], ['query'])
  });
};

async function testAdmin() {
  try {
    const agent = new HttpAgent({ host: 'https://icp0.io' });
    
    const adminCanisterId = 'wvset-niaaa-aaaao-a4osa-cai'; // New backend canister
    const actor = Actor.createActor(idlFactory, {
      agent,
      canisterId: Principal.fromText(adminCanisterId)
    });
    
    console.log('Fetching topics from admin canister...');
    const result = await actor.getTopics();
    
    if ('ok' in result) {
      console.log('Found ' + result.ok.length + ' topics:');
      if (result.ok.length === 0) {
        console.log('No topics created yet. Please create topics via the admin dashboard.');
      } else {
        result.ok.forEach(topic => {
          console.log('\n- ' + topic.name + ' (' + topic.status + ')');
          console.log('  Search queries: ' + topic.searchQueries.join(', '));
          console.log('  Required keywords: ' + topic.requiredKeywords.join(', '));
        });
      }
    } else {
      console.log('Error:', result.err);
    }
  } catch (error) {
    console.error('Failed to fetch topics:', error);
  }
}

testAdmin();