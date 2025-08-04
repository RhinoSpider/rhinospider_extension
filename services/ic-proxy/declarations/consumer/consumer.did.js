const idlFactory = ({ IDL }) => {
  const UserProfile = IDL.Record({
    'created' : IDL.Int,
    'principal' : IDL.Principal,
    'preferences' : IDL.Record({
      'theme' : IDL.Text,
      'notificationsEnabled' : IDL.Bool,
    }),
    'lastLogin' : IDL.Int,
    'devices' : IDL.Vec(IDL.Text),
    'ipAddress' : IDL.Opt(IDL.Text),
  });
  const Error = IDL.Variant({
    'InvalidInput' : IDL.Text,
    'SystemError' : IDL.Text,
    'NotFound' : IDL.Null,
    'NotAuthorized' : IDL.Null,
    'AlreadyExists' : IDL.Null,
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
    'topic' : IDL.Text,
    'content' : IDL.Text,
    'source' : IDL.Text,
    'timestamp' : IDL.Nat,
    'client_id' : IDL.Principal,
    'scraping_time' : IDL.Nat,
  });
  return IDL.Service({
    'getProfile' : IDL.Func([], [Result_2], []), 
    'getTopics' : IDL.Func([], [Result_1], []),
    'getScrapedData' : IDL.Func([IDL.Vec(IDL.Text)], [IDL.Variant({ 'ok' : IDL.Vec(ScrapedData), 'err' : Error })], []),
    'registerDevice' : IDL.Func([IDL.Text], [Result], []),
    'registerDeviceWithIP' : IDL.Func([IDL.Text, IDL.Opt(IDL.Text)], [Result], []),
    'submitScrapedData' : IDL.Func([ScrapedData], [Result], []),
    'updatePreferences' : IDL.Func([IDL.Bool, IDL.Text], [Result], []),
  });
};

const init = ({ IDL }) => { return []; };

module.exports = { idlFactory, init };
