require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Queue = require('bull');
const puppeteer = require('puppeteer');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for your extension domain
app.use(cors());
app.use(express.json());

// Create scraping queue
const scrapingQueue = new Queue('scraping', {
  redis: {
    host: 'localhost',
    port: 6379
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Scraping endpoint
app.post('/scrape', async (req, res) => {
  const { url, extractionRules } = req.body;
  
  if (!url || !extractionRules) {
    return res.status(400).json({ error: 'Missing url or extractionRules' });
  }

  try {
    const job = await scrapingQueue.add({
      url,
      extractionRules,
      timestamp: Date.now()
    });

    res.json({
      status: 'queued',
      jobId: job.id
    });
  } catch (error) {
    console.error('Error queueing job:', error);
    res.status(500).json({ error: 'Failed to queue scraping job' });
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

// Process scraping jobs
scrapingQueue.process(async (job) => {
  const { url, extractionRules } = job.data;
  
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    // Get page content
    const content = await page.content();
    
    // Basic extraction (you can enhance this based on extractionRules)
    const result = {
      url,
      content,
      timestamp: Date.now()
    };
    
    return result;
  } catch (error) {
    console.error('Scraping error:', error);
    throw error;
  } finally {
    await browser.close();
  }
});

// Start server
app.listen(port, () => {
  console.log(`Scraping service running on port ${port}`);
});
