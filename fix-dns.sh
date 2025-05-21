#!/bin/bash

# RhinoSpider DNS Fix Script
# This script helps fix DNS resolution issues for the RhinoSpider proxy servers

echo "===== RhinoSpider DNS Fix Script ====="
echo "This script will help fix DNS resolution issues for the RhinoSpider proxy servers"

# Check if we're running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run this script as root (sudo ./fix-dns.sh)"
  exit 1
fi

# Digital Ocean server IP
SERVER_IP="143.244.133.154"

# Domain names
IC_PROXY_DOMAIN="ic-proxy.rhinospider.com"
SEARCH_PROXY_DOMAIN="search-proxy.rhinospider.com"

# Check current DNS resolution
echo "===== Checking current DNS resolution ====="
echo "IC Proxy domain ($IC_PROXY_DOMAIN) resolves to:"
host $IC_PROXY_DOMAIN || echo "Failed to resolve $IC_PROXY_DOMAIN"

echo "Search Proxy domain ($SEARCH_PROXY_DOMAIN) resolves to:"
host $SEARCH_PROXY_DOMAIN || echo "Failed to resolve $SEARCH_PROXY_DOMAIN"

# Check if /etc/hosts file exists
if [ ! -f /etc/hosts ]; then
  echo "Error: /etc/hosts file not found"
  exit 1
fi

# Check if domains are already in /etc/hosts
IC_PROXY_IN_HOSTS=$(grep -c "$IC_PROXY_DOMAIN" /etc/hosts)
SEARCH_PROXY_IN_HOSTS=$(grep -c "$SEARCH_PROXY_DOMAIN" /etc/hosts)

# Backup hosts file
echo "===== Backing up /etc/hosts file ====="
cp /etc/hosts /etc/hosts.bak.$(date +%Y%m%d%H%M%S)
echo "Backup created: /etc/hosts.bak.$(date +%Y%m%d%H%M%S)"

# Add or update entries in /etc/hosts
echo "===== Updating /etc/hosts file ====="
if [ $IC_PROXY_IN_HOSTS -gt 0 ]; then
  echo "Updating existing entry for $IC_PROXY_DOMAIN"
  sed -i "/$IC_PROXY_DOMAIN/c\\$SERVER_IP $IC_PROXY_DOMAIN" /etc/hosts
else
  echo "Adding new entry for $IC_PROXY_DOMAIN"
  echo "$SERVER_IP $IC_PROXY_DOMAIN" >> /etc/hosts
fi

if [ $SEARCH_PROXY_IN_HOSTS -gt 0 ]; then
  echo "Updating existing entry for $SEARCH_PROXY_DOMAIN"
  sed -i "/$SEARCH_PROXY_DOMAIN/c\\$SERVER_IP $SEARCH_PROXY_DOMAIN" /etc/hosts
else
  echo "Adding new entry for $SEARCH_PROXY_DOMAIN"
  echo "$SERVER_IP $SEARCH_PROXY_DOMAIN" >> /etc/hosts
fi

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
echo "IC Proxy domain ($IC_PROXY_DOMAIN) now resolves to:"
host $IC_PROXY_DOMAIN || echo "Failed to resolve $IC_PROXY_DOMAIN"

echo "Search Proxy domain ($SEARCH_PROXY_DOMAIN) now resolves to:"
host $SEARCH_PROXY_DOMAIN || echo "Failed to resolve $SEARCH_PROXY_DOMAIN"

# Test connections
echo "===== Testing connections ====="
echo "Testing HTTP connections:"
curl -s -o /dev/null -w "%{http_code}\n" http://$IC_PROXY_DOMAIN/api/health || echo "Failed to connect to $IC_PROXY_DOMAIN via HTTP"
curl -s -o /dev/null -w "%{http_code}\n" http://$SEARCH_PROXY_DOMAIN/api/health || echo "Failed to connect to $SEARCH_PROXY_DOMAIN via HTTP"

echo "Testing HTTPS connections:"
curl -s -o /dev/null -w "%{http_code}\n" https://$IC_PROXY_DOMAIN/api/health || echo "Failed to connect to $IC_PROXY_DOMAIN via HTTPS"
curl -s -o /dev/null -w "%{http_code}\n" https://$SEARCH_PROXY_DOMAIN/api/health || echo "Failed to connect to $SEARCH_PROXY_DOMAIN via HTTPS"

echo "===== DNS fix completed ====="
echo "The domains should now resolve to the correct IP address"
echo "Next step: Restart your browser and test the extension"
