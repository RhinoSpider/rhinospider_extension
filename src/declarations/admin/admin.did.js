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
  const Result_1 = IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text });
  const UserRole = IDL.Variant({
    'Operator' : IDL.Null,
    'SuperAdmin' : IDL.Null,
    'Admin' : IDL.Null,
  });
  const Result = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  const TaskConfig = IDL.Record({
    'targetSites' : IDL.Vec(IDL.Text),
    'maxBandwidthPerDay' : IDL.Nat,
    'topics' : IDL.Vec(IDL.Text),
    'scanInterval' : IDL.Nat,
  });
  return IDL.Service({
    'addTasks' : IDL.Func([IDL.Vec(Task)], [Result_1], []),
    'addUser' : IDL.Func([IDL.Principal, UserRole], [Result], []),
    'getConfig' : IDL.Func([], [TaskConfig], ['query']),
    'getTasks' : IDL.Func([IDL.Nat], [IDL.Vec(Task)], []),
    'init' : IDL.Func([], [], []),
    'removeUser' : IDL.Func([IDL.Principal], [Result], []),
    'updateConfig' : IDL.Func([TaskConfig], [Result], []),
    'updateTaskStatus' : IDL.Func([IDL.Text, IDL.Text], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
