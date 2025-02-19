export const idlFactory = ({ IDL }) => {
  const Error = IDL.Variant({
    'InvalidInput' : IDL.Text,
    'SystemError' : IDL.Text,
    'NotFound' : IDL.Null,
    'NotAuthorized' : IDL.Null,
    'AlreadyExists' : IDL.Null,
  });
  const Result = IDL.Variant({ 'ok' : IDL.Null, 'err' : Error });
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
  const Result_3 = IDL.Variant({ 'ok' : AIConfig, 'err' : Error });
  const ScrapedData = IDL.Record({
    'id' : IDL.Text,
    'url' : IDL.Text,
    'status' : IDL.Text,
    'topic' : IDL.Text,
    'content' : IDL.Text,
    'source' : IDL.Text,
    'timestamp' : IDL.Int,
    'client_id' : IDL.Principal,
    'scraping_time' : IDL.Int,
  });
  const Result_2 = IDL.Variant({ 'ok' : IDL.Vec(ScrapedData), 'err' : Error });
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
  const Storage = IDL.Service({
    'addAuthorizedCanister' : IDL.Func([IDL.Principal], [Result], []),
    'getAIConfig' : IDL.Func([], [Result_3], ['query']),
    'getScrapedData' : IDL.Func([IDL.Vec(IDL.Text)], [Result_2], ['query']),
    'getTopics' : IDL.Func([], [Result_1], ['query']),
    'removeAuthorizedCanister' : IDL.Func([IDL.Principal], [Result], []),
    'submitScrapedData' : IDL.Func([ScrapedData], [Result], []),
    'updateAIConfig' : IDL.Func([AIConfig], [Result], []),
    'updateTopic' : IDL.Func([ScrapingTopic], [Result], []),
  });
  return Storage;
};
export const init = ({ IDL }) => { return []; };
