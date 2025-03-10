#!/bin/bash

# Define server details
SERVER_IP="143.244.133.154"
SERVER_USER="root"
TARGET_DIR="/opt/rhinospider/search-proxy"

# Display information
echo "Deploying improved search proxy service to $SERVER_USER@$SERVER_IP..."

# Create a temporary directory for our files
TMP_DIR=$(mktemp -d)
echo "Created temporary directory: $TMP_DIR"

# Copy the modified files to the temporary directory
echo "Copying modified files..."
mkdir -p "$TMP_DIR/search-proxy/routes"
mkdir -p "$TMP_DIR/search-proxy/services"
cp -R /Users/ayanuali/development/rhinospider/services/search-proxy/routes/* "$TMP_DIR/search-proxy/routes/"
cp -R /Users/ayanuali/development/rhinospider/services/search-proxy/services/* "$TMP_DIR/search-proxy/services/"

# Create the deployment package
echo "Creating deployment package..."
cd "$TMP_DIR"
tar -czf search-proxy-improved.tar.gz search-proxy

# Upload the improved package
echo "Uploading improved package..."
scp "$TMP_DIR/search-proxy-improved.tar.gz" $SERVER_USER@$SERVER_IP:/tmp/

# Execute remote commands to update the service
echo "Updating the service on the server..."
ssh $SERVER_USER@$SERVER_IP "
    # Set the target directory
    TARGET_DIR=\"$TARGET_DIR\"
    
    # Extract the improved code
    echo \"Extracting the improved code...\"
    mkdir -p /tmp/search-proxy-improved
    tar -xzf /tmp/search-proxy-improved.tar.gz -C /tmp/search-proxy-improved
    
    # Verify extracted content
    echo \"Verifying extracted content...\"
    ls -la /tmp/search-proxy-improved
    
    # Create backup directory
    BACKUP_DIR=\"\$TARGET_DIR/backups/\$(date +%Y%m%d%H%M%S)\"
    echo \"Creating backup directory: \$BACKUP_DIR\"
    mkdir -p \"\$BACKUP_DIR\"
    
    # Backup the current code
    echo \"Backing up current code...\"
    if [ -d \"\$TARGET_DIR/routes\" ]; then
        cp -R \"\$TARGET_DIR/routes\" \"\$BACKUP_DIR/routes\"
    fi
    
    if [ -d \"\$TARGET_DIR/services\" ]; then
        cp -R \"\$TARGET_DIR/services\" \"\$BACKUP_DIR/services\"
    fi
    
    # Ensure target directories exist
    echo \"Ensuring target directories exist...\"
    mkdir -p \"\$TARGET_DIR/routes\"
    mkdir -p \"\$TARGET_DIR/services\"
    
    # Update with the improved code
    echo \"Updating with improved code...\"
    cp -R /tmp/search-proxy-improved/search-proxy/routes/* \"\$TARGET_DIR/routes/\"
    cp -R /tmp/search-proxy-improved/search-proxy/services/* \"\$TARGET_DIR/services/\"
    
    # Fix permissions
    echo \"Fixing permissions...\"
    chown -R www-data:www-data \"\$TARGET_DIR/routes/\"
    chown -R www-data:www-data \"\$TARGET_DIR/services/\"
    chmod -R 755 \"\$TARGET_DIR/routes/\"
    chmod -R 755 \"\$TARGET_DIR/services/\"
    
    # Restart the service
    echo \"Restarting the search proxy service...\"
    systemctl restart rhinospider-search-proxy
    
    # Check service status
    echo \"Service status:\"
    systemctl status rhinospider-search-proxy | head -n 10
    
    # Clean up
    echo \"Cleaning up...\"
    rm -rf /tmp/search-proxy-improved
    rm /tmp/search-proxy-improved.tar.gz
    
    # Show logs
    echo \"Recent logs:\"
    sleep 5  # Wait for the service to start and produce logs
    journalctl -u rhinospider-search-proxy -n 20 --no-pager
"

# Clean up local temporary directory
rm -rf "$TMP_DIR"

echo "Deployment completed!"
