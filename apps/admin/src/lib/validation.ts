export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateUrlPattern = (pattern: string): ValidationResult => {
  const errors: string[] = [];

  // Check if pattern is empty
  if (!pattern.trim()) {
    errors.push('URL pattern cannot be empty');
    return { isValid: false, errors };
  }

  try {
    // Check if it's a valid regex pattern
    new RegExp(pattern);
  } catch (e) {
    errors.push('Invalid regex pattern');
    return { isValid: false, errors };
  }

  // Check for common mistakes
  if (!pattern.includes('*') && !pattern.includes('+') && !pattern.includes('?') && !pattern.includes('|')) {
    errors.push('Pattern might be too specific. Consider using wildcards or regex patterns');
  }

  if (pattern.includes('http://')) {
    errors.push('Consider using https:// instead of http:// for security');
  }

  // Check for basic structure
  if (!pattern.includes('.')) {
    errors.push('Pattern should include a domain (e.g., .com, .org)');
  }

  return {
    isValid: errors.length === 0 || errors.every(e => e.includes('Consider')),
    errors
  };
};

export const validateRateLimit = (requestsPerHour: number, maxConcurrent: number): ValidationResult => {
  const errors: string[] = [];

  if (requestsPerHour < 0) {
    errors.push('Requests per hour must be positive');
  }

  if (maxConcurrent < 0) {
    errors.push('Max concurrent requests must be positive');
  }

  if (maxConcurrent > requestsPerHour) {
    errors.push('Max concurrent requests should not exceed requests per hour');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
