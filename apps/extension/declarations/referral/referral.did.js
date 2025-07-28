export const idlFactory = ({ IDL }) => {
  const Result_1 = IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text });
  const UserData = IDL.Record({
    'referralCode' : IDL.Text,
    'referralCount' : IDL.Nat,
    'referredBy' : IDL.Opt(IDL.Principal),
    'points' : IDL.Nat,
  });
  const Result = IDL.Variant({ 'ok' : UserData, 'err' : IDL.Text });
  return IDL.Service({
    'getReferralCode' : IDL.Func([], [Result_1], []),
    'getUserData' : IDL.Func([], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
