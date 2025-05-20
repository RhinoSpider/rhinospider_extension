# RhinoSpider Admin Canister

This README provides instructions for working with the RhinoSpider admin canister.

## Important Canister IDs

- Admin Canister: `444wf-gyaaa-aaaaj-az5sq-cai`
- Admin UI Canister: `sxsvc-aqaaa-aaaaj-az4ta-cai`
- Consumer Canister: `tgyl5-yyaaa-aaaaj-az4wq-cai`

## Deployment Instructions

### Deploying the Admin Canister

Always use `--mode=upgrade` when deploying the admin canister to preserve existing data:

```bash
./deploy-interface-fix.sh
```

### Deploying the Admin UI

To deploy the admin UI, you need to:

1. Build the admin app:
   ```bash
   cd /Users/ayanuali/development/rhinospider/apps/admin
   npm run build
   ```

2. Deploy to the admin UI canister:
   ```bash
   ./deploy-ui.sh
   ```

## Topic Management

### Creating Topics

You can create topics using the admin app UI or using the script:

```bash
./add-financial-topic.sh
```

### Exclude Patterns

The admin canister has been updated to handle exclude patterns correctly. When creating topics via the admin app:

1. Leave the exclude patterns field empty if you're experiencing issues
2. Add exclude patterns later using the script

## Troubleshooting

### Wallet Canister Out of Cycles

If you encounter the error "Canister bfjmy-ryaaa-aaaao-a36qq-cai is out of cycles", you need to top up the wallet canister:

1. Add ICP to your account:
   ```bash
   # Check your balance
   dfx ledger balance --network ic
   
   # Your account address for receiving ICP
   # d835693b374b41716ec476a62107b9960da0fac40267c9402a64377d7b9cb28c
   ```

2. Top up the wallet canister:
   ```bash
   dfx ledger top-up --network ic --amount 0.2 bfjmy-ryaaa-aaaao-a36qq-cai
   ```

### Admin UI Canister Out of Cycles

If the admin UI canister is out of cycles:

```bash
dfx ledger top-up --network ic --amount 0.5 sxsvc-aqaaa-aaaaj-az4ta-cai
```
