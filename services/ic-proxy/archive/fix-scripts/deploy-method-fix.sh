#!/bin/bash
# Deploy Method Fix Script
# This script deploys the method name fix to the Digital Ocean server

# Configuration
REMOTE_USER="root"
REMOTE_HOST="your-digital-ocean-ip"  # Replace with your actual Digital Ocean IP
REMOTE_DIR="/root/ic-proxy"
LOCAL_DIR="$(pwd)"
TIMESTAMP=$(date +%Y%m%d%H%M%S)

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}===== RhinoSpider IC Proxy Method Fix Deployment =====${NC}"
echo -e "${YELLOW}Deploying fix for consumer canister method name${NC}"

# Step 1: Run the local update script to create the fixed files
echo -e "${YELLOW}Step 1: Running local update script...${NC}"
node update-server-method.js

if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to run the update script locally. Aborting deployment.${NC}"
  exit 1
fi

# Step 2: Create a deployment package
echo -e "${YELLOW}Step 2: Creating deployment package...${NC}"
DEPLOY_DIR="deploy-$TIMESTAMP"
mkdir -p "$DEPLOY_DIR"

# Copy the updated files
cp server.js "$DEPLOY_DIR/"
cp direct-storage-endpoint.js "$DEPLOY_DIR/" 2>/dev/null || :
cp fix-submission-method.js "$DEPLOY_DIR/"
cp update-server-method.js "$DEPLOY_DIR/"

# Create a deployment script to run on the server
cat > "$DEPLOY_DIR/apply-fix.sh" << 'EOF'
#!/bin/bash
# Apply Method Fix Script
# This script applies the method name fix on the server

# Configuration
SERVICE_NAME="ic-proxy"
BACKUP_DIR="backups/$(date +%Y%m%d%H%M%S)"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}===== Applying RhinoSpider IC Proxy Method Fix =====${NC}"

# Step 1: Create backup directory
echo -e "${YELLOW}Step 1: Creating backup directory...${NC}"
mkdir -p "$BACKUP_DIR"

# Step 2: Backup current files
echo -e "${YELLOW}Step 2: Backing up current files...${NC}"
cp server.js "$BACKUP_DIR/" 2>/dev/null || echo "server.js not found"
cp direct-storage-endpoint.js "$BACKUP_DIR/" 2>/dev/null || echo "direct-storage-endpoint.js not found"

# Step 3: Apply the fix
echo -e "${YELLOW}Step 3: Applying the method name fix...${NC}"
node update-server-method.js

if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to apply the method name fix. Rolling back...${NC}"
  cp "$BACKUP_DIR/server.js" . 2>/dev/null || :
  cp "$BACKUP_DIR/direct-storage-endpoint.js" . 2>/dev/null || :
  exit 1
fi

# Step 4: Restart the service
echo -e "${YELLOW}Step 4: Restarting the service...${NC}"
pm2 restart "$SERVICE_NAME"

if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to restart the service. Please check the service status.${NC}"
  exit 1
fi

# Step 5: Verify the service is running
echo -e "${YELLOW}Step 5: Verifying the service is running...${NC}"
sleep 5
pm2 status "$SERVICE_NAME"

echo -e "${GREEN}Method fix has been successfully applied!${NC}"
echo -e "${GREEN}A backup of the original files is available in $BACKUP_DIR${NC}"
EOF

chmod +x "$DEPLOY_DIR/apply-fix.sh"

# Step 3: Create a tarball of the deployment package
echo -e "${YELLOW}Step 3: Creating tarball of the deployment package...${NC}"
tar -czf "method-fix-$TIMESTAMP.tar.gz" "$DEPLOY_DIR"

# Step 4: Upload the deployment package to the server
echo -e "${YELLOW}Step 4: Uploading deployment package to the server...${NC}"
echo -e "${YELLOW}Please enter the password for $REMOTE_USER@$REMOTE_HOST when prompted${NC}"
scp "method-fix-$TIMESTAMP.tar.gz" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"

if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to upload the deployment package. Aborting deployment.${NC}"
  exit 1
fi

# Step 5: Extract and apply the fix on the server
echo -e "${YELLOW}Step 5: Extracting and applying the fix on the server...${NC}"
ssh "$REMOTE_USER@$REMOTE_HOST" "cd $REMOTE_DIR && \
  tar -xzf method-fix-$TIMESTAMP.tar.gz && \
  cd $DEPLOY_DIR && \
  ./apply-fix.sh"

if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to apply the fix on the server. Please check the server logs.${NC}"
  exit 1
fi

# Step 6: Clean up
echo -e "${YELLOW}Step 6: Cleaning up...${NC}"
rm -rf "$DEPLOY_DIR"
rm "method-fix-$TIMESTAMP.tar.gz"

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}The consumer canister method name has been fixed on the server.${NC}"
echo -e "${GREEN}Please verify that the extension is now working correctly.${NC}"
