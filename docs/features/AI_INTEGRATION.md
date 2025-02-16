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
interface BatchRequest {
  fields: FieldConfig[];
  content: string;
  priority: number;
}
```

## Security

### 1. Content Filtering

```typescript
interface ContentFilter {
  removePII: boolean;
  maxLength: number;
  allowedTags: string[];
}
```

### 2. Request Validation

```typescript
interface RequestValidator {
  validateOrigin: boolean;
  validateUser: boolean;
  validateQuota: boolean;
}
```

## Monitoring

### 1. Performance Metrics

```typescript
interface AIMetrics {
  successRate: number;
  averageLatency: number;
  tokenUsage: number;
  costPerField: number;
}
```

### 2. Quality Metrics

```typescript
interface QualityMetrics {
  accuracy: number;
  confidence: number;
  errorRate: number;
}
```

## Future Improvements

### 1. Enhanced Prompts
- Dynamic prompt generation
- Context-aware prompts
- Multi-language support

### 2. Model Selection
- Automatic model selection
- Custom fine-tuning
- Fallback strategies

### 3. Optimization
- Prompt optimization
- Cost reduction
- Performance improvements
