export const idlFactory = ({ IDL }) => {
  const Result_2 = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  const Result = IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text });
  const UserData = IDL.Record({
    'referralCode' : IDL.Text,
    'referralCount' : IDL.Nat,
    'referredBy' : IDL.Opt(IDL.Principal),
    'totalDataScraped' : IDL.Nat,
    'points' : IDL.Nat,
  });
  const Result_1 = IDL.Variant({ 'ok' : UserData, 'err' : IDL.Text });
  return IDL.Service({
    'awardPoints' : IDL.Func([IDL.Principal, IDL.Nat], [Result_2], []),
    'getReferralCode' : IDL.Func([], [Result], []),
    'getUserData' : IDL.Func([], [Result_1], []),
    'useReferralCode' : IDL.Func([IDL.Text], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
