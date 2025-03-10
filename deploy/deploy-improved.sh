#!/bin/bash

# Define server details
SERVER_IP="143.244.133.154"
SERVER_USER="root"
TARGET_DIR="/opt/rhinospider/search-proxy"

# Display information
echo "Deploying improved search proxy service to $SERVER_USER@$SERVER_IP..."

# First, let's recreate the package with the correct structure
echo "Creating deployment package..."
cd /Users/ayanuali/development/rhinospider
rm -f deploy/search-proxy-improved.tar.gz
tar -czf deploy/search-proxy-improved.tar.gz -C services/search-proxy routes services

# Upload the improved package
echo "Uploading improved package..."
scp /Users/ayanuali/development/rhinospider/deploy/search-proxy-improved.tar.gz $SERVER_USER@$SERVER_IP:/tmp/

# Execute remote commands to update the service
echo "Updating the service on the server..."
ssh $SERVER_USER@$SERVER_IP << 'EOF'
    # Extract the improved code
    mkdir -p /tmp/search-proxy-improved
    tar -xzf /tmp/search-proxy-improved.tar.gz -C /tmp/search-proxy-improved
    
    # Verify extracted content
    echo "Verifying extracted content..."
    ls -la /tmp/search-proxy-improved
    
    # Backup the current code
    echo "Backing up current code..."
    mkdir -p "$TARGET_DIR/backups/$(date +%Y%m%d%H%M%S)"
    cp -R "$TARGET_DIR/routes" "$TARGET_DIR/backups/$(date +%Y%m%d%H%M%S)/routes"
    cp -R "$TARGET_DIR/services" "$TARGET_DIR/backups/$(date +%Y%m%d%H%M%S)/services"
    
    # Update with the improved code
    echo "Updating with improved code..."
    cp -R /tmp/search-proxy-improved/routes/* "$TARGET_DIR/routes/"
    cp -R /tmp/search-proxy-improved/services/* "$TARGET_DIR/services/"
    
    # Fix permissions
    chown -R www-data:www-data "$TARGET_DIR/routes/"
    chown -R www-data:www-data "$TARGET_DIR/services/"
    chmod -R 755 "$TARGET_DIR/routes/"
    chmod -R 755 "$TARGET_DIR/services/"
    
    # Restart the service
    echo "Restarting the search proxy service..."
    systemctl restart rhinospider-search-proxy
    
    # Check service status
    echo "Service status:"
    systemctl status rhinospider-search-proxy | head -n 10
    
    # Clean up
    rm -rf /tmp/search-proxy-improved
    rm /tmp/search-proxy-improved.tar.gz
    
    # Show logs
    echo "Recent logs:"
    journalctl -u rhinospider-search-proxy -n 20 --no-pager
EOF

echo "Deployment completed!"
