#!/bin/bash

# Deploy Referral Canister to IC Network
echo "🚀 Deploying Referral Canister to IC Network"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "dfx.json" ]; then
    echo "❌ Error: dfx.json not found. Please run this script from the project root."
    exit 1
fi

# Check if dfx is installed
if ! command -v dfx &> /dev/null; then
    echo "❌ Error: dfx is not installed. Please install dfx first."
    echo "Visit: https://internetcomputer.org/docs/current/developer-docs/setup/install/"
    exit 1
fi

# Start local replica if deploying locally
read -p "Deploy to mainnet (ic) or local? (ic/local) [ic]: " NETWORK
NETWORK=${NETWORK:-ic}

if [ "$NETWORK" = "local" ]; then
    echo "📡 Starting local replica..."
    dfx start --clean --background
    sleep 5
fi

# Check wallet balance if deploying to mainnet
if [ "$NETWORK" = "ic" ]; then
    echo "💰 Checking wallet balance..."
    dfx wallet --network ic balance
    echo ""
    read -p "Continue with deployment? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 1
    fi
fi

# Build the canister
echo ""
echo "🔨 Building referral canister..."
dfx build referral --network $NETWORK

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Deploy the canister
echo ""
echo "📦 Deploying referral canister to $NETWORK..."
dfx deploy referral --network $NETWORK

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    
    # Get canister ID
    CANISTER_ID=$(dfx canister id referral --network $NETWORK)
    echo "📍 Referral Canister ID: $CANISTER_ID"
    
    if [ "$NETWORK" = "ic" ]; then
        echo "🌐 Canister URL: https://$CANISTER_ID.icp0.io"
    else
        echo "🌐 Local URL: http://localhost:4943/?canisterId=$CANISTER_ID"
    fi
    
    echo ""
    echo "📝 Update your extension configuration with:"
    echo "   Referral Canister ID: $CANISTER_ID"
    
    # Update local config if needed
    echo ""
    read -p "Update local .env file with new canister ID? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Update .env file
        if [ -f ".env" ]; then
            sed -i.bak "s/REFERRAL_CANISTER_ID=.*/REFERRAL_CANISTER_ID=$CANISTER_ID/" .env
            echo "✅ Updated .env file"
        else
            echo "REFERRAL_CANISTER_ID=$CANISTER_ID" >> .env
            echo "✅ Created .env file with canister ID"
        fi
    fi
    
else
    echo ""
    echo "❌ Deployment failed!"
    exit 1
fi

# Test the deployment
echo ""
echo "🧪 Testing deployment..."
echo "Getting referral code for anonymous principal..."

if [ "$NETWORK" = "ic" ]; then
    dfx canister call referral getReferralCode --network ic
else
    dfx canister call referral getReferralCode
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Update extension with new canister ID if changed"
echo "2. Test authentication flow in the extension"
echo "3. Monitor canister logs: dfx canister logs referral --network $NETWORK"

# Stop local replica if it was started
if [ "$NETWORK" = "local" ]; then
    echo ""
    read -p "Stop local replica? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        dfx stop
    fi
fi