# RhinoSpider Canister IDs - PRODUCTION

## ✅ CORRECT CANISTER IDS (DO NOT CHANGE)

### 1. **Admin Frontend (UI Assets)**
- **ID:** `sxsvc-aqaaa-aaaaj-az4ta-cai`
- **URL:** https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io/
- **Purpose:** Hosts the admin dashboard UI (React app)

### 2. **Admin Backend (Business Logic)**
- **ID:** `wvset-niaaa-aaaao-a4osa-cai`
- **Purpose:** Contains all admin methods (createTopic, updateTopic, etc.)
- **Methods Available:**
  - `createTopic` - Create new scraping topics
  - `updateTopic` - Update existing topics
  - `deleteTopic` - Delete topics
  - `getTopics` - Get all topics
  - `add_user` - Add admin users
  - `setGlobalAIConfig` - Configure AI settings

### 3. **Storage Canister**
- **ID:** `hhaip-uiaaa-aaaao-a4khq-cai`
- **Purpose:** Stores scraped data from extension users

### 4. **Consumer/Referral Canister**
- **ID:** `t3pjp-kqaaa-aaaao-a4ooq-cai`
- **Purpose:** Manages user points, rewards, and referrals

### 5. **Auth Canister**
- **ID:** `rdmx6-jaaaa-aaaaa-aaadq-cai`
- **Purpose:** Handles authentication

## 🎯 TOPICS ALREADY ADDED

1. **DePIN Infrastructure News** (ID: depin_infra_1)
2. **AI Agents Development** (ID: ai_agents_1)
3. **Web3 Security Exploits** (ID: web3_security_1)
4. **Test Topic** (ID: test_1)

## 👥 ADMIN USERS CONFIGURED

1. `t52au-jmmys-xpd7e-f2cc7-xgsya-2ajbl-22leo-e7hep-kclwp-kqzoq-jae`
2. `m2x6b-rijrs-nmddl-i4o4z-x2ymi-5equa-cgtmd-y5pag-6f6p4-plfjj-vae`

## 🚀 SERVICES URLS

- **Admin Dashboard:** https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io/
- **Search Proxy:** https://search-proxy.rhinospider.com
- **IC Proxy:** https://ic-proxy.rhinospider.com

## ⚠️ IMPORTANT NOTES

- **DO NOT REINSTALL CANISTERS** - All data will be lost
- **DO NOT CONFUSE FRONTEND AND BACKEND** - They are separate canisters
- The admin frontend (sxsvc) calls the admin backend (wvset) for all operations
- All canisters are properly deployed and working

## 📝 Environment Variables

```env
VITE_ADMIN_BACKEND_CANISTER_ID=wvset-niaaa-aaaao-a4osa-cai
VITE_ADMIN_FRONTEND_CANISTER_ID=sxsvc-aqaaa-aaaaj-az4ta-cai
VITE_STORAGE_CANISTER_ID=hhaip-uiaaa-aaaao-a4khq-cai
VITE_CONSUMER_CANISTER_ID=t3pjp-kqaaa-aaaao-a4ooq-cai
VITE_AUTH_CANISTER_ID=rdmx6-jaaaa-aaaaa-aaadq-cai
```