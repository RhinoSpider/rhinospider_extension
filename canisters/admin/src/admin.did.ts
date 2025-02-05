import { IDL } from '@dfinity/candid';

export const idlFactory = ({ IDL }) => {
  const ScrapingField = IDL.Record({
    'name': IDL.Text,
    'description': IDL.Text,
    'ai_prompt': IDL.Text,
    'required': IDL.Bool,
    'field_type': IDL.Text,
    'example': IDL.Opt(IDL.Text),
  });

  const ScrapingTopic = IDL.Record({
    'id': IDL.Text,
    'name': IDL.Text,
    'description': IDL.Text,
    'url_patterns': IDL.Vec(IDL.Text),
    'active': IDL.Bool,
    'extraction_rules': IDL.Record({
      'fields': IDL.Vec(ScrapingField),
      'custom_prompt': IDL.Opt(IDL.Text),
    }),
    'validation': IDL.Opt(IDL.Record({
      'rules': IDL.Vec(IDL.Text),
      'ai_validation': IDL.Opt(IDL.Text),
    })),
    'rate_limit': IDL.Opt(IDL.Record({
      'requests_per_hour': IDL.Nat32,
      'max_concurrent': IDL.Nat32,
    })),
  });

  const AIConfig = IDL.Record({
    'provider': IDL.Text,
    'api_key': IDL.Text,
    'model': IDL.Text,
    'max_tokens': IDL.Nat32,
    'temperature': IDL.Float64,
    'cost_limits': IDL.Record({
      'daily_usd': IDL.Float64,
      'monthly_usd': IDL.Float64,
    }),
  });

  const ScrapedData = IDL.Record({
    'id': IDL.Text,
    'topic_id': IDL.Text,
    'url': IDL.Text,
    'timestamp': IDL.Nat64,
    'extracted_by': IDL.Text,
    'data': IDL.Record(IDL.Text, IDL.Text),
    'quality': IDL.Record({
      'score': IDL.Float64,
      'issues': IDL.Opt(IDL.Vec(IDL.Text)),
    }),
  });

  const ExtensionUser = IDL.Record({
    'principal_id': IDL.Text,
    'status': IDL.Text,
    'last_active': IDL.Nat64,
    'stats': IDL.Record({
      'pages_scraped': IDL.Nat32,
      'data_points': IDL.Nat32,
      'quality_score': IDL.Float64,
    }),
    'rate_limit': IDL.Record({
      'requests_per_hour': IDL.Nat32,
      'max_concurrent': IDL.Nat32,
    }),
  });

  return IDL.Service({
    'getTopics': IDL.Func([], [IDL.Result(IDL.Vec(ScrapingTopic), IDL.Text)], ['query']),
    'createTopic': IDL.Func([ScrapingTopic], [IDL.Result(ScrapingTopic, IDL.Text)], []),
    'updateTopic': IDL.Func([IDL.Text, ScrapingTopic], [IDL.Result(ScrapingTopic, IDL.Text)], []),
    'deleteTopic': IDL.Func([IDL.Text], [IDL.Result(IDL.Bool, IDL.Text)], []),
    
    'getAIConfig': IDL.Func([], [IDL.Result(AIConfig, IDL.Text)], ['query']),
    'updateAIConfig': IDL.Func([AIConfig], [IDL.Result(AIConfig, IDL.Text)], []),
    
    'getScrapedData': IDL.Func([IDL.Opt(IDL.Text)], [IDL.Result(IDL.Vec(ScrapedData), IDL.Text)], ['query']),
    'addScrapedData': IDL.Func([ScrapedData], [IDL.Result(ScrapedData, IDL.Text)], []),
    
    'getUsers': IDL.Func([], [IDL.Result(IDL.Vec(ExtensionUser), IDL.Text)], ['query']),
    'updateUser': IDL.Func([IDL.Text, ExtensionUser], [IDL.Result(ExtensionUser, IDL.Text)], []),
  });
};
