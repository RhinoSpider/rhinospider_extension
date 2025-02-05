export const idlFactory = ({ IDL }) => {
  const ScrapedData = IDL.Record({
    'id' : IDL.Text,
    'url' : IDL.Text,
    'topic' : IDL.Text,
    'clientId' : IDL.Principal,
    'content' : IDL.Text,
    'source' : IDL.Text,
    'timestamp' : IDL.Int,
  });
  const ScrapedContent = IDL.Record({
    'id' : IDL.Text,
    'url' : IDL.Text,
    'aiAnalysis' : IDL.Record({
      'relevanceScore' : IDL.Nat,
      'keyPoints' : IDL.Vec(IDL.Text),
      'codeSnippets' : IDL.Vec(
        IDL.Record({ 'code' : IDL.Text, 'language' : IDL.Text })
      ),
    }),
    'title' : IDL.Text,
    'content' : IDL.Text,
    'source' : IDL.Text,
    'publishDate' : IDL.Int,
    'metadata' : IDL.Record({
      'readingTime' : IDL.Opt(IDL.Nat),
      'language' : IDL.Opt(IDL.Text),
      'license' : IDL.Opt(IDL.Text),
      'techStack' : IDL.Vec(IDL.Text),
    }),
    'author' : IDL.Text,
    'summary' : IDL.Text,
    'topics' : IDL.Vec(IDL.Text),
    'engagement' : IDL.Record({
      'claps' : IDL.Opt(IDL.Nat),
      'stars' : IDL.Opt(IDL.Nat),
      'comments' : IDL.Nat,
      'reactions' : IDL.Opt(IDL.Nat),
    }),
    'updateDate' : IDL.Int,
  });
  const Result = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  return IDL.Service({
    'getBySource' : IDL.Func([IDL.Text], [IDL.Vec(ScrapedData)], ['query']),
    'getContent' : IDL.Func([IDL.Text], [IDL.Opt(ScrapedContent)], ['query']),
    'getContentBySource' : IDL.Func(
        [IDL.Text],
        [IDL.Vec(ScrapedContent)],
        ['query'],
      ),
    'getContentByTopic' : IDL.Func(
        [IDL.Text, IDL.Nat],
        [IDL.Vec(ScrapedContent)],
        ['query'],
      ),
    'storeContent' : IDL.Func([ScrapedContent], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
