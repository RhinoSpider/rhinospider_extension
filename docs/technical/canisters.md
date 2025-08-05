# Canisters

## Admin Canister

- **ID**: `444wf-gyaaa-aaaaj-az5sq-cai`
- **Purpose**: Handles backend logic, data storage, and topic management.

## Consumer Canister

- **ID**: `tgyl5-yyaaa-aaaaj-az4wq-cai`
- **Purpose**: Integrates with the admin canister and acts as an intermediary for the extension.

## Storage Canister

- **ID**: `hhaip-uiaaa-aaaao-a4khq-cai`
- **Purpose**: Stores all scraped data from the extension.

## Deployment

- **NEVER** use `--mode=reinstall` when deploying canisters, as it will wipe all stored data.
- **ALWAYS** use `--mode=upgrade` to preserve existing data.
