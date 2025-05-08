# RhinoSpider Storage Canister

This document provides information about the RhinoSpider storage canister, its configuration, and how to manage its data.

## Storage Canister Overview

The storage canister is a critical component of the RhinoSpider architecture, responsible for storing all scraped data from the extension. It is an Internet Computer Protocol (ICP) canister that provides decentralized storage for the platform.

## Canister Configuration

### Current Storage Canister ID

The current storage canister ID used by both the admin app and extension is:

```
i2gk7-oyaaa-aaaao-a37cq-cai
```

This ID is configured in:
- Extension: `/apps/extension/.env` as `VITE_STORAGE_CANISTER_ID`
- Admin App: Hardcoded in the admin canister as `STORAGE_CANISTER_ID`

### Previous Configuration

Previously, there was a configuration mismatch where:
- Extension was using: `smxjh-2iaaa-aaaaj-az4rq-cai`
- Admin app was using: `i2gk7-oyaaa-aaaao-a37cq-cai`

This has been resolved by updating the extension to use the same storage canister as the admin app.

## Data Flow

The data flow for scraped content is as follows:

1. The extension scrapes content from websites using the enhanced URL fetching strategy
2. The scraped data is processed and formatted as JSON
3. The data is sent to the storage canister with ID `i2gk7-oyaaa-aaaao-a37cq-cai`
4. The admin app retrieves data from the same storage canister

## Managing Storage Canister Data

### Clearing Storage Canister Data

If you need to clear all data from the storage canister (e.g., for testing or to resolve issues), you can use the provided script:

```bash
./clear_correct_storage_auto.sh
```

This script will:
1. Stop the storage canister
2. Install empty code to reset its state
3. Clear all data

### Restoring Storage Canister Functionality

After clearing the storage canister, you may need to restore its functionality by redeploying the original code:

```bash
./final_restore.sh
```

## Troubleshooting

### Common Issues

1. **Admin app shows data but extension doesn't seem to be storing it**
   - Verify that both are using the same storage canister ID
   - Check the extension's `.env` file to ensure `VITE_STORAGE_CANISTER_ID` is set correctly

2. **Storage canister is full or rate-limited**
   - Clear the storage canister using the provided script
   - Consider implementing data retention policies

3. **Data not appearing in admin app**
   - Verify the extension is running and properly authenticated
   - Check network connectivity to the Internet Computer
   - Ensure the correct storage canister ID is being used

## Best Practices

1. **Regular Backups**: Consider implementing a backup strategy for important data
2. **Data Cleanup**: Periodically clean up old or unnecessary data
3. **Monitoring**: Implement monitoring to track storage usage and prevent issues
4. **Configuration Management**: Keep track of canister IDs and ensure consistency across components

## Future Improvements

1. **Data Partitioning**: Implement data partitioning to improve scalability
2. **Compression**: Add compression to reduce storage requirements
3. **Indexing**: Improve search and retrieval performance with better indexing
4. **Automated Cleanup**: Implement automated data retention policies
