module.exports = ({ IDL }) => {
  const Error = IDL.Variant({
    'NotFound': IDL.Null,
    'AlreadyExists': IDL.Null,
    'NotAuthorized': IDL.Null,
    'InvalidInput': IDL.Text,
    'SystemError': IDL.Text
  });
  
  const ScrapedData = IDL.Record({
    'id': IDL.Text,
    'url': IDL.Text,
    'topic': IDL.Text,
    'content': IDL.Text,
    'source': IDL.Text,
    'timestamp': IDL.Int,
    'client_id': IDL.Principal,
    'status': IDL.Text,
    'scraping_time': IDL.Int
  });
  
  const BatchSubmission = IDL.Record({
    'batchId': IDL.Text,
    'clientId': IDL.Principal,
    'items': IDL.Vec(ScrapedData)
  });
  
  const Result = IDL.Variant({
    'ok': IDL.Record({ 'id': IDL.Text }),
    'err': Error
  });
  
  const BatchResult = IDL.Variant({
    'ok': IDL.Record({ 'count': IDL.Nat }),
    'err': Error
  });
  
  return IDL.Service({
    'storeScrapedData': IDL.Func([ScrapedData], [Result], []),
    'storeBatch': IDL.Func([BatchSubmission], [BatchResult], []),
    'isAuthorizedCaller': IDL.Func([IDL.Principal], [IDL.Bool], ['query'])
  });
};
