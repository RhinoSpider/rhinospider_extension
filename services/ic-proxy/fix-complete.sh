#!/bin/bash

# Script to completely fix the IC proxy service

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Set SSH details
SSH_USER="root"
SSH_HOST="143.244.133.154"  # Digital Ocean server IP

echo -e "${GREEN}Performing complete fix of the IC proxy service...${NC}"
echo -e "SSH User: ${YELLOW}$SSH_USER${NC}"
echo -e "SSH Host: ${YELLOW}$SSH_HOST${NC}"

# Create a temporary script to run on the server
TEMP_DIR=$(mktemp -d)
cat > $TEMP_DIR/fix-complete.sh << EOL
#!/bin/bash

# Stop and delete the IC proxy service
echo "Stopping and deleting IC proxy service..."
pm2 stop ic-proxy || true
pm2 delete ic-proxy || true

# Clean PM2 logs
echo "Cleaning PM2 logs..."
pm2 flush

# Navigate to the directory
cd /root/rhinospider-ic-proxy

# Create verify-submission.js if it doesn't exist
if [ ! -f "verify-submission.js" ]; then
  echo "verify-submission.js is missing, creating an empty file..."
  touch verify-submission.js
  echo "module.exports = {};" > verify-submission.js
fi

# Clean npm cache and reinstall dependencies
echo "Cleaning npm cache and reinstalling dependencies..."
npm cache clean --force
rm -rf node_modules package-lock.json
npm install --production

# Verify express is installed
if [ -d "node_modules/express" ]; then
  echo "Express module is now installed."
else
  echo "Express module installation failed. Installing explicitly..."
  npm install express cors @dfinity/agent @dfinity/candid @dfinity/identity @dfinity/principal node-fetch@2 pem-file --save
fi

# Start the service with PM2
echo "Starting IC proxy service with PM2..."
pm2 start server.js --name ic-proxy

# Check if the service is running
echo "Checking if the service is running..."
pm2 status

# Test the health endpoint
echo "Testing the health endpoint..."
curl http://localhost:3001/api/health

echo "Fix completed!"
EOL

# Make the fix script executable
chmod +x $TEMP_DIR/fix-complete.sh

# Transfer the script to the server
echo "Transferring fix script to the server..."
echo "You may be prompted for your SSH password"
scp $TEMP_DIR/fix-complete.sh $SSH_USER@$SSH_HOST:/tmp/

# Execute the fix script on the server
echo "Executing fix script on the server..."
echo "You may be prompted for your SSH password again"
ssh $SSH_USER@$SSH_HOST "cd /tmp && ./fix-complete.sh"

# Clean up the temporary directory
echo "Cleaning up temporary directory..."
rm -rf $TEMP_DIR

echo -e "${GREEN}Fix completed!${NC}"
echo "To check the server status, run: ssh $SSH_USER@$SSH_HOST 'pm2 status'"
echo "To view logs, run: ssh $SSH_USER@$SSH_HOST 'pm2 logs ic-proxy'"
