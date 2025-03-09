#!/bin/bash

# Script to build the RhinoSpider extension

echo "Building RhinoSpider extension..."

# Set the source and build directories
SOURCE_DIR="/Users/ayanuali/development/rhinospider/apps/extension"
BUILD_DIR="/Users/ayanuali/development/rhinospider/apps/extension/build"

# Create the build directory if it doesn't exist
mkdir -p $BUILD_DIR

# Clean the build directory
echo "Cleaning build directory..."
rm -rf $BUILD_DIR/*

# Copy the source files to the build directory
echo "Copying files to build directory..."
cp -r $SOURCE_DIR/src/* $BUILD_DIR/
cp $SOURCE_DIR/manifest.json $BUILD_DIR/

# Build the extension bundle
echo "Building extension bundle..."
cd $SOURCE_DIR
npm run build

echo "Extension build completed!"
echo "The extension is ready for testing at: $BUILD_DIR"
echo "You can load this as an unpacked extension in Chrome for testing."
