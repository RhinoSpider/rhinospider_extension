# RhinoSpider Points & Referral System Documentation

## 📊 Points System

### **How Points Are Earned**

1. **Data Contribution Points**
   - **Rate:** 10 points per KB of data scraped
   - **Calculation:** `points = (contentLength / 1024) * 10`
   - **Applied:** Automatically when submitting scraped data

2. **Referral Bonuses** (One-time per referral)
   - **Tier 1 (1-10 referrals):** 100 points per new user
   - **Tier 2 (11-30 referrals):** 50 points per new user
   - **Tier 3 (31-70 referrals):** 25 points per new user
   - **Tier 4 (71+ referrals):** 5 points per new user

3. **Referral Revenue Sharing**
   - **10% Commission:** Referrers earn 10% of all points their referrals generate
   - **Lifetime Earnings:** Commission continues as long as referrals contribute

4. **Admin Bonus Points**
   - Admins can award bonus points for special events or achievements
   - Only admin canister can call `awardPoints()` function

### **Points Configuration**
```motoko
POINTS_PER_KB = 10          // Points per kilobyte of data
DAILY_BONUS_POINTS = 50     // Reserved for future daily login bonus
QUALITY_MULTIPLIER = 2      // Reserved for high-quality data bonus
```

## 🔗 Referral System

### **How It Works**

1. **Getting Your Referral Code**
   - Every user automatically gets a unique 12-character referral code
   - Format: 8 hex chars + 4 timestamp chars (e.g., "a3f2b1c84567")
   - Code is generated on first login or profile creation

2. **Using a Referral Code**
   - New users can enter a referral code during signup
   - Code must be used BEFORE creating profile
   - One-time use only (cannot change referrer later)

3. **Referral Tracking**
   - System tracks:
     - `referralCount`: How many users you've referred
     - `referredBy`: Who referred you (if applicable)
     - Commission earnings from referrals

### **Implementation Details**

#### Consumer Canister Functions:
- `getReferralCode()` - Get your unique referral code
- `useReferralCode(code)` - Apply a referral code (new users only)
- `getUserData()` - View your points, referrals, and stats

#### Data Structure:
```motoko
type UserProfile = {
    principal: Principal;
    points: Nat;                // Total points earned
    totalDataScraped: Nat;       // Total bytes contributed
    dataVolumeKB: Nat;          // Total KB contributed
    referralCode: Text;          // User's unique code
    referralCount: Nat;          // Number of successful referrals
    referredBy: ?Principal;      // Who referred this user
    // ... other fields
}
```

## 💰 Points Redemption (Future)

### **Planned Redemption Options**
1. **Token Conversion** - Convert points to RHINO tokens (1:1 ratio planned)
2. **Premium Features** - Unlock advanced scraping capabilities
3. **NFT Rewards** - Exclusive RhinoSpider NFTs for top contributors
4. **Cash Out** - Direct ICP or USD conversion (subject to rates)

### **Redemption Thresholds** (Proposed)
- Minimum redemption: 1,000 points
- Processing fee: 5% of points redeemed
- Monthly redemption limit: 100,000 points

## 📈 Points Analytics

### **User Metrics Tracked**
- Total points earned
- Points from data contribution
- Points from referrals
- Data volume contributed (KB)
- Active/inactive status
- Geographic location
- Last contribution timestamp

### **Network Metrics** (via RhinoScan)
- Total points distributed
- Average points per user
- Top contributors leaderboard
- Geographic distribution of points
- Daily/weekly/monthly point trends

## 🔒 Security & Anti-Fraud

### **Protections in Place**
1. **Principal-based Authentication** - All actions tied to Internet Identity
2. **One Referral Per User** - Cannot change referrer after signup
3. **Admin-only Bonus Points** - Only admin canister can award extra points
4. **Data Validation** - All scraped data verified before points awarded
5. **Rate Limiting** - Prevents spam submissions

### **Audit Trail**
- All point transactions logged on-chain
- Referral relationships permanently recorded
- Data contributions linked to user profiles
- Geographic tracking for node verification

## 🚀 Getting Started

### **For Users:**
1. Install RhinoSpider extension
2. Login with Internet Identity
3. Start browsing - points earned automatically
4. Share your referral code with friends
5. Track earnings in dashboard

### **For Developers:**
1. Points logic in: `/canisters/consumer/main.mo`
2. Extension integration: `/apps/extension/src/services/consumer.js`
3. Admin controls: `/apps/admin/src/components/`
4. API endpoints: Consumer canister methods

## 📊 Current Statistics (Live)
- **Points per KB:** 10
- **Total Users:** Check RhinoScan
- **Total Points Distributed:** Query consumer canister
- **Active Referral Codes:** Equal to user count
- **Average Points per User:** Calculate from totals

## 🎯 Future Enhancements
1. **Dynamic Point Rates** - Adjust based on data demand
2. **Quality Bonuses** - Extra points for high-value data
3. **Streak Rewards** - Bonus for consecutive days active
4. **Team Competitions** - Group challenges for bonus points
5. **Staking Mechanism** - Lock points for higher rewards

---

*Last Updated: December 2024*
*Version: 1.0.0*
*Status: Production Ready*