#!/bin/bash

# Create declarations directory
mkdir -p declarations/consumer

# Copy declarations from extension
cp -r ../../apps/extension/declarations/consumer/* ./declarations/consumer/

echo "Declarations copied successfully!"
