#!/bin/bash

echo "Checking all Nginx configurations..."
echo "===================================="
echo ""

echo "1. List all enabled sites:"
ls -la /etc/nginx/sites-enabled/

echo ""
echo "2. Check for domain configs:"
grep -r "ic-proxy.rhinospider.com\|search-proxy.rhinospider.com" /etc/nginx/sites-enabled/

echo ""
echo "3. Remove conflicting configs and reload:"
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/rhinospider.com
rm -f /etc/nginx/sites-enabled/ic-proxy.rhinospider.com
rm -f /etc/nginx/sites-enabled/search-proxy.rhinospider.com

# Keep only our config
ln -sf /etc/nginx/sites-available/rhinospider /etc/nginx/sites-enabled/rhinospider

echo ""
echo "4. Test and reload:"
nginx -t && systemctl reload nginx

echo ""
echo "5. Final test:"
sleep 2
curl -s https://ic-proxy.rhinospider.com/api/health
echo ""
curl -s https://ic-proxy.rhinospider.com/api/topics | head -c 200