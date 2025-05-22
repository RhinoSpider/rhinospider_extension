const adminIdlFactory = ({ IDL }) => {
  const UserRole = IDL.Variant({
    'Admin': IDL.Null,
    'SuperAdmin': IDL.Null,
    'Operator': IDL.Null,
  });

  const Time = IDL.Int;

  const User = IDL.Record({
    'principal': IDL.Principal,
    'role': UserRole,
    'addedBy': IDL.Principal,
    'addedAt': Time,
  });

  const ScrapingField = IDL.Record({
    'name': IDL.Text,
    'fieldType': IDL.Text,
    'required': IDL.Bool,
    'aiPrompt': IDL.Opt(IDL.Text),
  });

  const ExtractionRules = IDL.Record({
    'fields': IDL.Vec(ScrapingField),
    'customPrompt': IDL.Opt(IDL.Text),
  });

  const ContentIdentifiers = IDL.Record({
    'selectors': IDL.Vec(IDL.Text),
    'keywords': IDL.Vec(IDL.Text),
  });

  const CostLimits = IDL.Record({
    'maxDailyCost': IDL.Float64,
    'maxMonthlyCost': IDL.Float64,
    'maxConcurrent': IDL.Nat,
  });

  const AIConfig = IDL.Record({
    'apiKey': IDL.Text,
    'model': IDL.Text,
    'costLimits': CostLimits,
  });

  const ActiveHours = IDL.Record({
    'start': IDL.Nat,
    'end': IDL.Nat,
  });

  const ScrapingTopic = IDL.Record({
    'id': IDL.Text,
    'name': IDL.Text,
    'description': IDL.Text,
    'status': IDL.Text,
    'urlPatterns': IDL.Vec(IDL.Text),
    'extractionRules': ExtractionRules,
    'siteTypeClassification': IDL.Text,
    'urlGenerationStrategy': IDL.Text,
    'articleUrlPatterns': IDL.Opt(IDL.Vec(IDL.Text)),
    'contentIdentifiers': IDL.Opt(ContentIdentifiers),
    'scrapingInterval': IDL.Nat,
    'maxRetries': IDL.Nat,
    'activeHours': ActiveHours,
    'createdAt': IDL.Int,
    'lastScraped': IDL.Int,
    'excludePatterns': IDL.Opt(IDL.Vec(IDL.Text)),
    'paginationPatterns': IDL.Opt(IDL.Vec(IDL.Text)),
    'aiConfig': AIConfig,
  });

  const CreateTopicRequest = IDL.Record({
    'id': IDL.Text,
    'name': IDL.Text,
    'description': IDL.Text,
    'urlPatterns': IDL.Vec(IDL.Text),
    'status': IDL.Text,
    'extractionRules': ExtractionRules,
    'siteTypeClassification': IDL.Text,
    'urlGenerationStrategy': IDL.Text,
    'articleUrlPatterns': IDL.Opt(IDL.Vec(IDL.Text)),
    'contentIdentifiers': IDL.Opt(ContentIdentifiers),
    'scrapingInterval': IDL.Nat,
    'maxRetries': IDL.Nat,
    'activeHours': ActiveHours,
    'excludePatterns': IDL.Opt(IDL.Vec(IDL.Text)),
    'paginationPatterns': IDL.Opt(IDL.Vec(IDL.Text)),
    'aiConfig': AIConfig,
  });

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

  const Result = IDL.Variant({
    'ok': ScrapingTopic,
    'err': IDL.Text,
  });

  const Result_1 = IDL.Variant({
    'ok': IDL.Text,
    'err': IDL.Text,
  });

  const Result_2 = IDL.Variant({
    'ok': AIConfig,
    'err': IDL.Text,
  });

  const Result_3 = IDL.Variant({
    'ok': IDL.Null,
    'err': IDL.Text,
  });

  const Result_4 = IDL.Variant({
    'ok': IDL.Vec(User),
    'err': IDL.Text,
  });

  const Result_5 = IDL.Variant({
    'ok': IDL.Vec(ScrapingTopic),
    'err': IDL.Text,
  });

  const Result_6 = IDL.Variant({
    'ok': IDL.Vec(ScrapedData),
    'err': IDL.Text,
  });

  return IDL.Service({
    'add_user': IDL.Func([IDL.Principal, UserRole], [Result_3], []),
    'createTopic': IDL.Func([CreateTopicRequest], [Result], []),
    'deleteTopic': IDL.Func([IDL.Text], [Result_3], []),
    'getAIConfig': IDL.Func([], [Result_2], []),
    'getScrapedData': IDL.Func([IDL.Vec(IDL.Text)], [Result_6], []),
    'getTopics': IDL.Func([], [Result_5], ['query']),
    'getTopics_with_caller': IDL.Func([IDL.Principal], [Result_5], []),
    'get_users': IDL.Func([], [Result_4], []),
    'remove_user': IDL.Func([IDL.Principal], [Result_3], []),
    'setTopicActive': IDL.Func([IDL.Text, IDL.Bool], [Result_3], []),
    'testExtraction': IDL.Func([
      IDL.Record({
        'extraction_rules': ExtractionRules,
        'url': IDL.Text,
      })
    ], [Result_1], []),
    'updateAIConfig': IDL.Func([AIConfig], [Result_2], []),
    'updateLastScraped': IDL.Func([IDL.Text, IDL.Int], [Result_1], []),
    'updateTopic': IDL.Func([IDL.Text, IDL.Record({
      'name': IDL.Opt(IDL.Text),
      'description': IDL.Opt(IDL.Text),
      'urlPatterns': IDL.Opt(IDL.Vec(IDL.Text)),
      'status': IDL.Opt(IDL.Text),
      'extractionRules': IDL.Opt(ExtractionRules),
      'siteTypeClassification': IDL.Opt(IDL.Text),
      'urlGenerationStrategy': IDL.Opt(IDL.Text),
      'articleUrlPatterns': IDL.Opt(IDL.Vec(IDL.Text)),
      'contentIdentifiers': IDL.Opt(ContentIdentifiers),
      'excludePatterns': IDL.Opt(IDL.Vec(IDL.Text)),
      'paginationPatterns': IDL.Opt(IDL.Vec(IDL.Text)),
    })], [Result], []),
  });
};

module.exports = adminIdlFactory;
