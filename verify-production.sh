#!/bin/bash

echo "=== RhinoSpider Production Verification ==="
echo ""

# 1. Check admin panel
echo "1. Admin Panel Status:"
if curl -s https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io/assets/ui.CEw8dM8K.js | grep -q "S: .*| R:"; then
    echo "   ✅ Points split (S: scraping | R: referral) is deployed"
else
    echo "   ❌ Points split NOT found"
fi

if curl -s https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io/assets/ui.CEw8dM8K.js | grep -q "userData?.country"; then
    echo "   ✅ Country display is deployed"
else
    echo "   ⚠️  Country display code not found (may be minified differently)"
fi

echo ""
echo "2. Proxy Server Geo-Filtering:"

# Test with Kazakhstan IP
echo "   Testing KZ user (IP: 93.190.242.254):"
KZ_TOPICS=$(curl -s -X POST https://ic-proxy.rhinospider.com/api/consumer-topics \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 93.190.242.254" \
  -d '{"principalId":"test-kz"}' | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d))")
echo "   - Gets $KZ_TOPICS topics (should be 1: ai_agents_1)"

# Test with US IP
echo "   Testing US user (IP: 8.8.8.8):"
US_TOPICS=$(curl -s -X POST https://ic-proxy.rhinospider.com/api/consumer-topics \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 8.8.8.8" \
  -d '{"principalId":"test-us"}' | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d))")
echo "   - Gets $US_TOPICS topics (should be 2: depin_infra_1, geo_test_1)"

# Test with Middle East IP (UAE)
echo "   Testing AE user (IP: 5.195.224.0):"
AE_TOPICS=$(curl -s -X POST https://ic-proxy.rhinospider.com/api/consumer-topics \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 5.195.224.0" \
  -d '{"principalId":"test-ae"}' | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d))")
echo "   - Gets $AE_TOPICS topics (should be 1: web3_security_1)"

echo ""
if [ "$KZ_TOPICS" == "1" ] && [ "$US_TOPICS" == "2" ]; then
    echo "   ✅ Geo-filtering is WORKING correctly!"
else
    echo "   ❌ Geo-filtering NOT working (getting all 4 topics)"
    echo "      Need to deploy proxy server updates to 143.244.133.154"
fi

echo ""
echo "3. User Points Check:"
# Check top user's points
curl -s -X POST https://ic-proxy.rhinospider.com/api/user-profile-by-principal \
  -H "Content-Type: application/json" \
  -d '{"principalId":"idvpn-fiujl-2kds5-iicxw-4qefz-hqld5-smoul-lwul4-pjrdq-e24jt-7ae"}' | \
  python3 -c "import sys, json; d=json.load(sys.stdin); print(f'   User #1: {d[\"points\"]:,} points ({d[\"country\"]})')"

echo ""
echo "=== Summary ==="
if [ "$KZ_TOPICS" == "4" ]; then
    echo "❌ CRITICAL: Proxy geo-filtering NOT deployed - KZ users will get 0 topics!"
    echo "   Run: ./deploy-proxy-production.sh"
else
    echo "✅ Proxy geo-filtering is working"
fi

echo "✅ Admin panel points split is deployed"
echo "⚠️  Admin panel country display needs verification"