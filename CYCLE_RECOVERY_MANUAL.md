# 💰 URGENT: Recover 8.3 Trillion Cycles from Old Canisters

## ⚠️ CRITICAL: You have 8.3T cycles in old canisters!

### Old Canisters with Cycles:
1. **Old Admin Backend:** `szqyk-3aaaa-aaaaj-az4sa-cai` 
   - Balance: **4,223,855,666,928 cycles (4.2T)**
   - Status: Running (wasting cycles daily)

2. **Old Consumer:** `tgyl5-yyaaa-aaaaj-az4wq-cai`
   - Balance: **4,102,770,557,790 cycles (4.1T)** 
   - Status: Running (wasting cycles daily)

## 🔄 How to Recover Cycles

Since these canisters aren't cycle wallets, you have a few options:

### Option 1: Use Cycles Manager (Recommended)
1. Go to https://nns.ic0.app
2. Connect with your Internet Identity
3. Go to "Canisters" section
4. Add these canister IDs as "linked canisters"
5. Use the UI to transfer cycles to your new canisters

### Option 2: Use dfx with wallet
```bash
# First, set one of your controlled canisters as wallet
dfx identity set-wallet szqyk-3aaaa-aaaaj-az4sa-cai --network ic

# Then transfer cycles
dfx wallet send wvset-niaaa-aaaao-a4osa-cai 2000000000000 --network ic
dfx wallet send t3pjp-kqaaa-aaaao-a4ooq-cai 2000000000000 --network ic
```

### Option 3: Deploy cycle transfer code
Create a simple transfer function in the old canisters to send cycles to new ones.

## 🗑️ After Recovering Cycles

Stop and delete the old canisters:
```bash
# Stop old admin backend
dfx canister stop szqyk-3aaaa-aaaaj-az4sa-cai --network ic
dfx canister delete szqyk-3aaaa-aaaaj-az4sa-cai --network ic

# Stop old consumer
dfx canister stop tgyl5-yyaaa-aaaaj-az4wq-cai --network ic
dfx canister delete tgyl5-yyaaa-aaaaj-az4wq-cai --network ic
```

## 📝 Current Canister Structure

### ✅ ACTIVE CANISTERS (Keep these):
1. **Admin Frontend:** `sxsvc-aqaaa-aaaaj-az4ta-cai` - Hosts UI
2. **Admin Backend:** `wvset-niaaa-aaaao-a4osa-cai` - Business logic
3. **Storage:** `hhaip-uiaaa-aaaao-a4khq-cai` - Data storage
4. **Consumer/Referral:** `t3pjp-kqaaa-aaaao-a4ooq-cai` - User points
5. **Auth:** `rdmx6-jaaaa-aaaaa-aaadq-cai` - Authentication

### ❌ OLD CANISTERS (Delete after cycle recovery):
1. `szqyk-3aaaa-aaaaj-az4sa-cai` - Old admin backend (4.2T cycles)
2. `tgyl5-yyaaa-aaaaj-az4wq-cai` - Old consumer (4.1T cycles)

## 🔐 What is the Auth Canister?

The **Auth Canister** (`rdmx6-jaaaa-aaaaa-aaadq-cai`) is used for:
- Internet Identity integration
- Secure authentication for admin dashboard
- Session management
- Principal verification
- Access control

It's essential for the admin dashboard login system and security.

## ⚡ Daily Cycle Burn

You're currently burning cycles daily on unused canisters:
- Old admin: 26,820,231 cycles/day
- Old consumer: 26,405,617 cycles/day
- **Total waste: 53,225,848 cycles/day**

**Act quickly to recover your cycles!**