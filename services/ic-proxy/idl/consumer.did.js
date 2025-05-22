const consumerIdlFactory = ({ IDL }) => {
  const ExtractionField = IDL.Record({
    'name' : IDL.Text,
    'fieldType' : IDL.Text,
    'required' : IDL.Bool,
    'aiPrompt' : IDL.Text,
  });

  const ExtractionRules = IDL.Record({
    'fields' : IDL.Vec(ExtractionField),
    'customPrompt' : IDL.Text,
  });

  const ScrapingTopic = IDL.Record({
    'id' : IDL.Text,
    'name' : IDL.Text,
    'description' : IDL.Text,
    'status' : IDL.Text,
    'urlPatterns' : IDL.Vec(IDL.Text),
    'urlGenerationStrategy' : IDL.Text,
    'extractionRules' : ExtractionRules,
    'createdAt' : IDL.Nat64,
  });

  const Result_1 = IDL.Variant({
    'ok' : ScrapingTopic,
    'err' : IDL.Text,
  });

  const Result_2 = IDL.Variant({
    'ok' : IDL.Vec(ScrapingTopic),
    'err' : IDL.Text,
  });

  const ExtractedField = IDL.Record({
    'name' : IDL.Text,
    'value' : IDL.Text,
  });

  const ScrapedData = IDL.Record({
    'id' : IDL.Text,
    'url' : IDL.Text,
    'topicId' : IDL.Text,
    'content' : IDL.Text,
    'extractedData' : IDL.Vec(ExtractedField),
    'status' : IDL.Text,
    'client_id' : IDL.Principal,
    'scraping_time' : IDL.Nat64,
    'created_at' : IDL.Nat64,
  });

  const Result_3 = IDL.Variant({
    'ok' : ScrapedData,
    'err' : IDL.Text,
  });

  return IDL.Service({
    'addTopic' : IDL.Func([ScrapingTopic], [Result_1], []),
    'getTopics' : IDL.Func([], [Result_2], ['query']),
    'getTopic' : IDL.Func([IDL.Text], [Result_1], ['query']),
    'submitScrapedData' : IDL.Func([ScrapedData], [Result_3], []),
    'getScrapedData' : IDL.Func([IDL.Text], [Result_3], ['query']),
    'getAllScrapedData' : IDL.Func([], [IDL.Vec(ScrapedData)], ['query']),
    'ping' : IDL.Func([], [IDL.Text], ['query']),
  });
};

module.exports = consumerIdlFactory;
