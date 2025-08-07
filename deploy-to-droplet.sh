#!/bin/bash

# Deploy RhinoSpider proxy services to Digital Ocean droplet
# IP: 143.244.133.154

echo "🚀 Deploying RhinoSpider Proxy Services to 143.244.133.154"
echo "========================================================="

# Step 1: Copy proxy code to droplet
echo ""
echo "📦 Copying proxy code to server..."
echo "---------------------------------"

# Copy IC Proxy
echo "Copying IC Proxy service..."
scp -r services/ic-proxy/* root@143.244.133.154:/var/www/rhinospider/ic-proxy/

# Copy Search Proxy
echo "Copying Search Proxy service..."
scp -r services/search-proxy/* root@143.244.133.154:/var/www/rhinospider/search-proxy/

# Copy deployment script
echo "Copying deployment fix script..."
scp deploy-proxy-fix.sh root@143.244.133.154:/tmp/

echo ""
echo "✅ Files copied successfully!"
echo ""
echo "Now SSH into the server and run the deployment script:"
echo ""
echo "ssh root@143.244.133.154"
echo "chmod +x /tmp/deploy-proxy-fix.sh"
echo "sudo /tmp/deploy-proxy-fix.sh"
echo ""
echo "Or run this one-liner to deploy automatically:"
echo "ssh root@143.244.133.154 'chmod +x /tmp/deploy-proxy-fix.sh && sudo /tmp/deploy-proxy-fix.sh'"