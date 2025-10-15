#!/bin/bash

# Script to fix referral points for existing users
# Run this as an admin/controller of the consumer canister

export DFX_WARNING=-mainnet_plaintext_identity

echo "Fixing referral points for users with referrals..."
echo ""
echo "Affected users:"
echo "1. fthnf-of772-uaxra-paqk2-hpfnq-svrzd-ti4jf-ye5jj-54ftt-5gpr6-jae"
echo "   - Has 3 referrals but pointsFromReferrals = 0"
echo "   - Should have 300 referral points"
echo ""
echo "2. x7oqc-2us37-te2b6-onxbj-kqxgu-jf77o-e43kv-o4oah-o3xna-e4b2m-3ae"
echo "   - Has 1 referral but pointsFromReferrals = 0"  
echo "   - Should have 100 referral points"
echo ""

# Call the recalculateAllUsersPoints function if you're an admin
echo "To fix: Deploy the updated canister and call:"
echo "dfx canister --network ic call t3pjp-kqaaa-aaaao-a4ooq-cai recalculateAllUsersPoints"
echo ""
echo "Or each user can fix their own by calling:"
echo "dfx canister --network ic call t3pjp-kqaaa-aaaao-a4ooq-cai recalculatePointsBreakdown"