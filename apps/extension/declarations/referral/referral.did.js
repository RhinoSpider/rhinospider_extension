export const idlFactory = ({ IDL }) => {
  const UserData = IDL.Record({
    'referralCode' : IDL.Text,
    'referralCount' : IDL.Nat,
    'points' : IDL.Nat,
    'totalDataScraped' : IDL.Nat,
    'referredBy' : IDL.Opt(IDL.Principal),
  });
  const Result = IDL.Variant({'ok' : IDL.Null, 'err' : IDL.Text});
  const Result_1 = IDL.Variant({'ok' : IDL.Text, 'err' : IDL.Text});
  const Result_2 = IDL.Variant({'ok' : UserData, 'err' : IDL.Text});
  return IDL.Service({
    'awardPoints' : IDL.Func([IDL.Principal, IDL.Nat], [Result], []),
    'generateCode' : IDL.Func([], [IDL.Text], []),
    'getReferralCode' : IDL.Func([], [Result_1], []),
    'getUserData' : IDL.Func([], [Result_2], []),
    'useReferralCode' : IDL.Func([IDL.Text], [Result_1], []),
  });
};
export const init = ({ IDL }) => { return []; };