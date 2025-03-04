const { Actor, HttpAgent } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');
const fetch = require('node-fetch');

// Replace with your identity principal if needed
const identityPrincipal = null;

// Admin canister ID
const canisterId = '444wf-gyaaa-aaaaj-az5sq-cai';

// Create an agent
const agent = new HttpAgent({
  host: 'https://icp0.io',
  fetch,
  identity: identityPrincipal
});

// Interface definition for the admin canister
const idlFactory = ({ IDL }) => {
  const ScrapingField = IDL.Record({
    'aiPrompt': IDL.Opt(IDL.Text),
    'fieldType': IDL.Text,
    'name': IDL.Text,
    'required': IDL.Bool,
  });
  const ExtractionRules = IDL.Record({
    'customPrompt': IDL.Opt(IDL.Text),
    'fields': IDL.Vec(ScrapingField),
  });
  const Result = IDL.Variant({
    'err': IDL.Text,
    'ok': IDL.Record({
      'id': IDL.Text,
      'name': IDL.Text,
      'description': IDL.Text,
      'urlPatterns': IDL.Vec(IDL.Text),
      'status': IDL.Text,
      'siteTypeClassification': IDL.Text,
      // Add other fields as needed
    }),
  });

  return IDL.Service({
    'getTopics': IDL.Func([], [IDL.Vec(IDL.Record({
      'id': IDL.Text,
      'name': IDL.Text,
      'description': IDL.Text,
      'urlPatterns': IDL.Vec(IDL.Text),
      'status': IDL.Text,
      'siteTypeClassification': IDL.Text,
    }))], []),
    'updateTopic': IDL.Func(
      [
        IDL.Text,
        IDL.Record({
          'name': IDL.Opt(IDL.Text),
          'description': IDL.Opt(IDL.Text),
          'urlPatterns': IDL.Opt(IDL.Vec(IDL.Text)),
          'status': IDL.Opt(IDL.Text),
          'extractionRules': IDL.Opt(ExtractionRules),
          'siteTypeClassification': IDL.Opt(IDL.Text),
        }),
      ],
      [Result],
      [],
    ),
  });
};

async function main() {
  // Create an actor
  const actor = Actor.createActor(idlFactory, {
    agent,
    canisterId,
  });

  // Topic ID to update - use a real topic ID from your system
  const topicId = 'test-topic-1';

  // First try to get the topic to see its current state
  try {
    console.log('Fetching topics to find the one with ID:', topicId);
    const getTopicsResult = await actor.getTopics();
    if ('err' in getTopicsResult) {
      throw new Error(`Error getting topics: ${getTopicsResult.err}`);
    }
    
    const topics = getTopicsResult;
    console.log('Found topics:', topics.map(t => ({ id: t.id, name: t.name })));
    
    const topic = topics.find(t => t.id === topicId);
    if (!topic) {
      console.log('Topic not found, will create a new one with this ID');
    } else {
      console.log('Found topic:', JSON.stringify(topic, null, 2));
      console.log('Current siteTypeClassification:', topic.siteTypeClassification);
    }
  } catch (error) {
    console.error('Error fetching topics:', error);
  }

  // Update request with different variations of siteTypeClassification
  const updateRequest = {
    name: ['Test Topic Updated'],
    description: ['Updated description'],
    urlPatterns: [['https://example.com/*']],
    status: ['active'],
    extractionRules: [{
      fields: [{
        name: 'title',
        fieldType: 'text',
        required: true,
        aiPrompt: ['Extract the title']
      }],
      customPrompt: ['Custom prompt']
    }],
    // Try with a simple string value in an array
    siteTypeClassification: ['news']
  };

  try {
    console.log('Sending update request:', JSON.stringify(updateRequest, null, 2));
    const result = await actor.updateTopic(topicId, updateRequest);
    console.log('Update result:', JSON.stringify(result, null, 2));
    
    if ('err' in result) {
      console.error('Error in update response:', result.err);
    } else {
      console.log('Successfully updated topic');
      console.log('New siteTypeClassification:', result.ok.siteTypeClassification);
    }
  } catch (error) {
    console.error('Error updating topic:', error);
    console.error('Error details:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

main().catch(console.error);
