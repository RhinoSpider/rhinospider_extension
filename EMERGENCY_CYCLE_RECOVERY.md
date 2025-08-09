# 🚨 EMERGENCY: 8.3T Cycles Recovery Plan

## Current Status:
- **Old Admin:** `szqyk-3aaaa-aaaaj-az4sa-cai` - **4.22T cycles**
- **Old Consumer:** `tgyl5-yyaaa-aaaaj-az4wq-cai` - **4.10T cycles**
- **Daily Burn:** 53M cycles/day from unused canisters
- **You are now controller** of both old canisters ✅

## 🎯 IMMEDIATE ACTION REQUIRED

### Option 1: Use NNS Dapp (Easiest)
1. Go to **https://nns.ic0.app**
2. Login with Internet Identity
3. Go to "Canisters" tab
4. Add canister IDs:
   - `szqyk-3aaaa-aaaaj-az4sa-cai`
   - `tgyl5-yyaaa-aaaaj-az4wq-cai`
5. Use "Send Cycles" feature to transfer to new canisters

### Option 2: dfx Commands (If you have sufficient ICP)
```bash
# Top up new canisters using old ones as source
dfx ledger top-up wvset-niaaa-aaaao-a4osa-cai --amount 40 --network ic
dfx ledger top-up t3pjp-kqaaa-aaaao-a4ooq-cai --amount 40 --network ic
```

### Option 3: Manual Motoko Code Deploy
Deploy cycle transfer code to old canisters to send cycles to new ones.

## ⚠️ WHAT'S HAPPENING NOW:
- **Every day:** 53,225,848 cycles burned (wasted)
- **Every hour:** 2,217,744 cycles burned
- **Cost:** Real money being burned!

## 🎯 Target Canisters (Where to send cycles):
- **New Admin Backend:** `wvset-niaaa-aaaao-a4osa-cai`
- **New Consumer:** `t3pjp-kqaaa-aaaao-a4ooq-cai`

## 🗑️ After Recovery:
```bash
# Stop old canisters
dfx canister stop szqyk-3aaaa-aaaaj-az4sa-cai --network ic
dfx canister stop tgyl5-yyaaa-aaaaj-az4wq-cai --network ic

# Delete them (recovers remaining cycles to your wallet)
dfx canister delete szqyk-3aaaa-aaaaj-az4sa-cai --network ic
dfx canister delete tgyl5-yyaaa-aaaaj-az4wq-cai --network ic
```

## ⚡ URGENT: Do this TODAY!

You're losing money every minute these canisters run unused. The NNS dapp method is fastest and safest.