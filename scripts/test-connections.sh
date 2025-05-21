#!/bin/bash
# test-connections.sh - Test RhinoSpider connections with curl

echo "=== RhinoSpider Connection Test Script ==="
echo "Running tests: $(date)"
echo

# Test both HTTP and HTTPS for each endpoint
test_endpoint() {
    local protocol=$1
    local domain=$2
    local endpoint=$3
    local method=${4:-GET}
    local data=${5:-""}
    
    echo "Testing ${protocol}://${domain}${endpoint} (${method}):"
    
    if [ "$method" == "GET" ]; then
        # Run curl with verbose output and timing
        curl -v -s -k -o /dev/null -w "%{http_code} - Connect: %{time_connect}s, TTFB: %{time_starttransfer}s, Total: %{time_total}s\n" \
            "${protocol}://${domain}${endpoint}"
    else
        # For POST requests
        curl -v -s -k -o /dev/null -w "%{http_code} - Connect: %{time_connect}s, TTFB: %{time_starttransfer}s, Total: %{time_total}s\n" \
            -X POST -H "Content-Type: application/json" -d "${data}" \
            "${protocol}://${domain}${endpoint}"
    fi
    
    echo "-------------------------------------"
}

# Test all domains and protocols
echo "=== Testing ic-proxy.rhinospider.com ==="
test_endpoint "http" "ic-proxy.rhinospider.com" "/api/health"
test_endpoint "https" "ic-proxy.rhinospider.com" "/api/health"
test_endpoint "http" "ic-proxy.rhinospider.com" "/api/topics" "POST" '{"principalId":"test-principal"}'
test_endpoint "https" "ic-proxy.rhinospider.com" "/api/topics" "POST" '{"principalId":"test-principal"}'

echo "=== Testing search-proxy.rhinospider.com ==="
test_endpoint "http" "search-proxy.rhinospider.com" "/api/health"
test_endpoint "https" "search-proxy.rhinospider.com" "/api/health"
test_endpoint "http" "search-proxy.rhinospider.com" "/api/search" "POST" '{"query":"test"}'
test_endpoint "https" "search-proxy.rhinospider.com" "/api/search" "POST" '{"query":"test"}'

echo "=== Testing DNS Resolution ==="
echo "ic-proxy.rhinospider.com resolves to:"
dig +short ic-proxy.rhinospider.com
echo
echo "search-proxy.rhinospider.com resolves to:"
dig +short search-proxy.rhinospider.com
echo

echo "=== Testing HTTPS Certificate Details ==="
echo "ic-proxy.rhinospider.com certificate:"
echo | openssl s_client -servername ic-proxy.rhinospider.com -connect ic-proxy.rhinospider.com:443 2>/dev/null | openssl x509 -noout -text | grep -A1 "Subject:"
echo | openssl s_client -servername ic-proxy.rhinospider.com -connect ic-proxy.rhinospider.com:443 2>/dev/null | openssl x509 -noout -dates
echo
echo "search-proxy.rhinospider.com certificate:"
echo | openssl s_client -servername search-proxy.rhinospider.com -connect search-proxy.rhinospider.com:443 2>/dev/null | openssl x509 -noout -text | grep -A1 "Subject:"
echo | openssl s_client -servername search-proxy.rhinospider.com -connect search-proxy.rhinospider.com:443 2>/dev/null | openssl x509 -noout -dates
echo

echo "=== Testing completed ==="
