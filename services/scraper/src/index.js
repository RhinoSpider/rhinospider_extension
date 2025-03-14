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
app.use(express.json());

// Create scraping queue
const scrapingQueue = new Queue('scraping', {
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

// Scraping endpoint
app.post('/scrape', async (req, res) => {
  const { url, topic, extractionRules } = req.body;
  
  if (!url || !topic || !extractionRules) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      required: ['url', 'topic', 'extractionRules']
    });
  }

  try {
    const job = await scrapingQueue.add({
      url,
      topic,
      extractionRules,
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
    res.status(500).json({ error: 'Failed to queue scraping job' });
  }
});

// Process scraped content using extraction rules
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
          // Extract array of items
          result.data[rule.field] = await page.$$eval(rule.selector, (elements, attr) => {
            return elements.map(el => attr ? el.getAttribute(attr) : el.textContent.trim())
              .filter(Boolean);
          }, rule.attribute);
        } 
        else if (rule.type === 'object') {
          // Extract object with key-value pairs
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
          // Extract single value
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

// Process scraping jobs
scrapingQueue.process(async (job) => {
  const { url, topic, extractionRules } = job.data;
  
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: 'new'
  });
  
  try {
    console.log(`Processing ${url} for topic ${topic.id}`);
    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navigate to page
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Process content
    const processed = await processContent(page, extractionRules);
    
    // Prepare final result
    const result = {
      url,
      topic: topic.id,
      title: processed.title || '',
      text: processed.text || '',
      timestamp: Date.now(),
      metadata: {
        source: 'do_service',
        scrapeTime: Date.now(),
        ...processed.metadata
      },
      data: processed.data
    };
    
    console.log(`Successfully processed ${url}`);
    return result;
    
  } catch (error) {
    console.error('Scraping error:', error);
    throw error;
  } finally {
    await browser.close();
  }
});

// Job status endpoint
app.get('/status/:jobId', async (req, res) => {
  const { jobId } = req.params;
  
  try {
    const job = await scrapingQueue.getJob(jobId);
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
  console.log(`Scraper service running on port ${port}`);
});
