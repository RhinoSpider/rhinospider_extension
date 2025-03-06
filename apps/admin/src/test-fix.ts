// Test code to debug the excludePatterns issue
const topic = {
  excludePatterns: ["*/customer-reviews/*"]
};

// Current format
const badFormat = topic.excludePatterns && topic.excludePatterns.length > 0
  ? [[topic.excludePatterns
      .filter((p: any) => typeof p === 'string' && p.trim() !== '')
      .map((p: any) => p.trim())]]
  : [];

console.log("Bad format:", JSON.stringify(badFormat, null, 2));

// Correct format should be:
const correctFormat = topic.excludePatterns && topic.excludePatterns.length > 0
  ? [topic.excludePatterns
      .filter((p: any) => typeof p === 'string' && p.trim() !== '')]
  : [];

console.log("Correct format:", JSON.stringify(correctFormat, null, 2));

// Alternative format:
const alternativeFormat = topic.excludePatterns && topic.excludePatterns.length > 0
  ? [[...topic.excludePatterns
      .filter((p: any) => typeof p === 'string' && p.trim() !== '')
      .map((p: any) => p.trim())]]
  : [];

console.log("Alternative format:", JSON.stringify(alternativeFormat, null, 2));
