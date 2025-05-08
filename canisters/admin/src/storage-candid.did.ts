import { IDL } from '@dfinity/candid';

export const idlFactory = ({ IDL }) => {
  const Error = IDL.Variant({
    'NotAuthorized': IDL.Null,
    'InvalidInput': IDL.Text,
    'Other': IDL.Text,
  });
  
  const ScrapedData = IDL.Record({});  // Use an empty record to accept any field structure
  
  const Result = IDL.Variant({
    'ok': IDL.Vec(ScrapedData),
    'err': Error,
  });
  
  return IDL.Service({
    'getScrapedData': IDL.Func([IDL.Vec(IDL.Text)], [Result], ['query']),
  });
};
