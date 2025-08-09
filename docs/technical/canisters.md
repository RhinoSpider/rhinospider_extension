# Canisters

## Admin Backend Canister

- **ID**: `wvset-niaaa-aaaao-a4osa-cai`
- **Purpose**: Handles backend logic, topic management, and AI configuration
- **Candid UI**: https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=wvset-niaaa-aaaao-a4osa-cai

## Admin Frontend Canister

- **ID**: `sxsvc-aqaaa-aaaaj-az4ta-cai`
- **Purpose**: Web dashboard for managing topics and viewing data
- **URL**: https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io/

## Consumer Canister

- **ID**: `t3pjp-kqaaa-aaaao-a4ooq-cai`
- **Purpose**: Integrates with the admin canister, handles user profiles, points system, and extension authentication
- **Candid UI**: https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=t3pjp-kqaaa-aaaao-a4ooq-cai

## Storage Canister

- **ID**: `hhaip-uiaaa-aaaao-a4khq-cai`
- **Purpose**: Stores all scraped data from the extension
- **Candid UI**: https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=hhaip-uiaaa-aaaao-a4khq-cai

## Referral Canister

- **ID**: `t3pjp-kqaaa-aaaao-a4ooq-cai`
- **Purpose**: Manages referral system and rewards
- **Candid UI**: https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=t3pjp-kqaaa-aaaao-a4ooq-cai

## Deployment

- **NEVER** use `--mode=reinstall` when deploying canisters, as it will wipe all stored data.
- **ALWAYS** use `--mode=upgrade` to preserve existing data.
