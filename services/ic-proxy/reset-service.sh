#!/bin/bash

# Script to completely reset the IC proxy service and clean all logs

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Set SSH details
SSH_USER="root"
SSH_HOST="143.244.133.154"  # Digital Ocean server IP

echo -e "${GREEN}Completely resetting the IC proxy service...${NC}"
echo -e "SSH User: ${YELLOW}$SSH_USER${NC}"
echo -e "SSH Host: ${YELLOW}$SSH_HOST${NC}"

# Create a temporary script to run on the server
TEMP_DIR=$(mktemp -d)
cat > $TEMP_DIR/reset-service.sh << EOL
#!/bin/bash

# Stop and delete the IC proxy service
echo "Stopping and deleting IC proxy service..."
pm2 stop ic-proxy || true
pm2 delete ic-proxy || true

# Save PM2 process list to apply the changes
echo "Saving PM2 process list..."
pm2 save --force

# Completely remove the log files
echo "Removing log files..."
rm -f /root/.pm2/logs/ic-proxy*

# Start the service with PM2 with a new instance
echo "Starting IC proxy service with PM2..."
cd /root/rhinospider-ic-proxy
pm2 start server.js --name ic-proxy --update-env

# Wait for the service to start
echo "Waiting for the service to start..."
sleep 5

# Check if the service is running
echo "Checking if the service is running..."
pm2 status

# Test the health endpoint
echo "Testing the health endpoint..."
curl http://localhost:3001/api/health

echo "Reset completed!"
EOL

# Make the script executable
chmod +x $TEMP_DIR/reset-service.sh

# Transfer the script to the server
echo "Transferring script to the server..."
echo "You may be prompted for your SSH password"
scp $TEMP_DIR/reset-service.sh $SSH_USER@$SSH_HOST:/tmp/

# Execute the script on the server
echo "Executing script on the server..."
echo "You may be prompted for your SSH password again"
ssh $SSH_USER@$SSH_HOST "cd /tmp && ./reset-service.sh"

# Clean up the temporary directory
echo "Cleaning up temporary directory..."
rm -rf $TEMP_DIR

echo -e "${GREEN}Reset completed!${NC}"
echo "To check the server status, run: ssh $SSH_USER@$SSH_HOST 'pm2 status'"
echo "To view logs, run: ssh $SSH_USER@$SSH_HOST 'pm2 logs ic-proxy'"
echo "To test the health endpoint, run: curl http://$SSH_HOST:3001/api/health"
