#\!/bin/bash

echo "Deploying IC proxy fixes to production..."

# SSH to server and pull latest code
echo "Updating code on server and restarting IC proxy..."
ssh root@143.244.133.154 << 'ENDSSH'
cd /root/rhinospider
git pull origin main
cd services/ic-proxy
npm install
pm2 restart ic-proxy
pm2 save
echo "IC proxy restarted successfully"
ENDSSH

echo "Testing geo-distribution after restart..."
sleep 5

# Test the API
curl -s -X POST https://ic-proxy.rhinospider.com/api/topics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer rhinospider-api-key-2024" \
  -d '{
    "nodeCharacteristics": {
      "ipAddress": "185.18.253.132",
      "region": "KZ",
      "percentageNodes": 100,
      "randomizationMode": "none"
    }
  }' | python3 -m json.tool | head -30

echo "Deployment complete\!"
