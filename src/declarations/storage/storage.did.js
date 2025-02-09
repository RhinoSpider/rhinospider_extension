export const idlFactory = ({ IDL }) => {
  const ExtractionField = IDL.Record({
    'name' : IDL.Text,
    'description' : IDL.Opt(IDL.Text),
    'example' : IDL.Opt(IDL.Text),
    'aiPrompt' : IDL.Text,
    'required' : IDL.Bool,
    'fieldType' : IDL.Text,
  });
  const ExtractionRules = IDL.Record({
    'fields' : IDL.Vec(ExtractionField),
    'customPrompt' : IDL.Opt(IDL.Text),
  });
  const ScrapingTopic = IDL.Record({
    'id' : IDL.Text,
    'name' : IDL.Text,
    'createdAt' : IDL.Int,
    'description' : IDL.Opt(IDL.Text),
    'updatedAt' : IDL.Int,
    'urlPatterns' : IDL.Vec(IDL.Text),
    'extractionRules' : IDL.Opt(ExtractionRules),
  });
  const Result = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  const CostLimits = IDL.Record({
    'maxConcurrent' : IDL.Nat,
    'dailyUSD' : IDL.Nat,
    'monthlyUSD' : IDL.Nat,
  });
  const AIConfig = IDL.Record({
    'model' : IDL.Text,
    'costLimits' : CostLimits,
    'apiKey' : IDL.Text,
  });
  const Result_5 = IDL.Variant({ 'ok' : AIConfig, 'err' : IDL.Text });
  const ScrapedData = IDL.Record({
    'id' : IDL.Text,
    'url' : IDL.Text,
    'topic' : IDL.Text,
    'content' : IDL.Text,
    'source' : IDL.Text,
    'timestamp' : IDL.Int,
    'client_id' : IDL.Principal,
  });
  const ScrapedContent = IDL.Record({
    'id' : IDL.Text,
    'url' : IDL.Text,
    'title' : IDL.Text,
    'content' : IDL.Text,
    'source' : IDL.Text,
    'metadata' : IDL.Record({
      'language' : IDL.Opt(IDL.Text),
      'license' : IDL.Opt(IDL.Text),
      'tech_stack' : IDL.Vec(IDL.Text),
      'reading_time' : IDL.Opt(IDL.Nat),
    }),
    'update_date' : IDL.Int,
    'author' : IDL.Text,
    'summary' : IDL.Text,
    'topics' : IDL.Vec(IDL.Text),
    'ai_analysis' : IDL.Record({
      'key_points' : IDL.Vec(IDL.Text),
      'code_snippets' : IDL.Vec(
        IDL.Record({ 'code' : IDL.Text, 'language' : IDL.Text })
      ),
      'relevance_score' : IDL.Nat,
    }),
    'engagement' : IDL.Record({
      'claps' : IDL.Opt(IDL.Nat),
      'stars' : IDL.Opt(IDL.Nat),
      'comments' : IDL.Nat,
      'reactions' : IDL.Opt(IDL.Nat),
    }),
    'publish_date' : IDL.Int,
  });
  const Result_4 = IDL.Variant({ 'ok' : ScrapedContent, 'err' : IDL.Text });
  const Result_3 = IDL.Variant({
    'ok' : IDL.Vec(ScrapedContent),
    'err' : IDL.Text,
  });
  const ScrapingField = IDL.Record({
    'field_type' : IDL.Text,
    'name' : IDL.Text,
    'description' : IDL.Opt(IDL.Text),
    'example' : IDL.Opt(IDL.Text),
    'ai_prompt' : IDL.Text,
    'selector_type' : IDL.Text,
    'selector' : IDL.Text,
    'required' : IDL.Bool,
  });
  const ExtractionRules__1 = IDL.Record({
    'custom_prompt' : IDL.Opt(IDL.Text),
    'fields' : IDL.Vec(ScrapingField),
  });
  const Request = IDL.Record({
    'id' : IDL.Text,
    'url' : IDL.Text,
    'content_id' : IDL.Text,
    'topic_id' : IDL.Text,
    'timestamp' : IDL.Int,
    'extraction_rules' : ExtractionRules__1,
  });
  const Result_2 = IDL.Variant({
    'ok' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    'err' : IDL.Text,
  });
  const Result_1 = IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text });
  const Storage = IDL.Service({
    'createTopic' : IDL.Func([ScrapingTopic], [Result], []),
    'deleteTopic' : IDL.Func([IDL.Text], [Result], []),
    'getAIConfig' : IDL.Func([], [Result_5], ['query']),
    'getBySource' : IDL.Func([IDL.Text], [IDL.Vec(ScrapedData)], ['query']),
    'getContent' : IDL.Func([IDL.Text], [Result_4], ['query']),
    'getContentBySource' : IDL.Func([IDL.Text], [Result_3], ['query']),
    'getContentByTopic' : IDL.Func([IDL.Text, IDL.Nat], [Result_3], ['query']),
    'getNextPendingUrl' : IDL.Func(
        [],
        [IDL.Opt(IDL.Record({ 'id' : IDL.Text, 'url' : IDL.Text }))],
        [],
      ),
    'getTopics' : IDL.Func([], [IDL.Vec(ScrapingTopic)], ['query']),
    'processWithAI' : IDL.Func([Request], [Result_2], []),
    'queueUrlForProcessing' : IDL.Func([IDL.Text, IDL.Text], [Result], []),
    'storeContent' : IDL.Func([ScrapedContent], [Result], []),
    'storeHtmlContent' : IDL.Func([IDL.Text, IDL.Text], [], []),
    'storeRequest' : IDL.Func([Request], [Result], []),
    'testExtractRules' : IDL.Func(
        [IDL.Text, ExtractionRules__1],
        [Result_1],
        [],
      ),
    'updateAIConfig' : IDL.Func([AIConfig], [Result], []),
    'updateTopic' : IDL.Func([ScrapingTopic], [Result], []),
  });
  return Storage;
};
export const init = ({ IDL }) => { return []; };
