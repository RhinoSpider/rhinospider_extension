#!/bin/bash

# Set the extension directory
EXTENSION_DIR="/Users/ayanuali/development/rhinospider/apps/extension"

echo "===== Rebuilding RhinoSpider Chrome Extension ====="
echo "Extension directory: $EXTENSION_DIR"

# Make sure the connection-fallback.js is imported
if ! grep -q "import './connection-fallback.js'" "$EXTENSION_DIR/src/main.js"; then
  echo "Adding connection-fallback.js import to main.js..."
  sed -i '' '1s/^/import ".\/connection-fallback.js";\n/' "$EXTENSION_DIR/src/main.js"
fi

# Verify config.js is correct
echo "Checking config.js..."
cat "$EXTENSION_DIR/src/config.js"

# Build the extension
echo "Building the Chrome extension..."
cd "$EXTENSION_DIR"
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
  echo "Build successful!"
  echo "Extension files are in $EXTENSION_DIR/dist"
else
  echo "Build failed! Please check for errors."
  exit 1
fi

echo "===== Chrome Extension Rebuild Complete ====="
