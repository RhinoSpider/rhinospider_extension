import { IDL } from '@dfinity/candid';

export const idlFactory = ({ IDL }) => {
  const Error = IDL.Variant({
    'InvalidInput' : IDL.Text,
    'SystemError' : IDL.Text,
    'NotFound' : IDL.Null,
    'NotAuthorized' : IDL.Null,
    'AlreadyExists' : IDL.Null,
  });

  const Result = IDL.Variant({ 'ok' : IDL.Null, 'err' : Error });

  const UserProfile = IDL.Record({
    'created' : IDL.Nat64,
    'principal' : IDL.Principal,
    'preferences' : IDL.Record({
      'theme' : IDL.Text,
      'notificationsEnabled' : IDL.Bool,
    }),
    'lastLogin' : IDL.Nat64,
    'devices' : IDL.Vec(IDL.Text),
  });

  const Result_2 = IDL.Variant({ 'ok' : UserProfile, 'err' : Error });

  const CostLimits = IDL.Record({
    'maxConcurrent' : IDL.Nat32,
    'maxDailyCost' : IDL.Float64,
    'maxMonthlyCost' : IDL.Float64,
  });

  const AIConfig = IDL.Record({
    'model' : IDL.Text,
    'costLimits' : CostLimits,
    'apiKey' : IDL.Text,
  });

  const Result_3 = IDL.Variant({ 'ok' : AIConfig, 'err' : Error });

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
    'createdAt' : IDL.Nat64,
    'scrapingInterval' : IDL.Nat32,
    'description' : IDL.Text,
    'maxRetries' : IDL.Nat32,
    'activeHours' : IDL.Record({ 'end' : IDL.Nat32, 'start' : IDL.Nat32 }),
    'urlPatterns' : IDL.Vec(IDL.Text),
    'extractionRules' : ExtractionRules,
    'aiConfig' : AIConfig,
  });

  const Result_1 = IDL.Variant({ 'ok' : IDL.Vec(ScrapingTopic), 'err' : Error });

  const ScrapedData = IDL.Record({
    'id' : IDL.Text,
    'url' : IDL.Text,
    'status' : IDL.Text,
    'content' : IDL.Record({
      'raw' : IDL.Text,
      'extracted' : IDL.Vec(IDL.Tuple([IDL.Text, IDL.Text])),
    }),
    'error' : IDL.Opt(IDL.Text),
    'timestamp' : IDL.Nat64,
    'topicId' : IDL.Text,
    'retries' : IDL.Nat32,
  });

  return IDL.Service({
    'getAIConfig' : IDL.Func([], [Result_3], []),
    'getProfile' : IDL.Func([], [Result_2], ['query']),
    'getTopics' : IDL.Func([], [Result_1], ['query']),
    'registerDevice' : IDL.Func([IDL.Text], [Result], []),
    'submitScrapedData' : IDL.Func([ScrapedData], [Result], []),
    'updatePreferences' : IDL.Func([IDL.Bool, IDL.Text], [Result], []),
  });
};

export const init = ({ IDL }) => { return []; };
