export const idlFactory = ({ IDL }) => {
  const Task = IDL.Record({
    'id' : IDL.Text,
    'url' : IDL.Text,
    'status' : IDL.Text,
    'topic' : IDL.Text,
    'assignedTo' : IDL.Opt(IDL.Principal),
    'createdAt' : IDL.Int,
    'priority' : IDL.Nat,
  });
  const Result_4 = IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text });
  const UserRole = IDL.Variant({
    'Operator' : IDL.Null,
    'SuperAdmin' : IDL.Null,
    'Admin' : IDL.Null,
  });
  const Result_1 = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  const ScrapingField = IDL.Record({
    'name' : IDL.Text,
    'description' : IDL.Opt(IDL.Text),
    'example' : IDL.Opt(IDL.Text),
    'aiPrompt' : IDL.Text,
    'required' : IDL.Bool,
    'fieldType' : IDL.Text,
  });
  const ScrapingTopic = IDL.Record({
    'id' : IDL.Text,
    'active' : IDL.Bool,
    'name' : IDL.Text,
    'createdAt' : IDL.Int,
    'description' : IDL.Text,
    'urlPatterns' : IDL.Vec(IDL.Text),
    'extractionRules' : IDL.Record({
      'fields' : IDL.Vec(ScrapingField),
      'customPrompt' : IDL.Opt(IDL.Text),
    }),
    'rateLimit' : IDL.Opt(
      IDL.Record({ 'maxConcurrent' : IDL.Nat, 'requestsPerHour' : IDL.Nat })
    ),
    'validation' : IDL.Opt(
      IDL.Record({
        'aiValidation' : IDL.Opt(IDL.Text),
        'rules' : IDL.Vec(IDL.Text),
      })
    ),
  });
  const Result = IDL.Variant({ 'ok' : ScrapingTopic, 'err' : IDL.Text });
  const CostLimits = IDL.Record({
    'maxConcurrent' : IDL.Nat,
    'dailyUSD' : IDL.Nat,
    'monthlyUSD' : IDL.Nat,
  });
  const AIConfig = IDL.Record({
    'model' : IDL.Text,
    'costLimits' : CostLimits,
    'apiKey' : IDL.Text,
  });
  const Result_3 = IDL.Variant({ 'ok' : AIConfig, 'err' : IDL.Text });
  const TaskConfig = IDL.Record({
    'targetSites' : IDL.Vec(IDL.Text),
    'maxBandwidthPerDay' : IDL.Nat,
    'topics' : IDL.Vec(IDL.Text),
    'scanInterval' : IDL.Nat,
  });
  const Time = IDL.Int;
  const User = IDL.Record({
    'principal' : IDL.Principal,
    'role' : UserRole,
    'addedAt' : Time,
    'addedBy' : IDL.Principal,
  });
  const ScrapingField__1 = IDL.Record({
    'name' : IDL.Text,
    'description' : IDL.Opt(IDL.Text),
    'example' : IDL.Opt(IDL.Text),
    'aiPrompt' : IDL.Text,
    'required' : IDL.Bool,
    'fieldType' : IDL.Text,
  });
  const Result_2 = IDL.Variant({
    'ok' : IDL.Record({ 'data' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)) }),
    'err' : IDL.Text,
  });
  return IDL.Service({
    'addTasks' : IDL.Func([IDL.Vec(Task)], [Result_4], []),
    'addUser' : IDL.Func([IDL.Principal, UserRole], [Result_1], []),
    'clearAllData' : IDL.Func([], [IDL.Text], []),
    'createTopic' : IDL.Func([ScrapingTopic], [Result], []),
    'deleteTopic' : IDL.Func([IDL.Text], [Result_1], []),
    'getAIConfig' : IDL.Func([], [Result_3], []),
    'getConfig' : IDL.Func([], [TaskConfig], ['query']),
    'getTasks' : IDL.Func([IDL.Nat], [IDL.Vec(Task)], []),
    'getTopics' : IDL.Func([], [IDL.Vec(ScrapingTopic)], ['query']),
    'getUsers' : IDL.Func([], [IDL.Vec(User)], []),
    'removeUser' : IDL.Func([IDL.Principal], [Result_1], []),
    'testExtraction' : IDL.Func(
        [
          IDL.Record({
            'url' : IDL.Text,
            'extraction_rules' : IDL.Record({
              'custom_prompt' : IDL.Opt(IDL.Text),
              'fields' : IDL.Vec(ScrapingField__1),
            }),
          }),
        ],
        [Result_2],
        [],
      ),
    'updateAIConfig' : IDL.Func([AIConfig], [Result_1], []),
    'updateConfig' : IDL.Func([TaskConfig], [Result_1], []),
    'updateTaskStatus' : IDL.Func([IDL.Text, IDL.Text], [Result_1], []),
    'updateTopic' : IDL.Func([IDL.Text, ScrapingTopic], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
