// js/utils/string.enhancer.js

/**
 * Capitalizes the first letter of a string.
 * @param {string} str - The input string.
 * @returns {string} The string with the first letter capitalized, or original string if empty/invalid.
 */
export function capitalizeFirstLetter(str) {
  if (!str || typeof str !== 'string') {
    return ''; // Or return str as is, or throw error based on desired strictness
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Capitalizes the first letter of each word in a string.
 * @param {string} str - The input string.
 * @returns {string} The string with each word capitalized.
 */
export function capitalizeWords(str) {
  if (!str || typeof str !== 'string') {
    return '';
  }
  return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
  // Alternatively, split by space:
  // return str.split(' ').map(word => capitalizeFirstLetter(word)).join(' ');
}


/**
 * Truncates a string to a maximum length and appends a suffix.
 * @param {string} str - The input string.
 * @param {number} maxLength - The maximum length of the string (including suffix).
 * @param {string} [suffix='...'] - The suffix to append if the string is truncated.
 * @returns {string} The truncated string, or the original string if shorter than maxLength.
 */
export function truncateString(str, maxLength, suffix = '...') {
  if (!str || typeof str !== 'string') {
    return '';
  }
  if (str.length <= maxLength) {
    return str;
  }
  // Ensure maxLength accounts for the suffix length
  const truncatedLength = maxLength - suffix.length;
  if (truncatedLength <= 0) {
      // If maxLength is too small for the suffix, return just the suffix or part of it
      return suffix.substring(0, Math.max(0, maxLength));
  }
  return str.substring(0, truncatedLength) + suffix;
}

/**
 * Removes HTML/XML tags from a string.
 * @param {string} htmlString - The string containing HTML.
 * @returns {string} The string with HTML tags removed.
 */
export function stripHtmlTags(htmlString) {
  if (!htmlString || typeof htmlString !== 'string') {
    return '';
  }
  // A simple regex for stripping tags. May not cover all edge cases for malformed HTML.
  // For more robust stripping, a DOM parsing approach might be better but slower.
  return htmlString.replace(/<[^>]*>/g, '');
}

/**
 * Escapes HTML special characters to prevent XSS.
 * Replaces &, <, >, ", ' with their respective HTML entities.
 * @param {string} unsafeStr - The string to escape.
 * @returns {string} The escaped string.
 */
export function escapeHtml(unsafeStr) {
  if (unsafeStr === null || unsafeStr === undefined) return '';
  if (typeof unsafeStr !== 'string') unsafeStr = String(unsafeStr);

return unsafeStr
  .replace(/&/g, "&")
  .replace(/</g, "<")
  .replace(/>/g, ">")
  .replace(/"/g, "")
  .replace(/'/g, "");
}

// هنا يبدأ توثيق الدالة الجديدة أو أي شرح آخر خارج الجسم
/**
 * Unescapes HTML entities back to their characters.
 * @param {string} safeStr - The string with HTML entities.
 * @returns {string} The unescaped string.
 */
export function unescapeHtml(safeStr) {
  if (safeStr === null || safeStr === undefined) return '';
  if (typeof safeStr !== 'string') safeStr = String(safeStr);
  
  // Create a temporary textarea element to leverage browser's decoding
  const textarea = document.createElement('textarea');
  textarea.innerHTML = safeStr;
  return textarea.value;
  // Alternative manual replacement (less comprehensive):
  // return safeStr
  //   .replace(/</g, "<")
  //   .replace(/>/g, ">")
  //   .replace(/"/g, "\"")
  //   .replace(/'/g, "'") // Or /'/g
  //   .replace(/&/g, "&");
}


/**
 * Generates a random string of a specified length.
 * @param {number} length - The desired length of the random string.
 * @param {string} [characters='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'] -
 *                          The set of characters to choose from.
 * @returns {string} The generated random string.
 */
export function generateRandomString(length, characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
  if (typeof length !== 'number' || length <= 0) {
    return '';
  }
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

/**
 * Simple string template formatter. Replaces {key} with data[key].
 * Example: formatString("Hello {name}!", { name: "World" }) -> "Hello World!"
 * @param {string} template - The template string with placeholders.
 * @param {Record<string, string | number | boolean>} data - An object with key-value pairs for replacements.
 * @returns {string} The formatted string.
 */
export function formatString(template, data) {
  if (!template || typeof template !== 'string') return '';
  if (!data || typeof data !== 'object') return template; // Return template if no data

  return template.replace(/{([^{}]+)}/g, (match, key) => {
    // key will be the string inside {}.
    // Using `Object.prototype.hasOwnProperty.call` for safer property check.
    return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : match;
  });
}

/**
 * Converts a string into a URL-friendly "slug".
 * Replaces spaces with hyphens, converts to lowercase, and removes non-alphanumeric characters (except hyphens).
 * @param {string} str - The input string.
 * @returns {string} The slugified string.
 */
export function slugify(str) {
  if (!str || typeof str !== 'string') {
    return '';
  }
  return str
    .toString()
    .normalize('NFKD') // Normalize special characters (e.g., accented chars)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars except hyphens
    .replace(/--+/g, '-'); // Replace multiple - with single -
}

/**
 * Checks if a string is null, undefined, or consists only of whitespace.
 * @param {string | null | undefined} str - The string to check.
 * @returns {boolean} True if the string is blank, false otherwise.
 */
export function isBlank(str) {
    return (!str || typeof str !== 'string' || str.trim().length === 0);
}

/**
 * Checks if a string contains another substring (case-insensitive by default).
 * @param {string} mainString - The string to search within.
 * @param {string} subString - The substring to search for.
 * @param {boolean} [caseSensitive=false] - Whether the search should be case-sensitive.
 * @returns {boolean} True if subString is found in mainString.
 */
export function contains(mainString, subString, caseSensitive = false) {
    if (isBlank(mainString) || isBlank(subString)) {
        return false;
    }
    if (caseSensitive) {
        return mainString.includes(subString);
    }
    return mainString.toLowerCase().includes(subString.toLowerCase());
}


// This module exports utility functions directly. No complex initialization needed.
// No `initialize...` function needed from moduleBootstrap for this type of utility module.
