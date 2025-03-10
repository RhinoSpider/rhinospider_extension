#!/bin/bash

# Deployment script for Google Search Service
# This script should be run on your local machine

# Set variables
SERVER_IP="143.244.133.154"
SERVER_USER="root"
APP_DIR="/var/www/google-search-service"

# Prompt for password
echo "Enter password for $SERVER_USER@$SERVER_IP:"
read -s PASSWORD
echo

# Create a temporary directory for deployment files
TEMP_DIR=$(mktemp -d)
echo "Created temporary directory: $TEMP_DIR"

# Copy necessary files to the temporary directory
echo "Copying files to temporary directory..."
cp -r package.json index.js routes services README.md "$TEMP_DIR"

# Create .env file in the temporary directory
cat > "$TEMP_DIR/.env" << EOL
PORT=3000
NODE_ENV=production
EOL

# Create the deployment directory on the server
echo "Creating deployment directory on server..."
ssh -o PubkeyAuthentication=no $SERVER_USER@$SERVER_IP "mkdir -p $APP_DIR"

# Copy files to the server
echo "Copying files to server..."
scp -o PubkeyAuthentication=no -r "$TEMP_DIR"/* "$TEMP_DIR/.env" $SERVER_USER@$SERVER_IP:$APP_DIR

# Install dependencies and start the service
echo "Setting up the service on the server..."
ssh -o PubkeyAuthentication=no $SERVER_USER@$SERVER_IP "cd $APP_DIR && \
    npm install && \
    npm install -g pm2 && \
    pm2 stop google-search-service || true && \
    pm2 start index.js --name google-search-service && \
    pm2 save"

# Set up Nginx
echo "Setting up Nginx..."
ssh -o PubkeyAuthentication=no $SERVER_USER@$SERVER_IP "cat > /etc/nginx/sites-available/google-search-service << EOL
server {
    listen 80;
    server_name $SERVER_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_cache_bypass \\\$http_upgrade;
    }
}
EOL

ln -sf /etc/nginx/sites-available/google-search-service /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx"

# Clean up
echo "Cleaning up temporary directory..."
rm -rf "$TEMP_DIR"

echo "Deployment completed successfully!"
echo "Your service should be running at http://$SERVER_IP"
echo "To check the status, run: ssh -o PubkeyAuthentication=no $SERVER_USER@$SERVER_IP 'pm2 status'"
