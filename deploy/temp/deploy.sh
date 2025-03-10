#!/bin/bash

# Deployment script for RhinoSpider Search Proxy Service
# This script builds and deploys the search proxy service to a server

echo "=== RhinoSpider Search Proxy Deployment ==="

# Build Docker image
echo "Building Docker image..."
docker build -t rhinospider-search-proxy:latest .

# Prompt for registry information
read -p "Enter your container registry (e.g., docker.io/username): " REGISTRY

# Tag the image for your registry
echo "Tagging image..."
docker tag rhinospider-search-proxy:latest $REGISTRY/rhinospider-search-proxy:latest

# Push to registry
echo "Pushing to registry..."
docker push $REGISTRY/rhinospider-search-proxy:latest

echo "=== Deployment completed ==="
echo "The search proxy service has been built and pushed to the registry."
echo "To deploy to your server, run the appropriate commands on your server."
echo "Example:"
echo "  docker pull $REGISTRY/rhinospider-search-proxy:latest"
echo "  docker stop rhinospider-search-proxy || true"
echo "  docker rm rhinospider-search-proxy || true"
echo "  docker run -d --name rhinospider-search-proxy -p 3003:3003 --restart always $REGISTRY/rhinospider-search-proxy:latest"
