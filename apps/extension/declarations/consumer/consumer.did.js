export const idlFactory = ({ IDL }) => {
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
  const AIConfig = IDL.Record({
    'apiKey': IDL.Text,
    'model': IDL.Text,
    'costLimits': IDL.Record({
      'maxDailyCost': IDL.Float64,
      'maxMonthlyCost': IDL.Float64,
      'maxConcurrent': IDL.Nat,
    }),
  });
  const ScrapingTopic = IDL.Record({
    'id': IDL.Text,
    'status': IDL.Text,
    'name': IDL.Text,
    'description': IDL.Text,
    'scrapingInterval': IDL.Nat,
    'maxRetries': IDL.Nat,
    'activeHours': IDL.Record({
      'start': IDL.Nat,
      'end': IDL.Nat,
    }),
  });
  const Error = IDL.Variant({
    'NotFound': IDL.Null,
    'AlreadyExists': IDL.Null,
    'NotAuthorized': IDL.Null,
    'InvalidInput': IDL.Text,
    'SystemError': IDL.Text,
  });
  const Result = IDL.Variant({ 'Ok': IDL.Null, 'Err': Error });
  return IDL.Service({
    'getTopics': IDL.Func([], [IDL.Vec(ScrapingTopic)], ['query']),
    'submitScrapedContent': IDL.Func([IDL.Text, IDL.Text], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
