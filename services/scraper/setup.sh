#!/bin/bash

# Exit on error
set -e

# Update system
apt update && apt upgrade -y

# Install Docker
apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
apt update
apt install -y docker-ce

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create app directory
mkdir -p /opt/rhinospider-scraper
cd /opt/rhinospider-scraper

# Create environment file
cat > .env << EOL
NODE_ENV=production
PORT=3000
REDIS_HOST=redis
REDIS_PORT=6379
ALLOWED_ORIGINS=chrome-extension://<extension-id>
VERSION=1.0.0
EOL

# Create log directory
mkdir -p logs
chmod 755 logs

# Copy service files
# Note: You need to copy the following files from your repository:
# - src/
# - package.json
# - package-lock.json
# - docker-compose.yml
# - Dockerfile

# Start services
docker compose up -d

# Show logs
docker compose logs -f

# Print status
echo "RhinoSpider scraper service has been deployed!"
echo "Check the status at: http://localhost:3000/health"
