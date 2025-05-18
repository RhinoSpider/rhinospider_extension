# RhinoSpider Admin Canister Documentation

## Canister IDs
- **Admin Canister ID**: `444wf-gyaaa-aaaaj-az5sq-cai`
- **Admin App Canister ID**: `sxsvc-aqaaa-aaaaj-az4ta-cai`
- **Storage Canister ID**: `hhaip-uiaaa-aaaao-a4khq-cai`
- **Consumer Canister ID**: `tgyl5-yyaaa-aaaaj-az4wq-cai`

## Principal IDs
- **User Principal ID (ic-prod identity)**: `p6gaf-qjt3x-6q6ci-ro7nd-aklhp-6hgfo-4dljo-busl6-3ftgp-iliyi-zqe`
- **Admin App Principal ID**: `t52au-jmmys-xpd7e-f2cc7-xgsya-2ajbl-22leo-e7hep-kclwp-kqzoq-jae`

## How to Update the Admin Canister

### Step 1: Identify the Principal IDs
```bash
# Check your current principal ID
dfx identity use ic-prod
dfx identity get-principal
```

### Step 2: Update the Canister Code
1. Modify the `main.mo` file with your changes
2. Make sure to include both principal IDs in the authorization logic:
   ```motoko
   // Constants
   private let USER_PRINCIPAL_ID: Text = "p6gaf-qjt3x-6q6ci-ro7nd-aklhp-6hgfo-4dljo-busl6-3ftgp-iliyi-zqe";
   private let ADMIN_PRINCIPAL_ID: Text = "t52au-jmmys-xpd7e-f2cc7-xgsya-2ajbl-22leo-e7hep-kclwp-kqzoq-jae";
   ```
3. Ensure that the authorization logic checks both principals:
   ```motoko
   // Explicitly allow the user principal
   if (Text.equal(callerStr, USER_PRINCIPAL_ID)) {
       Debug.print("User principal explicitly authorized");
       return true;
   };
   
   // Explicitly allow the admin principal
   if (Text.equal(callerStr, ADMIN_PRINCIPAL_ID)) {
       Debug.print("Admin principal explicitly authorized");
       return true;
   };
   ```

### Step 3: Deploy the Updated Canister
```bash
# Use the deploy.sh script
./deploy.sh
```

The deploy script does the following:
1. Creates a temporary directory
2. Copies the admin canister code to the temp directory
3. Creates a dfx.json file
4. Compiles the canister using moc directly
5. Deploys the canister with `--mode=upgrade` to preserve existing data
6. Verifies that the canister is working correctly

### Step 4: Verify the Deployment
After deployment, verify that:
1. The canister recognizes your principal ID
2. The canister can return topics
3. The canister has the getAIConfig method

## Required Types
The admin canister must include these types with the exact structure:
- `ContentIdentifiers` with `selectors` and `keywords` fields
- `AIConfig` with `temperature` and `maxTokens` fields
- `ExtractionRules` with the correct structure
- `ScrapingTopic` with all the fields expected by the admin app

## Consumer Canister Integration
The admin canister provides a special method for the consumer canister:
```motoko
public shared({ caller }) func getTopics_with_caller(user_principal: Principal) : async Result.Result<[ScrapingTopic], Text> {
    // Only allow consumer canister to call this method
    if (not _isConsumerCanister(caller)) {
        return #err("Unauthorized: Only consumer canister can call this method");
    };
    #ok(Iter.toArray(topics.vals()))
};
```

To verify the consumer canister integration:
```bash
# Run the check-consumer-auth.sh script
./check-consumer-auth.sh
```

## Important Warnings
- **NEVER** use `--mode=reinstall` when deploying the admin canister, as it will wipe all stored topics
- **ALWAYS** use `--mode=upgrade` to preserve existing data
- **ALWAYS** include both principal IDs in the authorization logic
- Make sure the admin canister interface exactly matches what the admin app expects

## Troubleshooting
If the admin app shows "Unauthorized" errors:
1. Check that the admin canister includes the admin app's principal ID in its authorization logic
2. Verify that the admin canister interface matches what the admin app expects
3. Use `--mode=upgrade` to update the canister without wiping data

## Recovery
If topics are lost:
1. Check if there are any backups of the topics
2. If no backups exist, recreate the topics through the admin app

## Example Topic for Testing
When adding a new topic through the admin app, use this example:

**Basic Information:**
- **Name**: "Tech News"
- **Description**: "Scrapes technology news articles from major tech websites"
- **URL Patterns**: ["https://techcrunch.com/*", "https://www.theverge.com/*"]

**Extraction Rules:**
- Fields:
  1. **Title** (text, required)
  2. **Content** (text, required)
  3. **Author** (text, optional)
  4. **Publication Date** (date, optional)

**Content Identifiers:**
- Selectors: [".article-content", ".entry-content", "article", ".post-content"]
- Keywords: ["technology", "tech", "software", "hardware", "AI"]

**Scraping Configuration:**
- Scraping Interval: 3600 (1 hour)
- Active Hours: 0-24
- Max Retries: 3

## Current Status
- The admin canister has been deployed with both principal IDs authorized
- The admin canister interface matches what the admin app expects
- The admin app is deployed to canister ID `sxsvc-aqaaa-aaaaj-az4ta-cai`
- Topics need to be recreated through the admin app
