require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Queue = require('bull');
const puppeteer = require('puppeteer');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for extension
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['POST', 'GET'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));

// Create processing queue
const processingQueue = new Queue('processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    version: process.env.VERSION || '1.0.0',
    timestamp: Date.now()
  });
});

// Process HTML endpoint
app.post('/process', async (req, res) => {
  const { url, topic, extractionRules, html } = req.body;
  
  if (!url || !topic || !extractionRules || !html) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      required: ['url', 'topic', 'extractionRules', 'html']
    });
  }

  try {
    const job = await processingQueue.add({
      url,
      topic,
      extractionRules,
      html,
      timestamp: Date.now()
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    res.json({
      status: 'queued',
      jobId: job.id,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error queueing job:', error);
    res.status(500).json({ error: 'Failed to queue processing job' });
  }
});

// Process content using extraction rules
async function processContent(page, extractionRules) {
  const result = {
    data: {},
    metadata: {
      processedAt: Date.now()
    }
  };

  try {
    for (const rule of extractionRules) {
      try {
        if (!rule.selector) continue;

        // Handle different types of extraction
        if (rule.type === 'array') {
          result.data[rule.field] = await page.$$eval(rule.selector, (elements, attr) => {
            return elements.map(el => attr ? el.getAttribute(attr) : el.textContent.trim())
              .filter(Boolean);
          }, rule.attribute);
        } 
        else if (rule.type === 'object') {
          result.data[rule.field] = await page.$$eval(rule.selector, (elements, config) => {
            const obj = {};
            elements.forEach(el => {
              const key = config.keyAttribute ? el.getAttribute(config.keyAttribute) : el.tagName;
              const value = config.valueSelector ? 
                el.querySelector(config.valueSelector)?.textContent.trim() : 
                el.textContent.trim();
              if (key && value) obj[key] = value;
            });
            return obj;
          }, { keyAttribute: rule.keyAttribute, valueSelector: rule.valueSelector });
        }
        else {
          const element = await page.$(rule.selector);
          if (element) {
            const value = rule.attribute ?
              await element.evaluate((el, attr) => el.getAttribute(attr), rule.attribute) :
              await element.evaluate(el => el.textContent.trim());
            
            if (rule.field === 'title' || rule.field === 'text') {
              result[rule.field] = value;
            } else {
              result.data[rule.field] = value;
            }
          }
        }
      } catch (ruleError) {
        console.error(`Error processing rule ${rule.field}:`, ruleError);
        result.metadata.errors = result.metadata.errors || [];
        result.metadata.errors.push({
          field: rule.field,
          error: ruleError.message
        });
      }
    }

    // Extract page metadata
    const pageMetadata = await page.evaluate(() => {
      const metadata = {};
      const metaTags = document.querySelectorAll('meta');
      metaTags.forEach(meta => {
        const name = meta.getAttribute('name') || meta.getAttribute('property');
        const content = meta.getAttribute('content');
        if (name && content) metadata[name] = content;
      });
      return metadata;
    });

    result.metadata.page = pageMetadata;

  } catch (error) {
    console.error('Error in content processing:', error);
    result.metadata.processingError = error.message;
  }

  return result;
}

// Process jobs
processingQueue.process(async (job) => {
  const { url, topic, extractionRules, html } = job.data;
  
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: 'new'
  });
  
  try {
    console.log(`Processing HTML from ${url} for topic ${topic}`);
    const page = await browser.newPage();
    
    // Load HTML into virtual page
    await page.setContent(html, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Process content
    const processed = await processContent(page, extractionRules);
    
    // Prepare final result
    const result = {
      url,
      topic,
      title: processed.title || '',
      text: processed.text || '',
      timestamp: Date.now(),
      metadata: {
        source: 'do_service',
        processTime: Date.now(),
        ...processed.metadata
      },
      data: processed.data
    };
    
    console.log(`Successfully processed HTML from ${url}`);
    return result;
    
  } catch (error) {
    console.error('Processing error:', error);
    throw error;
  } finally {
    await browser.close();
  }
});

// Job status endpoint
app.get('/status/:jobId', async (req, res) => {
  const { jobId } = req.params;
  
  try {
    const job = await processingQueue.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const state = await job.getState();
    const result = job.returnvalue;
    const error = job.failedReason;

    res.json({
      id: job.id,
      state,
      result,
      error
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Processing service running on port ${port}`);
});
