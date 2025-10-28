const idlFactory = ({ IDL }) => {
  const ScrapingTopic = IDL.Record({
    'id': IDL.Text,
    'status': IDL.Text,
    'name': IDL.Text,
    'description': IDL.Text,
    'createdAt': IDL.Int,
    'lastScraped': IDL.Int,
    'totalUrlsScraped': IDL.Nat,
    'scrapingInterval': IDL.Nat,
    'priority': IDL.Nat,
    'maxUrlsPerBatch': IDL.Nat,
    'minContentLength': IDL.Nat,
    'maxContentLength': IDL.Nat,
    'searchQueries': IDL.Vec(IDL.Text),
    'preferredDomains': IDL.Opt(IDL.Vec(IDL.Text)),
    'excludeDomains': IDL.Opt(IDL.Vec(IDL.Text)),
    'requiredKeywords': IDL.Vec(IDL.Text),
    'excludeKeywords': IDL.Opt(IDL.Vec(IDL.Text)),
    'contentSelectors': IDL.Vec(IDL.Text),
    'titleSelectors': IDL.Opt(IDL.Vec(IDL.Text)),
    'excludeSelectors': IDL.Vec(IDL.Text),
    'geolocationFilter': IDL.Opt(IDL.Text),
    'percentageNodes': IDL.Opt(IDL.Nat),
    'randomizationMode': IDL.Opt(IDL.Text),
  });

  const Error = IDL.Variant({
    'InvalidInput': IDL.Text,
    'SystemError': IDL.Text,
    'NotFound': IDL.Null,
    'NotAuthorized': IDL.Null,
    'AlreadyExists': IDL.Null,
  });

  const Result_5 = IDL.Variant({
    'ok': IDL.Vec(ScrapingTopic),
    'err': IDL.Text,
  });

  const GlobalAIConfig = IDL.Record({
    'model': IDL.Text,
    'apiKey': IDL.Text,
  });

  const Result_2 = IDL.Variant({
    'ok': IDL.Opt(GlobalAIConfig),
    'err': IDL.Text,
  });

  const UserRole = IDL.Variant({
    'SuperAdmin': IDL.Null,
    'Admin': IDL.Null,
    'Operator': IDL.Null,
  });

  const Result_3 = IDL.Variant({
    'ok': IDL.Null,
    'err': IDL.Text,
  });

  return IDL.Service({
    'getTopics': IDL.Func([], [Result_5], ['query']),
    'getAllTopics': IDL.Func([], [IDL.Vec(ScrapingTopic)], ['query']),
    'getTopics_with_caller': IDL.Func([IDL.Principal], [Result_5], []),
    'getAIConfig': IDL.Func([], [Result_2], []),
    'add_user': IDL.Func([IDL.Principal, UserRole], [Result_3], []),
  });
};

const init = ({ IDL }) => { return []; };

module.exports = { idlFactory, init };
