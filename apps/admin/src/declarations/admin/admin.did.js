export const idlFactory = ({ IDL }) => {
  const UserRole = IDL.Variant({
    'Admin' : IDL.Null,
    'User' : IDL.Null,
    'None' : IDL.Null,
  });
  const Result_1 = IDL.Variant({
    'ok' : IDL.Null,
    'err' : IDL.Text,
  });
  const ExtractionField = IDL.Record({
    'name' : IDL.Text,
    'fieldType' : IDL.Text,
    'required' : IDL.Bool,
    'aiPrompt' : IDL.Opt(IDL.Text),
  });
  const ExtractionRules = IDL.Record({
    'fields' : IDL.Vec(ExtractionField),
    'customPrompt' : IDL.Opt(IDL.Text),
  });
  const CreateTopicRequest = IDL.Record({
    'id' : IDL.Text,
    'name' : IDL.Text,
    'description' : IDL.Text,
    'urlPatterns' : IDL.Vec(IDL.Text),
    'status' : IDL.Text,
    'extractionRules' : ExtractionRules,
  });
  const CostLimits = IDL.Record({
    'maxDailyCost' : IDL.Float64,
    'maxMonthlyCost' : IDL.Float64,
    'maxConcurrent' : IDL.Nat,
  });
  const AIConfig = IDL.Record({
    'apiKey' : IDL.Text,
    'costLimits' : CostLimits,
    'model' : IDL.Text,
  });
  const ScrapingTopic = IDL.Record({
    'id' : IDL.Text,
    'name' : IDL.Text,
    'description' : IDL.Text,
    'urlPatterns' : IDL.Vec(IDL.Text),
    'status' : IDL.Text,
    'extractionRules' : ExtractionRules,
    'aiConfig' : AIConfig,
    'createdAt' : IDL.Int,
    'scrapingInterval' : IDL.Nat,
    'lastScraped' : IDL.Int,
    'maxRetries' : IDL.Nat,
    'activeHours' : IDL.Record({ 'end' : IDL.Nat, 'start' : IDL.Nat }),
  });
  const Result = IDL.Variant({
    'ok' : ScrapingTopic,
    'err' : IDL.Text,
  });
  const Result_2 = IDL.Variant({
    'ok' : AIConfig,
    'err' : IDL.Text,
  });
  const ScrapedData = IDL.Record({
    'id' : IDL.Text,
    'topic' : IDL.Text,
    'url' : IDL.Text,
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
  const User = IDL.Record({
    'role' : UserRole,
  });
  const Result_4 = IDL.Variant({
    'ok' : IDL.Vec(User),
    'err' : IDL.Text,
  });
  return IDL.Service({
    'add_user' : IDL.Func([IDL.Principal, UserRole], [Result_1], []),
    'createTopic' : IDL.Func([CreateTopicRequest], [Result], []),
    'deleteTopic' : IDL.Func([IDL.Text], [Result_1], []),
    'getAIConfig' : IDL.Func([], [Result_2], []),
    'getScrapedData' : IDL.Func([IDL.Vec(IDL.Text)], [Result_6], []),
    'getTopics' : IDL.Func([], [Result_5], []),
    'get_users' : IDL.Func([], [Result_4], []),
    'remove_user' : IDL.Func([IDL.Principal], [Result_1], []),
    'setTopicActive' : IDL.Func([IDL.Text, IDL.Bool], [Result_1], []),
    'testExtraction' : IDL.Func(
        [
          IDL.Record({
            'url' : IDL.Text,
            'extraction_rules' : IDL.Record({
              'fields' : IDL.Vec(ExtractionField),
              'customPrompt' : IDL.Opt(IDL.Text),
            }),
          }),
        ],
        [Result_6],
        [],
      ),
    'updateAIConfig' : IDL.Func([AIConfig], [Result_2], []),
    'updateTopic' : IDL.Func(
        [
          IDL.Text,
          IDL.Record({
            'name' : IDL.Opt(IDL.Text),
            'description' : IDL.Opt(IDL.Text),
            'urlPatterns' : IDL.Opt(IDL.Vec(IDL.Text)),
            'status' : IDL.Opt(IDL.Text),
            'extractionRules' : IDL.Opt(ExtractionRules),
          }),
        ],
        [Result],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
