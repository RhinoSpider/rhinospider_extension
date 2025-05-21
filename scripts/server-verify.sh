#!/bin/bash
# server-verify.sh - Script to verify RhinoSpider proxy server configuration

echo "=== RhinoSpider Server Verification Script ==="
echo "Timestamp: $(date)"
echo

echo "=== Checking DNS Resolution ==="
echo "ic-proxy.rhinospider.com resolves to:"
host ic-proxy.rhinospider.com
echo
echo "search-proxy.rhinospider.com resolves to:"
host search-proxy.rhinospider.com
echo

echo "=== Checking Services ==="
echo "Nginx status:"
systemctl status nginx | grep Active
echo
echo "=== Checking Port Availability ==="
echo "Port 80 (HTTP):"
netstat -tuln | grep ":80 "
echo
echo "Port 443 (HTTPS):"
netstat -tuln | grep ":443 "
echo

echo "=== Checking SSL Certificates ==="
for domain in ic-proxy.rhinospider.com search-proxy.rhinospider.com; do
    echo "Certificate for $domain:"
    if [ -f "/etc/letsencrypt/live/$domain/fullchain.pem" ]; then
        openssl x509 -noout -dates -in "/etc/letsencrypt/live/$domain/fullchain.pem"
    else
        echo "Certificate not found!"
    fi
    echo
done

echo "=== Testing Endpoints ==="
for endpoint in "/api/health" "/api/topics"; do
    for domain in ic-proxy.rhinospider.com search-proxy.rhinospider.com; do
        echo "HTTP GET http://$domain$endpoint:"
        curl -s -o /dev/null -w "%{http_code}" "http://$domain$endpoint"
        echo
        
        echo "HTTPS GET https://$domain$endpoint:"
        curl -s -o /dev/null -w "%{http_code}" "https://$domain$endpoint"
        echo
    done
done

echo "=== Verification Complete ==="