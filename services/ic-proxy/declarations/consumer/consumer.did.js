const idlFactory = ({ IDL }) => {
  const Result_1 = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  const Result_12 = IDL.Variant({ 'ok' : IDL.Int, 'err' : IDL.Text });
  const ConversionRequest = IDL.Record({
    'id' : IDL.Text,
    'status' : IDL.Text,
    'userId' : IDL.Principal,
    'walletAddress' : IDL.Text,
    'tokensGross' : IDL.Nat,
    'tokensFee' : IDL.Nat,
    'tokensNet' : IDL.Nat,
    'pointsAmount' : IDL.Nat,
    'requestedAt' : IDL.Int,
  });
  const Result_11 = IDL.Variant({ 'ok' : ConversionRequest, 'err' : IDL.Text });
  const UserProfileBackup = IDL.Record({
    'totalPagesScraped' : IDL.Nat,
    'created' : IDL.Int,
    'principal' : IDL.Principal,
    'referralCode' : IDL.Text,
    'referralCount' : IDL.Nat,
    'referredBy' : IDL.Opt(IDL.Principal),
    'totalDataScraped' : IDL.Nat,
    'pointsFromReferrals' : IDL.Nat,
    'totalBandwidthUsed' : IDL.Nat,
    'lastLogin' : IDL.Int,
    'devices' : IDL.Vec(IDL.Text),
    'points' : IDL.Nat,
    'pointsFromScraping' : IDL.Nat,
  });
  const PointsRecord = IDL.Record({
    'source' : IDL.Text,
    'earnedAt' : IDL.Int,
    'amount' : IDL.Nat,
  });
  const Result_10 = IDL.Variant({
    'ok' : IDL.Record({
      'profiles' : IDL.Vec(IDL.Tuple(IDL.Principal, UserProfileBackup)),
      'conversionRequests' : IDL.Vec(IDL.Tuple(IDL.Text, ConversionRequest)),
      'pointsHistory' : IDL.Vec(
        IDL.Tuple(IDL.Principal, IDL.Vec(PointsRecord))
      ),
    }),
    'err' : IDL.Text,
  });
  const Result = IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text });
  const Result_9 = IDL.Variant({
    'ok' : IDL.Vec(ConversionRequest),
    'err' : IDL.Text,
  });
  const ReferralUse = IDL.Record({
    'pointsAwarded' : IDL.Nat,
    'userPrincipal' : IDL.Principal,
    'timestamp' : IDL.Int,
  });
  const UserProfile = IDL.Record({
    'region' : IDL.Opt(IDL.Text),
    'totalPagesScraped' : IDL.Nat,
    'latitude' : IDL.Opt(IDL.Float64),
    'created' : IDL.Int,
    'principal' : IDL.Principal,
    'referralCode' : IDL.Text,
    'country' : IDL.Opt(IDL.Text),
    'referralHistory' : IDL.Vec(ReferralUse),
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
    'pointsFromReferrals' : IDL.Nat,
    'totalBandwidthUsed' : IDL.Nat,
    'longitude' : IDL.Opt(IDL.Float64),
    'dataVolumeKB' : IDL.Nat,
    'sessionBandwidthUsed' : IDL.Nat,
    'lastLogin' : IDL.Int,
    'devices' : IDL.Vec(IDL.Text),
    'lastActive' : IDL.Int,
    'sessionPagesScraped' : IDL.Nat,
    'ipAddress' : IDL.Opt(IDL.Text),
    'points' : IDL.Nat,
    'pointsFromScraping' : IDL.Nat,
  });
  const GeographicDistribution = IDL.Record({
    'region' : IDL.Opt(IDL.Text),
    'country' : IDL.Text,
    'dataVolumeKB' : IDL.Nat,
    'nodeCount' : IDL.Nat,
    'coordinates' : IDL.Opt(
      IDL.Record({ 'lat' : IDL.Float64, 'lng' : IDL.Float64 })
    ),
  });
  const Result_8 = IDL.Variant({
    'ok' : IDL.Vec(PointsRecord),
    'err' : IDL.Text,
  });
  const Error = IDL.Variant({
    'InvalidInput' : IDL.Text,
    'SystemError' : IDL.Text,
    'NotFound' : IDL.Null,
    'NotAuthorized' : IDL.Null,
    'AlreadyExists' : IDL.Null,
  });
  const Result_7 = IDL.Variant({ 'ok' : UserProfile, 'err' : Error });
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
  const Result_6 = IDL.Variant({ 'ok' : IDL.Vec(ScrapedData), 'err' : Error });
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
  const Result_5 = IDL.Variant({
    'ok' : IDL.Vec(ScrapingTopic),
    'err' : Error,
  });
  const Result_4 = IDL.Variant({
    'ok' : IDL.Vec(ScrapingTopic),
    'err' : IDL.Text,
  });
  const Result_3 = IDL.Variant({ 'ok' : UserProfile, 'err' : IDL.Text });
  const Result_2 = IDL.Variant({ 'ok' : IDL.Null, 'err' : Error });
  return IDL.Service({
    'awardPoints' : IDL.Func([IDL.Principal, IDL.Nat], [Result_1], []),
    'createBackupSnapshot' : IDL.Func([IDL.Text], [Result_12], []),
    'createConversionRequest' : IDL.Func([IDL.Nat, IDL.Text], [Result_11], []),
    'exportForBackup' : IDL.Func([], [Result_10], []),
    'fixAllKazakhstanUsers' : IDL.Func([], [Result], []),
    'fixExistingUsersData' : IDL.Func([], [Result], []),
    'fixUserGeolocation' : IDL.Func([IDL.Principal], [Result_1], []),
    'getAllConversionRequests' : IDL.Func([], [Result_9], ['query']),
    'getAllUsers' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Principal, UserProfile))],
        ['query'],
      ),
    'getBackupInfo' : IDL.Func(
        [],
        [
          IDL.Record({
            'totalPointsRecords' : IDL.Nat,
            'totalProfiles' : IDL.Nat,
            'totalConversionRequests' : IDL.Nat,
          }),
        ],
        ['query'],
      ),
    'getConversionRequests' : IDL.Func([IDL.Principal], [Result_9], ['query']),
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
    'getPointsHistory' : IDL.Func([IDL.Principal], [Result_8], ['query']),
    'getProfile' : IDL.Func([], [Result_7], []),
    'getReferralCode' : IDL.Func([], [Result], []),
    'getRhinoScanStats' : IDL.Func([], [RhinoScanStats], ['query']),
    'getScrapedData' : IDL.Func([IDL.Vec(IDL.Text)], [Result_6], []),
    'getTopContributors' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Nat))],
        ['query'],
      ),
    'getTopics' : IDL.Func([], [Result_5], []),
    'getTopicsForUser' : IDL.Func([IDL.Principal], [Result_4], []),
    'getUserData' : IDL.Func([], [Result_3], []),
    'getUserScrapedUrls' : IDL.Func([], [IDL.Vec(IDL.Text)], []),
    'hasUserScrapedUrl' : IDL.Func([IDL.Text], [IDL.Bool], []),
    'mergeDuplicateUsers' : IDL.Func([IDL.Principal], [Result], []),
    'populateReferralCodes' : IDL.Func([], [Result], []),
    'recalculateAllUsersPoints' : IDL.Func([], [Result], []),
    'recalculatePointsBreakdown' : IDL.Func([], [Result], []),
    'refreshAllEmptyLocations' : IDL.Func([], [Result], []),
    'refreshUserGeolocation' : IDL.Func([IDL.Principal], [Result], []),
    'registerDevice' : IDL.Func([IDL.Text], [Result_2], []),
    'submitScrapedData' : IDL.Func([ScrapedData], [Result_2], []),
    'updateAllUsersGeoFromAPI' : IDL.Func([], [Result], []),
    'updatePreferences' : IDL.Func([IDL.Bool, IDL.Text], [Result_2], []),
    'updateUserLocationByIP' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text, IDL.Text],
        [Result],
        [],
      ),
    'updateUserLogin' : IDL.Func([IDL.Text], [Result_1], []),
    'updateUserLoginForPrincipal' : IDL.Func(
        [IDL.Principal, IDL.Text],
        [Result],
        [],
      ),
    'useReferralCode' : IDL.Func([IDL.Text], [Result_1], []),
    'useReferralCodeForPrincipal' : IDL.Func(
        [IDL.Principal, IDL.Text],
        [Result],
        [],
      ),
  });
};
const init = ({ IDL }) => { return []; };

module.exports = { idlFactory, init };
