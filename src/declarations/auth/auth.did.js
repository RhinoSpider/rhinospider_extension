export const idlFactory = ({ IDL }) => {
  const Result = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  const Client = IDL.Record({
    'id' : IDL.Text,
    'principal' : IDL.Principal,
    'bandwidthLimit' : IDL.Nat,
    'isActive' : IDL.Bool,
    'registeredAt' : IDL.Int,
    'lastActive' : IDL.Int,
  });
  const Result_3 = IDL.Variant({ 'ok' : IDL.Vec(Client), 'err' : IDL.Text });
  const ClientStats = IDL.Record({
    'lastUpdate' : IDL.Int,
    'bytesUploaded' : IDL.Nat,
    'bytesDownloaded' : IDL.Nat,
  });
  const Result_2 = IDL.Variant({ 'ok' : ClientStats, 'err' : IDL.Text });
  const Result_1 = IDL.Variant({ 'ok' : Client, 'err' : IDL.Text });
  return IDL.Service({
    'deactivateClient' : IDL.Func([IDL.Principal], [Result], []),
    'getAllClients' : IDL.Func([], [Result_3], ['query']),
    'getClientStats' : IDL.Func([], [Result_2], ['query']),
    'init' : IDL.Func([], [], []),
    'isAuthorized' : IDL.Func([IDL.Principal], [IDL.Bool], ['query']),
    'registerClient' : IDL.Func([IDL.Nat], [Result_1], []),
    'updateBandwidthLimit' : IDL.Func([IDL.Principal, IDL.Nat], [Result], []),
    'updateStats' : IDL.Func([IDL.Nat, IDL.Nat], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
