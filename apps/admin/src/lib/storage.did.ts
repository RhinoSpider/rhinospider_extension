// Custom IDL factory for the storage canister based on storage.did
// Using a simplified approach without importing IDL

export const storageIdlFactory = ({ IDL }: any) => {
  // Define the ScrapedData record structure as seen in storage.did
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

  // Define other types needed for the interface
  const StorageStats = IDL.Record({
    'totalItems': IDL.Nat,
    'totalBytes': IDL.Nat,
    'lastUpdate': IDL.Int,
  });

  const Result = IDL.Variant({
    'ok': IDL.Nat,
    'err': IDL.Text,
  });

  const DataBatch = IDL.Record({
    'items': IDL.Vec(ScrapedData),
    'clientId': IDL.Principal,
    'batchId': IDL.Text,
  });

  // Define the service interface
  return IDL.Service({
    'storeBatch': IDL.Func([DataBatch], [Result], []),
    'getByTopic': IDL.Func([IDL.Text], [IDL.Vec(ScrapedData)], ['query']),
    'getBySource': IDL.Func([IDL.Text], [IDL.Vec(ScrapedData)], ['query']),
    'getStats': IDL.Func([], [StorageStats], ['query']),
    'getCycles': IDL.Func([], [IDL.Nat], ['query']),
    'getScrapedData': IDL.Func([IDL.Vec(IDL.Text)], [IDL.Vec(ScrapedData)], ['query']),
    'getAllData': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Text, ScrapedData))], ['query']),
  });
};

export default storageIdlFactory;
