import { $query, $update, Record, StableBTreeMap, Vec, match, Result, nat64, ic, Principal } from 'azle';
import { v4 as uuidv4 } from 'uuid';
import { ScrapingTopic, AIConfig, ScrapedData, ExtensionUser, HTMLContent, ProcessRequest } from './types';

// Storage
const topics = new StableBTreeMap<string, ScrapingTopic>(0, 44, 1024);
const aiConfig = new StableBTreeMap<string, AIConfig>(1, 44, 1024);
const scrapedData = new StableBTreeMap<string, ScrapedData>(2, 44, 2048);
const users = new StableBTreeMap<string, ExtensionUser>(3, 44, 1024);
const htmlContent = new StableBTreeMap<string, HTMLContent>(4, 44, 4096);

// Encryption key (in production, this should be securely managed)
const ENCRYPTION_KEY = 'your-secure-key-here';

// Helper function to encrypt sensitive data
function encrypt(text: string): string {
  // Simple XOR encryption for demo (use proper encryption in production)
  const key = ENCRYPTION_KEY.repeat(Math.ceil(text.length / ENCRYPTION_KEY.length));
  return Array.from(text)
    .map((char, i) => String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i)))
    .join('');
}

// Helper function to decrypt sensitive data
function decrypt(encrypted: string): string {
  // XOR is reversible with the same key
  return encrypt(encrypted);
}

// Topic Management
$query;
export function getTopics(): Result<Vec<ScrapingTopic>, string> {
    return Result.Ok(topics.values());
}

$update;
export function createTopic(topic: ScrapingTopic): Result<ScrapingTopic, string> {
    try {
        // Validate topic
        if (!topic.name || !topic.urlPatterns || !topic.extractionRules) {
            return Result.Err('Invalid topic data');
        }

        const id = uuidv4();
        const newTopic = {
            ...topic,
            id,
            active: true
        };

        topics.insert(id, newTopic);
        return Result.Ok(newTopic);
    } catch (error) {
        return Result.Err(`Failed to create topic: ${error}`);
    }
}

$update;
export function updateTopic(id: string, topic: ScrapingTopic): Result<ScrapingTopic, string> {
    try {
        const existing = topics.get(id);
        if (!existing) {
            return Result.Err('Topic not found');
        }

        const updatedTopic = {
            ...topic,
            id
        };

        topics.insert(id, updatedTopic);
        return Result.Ok(updatedTopic);
    } catch (error) {
        return Result.Err(`Failed to update topic: ${error}`);
    }
}

$update;
export function deleteTopic(id: string): Result<boolean, string> {
    try {
        const existing = topics.get(id);
        if (!existing) {
            return Result.Err('Topic not found');
        }

        topics.remove(id);
        return Result.Ok(true);
    } catch (error) {
        return Result.Err(`Failed to delete topic: ${error}`);
    }
}

$update;
export function deleteAllTopics(): Result<string, string> {
  try {
    const allTopics = topics.values();
    for (const topic of allTopics) {
      topics.remove(topic.id);
    }
    return Result.Ok('All topics deleted');
  } catch (error) {
    return Result.Err(`Failed to delete topics: ${error}`);
  }
}

// AI Configuration
const DEFAULT_AI_CONFIG: AIConfig = {
  apiKey: '',
  model: 'gpt-3.5-turbo',
  costLimits: {
    dailyUSD: 5,
    monthlyUSD: 100,
    maxConcurrent: 5
  }
};

$query;
export function getAIConfig(): Result<AIConfig, string> {
  try {
    const configs = aiConfig.values();
    if (configs.length === 0) {
      // Return default config
      return Result.Ok(DEFAULT_AI_CONFIG);
    }
    
    // Decrypt API key before returning
    const config = configs[0];
    return Result.Ok({
      ...config,
      apiKey: decrypt(config.apiKey)
    });
  } catch (error) {
    return Result.Err(`Failed to get AI config: ${error}`);
  }
}

$update;
export function updateAIConfig(config: AIConfig): Result<AIConfig, string> {
  try {
    // Encrypt API key before storing
    const encryptedConfig = {
      ...config,
      apiKey: encrypt(config.apiKey)
    };

    // Store encrypted config
    aiConfig.insert('config', encryptedConfig);

    // Return config with decrypted API key
    return Result.Ok({
      ...encryptedConfig,
      apiKey: config.apiKey
    });
  } catch (error) {
    return Result.Err(`Failed to update AI config: ${error}`);
  }
}

$update;
export function clearAIConfig(): Result<string, string> {
  try {
    aiConfig.remove('config');
    return Result.Ok('AI config cleared');
  } catch (error) {
    return Result.Err(`Failed to clear AI config: ${error}`);
  }
}

// Scraped Data Management
$query;
export function getScrapedData(topicId: string | null): Result<Vec<ScrapedData>, string> {
  try {
    let data = scrapedData.values();
    
    // Filter by topic if specified
    if (topicId) {
      data = data.filter(item => item.topicId === topicId);
    }
    
    return Result.Ok(data);
  } catch (error) {
    return Result.Err(`Failed to get scraped data: ${error}`);
  }
}

$update;
export function addScrapedData(data: ScrapedData): Result<ScrapedData, string> {
    try {
        const id = uuidv4();
        const newData = {
            ...data,
            id,
            timestamp: ic.time()
        };

        scrapedData.insert(id, newData);
        return Result.Ok(newData);
    } catch (error) {
        return Result.Err(`Failed to add scraped data: ${error}`);
    }
}

// Extension User Management
$query;
export function getUsers(): Result<Vec<ExtensionUser>, string> {
    return Result.Ok(users.values());
}

$update;
export function updateUser(principalId: string, userData: ExtensionUser): Result<ExtensionUser, string> {
    try {
        const updatedUser = {
            ...userData,
            principalId,
            lastActive: ic.time()
        };

        users.insert(principalId, updatedUser);
        return Result.Ok(updatedUser);
    } catch (error) {
        return Result.Err(`Failed to update user: ${error}`);
    }
}

// HTML Storage and Processing
$update;
export function storeHTML(content: HTMLContent): Result<HTMLContent, string> {
  try {
    const id = uuidv4();
    const newContent = {
      ...content,
      id
    };
    htmlContent.insert(id, newContent);
    return Result.Ok(newContent);
  } catch (error) {
    return Result.Err(`Failed to store HTML: ${error}`);
  }
}

// OpenAI Integration
async function callOpenAI(apiKey: string, model: string, prompt: string, html: string): Promise<string> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that extracts specific information from HTML content based on given instructions.'
          },
          {
            role: 'user',
            content: `Extract the following information from this HTML content according to these instructions: ${prompt}\n\nHTML Content:\n${html}`
          }
        ],
        temperature: 0.3, // Lower temperature for more focused responses
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    throw new Error(`Failed to call OpenAI: ${error}`);
  }
}

$update;
export async function processWithAI(request: ProcessRequest): Promise<Result<ScrapedData, string>> {
  try {
    // Get HTML content
    const content = htmlContent.get(request.htmlId);
    if (!content) {
      return Result.Err('HTML content not found');
    }

    // Get topic configuration
    const topic = topics.get(request.topicId);
    if (!topic) {
      return Result.Err('Topic not found');
    }

    // Get AI configuration
    const configs = aiConfig.values();
    if (configs.length === 0) {
      return Result.Err('AI configuration not found');
    }
    const config = configs[0];
    
    // Decrypt API key
    const apiKey = decrypt(config.apiKey);

    // Process each field with AI
    const extractedData: Record<string, string> = {};
    let qualityScore = 1.0;
    const issues: string[] = [];

    for (const field of topic.extractionRules.fields) {
      try {
        const extractedValue = await callOpenAI(
          apiKey,
          config.model,
          field.aiPrompt,
          content.html
        );

        extractedData[field.name] = extractedValue;

        // Validate the extracted value
        if (field.required && !extractedValue) {
          issues.push(`Required field ${field.name} is empty`);
          qualityScore *= 0.8;
        }

        // Basic validation checks
        if (field.validation) {
          if (field.validation.minLength && extractedValue.length < field.validation.minLength) {
            issues.push(`${field.name} is too short (minimum ${field.validation.minLength} characters)`);
            qualityScore *= 0.9;
          }
          if (field.validation.maxLength && extractedValue.length > field.validation.maxLength) {
            issues.push(`${field.name} is too long (maximum ${field.validation.maxLength} characters)`);
            qualityScore *= 0.9;
          }
          if (field.validation.pattern) {
            const regex = new RegExp(field.validation.pattern);
            if (!regex.test(extractedValue)) {
              issues.push(`${field.name} does not match required pattern`);
              qualityScore *= 0.9;
            }
          }
        }
      } catch (error) {
        issues.push(`Failed to extract ${field.name}: ${error}`);
        qualityScore *= 0.7;
      }
    }

    // Create scraped data record
    const scrapedDataRecord: ScrapedData = {
      id: uuidv4(),
      topicId: request.topicId,
      url: request.url,
      timestamp: ic.time(),
      extractedBy: Principal.fromText(ic.caller().toText()).toText(),
      data: extractedData,
      quality: {
        score: qualityScore,
        issues: issues.length > 0 ? issues : undefined
      }
    };

    // Store the result
    scrapedData.insert(scrapedDataRecord.id, scrapedDataRecord);

    // Clean up HTML content to save space
    htmlContent.remove(request.htmlId);

    return Result.Ok(scrapedDataRecord);
  } catch (error) {
    return Result.Err(`Failed to process with AI: ${error}`);
  }
}

// Temporary function to simulate AI extraction (replace with actual OpenAI call)
function simulateAIExtraction(html: string, field: any): string {
  // This is just a placeholder
  // In production, we would:
  // 1. Call OpenAI with the field.aiPrompt
  // 2. Process the HTML content
  // 3. Return extracted data
  return `Extracted ${field.name} from content`;
}

// Helper function to validate a scraping topic
function validateTopic(topic: ScrapingTopic): string | null {
    if (!topic.name) {
        return 'Name is required';
    }
    if (!topic.urlPatterns || topic.urlPatterns.length === 0) {
        return 'At least one URL pattern is required';
    }
    if (!topic.extractionRules || !topic.extractionRules.fields || topic.extractionRules.fields.length === 0) {
        return 'At least one field is required';
    }
    return null;
}

// For development only - clear all data
$update;
export function clearAllData(): Result<string, string> {
  try {
    // Clear AI config
    aiConfig.clear();
    // Clear topics
    topics.clear();
    // Clear scraped data
    scrapedData.clear();
    return Result.Ok('All data cleared');
  } catch (error) {
    return Result.Err(`Failed to clear data: ${error}`);
  }
}
