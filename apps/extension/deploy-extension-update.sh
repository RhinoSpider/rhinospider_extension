#!/bin/bash

# Script to build and package the extension with the updated proxy client

echo "=== Building RhinoSpider Extension with Updated Proxy Client ==="

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Build the extension
echo "Building extension..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
  echo "Build failed! Aborting."
  exit 1
fi

# Create a zip file of the extension
echo "Creating extension package..."
cd build
zip -r ../rhinospider-extension-update.zip *

# Return to the original directory
cd ..

echo "=== Extension Build Complete ==="
echo "The updated extension has been packaged as rhinospider-extension-update.zip"
echo "You can now install this updated extension in your browser."
