#!/bin/bash

# Script to fix the IC proxy service binding issue

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Set SSH details
SSH_USER="root"
SSH_HOST="143.244.133.154"  # Digital Ocean server IP

echo -e "${GREEN}Fixing IC proxy service binding issue...${NC}"
echo -e "SSH User: ${YELLOW}$SSH_USER${NC}"
echo -e "SSH Host: ${YELLOW}$SSH_HOST${NC}"

# Create a temporary script to run on the server
TEMP_DIR=$(mktemp -d)
cat > $TEMP_DIR/fix-binding.sh << EOL
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

# Check the server.js file to see how it's binding
echo "Checking server.js file..."
grep -n "app.listen" server.js

# Create a backup of server.js
cp server.js server.js.backup

# Modify the server.js file to ensure it binds to 0.0.0.0
echo "Modifying server.js to bind to all interfaces..."
sed -i 's/app.listen(PORT)/app.listen(PORT, "0.0.0.0")/' server.js

# Check if the modification was successful
grep -n "app.listen" server.js

# Verify the .env file
echo "Checking .env file..."
cat .env

# Ensure the PORT is set correctly
echo "Ensuring PORT is set to 3001 in .env..."
if grep -q "PORT=" .env; then
  sed -i 's/PORT=.*/PORT=3001/' .env
else
  echo "PORT=3001" >> .env
fi

# Display the updated .env file
cat .env

# Clean npm cache and reinstall dependencies
echo "Cleaning npm cache and reinstalling dependencies..."
npm cache clean --force
rm -rf node_modules package-lock.json
npm install --production

# Start the service with PM2
echo "Starting IC proxy service with PM2..."
pm2 start server.js --name ic-proxy

# Wait for the service to start
echo "Waiting for the service to start..."
sleep 5

# Check if the service is running
echo "Checking if the service is running..."
pm2 status

# Check if the port is being listened on
echo "Checking if port 3001 is being listened on..."
netstat -tulpn | grep 3001

# Test the health endpoint using the server's IP
echo "Testing the health endpoint using the server's IP..."
curl http://0.0.0.0:3001/api/health

# Test the health endpoint using localhost
echo "Testing the health endpoint using localhost..."
curl http://localhost:3001/api/health

# Check the logs for any errors
echo "Checking logs for errors..."
pm2 logs ic-proxy --lines 10

echo "Fix completed!"
EOL

# Make the fix script executable
chmod +x $TEMP_DIR/fix-binding.sh

# Transfer the script to the server
echo "Transferring fix script to the server..."
echo "You may be prompted for your SSH password"
scp $TEMP_DIR/fix-binding.sh $SSH_USER@$SSH_HOST:/tmp/

# Execute the fix script on the server
echo "Executing fix script on the server..."
echo "You may be prompted for your SSH password again"
ssh $SSH_USER@$SSH_HOST "cd /tmp && ./fix-binding.sh"

# Clean up the temporary directory
echo "Cleaning up temporary directory..."
rm -rf $TEMP_DIR

echo -e "${GREEN}Fix completed!${NC}"
echo "To check the server status, run: ssh $SSH_USER@$SSH_HOST 'pm2 status'"
echo "To view logs, run: ssh $SSH_USER@$SSH_HOST 'pm2 logs ic-proxy'"
echo "To test the health endpoint, run: curl http://$SSH_HOST:3001/api/health"
