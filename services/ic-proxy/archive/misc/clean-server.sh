#!/bin/bash

# Script to clean the Digital Ocean server before reinstalling the IC proxy

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Set SSH details
SSH_USER="root"
SSH_HOST="143.244.133.154"  # Digital Ocean server IP

echo -e "${GREEN}Cleaning Digital Ocean server...${NC}"
echo -e "SSH User: ${YELLOW}$SSH_USER${NC}"
echo -e "SSH Host: ${YELLOW}$SSH_HOST${NC}"

# Create a temporary script to run on the server
TEMP_DIR=$(mktemp -d)
cat > $TEMP_DIR/clean.sh << EOL
#!/bin/bash

# Stop and remove the existing IC proxy service
echo "Stopping and removing existing IC proxy service..."
pm2 stop ic-proxy || true
pm2 delete ic-proxy || true

# Clean up existing directories
echo "Removing existing directories..."
rm -rf /root/rhinospider-ic-proxy
rm -rf /root/ic-proxy
rm -rf /root/declarations

# Clean npm cache
echo "Cleaning npm cache..."
npm cache clean --force

echo "Server cleaned successfully!"
EOL

# Make the cleaning script executable
chmod +x $TEMP_DIR/clean.sh

# Transfer the script to the server
echo "Transferring cleaning script to the server..."
echo "You may be prompted for your SSH password"
scp $TEMP_DIR/clean.sh $SSH_USER@$SSH_HOST:/tmp/

# Execute the cleaning script on the server
echo "Executing cleaning script on the server..."
echo "You may be prompted for your SSH password again"
ssh $SSH_USER@$SSH_HOST "cd /tmp && ./clean.sh"

# Clean up the temporary directory
echo "Cleaning up temporary directory..."
rm -rf $TEMP_DIR

echo -e "${GREEN}Server cleaning completed!${NC}"
