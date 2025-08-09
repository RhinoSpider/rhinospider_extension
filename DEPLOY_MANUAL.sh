#!/bin/bash

echo "🚀 PREPARING IC PROXY FOR MANUAL DEPLOYMENT"
echo "==========================================="

echo "📝 Updating consumer canister ID..."
# Update the fixed server file with correct consumer ID
sed -i "" "s/umunu-kh777-77774-qaaca-cai/t3pjp-kqaaa-aaaao-a4ooq-cai/g" services/ic-proxy/server-fixed.js

echo "📦 Creating deployment file: ic-proxy-production.js"
cp services/ic-proxy/server-fixed.js ic-proxy-production.js

echo ""
echo "✅ READY FOR MANUAL DEPLOYMENT!"
echo ""
echo "📋 MANUAL STEPS:"
echo "================"
echo ""
echo "1. Upload ic-proxy-production.js to your server:"
echo "   scp ic-proxy-production.js root@143.244.133.154:/tmp/"
echo ""
echo "2. SSH into server:"
echo "   ssh root@143.244.133.154"
echo ""
echo "3. On server, run:"
echo "   cp /var/www/ic-proxy-v2/server.js /var/www/ic-proxy-v2/server.js.backup"
echo "   cp /tmp/ic-proxy-production.js /var/www/ic-proxy-v2/server.js"
echo "   pm2 restart ic-proxy-v2"
echo "   curl https://ic-proxy.rhinospider.com/api/health"
echo ""
echo "📊 Current Canister IDs in deployment:"
echo "======================================"
echo "Admin:    wvset-niaaa-aaaao-a4osa-cai"
echo "Storage:  hhaip-uiaaa-aaaao-a4khq-cai" 
echo "Consumer: t3pjp-kqaaa-aaaao-a4ooq-cai"
echo ""
echo "✅ File ready: ic-proxy-production.js"