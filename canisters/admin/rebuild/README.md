# Admin Canister Rebuild

This directory contains the files needed to rebuild and redeploy the admin canister.

## Instructions

1. Copy these files to a machine with sufficient cycles to build the canister.
2. Make sure you have the correct identity with controller access to the admin canister.
3. Run the deploy script:

```bash
./deploy.sh
```

## Files

- `main.mo`: The main Motoko source code for the admin canister
- `dfx.json`: The DFX configuration file
- `deploy.sh`: The deployment script
- `README.md`: This file

## Important Notes

- This will overwrite the existing admin canister with the new code.
- All existing data in the admin canister will be lost.
- The script will initialize the canister with sample data.
