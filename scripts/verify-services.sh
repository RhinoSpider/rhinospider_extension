#!/bin/bash
# verify-services.sh - Comprehensive RhinoSpider service verification

echo "=== RhinoSpider Service Verification ==="
echo "Timestamp: $(date)"
echo

# Function to check if a service is running
check_service() {
  local port=$1
  local name=$2
  
  echo "Checking $name on port $port:"
  if lsof -i:$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✅ $name is running on port $port"
    local pid=$(lsof -i:$port -sTCP:LISTEN -t)
    echo "   PID: $pid"
    echo "   Command: $(ps -p $pid -o cmd=)"
    return 0
  else
    echo "❌ $name is NOT running on port $port"
    return 1
  fi
}

# Function to test an endpoint
test_endpoint() {
  local protocol=$1
  local domain=$2
  local endpoint=$3
  local method=${4:-GET}
  local data=${5:-""}
  local flag=""
  
  if [ "$protocol" = "https" ]; then
    flag="-k"  # Skip SSL verification for HTTPS
  fi
  
  echo "Testing $protocol://$domain$endpoint ($method):"
  
  if [ "$method" = "GET" ]; then
    code=$(curl -s $flag -o /dev/null -w "%{http_code}" "$protocol://$domain$endpoint")
  else
    code=$(curl -s $flag -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "$protocol://$domain$endpoint")
  fi
  
  if [ "$code" = "200" ] || [ "$code" = "204" ]; then
    echo "✅ $protocol://$domain$endpoint returned $code"
    return 0
  else
    echo "❌ $protocol://$domain$endpoint returned $code"
    return 1
  fi
}

echo "=== System Information ==="
echo "Server IP: $(curl -s http://checkip.amazonaws.com/ || wget -qO- http://checkip.amazonaws.com/)"
echo "Hostname: $(hostname)"
echo "Date: $(date)"
echo "Uptime: $(uptime)"
echo 

echo "=== DNS Configuration ==="
echo "ic-proxy.rhinospider.com resolves to:"
host ic-proxy.rhinospider.com || echo "Failed to resolve"
echo
echo "search-proxy.rhinospider.com resolves to:"
host search-proxy.rhinospider.com || echo "Failed to resolve"
echo

echo "=== Service Status ==="
check_service 3001 "IC Proxy"
check_service 3002 "Search Proxy"
check_service 80 "HTTP (nginx)"
check_service 443 "HTTPS (nginx)"
echo

echo "=== Nginx Configuration ==="
if command -v nginx >/dev/null 2>&1; then
  echo "Nginx found. Checking configuration:"
  nginx -t
  echo
  echo "Sites enabled:"
  ls -la /etc/nginx/sites-enabled/
else
  echo "❌ Nginx not installed!"
fi
echo

echo "=== Certificate Status ==="
for domain in ic-proxy.rhinospider.com search-proxy.rhinospider.com; do
  echo "Certificate for $domain:"
  if [ -f "/etc/letsencrypt/live/$domain/fullchain.pem" ]; then
    echo "✅ Certificate found at /etc/letsencrypt/live/$domain/fullchain.pem"
    echo "Details:"
    openssl x509 -noout -dates -in "/etc/letsencrypt/live/$domain/fullchain.pem"
    echo "Subject:"
    openssl x509 -noout -subject -in "/etc/letsencrypt/live/$domain/fullchain.pem"
  else
    echo "❌ Certificate not found!"
  fi
  echo
done

echo "=== Connection Tests ==="
echo "Testing IC Proxy:"
test_endpoint "http" "ic-proxy.rhinospider.com" "/api/health"
test_endpoint "https" "ic-proxy.rhinospider.com" "/api/health"
test_endpoint "http" "localhost:3001" "/api/health"
echo

echo "Testing Search Proxy:"
test_endpoint "http" "search-proxy.rhinospider.com" "/api/health"
test_endpoint "https" "search-proxy.rhinospider.com" "/api/health"
test_endpoint "http" "localhost:3002" "/api/health"
echo

echo "=== Extensive Connection Tests ==="
test_endpoint "http" "ic-proxy.rhinospider.com" "/api/topics" "POST" '{"principalId":"test-principal"}'
test_endpoint "https" "ic-proxy.rhinospider.com" "/api/topics" "POST" '{"principalId":"test-principal"}'
test_endpoint "http" "search-proxy.rhinospider.com" "/api/search" "POST" '{"query":"test"}'
test_endpoint "https" "search-proxy.rhinospider.com" "/api/search" "POST" '{"query":"test"}'
echo

echo "=== Additional Verification ==="
echo "Checking CORS headers on HTTP:"
curl -s -I -X OPTIONS http://ic-proxy.rhinospider.com/api/health | grep -i "Access-Control"
echo
echo "Checking CORS headers on HTTPS:"
curl -s -I -k -X OPTIONS https://ic-proxy.rhinospider.com/api/health | grep -i "Access-Control"
echo

echo "=== Verification Complete ==="
echo "If you see any ❌ errors above, please fix them using server-fix.sh"
