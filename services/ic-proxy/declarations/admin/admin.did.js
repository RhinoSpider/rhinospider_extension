const idlFactory = ({ IDL }) => {
  const ContentIdentifiers = IDL.Record({
    'selectors' : IDL.Vec(IDL.Text),
    'keywords' : IDL.Vec(IDL.Text),
  });
  const ExtractionRules = IDL.Record({
    'fields' : IDL.Vec(
      IDL.Record({
        'name' : IDL.Text,
        'aiPrompt' : IDL.Opt(IDL.Text),
        'required' : IDL.Bool,
        'fieldType' : IDL.Text,
      })
    ),
    'customPrompt' : IDL.Opt(IDL.Text),
  });
  const Topic = IDL.Record({
    'id' : IDL.Text,
    'status' : IDL.Text,
    'name' : IDL.Text,
    'createdAt' : IDL.Int,
    'description' : IDL.Text,
    'urlGenerationStrategy' : IDL.Text,
    'urlPatterns' : IDL.Vec(IDL.Text),
    'articleUrlPatterns' : IDL.Opt(IDL.Vec(IDL.Text)),
    'paginationPatterns' : IDL.Opt(IDL.Vec(IDL.Text)),
    'excludePatterns' : IDL.Opt(IDL.Vec(IDL.Text)),
    'contentIdentifiers' : IDL.Opt(ContentIdentifiers),
    'extractionRules' : ExtractionRules,
    'siteTypeClassification' : IDL.Opt(IDL.Text),
  });
  const Error = IDL.Variant({
    'InvalidInput' : IDL.Text,
    'SystemError' : IDL.Text,
    'NotFound' : IDL.Null,
    'NotAuthorized' : IDL.Null,
    'AlreadyExists' : IDL.Null,
  });
  const Result = IDL.Variant({ 'ok' : IDL.Vec(Topic), 'err' : Error });
  
  const CostLimits = IDL.Record({
    'maxConcurrent' : IDL.Nat,
    'maxDailyCost' : IDL.Float64,
    'maxMonthlyCost' : IDL.Float64,
  });
  const AIConfig = IDL.Record({
    'model' : IDL.Text,
    'costLimits' : CostLimits,
    'apiKey' : IDL.Text,
  });
  const Result_AIConfig = IDL.Variant({ 'ok' : AIConfig, 'err' : IDL.Text });
  const Result_Text = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  const UserRole = IDL.Variant({
    'SuperAdmin' : IDL.Null,
    'Admin' : IDL.Null,
    'Operator' : IDL.Null,
  });

  return IDL.Service({
    'getTopics' : IDL.Func([], [Result], ['query']),
    'getTopics_with_caller' : IDL.Func([IDL.Principal], [IDL.Variant({ 'ok' : IDL.Vec(Topic), 'err' : IDL.Text })], []),
    'getTopic' : IDL.Func([IDL.Text], [IDL.Variant({ 'ok' : Topic, 'err' : Error })], ['query']),
    'getAIConfig' : IDL.Func([], [Result_AIConfig], []),
    'add_user' : IDL.Func([IDL.Principal, UserRole], [Result_Text], []),
  });
};

const init = ({ IDL }) => { return []; };

module.exports = { idlFactory, init };
