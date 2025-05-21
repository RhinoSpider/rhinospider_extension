#!/bin/bash

# RhinoSpider Hosts Fix Script
# This script manually updates the /etc/hosts file to fix DNS resolution issues

echo "===== RhinoSpider Hosts Fix Script ====="
echo "This script will manually update the /etc/hosts file to fix DNS resolution issues"

# Check if we're running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run this script as root (sudo ./fix-hosts.sh)"
  exit 1
fi

# Digital Ocean server IP
SERVER_IP="143.244.133.154"

# Domain names
IC_PROXY_DOMAIN="ic-proxy.rhinospider.com"
SEARCH_PROXY_DOMAIN="search-proxy.rhinospider.com"

# Backup hosts file
echo "===== Backing up /etc/hosts file ====="
cp /etc/hosts /etc/hosts.bak.$(date +%Y%m%d%H%M%S)
echo "Backup created: /etc/hosts.bak.$(date +%Y%m%d%H%M%S)"

# Create a temporary file with the updated hosts entries
echo "===== Creating updated hosts file ====="
cat /etc/hosts | grep -v "$IC_PROXY_DOMAIN" | grep -v "$SEARCH_PROXY_DOMAIN" > /tmp/hosts.new
echo "$SERVER_IP $IC_PROXY_DOMAIN" >> /tmp/hosts.new
echo "$SERVER_IP $SEARCH_PROXY_DOMAIN" >> /tmp/hosts.new

# Replace the hosts file with the updated one
echo "===== Updating /etc/hosts file ====="
cp /tmp/hosts.new /etc/hosts
rm /tmp/hosts.new

# Flush DNS cache
echo "===== Flushing DNS cache ====="
if [ "$(uname)" == "Darwin" ]; then
  # macOS
  dscacheutil -flushcache
  killall -HUP mDNSResponder
  echo "DNS cache flushed (macOS)"
elif [ -f /etc/debian_version ]; then
  # Debian/Ubuntu
  systemd-resolve --flush-caches || true
  service network-manager restart || true
  echo "DNS cache flushed (Debian/Ubuntu)"
elif [ -f /etc/redhat-release ]; then
  # CentOS/RHEL
  systemctl restart NetworkManager || true
  echo "DNS cache flushed (CentOS/RHEL)"
else
  echo "Unknown OS, could not flush DNS cache"
fi

# Verify the changes
echo "===== Verifying changes ====="
echo "Updated /etc/hosts file:"
cat /etc/hosts

echo "===== Testing DNS resolution ====="
echo "IC Proxy domain ($IC_PROXY_DOMAIN) now resolves to:"
host $IC_PROXY_DOMAIN || echo "Failed to resolve $IC_PROXY_DOMAIN"

echo "Search Proxy domain ($SEARCH_PROXY_DOMAIN) now resolves to:"
host $SEARCH_PROXY_DOMAIN || echo "Failed to resolve $SEARCH_PROXY_DOMAIN"

# Test connections
echo "===== Testing connections ====="
echo "Testing HTTP connections:"
curl -s -o /dev/null -w "%{http_code}\n" http://$IC_PROXY_DOMAIN:3001/api/health || echo "Failed to connect to $IC_PROXY_DOMAIN via HTTP"
curl -s -o /dev/null -w "%{http_code}\n" http://$SEARCH_PROXY_DOMAIN:3002/api/health || echo "Failed to connect to $SEARCH_PROXY_DOMAIN via HTTP"

echo "Testing HTTPS connections:"
curl -s -o /dev/null -w "%{http_code}\n" https://$IC_PROXY_DOMAIN/api/health || echo "Failed to connect to $IC_PROXY_DOMAIN via HTTPS"
curl -s -o /dev/null -w "%{http_code}\n" https://$SEARCH_PROXY_DOMAIN/api/health || echo "Failed to connect to $SEARCH_PROXY_DOMAIN via HTTPS"

echo "===== Hosts fix completed ====="
echo "The domains should now resolve to the correct IP address"
echo "Next step: Restart your browser and test the extension"
