export const idlFactory = ({ IDL }) => {
  const UserRole = IDL.Variant({
    'Operator' : IDL.Null,
    'SuperAdmin' : IDL.Null,
    'Admin' : IDL.Null,
  });
  const Result_3 = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  const ScrapingField = IDL.Record({
    'name' : IDL.Text,
    'description' : IDL.Text,
    'required' : IDL.Bool,
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
    'url' : IDL.Text,
    'status' : IDL.Text,
    'name' : IDL.Text,
    'createdAt' : IDL.Int,
    'scrapingInterval' : IDL.Nat,
    'description' : IDL.Text,
    'maxRetries' : IDL.Nat,
    'activeHours' : IDL.Record({ 'end' : IDL.Nat, 'start' : IDL.Nat }),
    'extractionRules' : ExtractionRules,
    'aiConfig' : AIConfig,
    'lastScraped' : IDL.Int,
  });
  const Result = IDL.Variant({ 'ok' : ScrapingTopic, 'err' : IDL.Text });
  const Result_2 = IDL.Variant({ 'ok' : AIConfig, 'err' : IDL.Text });
  const ScrapedData = IDL.Record({
    'id' : IDL.Text,
    'url' : IDL.Text,
    'topic' : IDL.Text,
    'content' : IDL.Text,
    'source' : IDL.Text,
    'timestamp' : IDL.Int,
    'client_id' : IDL.Principal,
  });
  const Result_6 = IDL.Variant({
    'ok' : IDL.Vec(ScrapedData),
    'err' : IDL.Text,
  });
  const Result_5 = IDL.Variant({
    'ok' : IDL.Vec(ScrapingTopic),
    'err' : IDL.Text,
  });
  const Time = IDL.Int;
  const User = IDL.Record({
    'principal' : IDL.Principal,
    'role' : UserRole,
    'addedAt' : Time,
    'addedBy' : IDL.Principal,
  });
  const Result_4 = IDL.Variant({ 'ok' : IDL.Vec(User), 'err' : IDL.Text });
  const Result_1 = IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text });
  return IDL.Service({
    'add_user' : IDL.Func([IDL.Principal, UserRole], [Result_3], []),
    'createTopic' : IDL.Func(
        [
          IDL.Record({
            'id' : IDL.Text,
            'url' : IDL.Text,
            'status' : IDL.Text,
            'name' : IDL.Text,
            'description' : IDL.Text,
            'extractionRules' : ExtractionRules,
          }),
        ],
        [Result],
        [],
      ),
    'deleteTopic' : IDL.Func([IDL.Text], [Result_3], []),
    'getAIConfig' : IDL.Func([], [Result_2], []),
    'getScrapedData' : IDL.Func([IDL.Vec(IDL.Text)], [Result_6], []),
    'getTopics' : IDL.Func([], [Result_5], []),
    'get_users' : IDL.Func([], [Result_4], []),
    'remove_user' : IDL.Func([IDL.Principal], [Result_3], []),
    'setTopicActive' : IDL.Func([IDL.Text, IDL.Bool], [Result_3], []),
    'testExtraction' : IDL.Func(
        [
          IDL.Record({
            'url' : IDL.Text,
            'extraction_rules' : IDL.Record({
              'fields' : IDL.Vec(ScrapingField),
              'customPrompt' : IDL.Opt(IDL.Text),
            }),
          }),
        ],
        [Result_1],
        [],
      ),
    'updateAIConfig' : IDL.Func([AIConfig], [Result_2], []),
    'updateLastScraped' : IDL.Func([IDL.Text, IDL.Int], [Result_1], []),
    'updateTopic' : IDL.Func(
        [
          IDL.Text,
          IDL.Record({
            'url' : IDL.Opt(IDL.Text),
            'status' : IDL.Opt(IDL.Text),
            'name' : IDL.Opt(IDL.Text),
            'description' : IDL.Opt(IDL.Text),
            'extractionRules' : IDL.Opt(ExtractionRules),
          }),
        ],
        [Result],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
