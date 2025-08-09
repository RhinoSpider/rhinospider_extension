export const idlFactory = ({ IDL }) => {
  const Result = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  const GeographicDistribution = IDL.Record({
    'region' : IDL.Opt(IDL.Text),
    'country' : IDL.Text,
    'dataVolumeKB' : IDL.Nat,
    'nodeCount' : IDL.Nat,
    'coordinates' : IDL.Opt(
      IDL.Record({ 'lat' : IDL.Float64, 'lng' : IDL.Float64 })
    ),
  });
  const UserProfile = IDL.Record({
    'region' : IDL.Opt(IDL.Text),
    'latitude' : IDL.Opt(IDL.Float64),
    'created' : IDL.Int,
    'principal' : IDL.Principal,
    'referralCode' : IDL.Text,
    'country' : IDL.Opt(IDL.Text),
    'scrapedUrls' : IDL.Vec(IDL.Text),
    'city' : IDL.Opt(IDL.Text),
    'referralCount' : IDL.Nat,
    'isActive' : IDL.Bool,
    'preferences' : IDL.Record({
      'theme' : IDL.Text,
      'notificationsEnabled' : IDL.Bool,
    }),
    'referredBy' : IDL.Opt(IDL.Principal),
    'totalDataScraped' : IDL.Nat,
    'longitude' : IDL.Opt(IDL.Float64),
    'dataVolumeKB' : IDL.Nat,
    'lastLogin' : IDL.Int,
    'devices' : IDL.Vec(IDL.Text),
    'lastActive' : IDL.Int,
    'ipAddress' : IDL.Opt(IDL.Text),
    'points' : IDL.Nat,
  });
  const Error = IDL.Variant({
    'InvalidInput' : IDL.Text,
    'SystemError' : IDL.Text,
    'NotFound' : IDL.Null,
    'NotAuthorized' : IDL.Null,
    'AlreadyExists' : IDL.Null,
  });
  const Result_6 = IDL.Variant({ 'ok' : UserProfile, 'err' : Error });
  const Result_5 = IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text });
  const NodeActivity = IDL.Record({
    'region' : IDL.Opt(IDL.Text),
    'principal' : IDL.Principal,
    'country' : IDL.Opt(IDL.Text),
    'city' : IDL.Opt(IDL.Text),
    'dataVolumeKB' : IDL.Nat,
    'lastActive' : IDL.Int,
  });
  const RhinoScanStats = IDL.Record({
    'nodesByCountry' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat)),
    'recentActivity' : IDL.Vec(NodeActivity),
    'totalNodes' : IDL.Nat,
    'countriesCount' : IDL.Nat,
    'totalDataVolumeKB' : IDL.Nat,
    'activeNodes' : IDL.Nat,
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
  const Result_4 = IDL.Variant({ 'ok' : IDL.Vec(ScrapedData), 'err' : Error });
  const ScrapingField = IDL.Record({
    'name' : IDL.Text,
    'aiPrompt' : IDL.Opt(IDL.Text),
    'required' : IDL.Bool,
    'fieldType' : IDL.Text,
  });
  const ExtractionRules = IDL.Record({
    'fields' : IDL.Vec(ScrapingField),
    'customPrompt' : IDL.Opt(IDL.Text),
  });
  const CostLimits = IDL.Record({
    'maxConcurrent' : IDL.Nat,
    'maxDailyCost' : IDL.Float64,
    'maxMonthlyCost' : IDL.Float64,
  });
  const AIConfig = IDL.Record({
    'model' : IDL.Text,
    'costLimits' : CostLimits,
    'apiKey' : IDL.Text,
  });
  const ScrapingTopic = IDL.Record({
    'id' : IDL.Text,
    'status' : IDL.Text,
    'name' : IDL.Text,
    'createdAt' : IDL.Int,
    'scrapingInterval' : IDL.Nat,
    'description' : IDL.Text,
    'randomizationMode' : IDL.Opt(IDL.Text),
    'maxRetries' : IDL.Nat,
    'percentageNodes' : IDL.Opt(IDL.Nat),
    'activeHours' : IDL.Record({ 'end' : IDL.Nat, 'start' : IDL.Nat }),
    'geolocationFilter' : IDL.Opt(IDL.Text),
    'urlPatterns' : IDL.Vec(IDL.Text),
    'extractionRules' : ExtractionRules,
    'aiConfig' : AIConfig,
  });
  const Result_3 = IDL.Variant({
    'ok' : IDL.Vec(ScrapingTopic),
    'err' : Error,
  });
  const Result_2 = IDL.Variant({ 'ok' : UserProfile, 'err' : IDL.Text });
  const Result_1 = IDL.Variant({ 'ok' : IDL.Null, 'err' : Error });
  return IDL.Service({
    'awardPoints' : IDL.Func([IDL.Principal, IDL.Nat], [Result], []),
    'getNodeGeography' : IDL.Func(
        [],
        [IDL.Vec(GeographicDistribution)],
        ['query'],
      ),
    'getNodeStatus' : IDL.Func(
        [IDL.Principal],
        [
          IDL.Opt(
            IDL.Record({
              'country' : IDL.Opt(IDL.Text),
              'isActive' : IDL.Bool,
              'dataVolumeKB' : IDL.Nat,
              'lastActive' : IDL.Int,
              'points' : IDL.Nat,
            })
          ),
        ],
        ['query'],
      ),
    'getProfile' : IDL.Func([], [Result_6], []),
    'getReferralCode' : IDL.Func([], [Result_5], []),
    'getRhinoScanStats' : IDL.Func([], [RhinoScanStats], ['query']),
    'getScrapedData' : IDL.Func([IDL.Vec(IDL.Text)], [Result_4], []),
    'getTopContributors' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Nat))],
        ['query'],
      ),
    'getTopics' : IDL.Func([], [Result_3], []),
    'getUserData' : IDL.Func([], [Result_2], []),
    'getUserScrapedUrls' : IDL.Func([], [IDL.Vec(IDL.Text)], []),
    'hasUserScrapedUrl' : IDL.Func([IDL.Text], [IDL.Bool], []),
    'registerDevice' : IDL.Func([IDL.Text], [Result_1], []),
    'submitScrapedData' : IDL.Func([ScrapedData], [Result_1], []),
    'updatePreferences' : IDL.Func([IDL.Bool, IDL.Text], [Result_1], []),
    'updateUserLogin' : IDL.Func([IDL.Text], [Result], []),
    'useReferralCode' : IDL.Func([IDL.Text], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
