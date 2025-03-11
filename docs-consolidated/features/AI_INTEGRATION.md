# RhinoSpider AI Integration

## Overview

RhinoSpider uses AI to enhance data extraction through field-specific prompts that are configured and managed through the admin portal. Each topic's fields have customized prompts that guide the AI in extracting precise information.

## Admin Configuration

### 1. Topic Configuration

```typescript
interface TopicConfig {
  name: string;
  description: string;
  fields: FieldConfig[];
  aiSettings: AISettings;
}

interface FieldConfig {
  name: string;
  type: 'text' | 'number' | 'date' | 'list' | 'boolean';
  required: boolean;
  prompt: string;         // AI prompt for this field
  validation?: string[];  // Validation rules
}

interface AISettings {
  model: string;          // GPT model to use
  temperature: number;    // 0-1, higher = more creative
  maxTokens: number;     // Max tokens per request
  stopSequences?: string[]; // Optional stop sequences
}
```

### 2. Rate Limiting

```typescript
interface RateLimits {
  requestsPerMinute: number;
  tokensPerDay: number;
  maxConcurrent: number;
  cooldownPeriod: number;
}
```

### 3. Cost Controls

```typescript
interface CostControls {
  maxDailyCost: number;
  warningThreshold: number;
  modelPriority: {
    gpt4: number;      // When to use GPT-4
    gpt35: number;     // When to use GPT-3.5
  };
}
```

## Field-Specific Prompts

### 1. Prompt Structure

```typescript
interface FieldPrompt {
  instruction: string;   // What to extract
  context: string;      // Field context
  format: string;       // Expected format
  examples: Example[];  // Example extractions
}

interface Example {
  input: string;
  output: string;
  explanation: string;
}
```

### 2. Example Prompts

```typescript
// Product Price Field
const pricePrompt = {
  instruction: "Extract the product's price",
  context: "Look for currency symbols ($,€,£) and numerical values",
  format: "Number with 2 decimal places",
  examples: [
    {
      input: "Price: $99.99",
      output: "99.99",
      explanation: "Extracted numerical value only"
    }
  ]
};

// Article Date Field
const datePrompt = {
  instruction: "Extract the article publication date",
  context: "Look for date patterns in various formats",
  format: "ISO 8601 (YYYY-MM-DD)",
  examples: [
    {
      input: "Posted on Jan 15, 2024",
      output: "2024-01-15",
      explanation: "Converted to ISO format"
    }
  ]
};
```

## Implementation

### 1. Field Processing

```typescript
interface FieldProcessor {
  field: FieldConfig;
  content: string;
  
  async extract(): Promise<FieldResult> {
    const prompt = this.buildPrompt();
    const result = await this.callAI(prompt);
    return this.validateResult(result);
  }

  private buildPrompt(): string {
    return `${this.field.prompt}\nContent: ${this.content}`;
  }
}
```

### 2. Validation

```typescript
interface FieldResult {
  value: any;
  confidence: number;
  metadata: {
    processingTime: number;
    tokensUsed: number;
    model: string;
  };
}

class FieldValidator {
  validate(result: FieldResult, field: FieldConfig): boolean {
    // Apply field-specific validation rules
    return field.validation?.every(rule => 
      this.checkRule(rule, result.value)
    ) ?? true;
  }
}
```

## Error Handling

### 1. Field Errors

```typescript
interface FieldError {
  field: string;
  error: string;
  attempts: number;
  lastAttempt: {
    prompt: string;
    result: string;
    error?: string;
  };
}
```

### 2. Recovery Strategy

```typescript
class ErrorHandler {
  async handleFieldError(error: FieldError): Promise<void> {
    if (error.attempts < 3) {
      // Retry with modified prompt
      return this.retryExtraction(error);
    }
    // Log failure and skip field
    await this.logFailure(error);
  }
}
```

## Performance Optimization

### 1. Caching

```typescript
interface PromptCache {
  key: string;        // Hash of content + field
  result: FieldResult;
  timestamp: number;
  usageCount: number;
}
```

### 2. Batch Processing

```typescript
class BatchProcessor {
  private queue: FieldRequest[] = [];
  private processing = false;
  
  async add(request: FieldRequest): Promise<FieldResult> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        ...request,
        resolve,
        reject
      });
      
      if (!this.processing) {
        this.processQueue();
      }
    });
  }
  
  private async processQueue(): Promise<void> {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, 10); // Process 10 at a time
      await Promise.all(batch.map(this.processRequest));
    }
    
    this.processing = false;
  }
}
```

## Integration Points

### 1. Extension Integration

```typescript
// In extension's content processor
async function processWithAI(content, topic) {
  // Only if AI processing is enabled for this topic
  if (topic.aiSettings && topic.aiSettings.enabled) {
    try {
      // Send to AI processing endpoint
      const response = await fetch(`${AI_ENDPOINT}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          content,
          topicId: topic.id,
          fields: topic.fields
        })
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error("AI processing error:", error);
    }
  }
  
  // Fallback to basic processing
  return basicProcessContent(content, topic);
}
```

### 2. Admin Portal Integration

```typescript
// In admin portal's topic editor
function AISettingsEditor({ topic, onChange }) {
  const [aiSettings, setAISettings] = useState(topic.aiSettings || {
    enabled: false,
    model: 'gpt-3.5-turbo',
    temperature: 0.3,
    maxTokens: 1000
  });
  
  const handleChange = (field, value) => {
    const newSettings = { ...aiSettings, [field]: value };
    setAISettings(newSettings);
    onChange(newSettings);
  };
  
  return (
    <div className="ai-settings-editor">
      <h3>AI Processing Settings</h3>
      
      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={aiSettings.enabled}
            onChange={e => handleChange('enabled', e.target.checked)}
          />
          Enable AI Processing
        </label>
      </div>
      
      {aiSettings.enabled && (
        <>
          <div className="form-group">
            <label>Model</label>
            <select
              value={aiSettings.model}
              onChange={e => handleChange('model', e.target.value)}
            >
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="gpt-4">GPT-4</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Temperature</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={aiSettings.temperature}
              onChange={e => handleChange('temperature', parseFloat(e.target.value))}
            />
            <span>{aiSettings.temperature}</span>
          </div>
          
          <div className="form-group">
            <label>Max Tokens</label>
            <input
              type="number"
              value={aiSettings.maxTokens}
              onChange={e => handleChange('maxTokens', parseInt(e.target.value))}
            />
          </div>
        </>
      )}
    </div>
  );
}
```

## Custom Prompts

The AI custom prompts in RhinoSpider serve several key purposes in the web scraping process:

1. **Content Extraction and Structuring**:
   - Transforms raw HTML into structured data according to the defined schema
   - Identifies and extracts relevant content while ignoring ads, navigation, and other irrelevant elements

2. **Field-Specific Processing**:
   - Processes different types of data appropriately (dates, categories, content)
   - Standardizes formats and extracts implicit information

3. **Handling Inconsistent Layouts**:
   - Makes scraping more robust against website layout changes
   - Understands semantic meaning rather than relying solely on CSS selectors

4. **Implementation Options in RhinoSpider Architecture**:
   - In the extension before sending data to the proxy (most efficient)
   - In the proxy service before storing in the canister
   - As a post-processing step after data is in the storage canister

## Future Improvements

### 1. Advanced Features
- Multi-model support
- Domain-specific fine-tuning
- Adaptive prompt generation

### 2. Integration Enhancements
- Real-time feedback loop
- Custom fine-tuning
- Fallback strategies

### 3. Optimization
- Prompt optimization
- Token usage reduction
- Batch processing improvements
