#!/bin/bash
# Script to directly fix the consumer canister submission issue
# This fix specifically targets the consumer-submit endpoint and ensures proper data formatting

echo "Deploying direct consumer canister fix..."

# Create the direct fix script
cat > direct-consumer-fix.js << 'EOL'
// Direct fix for consumer canister submission
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find the actual server.js location
function findServerJsPath() {
  try {
    // Try common locations
    const possiblePaths = [
      '/root/server.js',
      '/root/ic-proxy/server.js',
      '/opt/ic-proxy/server.js',
      '/home/ubuntu/ic-proxy/server.js'
    ];
    
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        console.log(`Found server.js at: ${p}`);
        return p;
      }
    }
    
    // If not found in common locations, try to find it using find command
    console.log('Server.js not found in common locations, searching...');
    const result = execSync('find / -name "server.js" -type f 2>/dev/null | grep -v "node_modules"').toString().trim();
    const paths = result.split('\n').filter(p => p.includes('ic-proxy') || p.includes('proxy'));
    
    if (paths.length > 0) {
      console.log(`Found server.js at: ${paths[0]}`);
      return paths[0];
    }
    
    throw new Error('Could not find server.js');
  } catch (error) {
    console.error('Error finding server.js:', error.message);
    throw error;
  }
}

// Get the server.js path
const serverJsPath = findServerJsPath();
const serverDir = path.dirname(serverJsPath);
console.log(`Server directory: ${serverDir}`);

// Create necessary directories
const declarationsDir = path.join(serverDir, 'declarations');
const consumerDir = path.join(declarationsDir, 'consumer');

if (!fs.existsSync(declarationsDir)) {
  console.log(`Creating declarations directory: ${declarationsDir}`);
  fs.mkdirSync(declarationsDir, { recursive: true });
}

if (!fs.existsSync(consumerDir)) {
  console.log(`Creating consumer directory: ${consumerDir}`);
  fs.mkdirSync(consumerDir, { recursive: true });
}

// Path to the fixed consumer.did.js file
const fixedConsumerDidPath = path.join(consumerDir, 'consumer.did.fixed.js');

// Create the fixed consumer.did.js file
function createFixedConsumerDid() {
  const fixedDidContent = `
const idlFactory = ({ IDL }) => {
  const UserProfile = IDL.Record({
    'created' : IDL.Int,
    'principal' : IDL.Principal,
    'preferences' : IDL.Record({
      'theme' : IDL.Text,
      'notificationsEnabled' : IDL.Bool,
    }),
    'lastLogin' : IDL.Int,
    'devices' : IDL.Vec(IDL.Text),
  });
  const Error = IDL.Variant({
    'InvalidInput' : IDL.Text,
    'SystemError' : IDL.Text,
    'NotFound' : IDL.Null,
    'NotAuthorized' : IDL.Null,
    'AlreadyExists' : IDL.Null,
  });
  const Result_2 = IDL.Variant({ 'ok' : UserProfile, 'err' : Error });
  const ScrapingField = IDL.Record({
    'name' : IDL.Text,
    'aiPrompt' : IDL.Opt(IDL.Text),
    'required' : IDL.Bool,
    'fieldType' : IDL.Text,
  });
  const ExtractionRules = IDL.Record({
    'fields' : IDL.Vec(ScrapingField),
    'customPrompt' : IDL.Opt(IDL.Text),
  });
  const CostLimits = IDL.Record({
    'maxConcurrent' : IDL.Nat,
    'maxDailyCost' : IDL.Float64,
    'maxMonthlyCost' : IDL.Float64,
  });
  const AIConfig = IDL.Record({
    'model' : IDL.Text,
    'costLimits' : CostLimits,
    'apiKey' : IDL.Text,
  });
  const ScrapingTopic = IDL.Record({
    'id' : IDL.Text,
    'status' : IDL.Text,
    'name' : IDL.Text,
    'createdAt' : IDL.Int,
    'scrapingInterval' : IDL.Nat,
    'description' : IDL.Text,
    'maxRetries' : IDL.Nat,
    'activeHours' : IDL.Record({ 'end' : IDL.Nat, 'start' : IDL.Nat }),
    'urlPatterns' : IDL.Vec(IDL.Text),
    'extractionRules' : ExtractionRules,
    'aiConfig' : AIConfig,
  });
  const Result_1 = IDL.Variant({
    'ok' : IDL.Vec(ScrapingTopic),
    'err' : Error,
  });
  const Result = IDL.Variant({ 'ok' : IDL.Null, 'err' : Error });
  
  // Define ScrapedData with explicit Nat types for timestamp and scraping_time
  const ScrapedData = IDL.Record({
    'id' : IDL.Text,
    'url' : IDL.Text,
    'status' : IDL.Text,
    'topic' : IDL.Text,
    'content' : IDL.Text,
    'source' : IDL.Text,
    'timestamp' : IDL.Nat,
    'client_id' : IDL.Principal,
    'scraping_time' : IDL.Nat,
  });
  
  return IDL.Service({
    'getProfile' : IDL.Func([], [Result_2], []), 
    'getTopics' : IDL.Func([], [Result_1], []),
    'getScrapedData' : IDL.Func([IDL.Vec(IDL.Text)], [IDL.Variant({ 'ok' : IDL.Vec(ScrapedData), 'err' : Error })], []),
    'registerDevice' : IDL.Func([IDL.Text], [Result], []),
    'submitScrapedData' : IDL.Func([ScrapedData], [Result], []),
    'updatePreferences' : IDL.Func([IDL.Bool, IDL.Text], [Result], []),
  });
};

const init = ({ IDL }) => { return []; };

module.exports = { idlFactory, init };
  `;

  // Write the fixed consumer.did.js file
  fs.writeFileSync(fixedConsumerDidPath, fixedDidContent);
  console.log('Created fixed consumer.did.js file at:', fixedConsumerDidPath);
}

// Create a completely new consumer-submit endpoint handler
function createConsumerSubmitEndpoint() {
  const endpointCode = `
// Consumer canister submission endpoint - COMPLETELY REWRITTEN
app.post('/api/consumer-submit', async (req, res) => {
  console.log('==== /api/consumer-submit endpoint called ====');
  console.log('Request body:', JSON.stringify(req.body, (key, value) => 
    typeof value === 'bigint' ? value.toString() : value));
  
  try {
    // Extract data from request
    const { url, content, topic, topicId, principalId, status, source, scraping_time } = req.body.data || req.body;
    
    // Generate a unique submission ID
    const submissionId = (req.body.data && req.body.data.id) || req.body.id || \`submission-\${Date.now()}-\${Math.random().toString(36).substring(2, 9)}\`;
    
    // Get content value
    const contentValue = content || '<html><body><p>No content available</p></body></html>';
    
    // Create the consumer actor with the fixed IDL
    console.log('[/api/consumer-submit] Creating consumer actor with fixed IDL...');
    const { Actor, HttpAgent } = require('@dfinity/agent');
    const { Principal } = require('@dfinity/principal');
    const consumerIdlFactory = require('./declarations/consumer/consumer.did.fixed.js').idlFactory;
    
    // Create an anonymous agent
    const agent = new HttpAgent({
      host: process.env.IC_HOST || 'https://ic0.app'
    });
    
    // Fetch root key for local development
    if (process.env.IC_HOST !== 'https://ic0.app') {
      try {
        await agent.fetchRootKey();
      } catch (err) {
        console.warn('[/api/consumer-submit] Warning: Unable to fetch root key, continuing anyway');
      }
    }
    
    // Create the consumer actor
    const consumerActor = Actor.createActor(consumerIdlFactory, {
      agent,
      canisterId: process.env.CONSUMER_CANISTER_ID || 'tgyl5-yyaaa-aaaaj-az4wq-cai'
    });
    
    // Prepare data for consumer canister - CRITICAL FIX
    console.log('[/api/consumer-submit] Preparing data for consumer canister...');
    
    // Create properly formatted data for the consumer canister
    const consumerData = {
      id: submissionId,
      url: url || '',
      topic: topic || topicId || '',
      content: contentValue,
      source: source || 'extension',
      // CRITICAL FIX: Ensure timestamp is a BigInt (Nat in Motoko) and in seconds
      timestamp: BigInt(Math.floor(Date.now() / 1000)),
      // Ensure client_id is a Principal
      client_id: principalId ? Principal.fromText(principalId) : Principal.fromText('2vxsx-fae'),
      status: status || 'completed',
      // CRITICAL FIX: Ensure scraping_time is a BigInt (Nat in Motoko)
      scraping_time: BigInt(scraping_time || 500)
    };
    
    // Log the data for debugging
    console.log('[/api/consumer-submit] Consumer data:', JSON.stringify(consumerData, (key, value) => 
      typeof value === 'bigint' ? value.toString() : 
      (value && typeof value === 'object' && value._isPrincipal) ? value.toString() : value
    ));
    
    // Submit to consumer canister
    console.log('[/api/consumer-submit] Calling submitScrapedData on consumer canister...');
    const consumerResult = await consumerActor.submitScrapedData(consumerData);
    
    console.log('[/api/consumer-submit] Consumer canister result:', JSON.stringify(consumerResult));
    
    // Return the result
    return res.status(200).json(consumerResult);
  } catch (error) {
    console.error('Error in /api/consumer-submit:', error.message || error);
    console.error('Error stack:', error.stack);
    
    // Return an error response
    return res.status(200).json({
      err: { 
        message: error.message || String(error),
        timestamp: Date.now()
      }
    });
  }
});
`;

  return endpointCode;
}

// Fix the server.js file
function fixServerJs() {
  // Read the server.js file
  let serverJsContent = fs.readFileSync(serverJsPath, 'utf8');
  
  // 1. Add required imports if they don't exist
  if (!serverJsContent.includes('const { Principal }')) {
    const importPattern = /const express = require\('express'\);/;
    const importReplacement = `const express = require('express');
const { Principal } = require('@dfinity/principal');`;
    serverJsContent = serverJsContent.replace(importPattern, importReplacement);
    console.log('Added Principal import');
  }

  // 2. Add BigInt patch at the top of the file if it doesn't exist
  if (!serverJsContent.includes('BigInt.prototype.toJSON')) {
    const bigIntPatch = `// Add BigInt serialization support
if (typeof BigInt.prototype.toJSON !== 'function') {
  BigInt.prototype.toJSON = function() { return this.toString(); };
}

`;
    serverJsContent = bigIntPatch + serverJsContent;
    console.log('Added BigInt serialization patch');
  }

  // 3. Replace the entire consumer-submit endpoint
  const consumerSubmitPattern = /app\.post\(['"]\/api\/consumer-submit['"][\s\S]*?}\);/;
  if (consumerSubmitPattern.test(serverJsContent)) {
    serverJsContent = serverJsContent.replace(consumerSubmitPattern, createConsumerSubmitEndpoint());
    console.log('Replaced consumer-submit endpoint with fixed version');
  } else {
    // If the endpoint doesn't exist, add it before the health check endpoint
    const healthCheckPattern = /app\.get\(['"]\/api\/health['"]/;
    if (healthCheckPattern.test(serverJsContent)) {
      serverJsContent = serverJsContent.replace(healthCheckPattern, `${createConsumerSubmitEndpoint()}\n\n// Health check endpoint\napp.get('/api/health'`);
      console.log('Added consumer-submit endpoint before health check endpoint');
    } else {
      // If health check endpoint doesn't exist, add it at the end
      serverJsContent += `\n\n${createConsumerSubmitEndpoint()}\n`;
      console.log('Added consumer-submit endpoint at the end of the file');
    }
  }

  // Write the fixed server.js file
  fs.writeFileSync(serverJsPath, serverJsContent);
  console.log('All fixes applied successfully to server.js');
}

// Execute the fixes
try {
  createFixedConsumerDid();
  fixServerJs();
  console.log('All fixes completed successfully!');
} catch (error) {
  console.error('Error applying fixes:', error);
  process.exit(1);
}
EOL

echo "Applying direct consumer fix on the server..."

# Upload the fix script to the server
sshpass -p "ffGpA2saNS47qr" scp -o StrictHostKeyChecking=no direct-consumer-fix.js root@ic-proxy.rhinospider.com:/root/

# Run the fix script on the server
sshpass -p "ffGpA2saNS47qr" ssh -o StrictHostKeyChecking=no root@ic-proxy.rhinospider.com << 'EOF'
cd /root
node direct-consumer-fix.js
pm2 restart ic-proxy
pm2 status
EOF

echo "Direct consumer fix deployed. The IDL error should now be fixed."
echo "To view logs: ssh root@ic-proxy.rhinospider.com 'pm2 logs ic-proxy'"
