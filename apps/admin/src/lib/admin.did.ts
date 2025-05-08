// This is a simplified IDL factory for the admin canister
export const idlFactory = ({ IDL }: any) => {
  // Define the ScrapedData record structure
  const ScrapedData = IDL.Record({
    'id': IDL.Opt(IDL.Text),
    'url': IDL.Opt(IDL.Text),
    'topic': IDL.Opt(IDL.Text),
    'content': IDL.Opt(IDL.Text),
    'source': IDL.Opt(IDL.Text),
    'timestamp': IDL.Opt(IDL.Nat64),
    'client_id': IDL.Opt(IDL.Text),
    'status': IDL.Opt(IDL.Text),
    'scraping_time': IDL.Opt(IDL.Nat64),
    'topicId': IDL.Opt(IDL.Text),
  });
  
  // Define the Result variant
  const Result = IDL.Variant({
    'ok': IDL.Vec(ScrapedData),
    'err': IDL.Text
  });
  
  // Define the Topic record structure
  const Topic = IDL.Record({
    'id': IDL.Text,
    'name': IDL.Text,
    'description': IDL.Text,
    'urlPatterns': IDL.Vec(IDL.Text),
    'status': IDL.Text
  });
  
  // Define the TopicResult variant
  const TopicResult = IDL.Variant({
    'ok': IDL.Vec(Topic),
    'err': IDL.Text
  });
  
  // Define the AIConfig record structure
  const AIConfig = IDL.Record({
    'apiKey': IDL.Text,
    'model': IDL.Text,
    'costLimits': IDL.Record({
      'maxDailyCost': IDL.Float64,
      'maxMonthlyCost': IDL.Float64,
      'maxConcurrent': IDL.Nat8
    }),
    'temperature': IDL.Opt(IDL.Float64),
    'maxTokens': IDL.Opt(IDL.Nat16)
  });
  
  // Define the AIConfigResult variant
  const AIConfigResult = IDL.Variant({
    'ok': AIConfig,
    'err': IDL.Text
  });
  
  // Define the service interface
  return IDL.Service({
    'getScrapedData': IDL.Func([IDL.Vec(IDL.Text)], [Result], ['query']),
    'getTopics': IDL.Func([], [TopicResult], ['query']),
    'getAIConfig': IDL.Func([], [AIConfigResult], ['query']),
    'updateAIConfig': IDL.Func([AIConfig], [AIConfigResult], [])
  });
};

// Init function (not used but required by the IDL format)
export const init = () => { return []; };
