#!/bin/bash

# Script to fix the missing dependencies in the IC proxy

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Set SSH details
SSH_USER="root"
SSH_HOST="143.244.133.154"  # Digital Ocean server IP

echo -e "${GREEN}Fixing missing dependencies on the server...${NC}"
echo -e "SSH User: ${YELLOW}$SSH_USER${NC}"
echo -e "SSH Host: ${YELLOW}$SSH_HOST${NC}"

# Create a temporary script to run on the server
TEMP_DIR=$(mktemp -d)
cat > $TEMP_DIR/fix-deps.sh << EOL
#!/bin/bash

# Stop the IC proxy service
echo "Stopping IC proxy service..."
pm2 stop ic-proxy || true

# Navigate to the directory
cd /root/rhinospider-ic-proxy

# Create verify-submission.js if it doesn't exist
if [ ! -f "verify-submission.js" ]; then
  echo "verify-submission.js is missing, creating an empty file..."
  touch verify-submission.js
  echo "module.exports = {};" > verify-submission.js
fi

# Force reinstall all dependencies explicitly
echo "Reinstalling dependencies explicitly..."
npm install express cors @dfinity/agent @dfinity/candid @dfinity/identity @dfinity/principal node-fetch@2 pem-file --force

# Verify express is installed
if [ -d "node_modules/express" ]; then
  echo "Express module is now installed."
else
  echo "Express module installation failed. Trying alternative approach..."
  npm cache clean --force
  rm -rf node_modules package-lock.json
  npm install
fi

# Restart the service
echo "Restarting IC proxy service..."
pm2 restart ic-proxy

echo "Fix completed!"
EOL

# Make the fix script executable
chmod +x $TEMP_DIR/fix-deps.sh

# Transfer the script to the server
echo "Transferring fix script to the server..."
echo "You may be prompted for your SSH password"
scp $TEMP_DIR/fix-deps.sh $SSH_USER@$SSH_HOST:/tmp/

# Execute the fix script on the server
echo "Executing fix script on the server..."
echo "You may be prompted for your SSH password again"
ssh $SSH_USER@$SSH_HOST "cd /tmp && ./fix-deps.sh"

# Clean up the temporary directory
echo "Cleaning up temporary directory..."
rm -rf $TEMP_DIR

echo -e "${GREEN}Fix completed!${NC}"
echo "To check the server status, run: ssh $SSH_USER@$SSH_HOST 'pm2 status'"
echo "To view logs, run: ssh $SSH_USER@$SSH_HOST 'pm2 logs ic-proxy'"
