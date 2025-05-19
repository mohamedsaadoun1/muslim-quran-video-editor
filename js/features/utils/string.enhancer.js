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
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// هنا يبدأ توثيق الدالة الجديدة أو أي شرح آخر خارج الجسم
/**
 * Unescapes HTML entities back to their characters.
 * يمكنك إضافة دوال أخرى هنا حسب الحاجة.
 */
