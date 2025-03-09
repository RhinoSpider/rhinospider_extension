#!/bin/bash

# Script to thoroughly clean PM2 logs for the IC proxy service

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Set SSH details
SSH_USER="root"
SSH_HOST="143.244.133.154"  # Digital Ocean server IP

echo -e "${GREEN}Thoroughly cleaning PM2 logs for IC proxy service...${NC}"
echo -e "SSH User: ${YELLOW}$SSH_USER${NC}"
echo -e "SSH Host: ${YELLOW}$SSH_HOST${NC}"

# Create a temporary script to run on the server
TEMP_DIR=$(mktemp -d)
cat > $TEMP_DIR/clean-logs.sh << EOL
#!/bin/bash

# Stop the IC proxy service
echo "Stopping IC proxy service..."
pm2 stop ic-proxy || true

# Clean PM2 logs using flush command
echo "Flushing PM2 logs..."
pm2 flush

# Directly remove the log files
echo "Directly removing log files..."
rm -f /root/.pm2/logs/ic-proxy-*.log

# Restart the service
echo "Restarting IC proxy service..."
pm2 restart ic-proxy

# Wait for the service to start
echo "Waiting for the service to start..."
sleep 5

# Check if the service is running
echo "Checking if the service is running..."
pm2 status

# Test the health endpoint
echo "Testing the health endpoint..."
curl http://localhost:3001/api/health

# Check the logs to verify they're clean
echo "Checking logs to verify they're clean..."
ls -la /root/.pm2/logs/

echo "Log cleaning completed!"
EOL

# Make the script executable
chmod +x $TEMP_DIR/clean-logs.sh

# Transfer the script to the server
echo "Transferring script to the server..."
echo "You may be prompted for your SSH password"
scp $TEMP_DIR/clean-logs.sh $SSH_USER@$SSH_HOST:/tmp/

# Execute the script on the server
echo "Executing script on the server..."
echo "You may be prompted for your SSH password again"
ssh $SSH_USER@$SSH_HOST "cd /tmp && ./clean-logs.sh"

# Clean up the temporary directory
echo "Cleaning up temporary directory..."
rm -rf $TEMP_DIR

echo -e "${GREEN}Log cleaning completed!${NC}"
echo "To check the server status, run: ssh $SSH_USER@$SSH_HOST 'pm2 status'"
echo "To view logs, run: ssh $SSH_USER@$SSH_HOST 'pm2 logs ic-proxy'"
