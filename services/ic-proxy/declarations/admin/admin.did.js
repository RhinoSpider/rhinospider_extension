const idlFactory = ({ IDL }) => {
  const ScrapingField = IDL.Record({
    'name': IDL.Text,
    'aiPrompt': IDL.Opt(IDL.Text),
    'required': IDL.Bool,
    'fieldType': IDL.Text,
  });

  const ExtractionRules = IDL.Record({
    'fields': IDL.Vec(ScrapingField),
    'customPrompt': IDL.Opt(IDL.Text),
  });

  const ContentIdentifiers = IDL.Record({
    'selectors': IDL.Vec(IDL.Text),
    'keywords': IDL.Vec(IDL.Text),
  });

  const ScrapingTopic = IDL.Record({
    'id': IDL.Text,
    'status': IDL.Text,
    'name': IDL.Text,
    'createdAt': IDL.Int,
    'description': IDL.Text,
    'urlGenerationStrategy': IDL.Text,
    'urlPatterns': IDL.Vec(IDL.Text),
    'articleUrlPatterns': IDL.Opt(IDL.Vec(IDL.Text)),
    'paginationPatterns': IDL.Opt(IDL.Vec(IDL.Text)),
    'excludePatterns': IDL.Opt(IDL.Vec(IDL.Text)),
    'contentIdentifiers': IDL.Opt(ContentIdentifiers),
    'extractionRules': ExtractionRules,
    'siteTypeClassification': IDL.Opt(IDL.Text),
  });

  const Result_5 = IDL.Variant({
    'ok': IDL.Vec(ScrapingTopic),
    'err': IDL.Text,
  });

  const CostLimits = IDL.Record({
    'maxConcurrent': IDL.Nat,
    'maxDailyCost': IDL.Float64,
    'maxMonthlyCost': IDL.Float64,
  });

  const AIConfig = IDL.Record({
    'model': IDL.Text,
    'costLimits': CostLimits,
    'apiKey': IDL.Text,
  });

  const Result_2 = IDL.Variant({
    'ok': AIConfig,
    'err': IDL.Text,
  });

  const Result_3 = IDL.Variant({
    'ok': IDL.Null,
    'err': IDL.Text,
  });

  const UserRole = IDL.Variant({
    'SuperAdmin': IDL.Null,
    'Admin': IDL.Null,
    'Operator': IDL.Null,
  });

  return IDL.Service({
    'getTopics': IDL.Func([], [Result_5], ['query']),
    'getTopics_with_caller': IDL.Func([IDL.Principal], [Result_5], []),
    'getAIConfig': IDL.Func([], [Result_2], []),
    'add_user': IDL.Func([IDL.Principal, UserRole], [Result_3], []),
  });
};

const init = ({ IDL }) => { return []; };

module.exports = { idlFactory, init };
