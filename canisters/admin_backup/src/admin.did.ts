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

  const CostLimits = IDL.Record({
    'dailyUSD': IDL.Nat,
    'monthlyUSD': IDL.Nat,
    'maxConcurrent': IDL.Nat,
  });

  const AIConfig = IDL.Record({
    'apiKey': IDL.Text,
    'model': IDL.Text,
    'costLimits': CostLimits,
  });

  const ScrapedData = IDL.Record({
    'id': IDL.Text,
    'topic_id': IDL.Text,
    'url': IDL.Text,
    'timestamp': IDL.Nat64,
    'extracted_by': IDL.Text,
    'data': IDL.Record({ 'text': IDL.Text }),
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
    'get_topics': IDL.Func([], [IDL.Vec(ScrapingTopic)], ['query']),
    'create_topic': IDL.Func([ScrapingTopic], [ScrapingTopic], []),
    'update_topic': IDL.Func([IDL.Text, ScrapingTopic], [ScrapingTopic], []),
    'delete_topic': IDL.Func([IDL.Text], [], []),
    
    'getAIConfig': IDL.Func([], [IDL.Variant({ 'Ok': AIConfig, 'Err': IDL.Text })], []),
    'updateAIConfig': IDL.Func([AIConfig], [IDL.Variant({ 'Ok': IDL.Null, 'Err': IDL.Text })], []),
    
    'get_scraped_data': IDL.Func([IDL.Opt(IDL.Text)], [IDL.Vec(ScrapedData)], ['query']),
    'delete_scraped_data': IDL.Func([IDL.Text], [], []),
    
    'get_users': IDL.Func([], [IDL.Vec(ExtensionUser)], ['query']),
    'update_user': IDL.Func([IDL.Text, ExtensionUser], [ExtensionUser], []),
  });
};
