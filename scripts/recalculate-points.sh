#!/bin/bash

# Script to recalculate points for users with referrals

export DFX_WARNING=-mainnet_plaintext_identity

echo "Recalculating points for users with referrals..."

# List of principals that need recalculation
PRINCIPALS=(
    "fthnf-of772-uaxra-paqk2-hpfnq-svrzd-ti4jf-ye5jj-54ftt-5gpr6-jae"  # 3 referrals
    "x7oqc-2us37-te2b6-onxbj-kqxgu-jf77o-e43kv-o4oah-o3xna-e4b2m-3ae"  # 1 referral
)

echo "Note: This function can only be called by the user themselves."
echo "Users need to call this function from their own identity."
echo ""
echo "Affected users who need to recalculate:"
for PRINCIPAL in "${PRINCIPALS[@]}"; do
    echo "- $PRINCIPAL"
done

echo ""
echo "To fix your points breakdown, users should:"
echo "1. Open the dashboard"
echo "2. Check if referral points show as 0 when they have referrals"
echo "3. Contact support if points need adjustment"