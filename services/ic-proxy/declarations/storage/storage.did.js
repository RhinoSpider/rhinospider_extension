// Generated IDL file for the storage canister
const idlFactory = ({ IDL }) => {
  const Error = IDL.Variant({
    'NotFound': IDL.Null,
    'NotAuthorized': IDL.Null,
    'AlreadyExists': IDL.Null,
    'InvalidInput': IDL.Null,
  });
  
  const Result = IDL.Variant({ 'ok': IDL.Null, 'err': Error });
  
  const ScrapedData = IDL.Record({
    'id': IDL.Text,
    'url': IDL.Text,
    'topic': IDL.Text,
    'source': IDL.Text,
    'content': IDL.Text,
    'timestamp': IDL.Int,
    'client_id': IDL.Principal,
    'status': IDL.Text,
    'scraping_time': IDL.Int,
  });
  
  return IDL.Service({
    'addAuthorizedCanister': IDL.Func([IDL.Principal], [Result], []),
    'removeAuthorizedCanister': IDL.Func([IDL.Principal], [Result], []),
    'submitScrapedData': IDL.Func([ScrapedData], [Result], []),
  });
};

const init = ({ IDL }) => { return []; };

module.exports = { idlFactory, init };
