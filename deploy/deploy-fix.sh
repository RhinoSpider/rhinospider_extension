#!/bin/bash

# Define server details
SERVER_IP="143.244.133.154"
SERVER_USER="root"
TARGET_DIR="/opt/rhinospider/search-proxy"

# Display information
echo "Deploying search proxy service fix to $SERVER_USER@$SERVER_IP..."

# Upload the fixed routes package
echo "Uploading fixed routes package..."
scp /Users/ayanuali/development/rhinospider/deploy/search-proxy-routes-fix.tar.gz $SERVER_USER@$SERVER_IP:/tmp/

# Execute remote commands to update the service
echo "Updating the service on the server..."
ssh $SERVER_USER@$SERVER_IP << 'EOF'
    # Extract the fixed routes
    mkdir -p /tmp/search-proxy-fix
    tar -xzf /tmp/search-proxy-routes-fix.tar.gz -C /tmp/search-proxy-fix
    
    # Backup the current routes
    echo "Backing up current routes..."
    cp -R "$TARGET_DIR/routes" "$TARGET_DIR/routes.bak"
    
    # Update with the fixed routes
    echo "Updating with fixed routes..."
    cp -R /tmp/search-proxy-fix/routes/* "$TARGET_DIR/routes/"
    
    # Restart the service
    echo "Restarting the search proxy service..."
    systemctl restart rhinospider-search-proxy
    
    # Check service status
    echo "Service status:"
    systemctl status rhinospider-search-proxy | head -n 10
    
    # Clean up
    rm -rf /tmp/search-proxy-fix
    rm /tmp/search-proxy-routes-fix.tar.gz
EOF

echo "Deployment completed!"
