// Fix Consumer Submission Method
// This script verifies and updates the consumer submission method in the extension

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const EXTENSION_DIR = path.resolve(__dirname);
const PROXY_CLIENT_PATH = path.join(EXTENSION_DIR, 'src/proxy-client.js');
const CONSUMER_DID_PATH = path.join(EXTENSION_DIR, 'src/declarations/consumer/consumer.did.js');

// Colors for output
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

console.log(`${GREEN}===== RhinoSpider Extension Consumer Submission Fix =====${RESET}`);

// Function to check and update the consumer.did.js file
function checkConsumerDid() {
  console.log(`${YELLOW}Checking consumer.did.js file...${RESET}`);
  
  try {
    // Read the consumer.did.js file
    const didContent = fs.readFileSync(CONSUMER_DID_PATH, 'utf8');
    
    // Check if it contains the correct method name
    const hasCorrectMethod = didContent.includes("'submitScrapedData'");
    const hasIncorrectMethod = didContent.includes("'submitScrapedContent'");
    
    if (hasCorrectMethod && !hasIncorrectMethod) {
      console.log(`${GREEN}Consumer DID file already has the correct method name: submitScrapedData${RESET}`);
      return true;
    } else if (hasIncorrectMethod) {
      console.log(`${RED}Consumer DID file has the incorrect method name: submitScrapedContent${RESET}`);
      
      // Update the file with the correct method name
      const updatedContent = didContent.replace(/['"]submitScrapedContent['"]/g, "'submitScrapedData'");
      fs.writeFileSync(CONSUMER_DID_PATH, updatedContent, 'utf8');
      
      console.log(`${GREEN}Updated consumer.did.js with the correct method name: submitScrapedData${RESET}`);
      return true;
    } else {
      console.log(`${RED}Consumer DID file doesn't contain either method name. Manual inspection needed.${RESET}`);
      return false;
    }
  } catch (error) {
    console.error(`${RED}Error checking consumer.did.js file:${RESET}`, error);
    return false;
  }
}

// Function to check and update the proxy-client.js file
function checkProxyClient() {
  console.log(`${YELLOW}Checking proxy-client.js file...${RESET}`);
  
  try {
    // Read the proxy-client.js file
    const proxyContent = fs.readFileSync(PROXY_CLIENT_PATH, 'utf8');
    
    // Check if the consumer-submit endpoint is being used
    const hasConsumerEndpoint = proxyContent.includes('/api/consumer-submit');
    
    if (hasConsumerEndpoint) {
      console.log(`${GREEN}Proxy client is using the correct endpoint: /api/consumer-submit${RESET}`);
    } else {
      console.log(`${RED}Proxy client is not using the /api/consumer-submit endpoint. Manual inspection needed.${RESET}`);
    }
    
    // Check if any references to submitScrapedContent exist and need to be updated
    const hasIncorrectMethod = proxyContent.includes('submitScrapedContent');
    
    if (hasIncorrectMethod) {
      console.log(`${RED}Found references to incorrect method name: submitScrapedContent${RESET}`);
      
      // Update the file with the correct method name
      const updatedContent = proxyContent.replace(/submitScrapedContent/g, 'submitScrapedData');
      fs.writeFileSync(PROXY_CLIENT_PATH, updatedContent, 'utf8');
      
      console.log(`${GREEN}Updated proxy-client.js with the correct method name: submitScrapedData${RESET}`);
    } else {
      console.log(`${GREEN}No incorrect method references found in proxy-client.js${RESET}`);
    }
    
    return true;
  } catch (error) {
    console.error(`${RED}Error checking proxy-client.js file:${RESET}`, error);
    return false;
  }
}

// Function to check the .env file for correct API endpoint
function checkEnvFile() {
  console.log(`${YELLOW}Checking .env file...${RESET}`);
  
  try {
    const envPath = path.join(EXTENSION_DIR, '.env');
    if (!fs.existsSync(envPath)) {
      console.log(`${YELLOW}.env file not found, skipping check${RESET}`);
      return true;
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Check if the API URL is set correctly
    const apiUrlLine = envContent.split('\n').find(line => line.startsWith('VITE_API_URL='));
    
    if (apiUrlLine) {
      const apiUrl = apiUrlLine.split('=')[1].trim();
      console.log(`${YELLOW}Current API URL:${RESET} ${apiUrl}`);
      
      // Verify the API URL is pointing to the correct server
      if (apiUrl.includes('143.244.133.154')) {
        console.log(`${GREEN}API URL is correctly pointing to the Digital Ocean server${RESET}`);
      } else {
        console.log(`${RED}API URL is not pointing to the Digital Ocean server (143.244.133.154)${RESET}`);
        console.log(`${YELLOW}Consider updating the API URL in the .env file${RESET}`);
      }
    } else {
      console.log(`${YELLOW}API URL not found in .env file${RESET}`);
    }
    
    return true;
  } catch (error) {
    console.error(`${RED}Error checking .env file:${RESET}`, error);
    return false;
  }
}

// Run all checks
function runAllChecks() {
  const didResult = checkConsumerDid();
  const proxyResult = checkProxyClient();
  const envResult = checkEnvFile();
  
  if (didResult && proxyResult && envResult) {
    console.log(`${GREEN}All checks completed successfully!${RESET}`);
    console.log(`${GREEN}The extension should now be able to submit data correctly to the consumer canister.${RESET}`);
  } else {
    console.log(`${RED}Some checks failed. Please review the logs and fix any remaining issues.${RESET}`);
  }
}

// Run all checks
runAllChecks();
