#!/bin/bash

echo "🔧 RESTORING NGINX CONFIGURATIONS"
echo "================================="

# Create IC proxy nginx config
cat > /etc/nginx/sites-available/ic-proxy.rhinospider.com << 'EOF'
server {
    listen 80;
    server_name ic-proxy.rhinospider.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ic-proxy.rhinospider.com;

    ssl_certificate /etc/letsencrypt/live/ic-proxy.rhinospider.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ic-proxy.rhinospider.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

echo "✅ Created IC proxy config"

# Create search proxy nginx config
cat > /etc/nginx/sites-available/search-proxy.rhinospider.com << 'EOF'
server {
    listen 80;
    server_name search-proxy.rhinospider.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name search-proxy.rhinospider.com;

    ssl_certificate /etc/letsencrypt/live/search-proxy.rhinospider.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/search-proxy.rhinospider.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

echo "✅ Created search proxy config"

# Enable sites
ln -sf /etc/nginx/sites-available/ic-proxy.rhinospider.com /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/search-proxy.rhinospider.com /etc/nginx/sites-enabled/

echo "✅ Enabled both sites"

# Test nginx config
echo "🧪 Testing nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx config is valid"
    echo "🔄 Reloading nginx..."
    systemctl reload nginx
    echo "✅ Nginx reloaded"
else
    echo "❌ Nginx config has errors!"
    exit 1
fi

echo ""
echo "🌐 Testing domains..."
sleep 3
curl -I https://ic-proxy.rhinospider.com
echo ""
curl -I https://search-proxy.rhinospider.com

echo ""
echo "✅ NGINX RESTORED!"