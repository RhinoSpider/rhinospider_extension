export const idlFactory = ({ IDL }) => {
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
  const Error = IDL.Variant({
    'InvalidInput' : IDL.Text,
    'SystemError' : IDL.Text,
    'NotFound' : IDL.Null,
    'NotAuthorized' : IDL.Null,
    'AlreadyExists' : IDL.Null,
  });
  const Result_3 = IDL.Variant({ 'ok' : AIConfig, 'err' : Error });
  const UserProfile = IDL.Record({
    'created' : IDL.Int,
    'principal' : IDL.Principal,
    'preferences' : IDL.Record({
      'theme' : IDL.Text,
      'notificationsEnabled' : IDL.Bool,
    }),
    'lastLogin' : IDL.Int,
    'devices' : IDL.Vec(IDL.Text),
  });
  const Result_2 = IDL.Variant({ 'ok' : UserProfile, 'err' : Error });
  const ScrapingField = IDL.Record({
    'name' : IDL.Text,
    'aiPrompt' : IDL.Opt(IDL.Text),
    'required' : IDL.Bool,
    'fieldType' : IDL.Text,
  });
  const ExtractionRules = IDL.Record({
    'fields' : IDL.Vec(ScrapingField),
    'customPrompt' : IDL.Opt(IDL.Text),
  });
  const ScrapingTopic = IDL.Record({
    'id' : IDL.Text,
    'status' : IDL.Text,
    'name' : IDL.Text,
    'createdAt' : IDL.Int,
    'scrapingInterval' : IDL.Nat,
    'description' : IDL.Text,
    'maxRetries' : IDL.Nat,
    'activeHours' : IDL.Record({ 'end' : IDL.Nat, 'start' : IDL.Nat }),
    'urlPatterns' : IDL.Vec(IDL.Text),
    'extractionRules' : ExtractionRules,
    'aiConfig' : AIConfig,
  });
  const Result_1 = IDL.Variant({
    'ok' : IDL.Vec(ScrapingTopic),
    'err' : Error,
  });
  const Result = IDL.Variant({ 'ok' : IDL.Null, 'err' : Error });
  const ScrapedData = IDL.Record({
    'id' : IDL.Text,
    'url' : IDL.Text,
    'status' : IDL.Text,
    'content' : IDL.Record({
      'raw' : IDL.Text,
      'extracted' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    }),
    'error' : IDL.Opt(IDL.Text),
    'timestamp' : IDL.Int,
    'topicId' : IDL.Text,
    'retries' : IDL.Nat,
  });
  return IDL.Service({
    'getAIConfig' : IDL.Func([], [Result_3], []),
    'getProfile' : IDL.Func([], [Result_2], ['query']),
    'getTopics' : IDL.Func([], [Result_1], []),
    'registerDevice' : IDL.Func([IDL.Text], [Result], []),
    'submitScrapedData' : IDL.Func([ScrapedData], [Result], []),
    'updatePreferences' : IDL.Func([IDL.Bool, IDL.Text], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
