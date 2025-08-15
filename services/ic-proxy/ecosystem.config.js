module.exports = {
  apps: [
    {
      name: 'ic-proxy',
      script: 'server-fixed.js',
      env: {
        NODE_ENV: 'production',
        ADMIN_CANISTER_ID: 'wvset-niaaa-aaaao-a4osa-cai',
        CONSUMER_CANISTER_ID: 't3pjp-kqaaa-aaaao-a4ooq-cai',
        STORAGE_CANISTER_ID: 'hhaip-uiaaa-aaaao-a4khq-cai'
      }
    }
  ]
};