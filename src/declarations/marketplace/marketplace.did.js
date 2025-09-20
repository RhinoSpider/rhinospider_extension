export const idlFactory = ({ IDL }) => {
  const Result_7 = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  const Dataset = IDL.Record({
    'region' : IDL.Text,
    'status' : IDL.Text,
    'on_chain_hash' : IDL.Text,
    'data_source' : IDL.Text,
    'provider' : IDL.Text,
    'dataset_id' : IDL.Text,
    'size_gb' : IDL.Float64,
    'name' : IDL.Text,
    'tags' : IDL.Vec(IDL.Text),
    'row_count' : IDL.Nat,
    'description' : IDL.Text,
    'update_frequency' : IDL.Text,
    'file_url' : IDL.Text,
    'sample_rows' : IDL.Vec(IDL.Text),
    'api_endpoint' : IDL.Opt(IDL.Text),
    'category' : IDL.Text,
    'preview_available' : IDL.Bool,
    'price_api' : IDL.Float64,
    'last_update' : IDL.Int,
    'price_bulk' : IDL.Float64,
    'format' : IDL.Text,
  });
  const Result = IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text });
  const Result_6 = IDL.Variant({ 'ok' : Dataset, 'err' : IDL.Text });
  const Result_5 = IDL.Variant({ 'ok' : IDL.Vec(IDL.Text), 'err' : IDL.Text });
  const DatasetStats = IDL.Record({
    'unique_buyers' : IDL.Nat,
    'dataset_id' : IDL.Text,
    'api_subscriptions' : IDL.Nat,
    'avg_rating' : IDL.Float64,
    'bulk_downloads' : IDL.Nat,
    'total_api_calls' : IDL.Nat,
    'total_revenue' : IDL.Float64,
    'total_purchases' : IDL.Nat,
  });
  const Result_4 = IDL.Variant({ 'ok' : DatasetStats, 'err' : IDL.Text });
  const ApiKey = IDL.Record({
    'user_principal' : IDL.Principal,
    'dataset_id' : IDL.Text,
    'api_key' : IDL.Text,
    'key_id' : IDL.Text,
    'allowed_ips' : IDL.Vec(IDL.Text),
    'created_at' : IDL.Int,
    'last_reset' : IDL.Int,
    'usage_today' : IDL.Nat,
    'last_used' : IDL.Opt(IDL.Int),
    'is_active' : IDL.Bool,
    'request_count' : IDL.Nat,
    'expires_at' : IDL.Opt(IDL.Int),
    'rate_limit_per_minute' : IDL.Nat,
    'daily_limit' : IDL.Nat,
  });
  const User = IDL.Record({
    'last_login' : IDL.Int,
    'total_spent' : IDL.Float64,
    'principal' : IDL.Principal,
    'kyc_verified' : IDL.Bool,
    'use_case' : IDL.Opt(IDL.Text),
    'api_calls_total' : IDL.Nat,
    'company_size' : IDL.Opt(IDL.Text),
    'email' : IDL.Opt(IDL.Text),
    'company' : IDL.Opt(IDL.Text),
    'purchase_count' : IDL.Nat,
    'registered_at' : IDL.Int,
    'preferred_payment' : IDL.Text,
    'account_tier' : IDL.Text,
    'industry' : IDL.Opt(IDL.Text),
  });
  const Result_1 = IDL.Variant({ 'ok' : User, 'err' : IDL.Text });
  const Purchase = IDL.Record({
    'download_count' : IDL.Nat,
    'status' : IDL.Text,
    'user_principal' : IDL.Principal,
    'dataset_id' : IDL.Text,
    'download_url' : IDL.Opt(IDL.Text),
    'created_at' : IDL.Int,
    'purchase_id' : IDL.Text,
    'currency' : IDL.Text,
    'purchase_type' : IDL.Text,
    'amount' : IDL.Float64,
    'expires_at' : IDL.Opt(IDL.Int),
    'payment_tx_id' : IDL.Text,
  });
  const UsageMetrics = IDL.Record({
    'user_principal' : IDL.Principal,
    'data_transferred_gb' : IDL.Float64,
    'dataset_id' : IDL.Text,
    'api_calls_month' : IDL.Nat,
    'api_calls_today' : IDL.Nat,
    'downloads_count' : IDL.Nat,
    'last_access' : IDL.Int,
  });
  const Result_3 = IDL.Variant({ 'ok' : UsageMetrics, 'err' : IDL.Text });
  const Result_2 = IDL.Variant({ 'ok' : Purchase, 'err' : IDL.Text });
  return IDL.Service({
    'addAdmin' : IDL.Func([IDL.Principal], [Result_7], []),
    'createDataset' : IDL.Func([Dataset], [Result], []),
    'getAdmins' : IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
    'getAllDatasets' : IDL.Func([], [IDL.Vec(Dataset)], ['query']),
    'getDataset' : IDL.Func([IDL.Text], [Result_6], ['query']),
    'getDatasetData' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Nat, IDL.Nat],
        [Result_5],
        [],
      ),
    'getDatasetStats' : IDL.Func([IDL.Text], [Result_4], ['query']),
    'getTopDatasets' : IDL.Func([IDL.Nat], [IDL.Vec(Dataset)], ['query']),
    'getUserApiKeys' : IDL.Func([], [IDL.Vec(ApiKey)], []),
    'getUserProfile' : IDL.Func([], [Result_1], []),
    'getUserPurchases' : IDL.Func([], [IDL.Vec(Purchase)], []),
    'getUserUsageMetrics' : IDL.Func([IDL.Text], [Result_3], []),
    'init' : IDL.Func([], [], []),
    'purchaseDataset' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text, IDL.Float64, IDL.Text],
        [Result_2],
        [],
      ),
    'regenerateApiKey' : IDL.Func([IDL.Text], [Result], []),
    'registerUser' : IDL.Func(
        [
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
        ],
        [Result_1],
        [],
      ),
    'searchDatasets' : IDL.Func(
        [
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Float64),
          IDL.Opt(IDL.Float64),
        ],
        [IDL.Vec(Dataset)],
        ['query'],
      ),
    'syncDatasets' : IDL.Func([], [Result], []),
    'syncWithAdmin' : IDL.Func([], [IDL.Text], []),
  });
};
export const init = ({ IDL }) => { return []; };
