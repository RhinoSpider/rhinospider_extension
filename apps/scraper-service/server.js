const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Actor, HttpAgent } = require('@dfinity/agent');
const { IDL } = require('@dfinity/candid');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { Principal } = require('@dfinity/principal');

// Load environment variables
require('dotenv').config();

// Constants
const PORT = process.env.PORT || 3000;
const IC_HOST = process.env.IC_HOST || 'https://icp0.io';
const CONSUMER_CANISTER_ID = process.env.CONSUMER_CANISTER_ID;
const STORAGE_LIMIT_MB = parseInt(process.env.STORAGE_LIMIT_MB || '500');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Authentication middleware
const authenticateRequest = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const principalId = authHeader.split(' ')[1];
  
  try {
    // Validate principal ID format
    const principal = Principal.fromText(principalId);
    req.principal = principal;
    next();
  } catch (error) {
    console.error('Invalid principal:', error);
    return res.status(401).json({ error: 'Invalid authentication' });
  }
};

// Load consumer canister interface
const consumerIdlFactory = ({ IDL }) => {
  const ScrapedData = IDL.Record({
    'id': IDL.Text,
    'url': IDL.Text,
    'topic': IDL.Text,
    'content': IDL.Text,
    'source': IDL.Text,
    'timestamp': IDL.Int,
    'client_id': IDL.Principal,
    'status': IDL.Text,
    'scraping_time': IDL.Int,
  });

  return IDL.Service({
    'submitScrapedData': IDL.Func(
      [ScrapedData],
      [IDL.Variant({
        'ok': IDL.Null,
        'err': IDL.Text,
      })],
      [],
    ),
  });
};

// Create IC agent and actor
let agent = null;
let actor = null;

// Initialize IC connection
async function initializeIC() {
  try {
    console.log('Initializing IC connection...');
    
    // Create agent
    agent = new HttpAgent({
      host: IC_HOST,
      fetch: customFetch
    });
    
    // Create actor
    actor = Actor.createActor(consumerIdlFactory, {
      agent,
      canisterId: CONSUMER_CANISTER_ID,
    });
    
    console.log('IC connection initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize IC connection:', error);
    return false;
  }
}

// Custom fetch handler for IC agent
async function customFetch(url, options = {}) {
  options.headers = {
    ...options.headers,
    'Content-Type': 'application/cbor'
  };
  options.credentials = 'omit';
  
  const response = await fetch(url, options);
  const buffer = await response.arrayBuffer();
  
  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers),
    arrayBuffer: () => Promise.resolve(buffer)
  };
}

// Process and clean HTML content
function processContent(rawHtml, extractedContent) {
  // Basic cleaning - remove scripts, styles, and excessive whitespace
  let cleanedContent = extractedContent.content || '';
  
  // Remove HTML tags if present
  cleanedContent = cleanedContent.replace(/<[^>]*>/g, ' ');
  
  // Remove excessive whitespace
  cleanedContent = cleanedContent.replace(/\s+/g, ' ').trim();
  
  // Limit content length if needed
  if (cleanedContent.length > 10000) {
    cleanedContent = cleanedContent.substring(0, 10000) + '...';
  }
  
  return {
    title: (extractedContent.title || '').trim(),
    content: cleanedContent,
    author: (extractedContent.author || '').trim(),
    date: (extractedContent.date || '').trim()
  };
}

// Save raw content to local storage for backup
function saveRawContent(topicId, url, rawContent) {
  try {
    // Create directory for topic if it doesn't exist
    const topicDir = path.join(DATA_DIR, topicId);
    if (!fs.existsSync(topicDir)) {
      fs.mkdirSync(topicDir, { recursive: true });
    }
    
    // Create a filename based on URL
    const filename = `${Date.now()}_${Buffer.from(url).toString('base64').substring(0, 40)}.html`;
    const filePath = path.join(topicDir, filename);
    
    // Save raw content
    fs.writeFileSync(filePath, rawContent);
    
    // Check storage limit and clean up if necessary
    checkStorageLimit();
    
    return { success: true, filePath };
  } catch (error) {
    console.error('Error saving raw content:', error);
    return { success: false, error: error.message };
  }
}

// Check storage limit and clean up old files if needed
function checkStorageLimit() {
  try {
    // Get all files in data directory recursively
    const getAllFiles = (dir) => {
      let files = [];
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          files = [...files, ...getAllFiles(itemPath)];
        } else {
          files.push({
            path: itemPath,
            size: stats.size,
            mtime: stats.mtime.getTime()
          });
        }
      }
      
      return files;
    };
    
    const files = getAllFiles(DATA_DIR);
    
    // Calculate total size
    const totalSizeMB = files.reduce((acc, file) => acc + file.size, 0) / (1024 * 1024);
    
    // If over limit, delete oldest files
    if (totalSizeMB > STORAGE_LIMIT_MB) {
      console.log(`Storage limit exceeded: ${totalSizeMB.toFixed(2)}MB / ${STORAGE_LIMIT_MB}MB`);
      
      // Sort files by modification time (oldest first)
      files.sort((a, b) => a.mtime - b.mtime);
      
      // Delete files until under limit
      let currentSize = totalSizeMB;
      for (const file of files) {
        if (currentSize <= STORAGE_LIMIT_MB * 0.9) {
          break; // Stop when we're 10% under the limit
        }
        
        const fileSizeMB = file.size / (1024 * 1024);
        fs.unlinkSync(file.path);
        currentSize -= fileSizeMB;
        
        console.log(`Deleted old file: ${file.path} (${fileSizeMB.toFixed(2)}MB)`);
      }
    }
  } catch (error) {
    console.error('Error checking storage limit:', error);
  }
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.post('/api/submit', authenticateRequest, async (req, res) => {
  try {
    const { topicId, url, rawContent, extractedContent, timestamp, aiConfig } = req.body;
    
    if (!topicId || !url || !rawContent || !extractedContent) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    console.log(`Processing content from ${url} for topic ${topicId}`);
    
    // Save raw content for backup
    const saveResult = saveRawContent(topicId, url, rawContent);
    
    // Process and clean content
    const processedContent = processContent(rawContent, extractedContent);
    
    // Initialize IC if not already initialized
    if (!actor) {
      await initializeIC();
    }
    
    // Submit to consumer canister
    const result = await actor.submitScrapedData({
      id: `${topicId}-${url}-${timestamp}`,
      url,
      topic: topicId,
      content: processedContent.content,
      source: 'extension',
      timestamp: BigInt(timestamp),
      client_id: req.principal, // Use the principal from authentication
      status: 'completed',
      scraping_time: BigInt(0), // Placeholder, actual scraping time should come from client
    });
    
    if ('ok' in result) {
      console.log(`Successfully submitted content for ${url}`);
      return res.json({
        success: true,
        message: 'Content submitted successfully',
        contentId: result.ok,
        savedLocally: saveResult.success
      });
    } else {
      console.error(`Failed to submit content: ${result.err}`);
      return res.status(500).json({
        success: false,
        error: result.err,
        savedLocally: saveResult.success
      });
    }
  } catch (error) {
    console.error('Error processing submission:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Scraper service running on port ${PORT}`);
  
  // Initialize IC connection on startup
  initializeIC();
});
