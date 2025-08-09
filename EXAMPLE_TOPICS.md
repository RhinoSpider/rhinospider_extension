# Example Topics for RhinoSpider Admin Dashboard

Add these topics at: https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io/

## 1. DePIN Infrastructure News
```javascript
{
  name: "DePIN Infrastructure News",
  description: "Latest developments in decentralized physical infrastructure networks",
  searchQueries: [
    "DePIN blockchain news",
    "decentralized infrastructure",
    "Helium network updates",
    "Filecoin storage mining"
  ],
  requiredKeywords: ["DePIN", "decentralized", "infrastructure"],
  excludeKeywords: [],
  preferredDomains: ["coindesk.com", "decrypt.co", "theblock.co"],
  excludeDomains: [],
  contentSelectors: ["article", "main", ".content", ".post-content"],
  titleSelectors: ["h1", "title", ".article-title"],
  excludeSelectors: [".advertisement", ".sidebar", ".comments"],
  minContentLength: 200,
  maxContentLength: 50000,
  maxUrlsPerBatch: 10,
  scrapingInterval: 1800,  // 30 minutes
  priority: 9
}
```

## 2. ETF Daily Flows
```javascript
{
  name: "ETF Daily Flows",
  description: "Track daily inflows and outflows in major ETFs",
  searchQueries: [
    "ETF flows today",
    "largest ETF inflows",
    "ETF outflows daily",
    "SPY QQQ IWM flows"
  ],
  requiredKeywords: ["ETF", "flows", "inflow", "outflow"],
  excludeKeywords: ["advertisement", "sponsored"],
  preferredDomains: ["etf.com", "etfdb.com", "morningstar.com"],
  excludeDomains: [],
  contentSelectors: ["table", ".data-table", ".flows-content", "article"],
  titleSelectors: ["h1", ".page-title"],
  excludeSelectors: [".ad", ".popup", ".newsletter-signup"],
  minContentLength: 100,
  maxContentLength: 30000,
  maxUrlsPerBatch: 15,
  scrapingInterval: 3600,  // 1 hour
  priority: 10
}
```

## 3. Tech Earnings Reports
```javascript
{
  name: "Tech Earnings Reports",
  description: "Quarterly earnings from major tech companies",
  searchQueries: [
    "tech earnings today",
    "FAANG earnings results",
    "technology quarterly results",
    "Microsoft Apple Google earnings"
  ],
  requiredKeywords: ["earnings", "revenue", "quarter"],
  excludeKeywords: ["prediction", "forecast", "expected"],
  preferredDomains: ["seekingalpha.com", "yahoo.com", "cnbc.com"],
  excludeDomains: [],
  contentSelectors: [".article-content", ".earnings-table", "main"],
  titleSelectors: ["h1", ".headline"],
  excludeSelectors: [".comments", ".related-articles"],
  minContentLength: 300,
  maxContentLength: 40000,
  maxUrlsPerBatch: 8,
  scrapingInterval: 900,  // 15 minutes during earnings season
  priority: 8
}
```

## 4. Crypto Market Analysis
```javascript
{
  name: "Crypto Market Analysis",
  description: "Bitcoin, Ethereum and altcoin market analysis",
  searchQueries: [
    "Bitcoin price analysis",
    "Ethereum market update",
    "crypto market today",
    "altcoin technical analysis"
  ],
  requiredKeywords: ["Bitcoin", "Ethereum", "crypto", "analysis"],
  excludeKeywords: ["scam", "pump", "shill"],
  preferredDomains: ["cointelegraph.com", "cryptoslate.com", "bitcoinist.com"],
  excludeDomains: [],
  contentSelectors: ["article", ".post-content", ".analysis-content"],
  titleSelectors: ["h1", ".post-title"],
  excludeSelectors: [".price-widget", ".ad-container"],
  minContentLength: 400,
  maxContentLength: 35000,
  maxUrlsPerBatch: 12,
  scrapingInterval: 2400,  // 40 minutes
  priority: 7
}
```

## 5. Federal Reserve Updates
```javascript
{
  name: "Federal Reserve Updates",
  description: "Fed policy decisions and FOMC meeting minutes",
  searchQueries: [
    "Federal Reserve announcement",
    "FOMC meeting minutes",
    "Fed interest rates",
    "Jerome Powell speech"
  ],
  requiredKeywords: ["Federal Reserve", "Fed", "FOMC", "rates"],
  excludeKeywords: [],
  preferredDomains: ["federalreserve.gov", "reuters.com", "bloomberg.com"],
  excludeDomains: [],
  contentSelectors: [".content", "article", ".press-release"],
  titleSelectors: ["h1", ".title"],
  excludeSelectors: [".footer", ".navigation"],
  minContentLength: 500,
  maxContentLength: 60000,
  maxUrlsPerBatch: 5,
  scrapingInterval: 7200,  // 2 hours
  priority: 10
}
```

## 6. AI & Machine Learning News
```javascript
{
  name: "AI & Machine Learning News",
  description: "Latest developments in artificial intelligence",
  searchQueries: [
    "artificial intelligence news",
    "machine learning breakthrough",
    "OpenAI Anthropic Google AI",
    "LLM large language model updates"
  ],
  requiredKeywords: ["AI", "artificial intelligence", "machine learning"],
  excludeKeywords: ["course", "tutorial", "certification"],
  preferredDomains: ["venturebeat.com", "techcrunch.com", "arstechnica.com"],
  excludeDomains: [],
  contentSelectors: ["article", "main", ".post-body"],
  titleSelectors: ["h1", ".article-header"],
  excludeSelectors: [".social-share", ".author-bio"],
  minContentLength: 300,
  maxContentLength: 45000,
  maxUrlsPerBatch: 10,
  scrapingInterval: 3600,  // 1 hour
  priority: 8
}
```

## 7. ESG & Sustainable Investing
```javascript
{
  name: "ESG & Sustainable Investing",
  description: "Environmental, social, and governance investing trends",
  searchQueries: [
    "ESG investing news",
    "sustainable finance",
    "green bonds ETF",
    "climate investing"
  ],
  requiredKeywords: ["ESG", "sustainable", "green", "climate"],
  excludeKeywords: ["greenwashing"],
  preferredDomains: ["responsible-investor.com", "esginvesting.com"],
  excludeDomains: [],
  contentSelectors: ["article", ".content-main"],
  titleSelectors: ["h1", ".headline"],
  excludeSelectors: [".disclaimer", ".advertisement"],
  minContentLength: 250,
  maxContentLength: 30000,
  maxUrlsPerBatch: 8,
  scrapingInterval: 5400,  // 90 minutes
  priority: 6
}
```

## 8. Commodity Markets
```javascript
{
  name: "Commodity Markets",
  description: "Gold, silver, oil, and agricultural commodities",
  searchQueries: [
    "gold price news",
    "oil market analysis",
    "commodity futures today",
    "agricultural commodities"
  ],
  requiredKeywords: ["commodity", "gold", "oil", "futures"],
  excludeKeywords: [],
  preferredDomains: ["kitco.com", "oilprice.com", "investing.com"],
  excludeDomains: [],
  contentSelectors: [".news-content", "article", ".analysis"],
  titleSelectors: ["h1", ".news-title"],
  excludeSelectors: [".price-ticker", ".live-chart"],
  minContentLength: 200,
  maxContentLength: 25000,
  maxUrlsPerBatch: 10,
  scrapingInterval: 2700,  // 45 minutes
  priority: 7
}
```

## 9. Regulatory & Compliance News
```javascript
{
  name: "Regulatory & Compliance News",
  description: "SEC, CFTC, and financial regulatory updates",
  searchQueries: [
    "SEC announcement",
    "financial regulation news",
    "CFTC cryptocurrency",
    "banking regulation updates"
  ],
  requiredKeywords: ["SEC", "regulation", "compliance", "regulatory"],
  excludeKeywords: ["opinion", "speculation"],
  preferredDomains: ["sec.gov", "cftc.gov", "law360.com"],
  excludeDomains: [],
  contentSelectors: [".release-content", "article", ".document"],
  titleSelectors: ["h1", ".document-title"],
  excludeSelectors: [".footer", ".sidebar"],
  minContentLength: 400,
  maxContentLength: 80000,
  maxUrlsPerBatch: 5,
  scrapingInterval: 10800,  // 3 hours
  priority: 9
}
```

## 10. Market Sentiment Analysis
```javascript
{
  name: "Market Sentiment Analysis",
  description: "Track overall market sentiment and investor mood",
  searchQueries: [
    "market sentiment today",
    "investor sentiment index",
    "fear greed index",
    "market mood analysis"
  ],
  requiredKeywords: ["sentiment", "market", "investor", "mood"],
  excludeKeywords: [],
  preferredDomains: ["cnn.com/markets", "marketwatch.com", "sentiment-trader.com"],
  excludeDomains: [],
  contentSelectors: ["article", ".sentiment-analysis", "main"],
  titleSelectors: ["h1", ".article-headline"],
  excludeSelectors: [".advertisement", ".premium-content"],
  minContentLength: 300,
  maxContentLength: 35000,
  maxUrlsPerBatch: 12,
  scrapingInterval: 1800,  // 30 minutes
  priority: 8
}
```

## How to Add Topics:

1. **Login** to admin dashboard: https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io/
2. Click **"Topics"** in the sidebar
3. Click **"Add Topic"** button
4. Fill in the fields:
   - **Name**: Topic name (e.g., "DePIN Infrastructure News")
   - **Description**: Brief description
   - **Search Queries**: What to search for (add multiple)
   - **Required Keywords**: Must be present in content
   - **Exclude Keywords**: Skip pages with these words
   - **Preferred Domains**: Prioritize these sites
   - **Content Selectors**: CSS selectors for main content
   - **Min/Max Content Length**: Size limits
   - **Max URLs per Batch**: How many URLs to process at once
   - **Scraping Interval**: How often to run (in seconds)
   - **Priority**: 1-10 (10 = highest)
5. Click **"Create Topic"**

## Tips for Creating Topics:

1. **Start Simple**: Begin with 2-3 search queries and expand later
2. **Use Specific Keywords**: More specific = better quality results
3. **Set Reasonable Intervals**: 
   - Breaking news: 15-30 minutes
   - Daily updates: 1-2 hours
   - Research content: 3-6 hours
4. **Prioritize Important Topics**: Use priority 8-10 for critical data
5. **Test First**: Create topic with small batch size to test quality
6. **Monitor Results**: Check scraped data quality and adjust selectors

## AI Configuration (Optional):

If you want to enable AI enhancement:
1. Go to **"Scraping Config"** → **"AI Configuration"**
2. Toggle **"Enable AI Processing"**
3. Add your **OpenAI API key**
4. Select features:
   - ✅ Summarization
   - ✅ Keyword Extraction
   - ✅ Categorization
   - ✅ Sentiment Analysis
5. Click **"Save Configuration"**

**Cost**: ~$0.0002 per page with all features enabled