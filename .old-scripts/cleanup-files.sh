#!/bin/bash

# Script to clean up unnecessary files and organize the admin canister directory

echo "CLEANING UP ADMIN CANISTER DIRECTORY"
echo "=================================="

# Create a backup directory
BACKUP_DIR="/Users/ayanuali/development/rhinospider/canisters/admin/backup"
mkdir -p $BACKUP_DIR
echo "Created backup directory: $BACKUP_DIR"

# Move old files to backup directory
echo "Moving old files to backup directory..."

# Move all admin-*.mo files except admin-final.mo
for file in /Users/ayanuali/development/rhinospider/canisters/admin/admin-*.mo; do
  if [ "$file" != "/Users/ayanuali/development/rhinospider/canisters/admin/admin-final.mo" ]; then
    echo "Moving $file to backup directory"
    mv "$file" $BACKUP_DIR/
  fi
done

# Move all deploy-*.sh files except deploy-final.sh
for file in /Users/ayanuali/development/rhinospider/canisters/admin/deploy-*.sh; do
  if [ "$file" != "/Users/ayanuali/development/rhinospider/canisters/admin/deploy-final.sh" ]; then
    echo "Moving $file to backup directory"
    mv "$file" $BACKUP_DIR/
  fi
done

# Rename the final files to be the main ones
echo "Renaming final files to be the main ones..."
cp /Users/ayanuali/development/rhinospider/canisters/admin/admin-final.mo /Users/ayanuali/development/rhinospider/canisters/admin/main.mo
cp /Users/ayanuali/development/rhinospider/canisters/admin/deploy-final.sh /Users/ayanuali/development/rhinospider/canisters/admin/deploy.sh
chmod +x /Users/ayanuali/development/rhinospider/canisters/admin/deploy.sh

# List the remaining files
echo "Remaining files in the admin directory:"
ls -la /Users/ayanuali/development/rhinospider/canisters/admin/

echo "Cleanup completed!"
