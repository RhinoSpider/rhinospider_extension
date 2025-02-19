# RhinoSpider Data Processing Architecture

## Overview

RhinoSpider implements a multi-stage data processing pipeline that converts raw web content into structured JSON data. The processing happens at different stages of the system to ensure efficient and reliable data collection.

## Data Flow Stages

### 1. Chrome Extension (Initial Processing)
- **Location**: User's browser
- **Purpose**: Initial HTML parsing and basic data extraction
- **Process**:
  1. Fetches raw HTML content
  2. Applies topic-specific extraction rules
  3. Creates initial structured JSON
  4. Sends to Consumer Canister

```javascript
// Example Extension Output
{
  url: "https://example.com/page",
  topic: "topic_id",
  title: "Extracted Title",
  text: "Main Content",
  timestamp: BigInt(Date.now()),
  metadata: {
    source: "extension",
    scrapeTime: timestamp,
    page: {
      // Meta tags
      description: "...",
      keywords: "..."
    }
  },
  data: {
    // Structured data from rules
    price: "123.45",
    features: ["feature1", "feature2"],
    specifications: {
      color: "red",
      size: "large"
    }
  }
}
```

### 2. Digital Ocean Service (Deep Processing)
- **Location**: DO Droplet
- **Purpose**: Advanced content processing and validation
- **Components**:
  - Puppeteer for JavaScript rendering
  - Custom extractors for complex content
  - Data validation and enrichment
- **Process**:
  1. Receives scraping requests from extension
  2. Renders full page content with JavaScript
  3. Applies advanced extraction rules
  4. Validates and enriches data
  5. Returns processed JSON to extension

```javascript
// Example DO Service Processing
{
  original: {
    // Original data from extension
  },
  enriched: {
    // Additional extracted data
    images: ["url1", "url2"],
    relatedLinks: ["link1", "link2"],
    structuredData: {
      // Schema.org or other structured data
    }
  },
  validation: {
    status: "valid",
    completeness: 0.95,
    errors: []
  }
}
```

### 3. Consumer Canister (Data Validation)
- **Location**: Internet Computer
- **Purpose**: Data validation and routing
- **Process**:
  1. Validates incoming data structure
  2. Checks required fields
  3. Normalizes data format
  4. Routes to storage canister

### 4. Storage Canister (Final Storage)
- **Location**: Internet Computer
- **Purpose**: Permanent data storage
- **Features**:
  - Efficient data indexing
  - Query optimization
  - Data versioning

## Extraction Rules

### 1. Rule Types
- **Simple Selectors**: Direct CSS/XPath selectors
- **Array Collectors**: Extract lists of items
- **Object Builders**: Create nested objects
- **Custom Functions**: Special processing logic

### 2. Example Rules
```javascript
{
  rules: [
    {
      field: "title",
      selector: "h1.product-title",
      type: "text"
    },
    {
      field: "features",
      selector: "ul.features li",
      type: "array"
    },
    {
      field: "specifications",
      selector: "table.specs tr",
      type: "object",
      keyAttribute: "data-spec",
      valueSelector: "td"
    }
  ]
}
```

## Error Handling

### 1. Extension Level
- Selector failures logging
- Partial data collection
- Retry mechanism

### 2. DO Service Level
- Network error handling
- Timeout management
- Data validation errors

### 3. Canister Level
- Schema validation
- Data integrity checks
- Storage verification

## Data Quality Assurance

### 1. Validation Rules
- Required fields
- Data type checking
- Format validation
- Cross-field validation

### 2. Monitoring
- Success rate tracking
- Data completeness metrics
- Error rate monitoring
- Performance metrics

## Implementation Notes

### 1. Extension Implementation
- Use DOMParser for HTML processing
- Implement rate limiting
- Handle partial success
- Batch processing support

### 2. DO Service Implementation
- Use Docker for isolation
- Redis for queue management
- Implement retry logic
- Monitor resource usage

### 3. Canister Implementation
- Optimize storage patterns
- Implement efficient queries
- Handle data versioning
- Manage access control

## Future Improvements

1. AI-powered extraction
2. Adaptive rule generation
3. Real-time validation
4. Enhanced error recovery
5. Advanced data enrichment
