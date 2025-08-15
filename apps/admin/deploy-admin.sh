#\!/bin/bash
CANISTER_ID="sxsvc-aqaaa-aaaaj-az4ta-cai"
NETWORK="ic"

# Deploy static assets to canister
echo "Deploying admin app to $CANISTER_ID on $NETWORK network..."

# Create a temporary dfx.json
cat > /tmp/dfx-temp.json << EOF
{
  "canisters": {
    "admin_frontend": {
      "type": "assets",
      "source": ["dist"]
    }
  },
  "networks": {
    "ic": {
      "providers": ["https://ic0.app"]
    }
  }
}
EOF

# Deploy using dfx
cd /Users/ayanuali/development/rhinospider/apps/admin
DFX_CONFIG_ROOT=/tmp dfx deploy admin_frontend --network ic --with-cycles 1000000000000 --specified-id $CANISTER_ID

echo "Admin app deployed to: https://$CANISTER_ID.icp0.io/"

