#!/bin/bash

# Set up variables
SSHPASS="ffGpA2saNS47qr"
SERVER="143.244.133.154"

# Create a simple script to fix the certificate
cat > /tmp/fix-ssl.sh << 'EOF'
#!/bin/bash

echo "===== Running Certbot with Expand flag ====="
certbot --nginx -d ic-proxy.rhinospider.com -d search-proxy.rhinospider.com --non-interactive --agree-tos --email admin@rhinospider.com --expand

# Restart nginx
systemctl restart nginx

# Test HTTPS again
echo "===== Testing HTTPS endpoints ====="
echo "Testing IC Proxy (HTTPS with -k)..."
curl -k -v https://ic-proxy.rhinospider.com/api/health

echo "Testing Search Proxy (HTTPS with -k)..."
curl -k -v https://search-proxy.rhinospider.com/api/health

# Modify nginx config to allow HTTP fallback
echo "===== Modifying Nginx config to keep HTTP working ====="
cp /etc/nginx/sites-available/rhinospider /etc/nginx/sites-available/rhinospider.bak

# Get the current nginx config
awk '
{
    if ($0 ~ /server {/ && flag == 0) {
        flag = 1;
        print "# IC Proxy Server";
        print "server {";
        print "    listen 80;";
        print "    server_name ic-proxy.rhinospider.com;";
        print "";
        print "    location / {";
        print "        proxy_pass http://localhost:3001;";
        print "        proxy_http_version 1.1;";
        print "        proxy_set_header Upgrade $http_upgrade;";
        print "        proxy_set_header Connection \"upgrade\";";
        print "        proxy_set_header Host $host;";
        print "        proxy_cache_bypass $http_upgrade;";
        print "";
        print "        # CORS headers";
        print "        add_header \"Access-Control-Allow-Origin\" \"*\" always;";
        print "        add_header \"Access-Control-Allow-Methods\" \"GET, POST, OPTIONS\" always;";
        print "        add_header \"Access-Control-Allow-Headers\" \"DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,x-device-id\" always;";
        print "        add_header \"Access-Control-Expose-Headers\" \"Content-Length,Content-Range\" always;";
        print "";
        print "        # Handle preflight requests";
        print "        if ($request_method = \"OPTIONS\") {";
        print "            add_header \"Access-Control-Allow-Origin\" \"*\";";
        print "            add_header \"Access-Control-Allow-Methods\" \"GET, POST, OPTIONS\";";
        print "            add_header \"Access-Control-Allow-Headers\" \"DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,x-device-id\";";
        print "            add_header \"Access-Control-Max-Age\" 1728000;";
        print "            add_header \"Content-Type\" \"text/plain; charset=utf-8\";";
        print "            add_header \"Content-Length\" 0;";
        print "            return 204;";
        print "        }";
        print "    }";
        print "}";
        next;
    } else if ($0 ~ /server {/ && flag == 1 && secondServer == 0) {
        secondServer = 1;
        print "# Search Proxy Server";
        print "server {";
        print "    listen 80;";
        print "    server_name search-proxy.rhinospider.com;";
        print "";
        print "    location / {";
        print "        proxy_pass http://localhost:3002;";
        print "        proxy_http_version 1.1;";
        print "        proxy_set_header Upgrade $http_upgrade;";
        print "        proxy_set_header Connection \"upgrade\";";
        print "        proxy_set_header Host $host;";
        print "        proxy_cache_bypass $http_upgrade;";
        print "";
        print "        # CORS headers";
        print "        add_header \"Access-Control-Allow-Origin\" \"*\" always;";
        print "        add_header \"Access-Control-Allow-Methods\" \"GET, POST, OPTIONS\" always;";
        print "        add_header \"Access-Control-Allow-Headers\" \"DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,x-device-id\" always;";
        print "        add_header \"Access-Control-Expose-Headers\" \"Content-Length,Content-Range\" always;";
        print "";
        print "        # Handle preflight requests";
        print "        if ($request_method = \"OPTIONS\") {";
        print "            add_header \"Access-Control-Allow-Origin\" \"*\";";
        print "            add_header \"Access-Control-Allow-Methods\" \"GET, POST, OPTIONS\";";
        print "            add_header \"Access-Control-Allow-Headers\" \"DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,x-device-id\";";
        print "            add_header \"Access-Control-Max-Age\" 1728000;";
        print "            add_header \"Content-Type\" \"text/plain; charset=utf-8\";";
        print "            add_header \"Content-Length\" 0;";
        print "            return 204;";
        print "        }";
        print "    }";
        print "}";
        next;
    }
    print;
}
' /etc/nginx/sites-available/rhinospider > /tmp/rhinospider.conf

cat /tmp/rhinospider.conf > /etc/nginx/sites-available/rhinospider

# Check nginx config
nginx -t

# Restart nginx
systemctl restart nginx

echo "===== Testing connections one more time ====="
echo "Testing HTTP domain endpoints..."
curl -v http://ic-proxy.rhinospider.com/api/health
curl -v http://search-proxy.rhinospider.com/api/health

echo "Testing HTTPS domain endpoints (with -k)..."
curl -k -v https://ic-proxy.rhinospider.com/api/health
curl -k -v https://search-proxy.rhinospider.com/api/health

echo "===== SSL fix completed ====="
EOF

chmod +x /tmp/fix-ssl.sh

# Upload and execute the script
echo "Attempting to connect to server and run SSL fix script..."
cat /tmp/fix-ssl.sh | sshpass -p "${SSHPASS}" ssh -o StrictHostKeyChecking=no root@${SERVER} "cat > /root/fix-ssl.sh && chmod +x /root/fix-ssl.sh && /root/fix-ssl.sh"

# Clean up
rm /tmp/fix-ssl.sh
