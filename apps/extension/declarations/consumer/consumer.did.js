export const idlFactory = ({ IDL }) => {
  const ExtractionField = IDL.Record({
    'name': IDL.Text,
    'fieldType': IDL.Text,
    'required': IDL.Bool,
    'aiPrompt': IDL.Opt(IDL.Text),
  });
  const ExtractionRules = IDL.Record({
    'fields': IDL.Vec(ExtractionField),
    'customPrompt': IDL.Opt(IDL.Text),
  });
  const CostLimits = IDL.Record({
    'maxDailyCost': IDL.Float64,
    'maxMonthlyCost': IDL.Float64,
    'maxConcurrent': IDL.Nat,
  });
  const AIConfig = IDL.Record({
    'apiKey': IDL.Text,
    'costLimits': CostLimits,
    'model': IDL.Text,
  });
  const ScrapingTopic = IDL.Record({
    'id': IDL.Text,
    'name': IDL.Text,
    'description': IDL.Text,
    'urlPatterns': IDL.Vec(IDL.Text),
    'status': IDL.Text,
    'extractionRules': ExtractionRules,
    'aiConfig': AIConfig,
    'createdAt': IDL.Int,
    'scrapingInterval': IDL.Nat,
    'lastScraped': IDL.Int,
    'maxRetries': IDL.Nat,
    'activeHours': IDL.Record({ 'end': IDL.Nat, 'start': IDL.Nat }),
  });
  const Error = IDL.Variant({
    'NotFound': IDL.Null,
    'AlreadyExists': IDL.Null,
    'NotAuthorized': IDL.Null,
    'InvalidInput': IDL.Text,
    'SystemError': IDL.Text,
  });
  const Result = IDL.Variant({ 'ok': IDL.Null, 'err': Error });
  const Result_Topics = IDL.Variant({
    'ok': IDL.Vec(ScrapingTopic),
    'err': IDL.Text,
  });
  return IDL.Service({
    'getTopics': IDL.Func([], [Result_Topics], ['query']),
    'submitScrapedContent': IDL.Func([IDL.Text, IDL.Text], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
