module.exports = {
  apps: [
    {
      name: 'search-proxy',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        CONSUMER_CANISTER_ID: 't3pjp-kqaaa-aaaao-a4ooq-cai'
      }
    }
  ]
};