#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Storage canister ID
STORAGE_CANISTER_ID="nwy3f-jyaaa-aaaao-a4htq-cai"
# Wallet canister ID
WALLET_CANISTER_ID="bfjmy-ryaaa-aaaao-a36qq-cai"
# Amount of cycles to add (5T cycles = 5 trillion cycles)
CYCLES_AMOUNT="5000000000000"

echo -e "${YELLOW}Adding ${CYCLES_AMOUNT} cycles to storage canister ${STORAGE_CANISTER_ID} from wallet ${WALLET_CANISTER_ID}...${NC}"

# Add cycles to the storage canister
# Using a different format for the wallet_send command
dfx canister --network ic call "${WALLET_CANISTER_ID}" wallet_send "(record { canister = principal \"${STORAGE_CANISTER_ID}\"; amount = (${CYCLES_AMOUNT} : nat64) })"

# Check if the command was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Successfully added ${CYCLES_AMOUNT} cycles to storage canister!${NC}"
else
    echo -e "${RED}Failed to add cycles to storage canister!${NC}"
fi

# Check the balance of the storage canister
echo -e "${YELLOW}Checking storage canister status...${NC}"
dfx canister --network ic status "${STORAGE_CANISTER_ID}"
