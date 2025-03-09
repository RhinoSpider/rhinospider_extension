#!/bin/bash

# Script to install dependencies and run the authorize-consumer.js script

# Change to the script directory
cd "$(dirname "$0")"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Run the authorization script
echo "Running authorization script..."
node authorize-consumer.js "$@"
