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
  const Result_2 = IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text });
  const UserRole = IDL.Variant({
    'Operator' : IDL.Null,
    'SuperAdmin' : IDL.Null,
    'Admin' : IDL.Null,
  });
  const Result = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
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
  const Result_1 = IDL.Variant({ 'ok' : AIConfig, 'err' : IDL.Text });
  const TaskConfig = IDL.Record({
    'targetSites' : IDL.Vec(IDL.Text),
    'maxBandwidthPerDay' : IDL.Nat,
    'topics' : IDL.Vec(IDL.Text),
    'scanInterval' : IDL.Nat,
  });
  return IDL.Service({
    'addTasks' : IDL.Func([IDL.Vec(Task)], [Result_2], []),
    'addUser' : IDL.Func([IDL.Principal, UserRole], [Result], []),
    'clearAllData' : IDL.Func([], [IDL.Text], []),
    'getAIConfig' : IDL.Func([], [Result_1], []),
    'getConfig' : IDL.Func([], [TaskConfig], ['query']),
    'getTasks' : IDL.Func([IDL.Nat], [IDL.Vec(Task)], []),
    'init' : IDL.Func([], [], []),
    'removeUser' : IDL.Func([IDL.Principal], [Result], []),
    'updateAIConfig' : IDL.Func([AIConfig], [Result], []),
    'updateConfig' : IDL.Func([TaskConfig], [Result], []),
    'updateTaskStatus' : IDL.Func([IDL.Text, IDL.Text], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
