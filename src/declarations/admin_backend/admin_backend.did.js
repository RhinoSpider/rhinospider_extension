export const idlFactory = ({ IDL }) => {
  const UserRole = IDL.Variant({
    'Operator' : IDL.Null,
    'SuperAdmin' : IDL.Null,
    'Admin' : IDL.Null,
  });
  const Result_2 = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  const ScrapingTopic = IDL.Record({
    'id' : IDL.Text,
    'status' : IDL.Text,
    'titleSelectors' : IDL.Opt(IDL.Vec(IDL.Text)),
    'preferredDomains' : IDL.Opt(IDL.Vec(IDL.Text)),
    'maxUrlsPerBatch' : IDL.Nat,
    'maxContentLength' : IDL.Nat,
    'requiredKeywords' : IDL.Vec(IDL.Text),
    'name' : IDL.Text,
    'createdAt' : IDL.Int,
    'totalUrlsScraped' : IDL.Nat,
    'minContentLength' : IDL.Nat,
    'excludeKeywords' : IDL.Opt(IDL.Vec(IDL.Text)),
    'scrapingInterval' : IDL.Nat,
    'description' : IDL.Text,
    'contentSelectors' : IDL.Vec(IDL.Text),
    'excludeSelectors' : IDL.Vec(IDL.Text),
    'excludeDomains' : IDL.Opt(IDL.Vec(IDL.Text)),
    'priority' : IDL.Nat,
    'lastScraped' : IDL.Int,
    'searchQueries' : IDL.Vec(IDL.Text),
  });
  const Result = IDL.Variant({ 'ok' : ScrapingTopic, 'err' : IDL.Text });
  const GlobalAIConfig = IDL.Record({
    'model' : IDL.Text,
    'features' : IDL.Record({
      'keywordExtraction' : IDL.Bool,
      'summarization' : IDL.Bool,
      'categorization' : IDL.Bool,
      'sentimentAnalysis' : IDL.Bool,
    }),
    'provider' : IDL.Text,
    'maxTokensPerRequest' : IDL.Nat,
    'enabled' : IDL.Bool,
    'apiKey' : IDL.Opt(IDL.Text),
  });
  const Result_7 = IDL.Variant({
    'ok' : IDL.Opt(GlobalAIConfig),
    'err' : IDL.Text,
  });
  const NodeCharacteristics = IDL.Record({
    'region' : IDL.Text,
    'randomizationMode' : IDL.Opt(IDL.Text),
    'percentageNodes' : IDL.Opt(IDL.Nat),
    'ipAddress' : IDL.Text,
  });
  const Result_4 = IDL.Variant({
    'ok' : IDL.Vec(ScrapingTopic),
    'err' : IDL.Text,
  });
  const Result_6 = IDL.Variant({
    'ok' : IDL.Vec(IDL.Tuple(IDL.Principal, NodeCharacteristics)),
    'err' : IDL.Text,
  });
  const ScrapedData = IDL.Record({
    'id' : IDL.Text,
    'url' : IDL.Text,
    'status' : IDL.Text,
    'topic' : IDL.Text,
    'content' : IDL.Text,
    'source' : IDL.Text,
    'timestamp' : IDL.Int,
    'client_id' : IDL.Principal,
    'scraping_time' : IDL.Int,
  });
  const Result_5 = IDL.Variant({
    'ok' : IDL.Vec(ScrapedData),
    'err' : IDL.Text,
  });
  const Time = IDL.Int;
  const User = IDL.Record({
    'principal' : IDL.Principal,
    'role' : UserRole,
    'addedAt' : Time,
    'addedBy' : IDL.Principal,
  });
  const Result_3 = IDL.Variant({ 'ok' : IDL.Vec(User), 'err' : IDL.Text });
  const Result_1 = IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text });
  return IDL.Service({
    'add_user' : IDL.Func([IDL.Principal, UserRole], [Result_2], []),
    'createTopic' : IDL.Func([ScrapingTopic], [Result], []),
    'deleteTopic' : IDL.Func([IDL.Text], [Result_2], []),
    'getAIConfig' : IDL.Func([], [Result_7], ['query']),
    'getAllTopics' : IDL.Func([], [IDL.Vec(ScrapingTopic)], ['query']),
    'getAssignedTopics' : IDL.Func(
        [NodeCharacteristics],
        [Result_4],
        ['query'],
      ),
    'getGlobalAIConfig' : IDL.Func([], [Result_7], ['query']),
    'getRegisteredNodes' : IDL.Func([], [Result_6], ['query']),
    'getScrapedData' : IDL.Func([IDL.Vec(IDL.Text)], [Result_5], []),
    'getTopics' : IDL.Func([], [Result_4], ['query']),
    'getTopics_with_caller' : IDL.Func([IDL.Principal], [Result_4], []),
    'get_users' : IDL.Func([], [Result_3], ['query']),
    'registerNode' : IDL.Func(
        [IDL.Principal, NodeCharacteristics],
        [Result_2],
        [],
      ),
    'remove_user' : IDL.Func([IDL.Principal], [Result_2], []),
    'setGlobalAIConfig' : IDL.Func([IDL.Opt(GlobalAIConfig)], [Result_2], []),
    'setTopicActive' : IDL.Func([IDL.Text, IDL.Bool], [Result_2], []),
    'testExtraction' : IDL.Func([IDL.Text, IDL.Text], [Result_1], []),
    'updateTopic' : IDL.Func(
        [
          IDL.Text,
          IDL.Record({
            'status' : IDL.Opt(IDL.Text),
            'titleSelectors' : IDL.Opt(IDL.Vec(IDL.Text)),
            'preferredDomains' : IDL.Opt(IDL.Vec(IDL.Text)),
            'maxUrlsPerBatch' : IDL.Opt(IDL.Nat),
            'maxContentLength' : IDL.Opt(IDL.Nat),
            'requiredKeywords' : IDL.Opt(IDL.Vec(IDL.Text)),
            'name' : IDL.Opt(IDL.Text),
            'minContentLength' : IDL.Opt(IDL.Nat),
            'excludeKeywords' : IDL.Opt(IDL.Vec(IDL.Text)),
            'scrapingInterval' : IDL.Opt(IDL.Nat),
            'description' : IDL.Opt(IDL.Text),
            'contentSelectors' : IDL.Opt(IDL.Vec(IDL.Text)),
            'excludeSelectors' : IDL.Opt(IDL.Vec(IDL.Text)),
            'excludeDomains' : IDL.Opt(IDL.Vec(IDL.Text)),
            'priority' : IDL.Opt(IDL.Nat),
            'searchQueries' : IDL.Opt(IDL.Vec(IDL.Text)),
          }),
        ],
        [Result],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
