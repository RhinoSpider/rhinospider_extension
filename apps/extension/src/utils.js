// utils.js - General utility functions for the RhinoSpider extension

/**
 * Generate a random string of specified length
 * @param {number} length - The length of the random string to generate
 * @returns {string} A random string of the specified length
 */
export function getRandomString(length = 8) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }
  
  return result;
}

/**
 * Sleep for the specified number of milliseconds
 * @param {number} ms - The number of milliseconds to sleep
 * @returns {Promise} A promise that resolves after the specified time
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format a date as an ISO string without milliseconds
 * @param {Date} date - The date to format
 * @returns {string} The formatted date string
 */
export function formatDate(date = new Date()) {
  return date.toISOString().split('.')[0] + 'Z';
}

/**
 * Safely parse JSON with error handling
 * @param {string} jsonString - The JSON string to parse
 * @param {any} defaultValue - The default value to return if parsing fails
 * @returns {any} The parsed JSON or the default value
 */
export function safeJsonParse(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return defaultValue;
  }
}
