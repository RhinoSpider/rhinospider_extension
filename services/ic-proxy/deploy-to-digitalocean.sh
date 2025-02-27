#!/bin/bash

# Deploy IC Proxy to Digital Ocean
# This script assumes you have the Digital Ocean CLI (doctl) installed and authenticated

# Set variables
APP_NAME="rhinospider-ic-proxy"
REGION="nyc1"  # Change to your preferred region
SPEC_FILE="app-spec.yaml"

# Create app spec file
cat > $SPEC_FILE << EOL
name: $APP_NAME
region: $REGION
services:
- name: ic-proxy
  github:
    repo: YOUR_GITHUB_REPO  # Replace with your GitHub repo
    branch: main
    deploy_on_push: true
  build_command: npm install
  run_command: npm start
  http_port: 3000
  instance_count: 1
  instance_size_slug: basic-xs
  routes:
  - path: /
  envs:
  - key: IC_HOST
    value: "https://icp0.io"
    scope: RUN_TIME
  - key: CONSUMER_CANISTER_ID
    value: "tgyl5-yyaaa-aaaaj-az4wq-cai"
    scope: RUN_TIME
  - key: PORT
    value: "3000"
    scope: RUN_TIME
EOL

echo "Created app spec file: $SPEC_FILE"
echo "Please update the GitHub repo in the spec file before deploying."
echo "Then run: doctl apps create --spec $SPEC_FILE"
echo ""
echo "Alternatively, you can deploy using the Digital Ocean App Platform UI:"
echo "1. Go to https://cloud.digitalocean.com/apps"
echo "2. Click 'Create App'"
echo "3. Connect your GitHub repository"
echo "4. Configure the app settings as specified in the app-spec.yaml file"
echo "5. Deploy the app"

chmod +x $0
