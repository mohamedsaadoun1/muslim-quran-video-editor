// js/utils/string.enhancer.js

/**
 * @typedef {Object} StringError
 * @property {string} message - Description of the error
 * @property {string} origin - The function where the error occurred
 * @property {any[]} [inputs] - The input values that caused the error
 */

/**
 * Escapes special characters in a string for use in a regular expression.
 * @param {string} str - The string to escape.
 * @returns {string} The escaped string.
 * @private
 */
function _escapeRegExp(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

/**
 * Escapes HTML special characters in a string for use in HTML attributes.
 * Used internally by stripHtmlTags.
 * @param {string|number} value - The string or number to escape.
 * @returns {string} The escaped string.
 * @private
 */
function _escapeHtmlForAttributes(value) {
    const s = (typeof value === 'number') ? String(value) : (typeof value === 'string' ? value : '');
    return s.replace(/[&<>"']/g, function (match) {
        switch (match) {
            case '&': return '&';
            case '<': return '<';
            case '>': return '>';
            case '"': return '"';
            case "'": return '''; // ' is preferred over ' for broad HTML compatibility.
            default: return match;
        }
    });
}

/**
 * Helper function to transform the replacement string based on the case of the matched text.
 * Used by replaceAllPreserveCase.
 * @param {string} matchedText - The actual text matched in the original string.
 * @param {string} replacement - The base replacement string.
 * @returns {string} The replacement string, cased according to matchedText.
 * @private
 */
function _transformReplacementCase(matchedText, replacement) {
    if (!matchedText || !replacement || replacement.length === 0) return replacement;

    const firstCharMatched = matchedText[0];
    const firstCharReplacement = replacement[0];

    // If the entire matched text was uppercase, uppercase the entire replacement.
    if (matchedText === matchedText.toUpperCase()) {
        return replacement.toUpperCase();
    }
    // If the entire matched text was lowercase, lowercase the entire replacement.
    if (matchedText === matchedText.toLowerCase()) {
        return replacement.toLowerCase();
    }
    // If the first character of matched text was uppercase (likely title case or start of sentence)
    if (firstCharMatched === firstCharMatched.toUpperCase()) {
        // If the rest of matchedText is lowercase (e.g., "Word"), apply title case to replacement.
        if (matchedText.length === 1 || matchedText.substring(1) === matchedText.substring(1).toLowerCase()) {
            return firstCharReplacement.toUpperCase() + replacement.substring(1).toLowerCase();
        }
        // If mixed case after first char (e.g., "WordMixed"), just uppercase first char of replacement.
        return firstCharReplacement.toUpperCase() + replacement.substring(1);
    }
    // Default: return replacement as is.
    return replacement;
}

/**
 * Capitalizes the first letter of a string.
 * @param {string} str - The input string.
 * @param {boolean} [lowercaseRest=false] - Whether to lowercase the rest of the string.
 * @returns {string} The string with the first letter capitalized.
 * @throws {Error} If str is not a string.
 */
export function capitalizeFirstLetter(str, lowercaseRest = false) {
  if (typeof str !== 'string') {
    throw new Error('capitalizeFirstLetter requires a string as input');
  }
  if (str.length === 0) {
    return str;
  }
  if (lowercaseRest) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Capitalizes the first letter of each word in a string.
 * @param {string} str - The input string.
 * @param {boolean} [lowercaseRest=false] - Whether to lowercase the rest of each word.
 * @returns {string} The string with each word capitalized.
 * @throws {Error} If str is not a string.
 */
export function capitalizeWords(str, lowercaseRest = false) {
  if (typeof str !== 'string') {
    throw new Error('capitalizeWords requires a string as input');
  }
  if (str.length === 0) {
    return str;
  }
  // Regex captures the main part of the word and any non-space characters attached to it.
  return str.replace(/\b([^\W_]+)([^\s]*)/g, (match, wordStart, wordEnd) => {
    let capitalizedWordStart = wordStart.charAt(0).toUpperCase() +
                              (lowercaseRest ? wordStart.slice(1).toLowerCase() : wordStart.slice(1));
    let processedWordEnd = lowercaseRest ? wordEnd.toLowerCase() : wordEnd;
    return capitalizedWordStart + processedWordEnd;
  });
}

/**
 * Truncates a string to a maximum length and appends a suffix.
 * @param {string} str - The input string.
 * @param {number} maxLength - The maximum length of the string (including suffix).
 * @param {string} [suffix='...'] - The suffix to append if the string is truncated.
 * @param {boolean} [preserveWord=false] - Whether to preserve complete words. If true, truncation happens at the last space before maxLength.
 * @returns {string} The truncated string, or the original string if shorter than maxLength.
 * @throws {Error} If inputs are invalid.
 */
export function truncateString(str, maxLength, suffix = '...', preserveWord = false) {
  if (typeof str !== 'string') {
    throw new Error('truncateString requires a string as the first argument');
  }
  if (typeof maxLength !== 'number' || maxLength < 0) {
    throw new Error('truncateString requires maxLength to be a non-negative number');
  }
  if (typeof suffix !== 'string') {
    throw new Error('truncateString requires suffix to be a string');
  }

  if (str.length <= maxLength) {
    return str;
  }

  const effectiveLength = Math.max(0, maxLength - suffix.length);

  if (effectiveLength === 0) {
    return suffix.substring(0, Math.min(suffix.length, maxLength));
  }

  let truncatedStr = str.substring(0, effectiveLength);

  if (preserveWord) {
    // Check if we are cutting in the middle of a word in the original string
    if (str.length > effectiveLength && // Original string was longer
        effectiveLength > 0 && // We have some truncated string
        str[effectiveLength] !== ' ' && // The character after cut isn't a space
        truncatedStr[truncatedStr.length - 1] !== ' ') { // The character at cut isn't a space
        const lastSpaceIndex = truncatedStr.lastIndexOf(' ');
        if (lastSpaceIndex !== -1) { // If -1, means no space in truncatedStr
            truncatedStr = truncatedStr.substring(0, lastSpaceIndex);
        } else {
            // No space found in the part to be kept (e.g., "VeryLongWord")
            return suffix.substring(0, Math.min(suffix.length, maxLength));
        }
    }
  }
  return truncatedStr.replace(/\s+$/, '') + suffix;
}

/**
 * Removes HTML/XML tags from a string, optionally keeping specified tags.
 * @param {string} htmlString - The string containing HTML.
 * @param {string[]} [allowedTags=[]] - Optional array of allowed tag names (e.g., ['b', 'i']) to keep. Attributes are preserved on allowed tags.
 * @returns {string} The string with disallowed HTML tags removed.
 * @throws {Error} If inputs are invalid.
 */
export function stripHtmlTags(htmlString, allowedTags = []) {
  if (typeof htmlString !== 'string') {
    throw new Error('stripHtmlTags requires a string as the first argument');
  }
  if (!Array.isArray(allowedTags)) {
    throw new Error('stripHtmlTags requires an array of allowed tags as the second argument');
  }
  if (htmlString.length === 0) {
    return '';
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const allowedSet = new Set(allowedTags.map(tag => tag.toLowerCase()));
  const voidElements = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

  function serializeNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagNameOriginal = node.tagName; // Keep original case for tag
      const tagNameLower = tagNameOriginal.toLowerCase();

      if (allowedSet.has(tagNameLower)) {
        let selfHtml = `<${tagNameOriginal}`; // Use original tag name
        for (const attr of node.attributes) {
          selfHtml += ` ${attr.name}="${_escapeHtmlForAttributes(attr.value)}"`;
        }

        if (voidElements.has(tagNameLower) && node.childNodes.length === 0) {
          // Browsers might not strictly require the slash for HTML5 void elements,
          // but it's common for XML-based serialization.
          selfHtml += ' />';
        } else {
          selfHtml += '>';
          let inner = '';
          node.childNodes.forEach(child => {
            inner += serializeNode(child);
          });
          selfHtml += inner;
          selfHtml += `</${tagNameOriginal}>`; // Use original tag name
        }
        return selfHtml;
      } else {
        // Tag is not allowed, process its children
        let content = '';
        node.childNodes.forEach(child => {
          content += serializeNode(child);
        });
        return content;
      }
    }
    return ''; // Ignore other node types like comments
  }

  let result = '';
  // Iterate over childNodes of doc.body, not doc.documentElement or doc itself
  doc.body.childNodes.forEach(child => {
    result += serializeNode(child);
  });
  return result;
}

/**
 * Escapes HTML special characters to prevent XSS.
 * @param {string | number} unsafeStr - The string or number to escape.
 * @returns {string} The escaped string.
 * @throws {Error} If input is not a string or number.
 */
export function escapeHtml(unsafeStr) {
  if (typeof unsafeStr !== 'string' && typeof unsafeStr !== 'number') {
    throw new Error('escapeHtml requires a string or number as input');
  }
  const str = String(unsafeStr); // Convert number to string

  const textNode = document.createTextNode(str);
  const div = document.createElement('div');
  div.appendChild(textNode);
  return div.innerHTML;
}

/**
 * Unescapes HTML entities back to their characters.
 * @param {string} escapedStr - The HTML-escaped string.
 * @returns {string} The unescaped string.
 * @throws {Error} If input is not a string.
 */
export function unescapeHtml(escapedStr) {
  if (typeof escapedStr !== 'string') {
    throw new Error('unescapeHtml requires a string as input');
  }

  const div = document.createElement('div');
  div.innerHTML = escapedStr;
  return div.textContent || '';
}

/**
 * Checks if a string contains only whitespace characters or is empty.
 * @param {string} str - The string to check.
 * @returns {boolean} True if the string is empty or contains only whitespace.
 * @throws {Error} If input is not a string.
 */
export function isEmptyOrWhitespace(str) {
  if (typeof str !== 'string') {
    throw new Error('isEmptyOrWhitespace requires a string as input');
  }
  return /^\s*$/.test(str);
}

/**
 * Alias for isEmptyOrWhitespace. Checks if a string contains only whitespace characters.
 * @param {string} str - The string to check.
 * @returns {boolean} True if the string contains only whitespace characters or is empty.
 * @throws {Error} If input is not a string
 */
export function isWhitespaceOnly(str) {
    return isEmptyOrWhitespace(str);
}

/**
 * Counts the number of words in a string.
 * Words are considered sequences of alphanumeric characters.
 * @param {string} str - The string to count words in.
 * @returns {number} The number of words.
 * @throws {Error} If input is not a string.
 */
export function countWords(str) {
  if (typeof str !== 'string') {
    throw new Error('countWords requires a string as input');
  }
  if (isEmptyOrWhitespace(str)) return 0;
  const matches = str.match(/\b\w+\b/g);
  return matches ? matches.length : 0;
}

/**
 * Counts the number of characters in a string, optionally excluding whitespace.
 * @param {string} str - The string to count characters in.
 * @param {boolean} [excludeWhitespace=false] - Whether to exclude whitespace characters.
 * @returns {number} The number of characters.
 * @throws {Error} If input is not a string.
 */
export function countCharacters(str, excludeWhitespace = false) {
  if (typeof str !== 'string') {
    throw new Error('countCharacters requires a string as input');
  }
  if (excludeWhitespace) {
    return str.replace(/\s/g, '').length;
  }
  return str.length;
}

/**
 * Converts a string to a slug-friendly format.
 * @param {string} str - The string to convert.
 * @param {string} [separator='-'] - The separator to use between words. Can be empty.
 * @returns {string} The slugified string.
 * @throws {Error} If str or separator are not strings.
 */
export function slugify(str, separator = '-') {
  if (typeof str !== 'string') {
    throw new Error('slugify requires a string as input for str');
  }
  if (typeof separator !== 'string') {
    throw new Error('slugify requires a string as input for separator');
  }

  let s = str.toString()
    .normalize('NFKD') // Normalize to decomposed form for accent removal
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase()
    .trim();

  const escapedSeparator = _escapeRegExp(separator);

  s = s.replace(/\s+/g, separator); // Replace spaces with separator
  if (separator.length > 0) {
    s = s.replace(new RegExp(`[^\\w${escapedSeparator}]`, 'g'), ''); // Remove non-word chars except separator
    s = s.replace(new RegExp(`${escapedSeparator}+`, 'g'), separator); // Replace multiple separators with one
    s = s.replace(new RegExp(`^${escapedSeparator}+|${escapedSeparator}+$`, 'g'), '');// Trim leading/trailing separator
  } else { // If separator is empty string, remove all non-alphanumeric characters
    s = s.replace(/[^\w]/g, '');
  }

  return s;
}

/**
 * Trims whitespace from both ends of a string.
 * @param {string} str - The string to trim.
 * @returns {string} The trimmed string.
 * @throws {Error} If input is not a string.
 */
export function trim(str) {
  if (typeof str !== 'string') {
    throw new Error('trim requires a string as input');
  }
  return str.trim();
}

/**
 * Trims whitespace from the beginning (start) of a string.
 * @param {string} str - The string to trim.
 * @returns {string} The trimmed string.
 * @throws {Error} If input is not a string.
 */
export function trimStart(str) {
  if (typeof str !== 'string') {
    throw new Error('trimStart requires a string as input');
  }
  return str.trimStart(); // ES2019
}

/**
 * Trims whitespace from the end of a string.
 * @param {string} str - The string to trim.
 * @returns {string} The trimmed string.
 * @throws {Error} If input is not a string.
 */
export function trimEnd(str) {
  if (typeof str !== 'string') {
    throw new Error('trimEnd requires a string as input');
  }
  return str.trimEnd(); // ES2019
}

/**
 * Truncates a string to a maximum number of words.
 * @param {string} str - The input string.
 * @param {number} maxWords - The maximum number of words. Must be a non-negative integer.
 * @param {string} [suffix='...'] - The suffix to append if the string is truncated.
 * @returns {string} The truncated string, or the original string if fewer words.
 * @throws {Error} If inputs are invalid.
 */
export function truncateWords(str, maxWords, suffix = '...') {
  if (typeof str !== 'string') {
    throw new Error('truncateWords requires a string as the first argument');
  }
  if (typeof maxWords !== 'number' || !Number.isInteger(maxWords) || maxWords < 0) {
    throw new Error('truncateWords requires maxWords to be a non-negative integer');
  }
  if (typeof suffix !== 'string') {
    throw new Error('truncateWords requires suffix to be a string');
  }

  if (maxWords === 0) {
    return suffix;
  }
  // Filter out empty strings that can result from multiple spaces
  const words = str.split(/\s+/).filter(word => word.length > 0);
  if (words.length <= maxWords) {
    return str;
  }
  return words.slice(0, maxWords).join(' ') + suffix;
}

/**
 * Truncates an HTML string to a maximum number of words, preserving HTML tags.
 * Note: This function uses regex for tokenization and is best for simple, well-formed HTML.
 * Complex or malformed HTML might lead to unexpected results.
 * @param {string} htmlString - The input string with HTML.
 * @param {number} maxWords - The maximum number of words (from text content). Must be a non-negative integer.
 * @param {string} [suffix='...'] - The suffix to append if truncated.
 * @returns {string} The truncated string, or the original string if fewer words.
 * @throws {Error} If inputs are invalid.
 */
export function truncateHtmlWords(htmlString, maxWords, suffix = '...') {
  if (typeof htmlString !== 'string') {
    throw new Error('truncateHtmlWords requires a string as the first argument');
  }
  if (typeof maxWords !== 'number' || !Number.isInteger(maxWords) || maxWords < 0) {
    throw new Error('truncateHtmlWords requires maxWords to be a non-negative integer');
  }
  if (typeof suffix !== 'string') {
    throw new Error('truncateHtmlWords requires suffix to be a string');
  }

  if (maxWords === 0) {
    return suffix || ''; // Return suffix even if empty, or just empty string
  }

  // Use DOM to accurately count text words first
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlString;
  const textContent = tempDiv.textContent || tempDiv.innerText || "";
  const totalTextWords = textContent.trim().split(/\s+/).filter(w => w.length > 0).length;

  if (totalTextWords <= maxWords) {
    return htmlString;
  }

  let currentWordCount = 0;
  let truncatedResult = '';
  const openTagsStack = [];
  // Regex to tokenize HTML: matches comments, tags, or text content
  const htmlTokens = htmlString.match(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g) || [];
  const voidElements = new Set(['area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

  for (const token of htmlTokens) {
    if (token.startsWith('<!--')) { // It's a comment
      truncatedResult += token;
    } else if (token.startsWith('<') && token.endsWith('>')) { // It's a tag
      truncatedResult += token;
      const tagNameMatch = token.match(/^<\/?([a-zA-Z0-9]+)/); // Get tag name
      if (tagNameMatch) {
        const tagName = tagNameMatch[1].toLowerCase();
        if (token.startsWith('</')) { // Closing tag
          if (openTagsStack.length > 0 && openTagsStack[openTagsStack.length - 1] === tagName) {
            openTagsStack.pop();
          }
        } else if (!token.endsWith('/>') && !voidElements.has(tagName)) { // Opening tag (not self-closing and not void)
          openTagsStack.push(tagName);
        }
      }
    } else { // It's text content
      const textNodeParts = token.split(/(\s+)/); // Split by spaces to count words
      for (const part of textNodeParts) {
        if (currentWordCount >= maxWords) break;
        if (part.trim().length > 0) { // It's a word
          truncatedResult += part;
          currentWordCount++;
        } else { // It's whitespace
          truncatedResult += part;
        }
      }
      if (currentWordCount >= maxWords) {
        truncatedResult = truncatedResult.trimEnd(); // Remove trailing space before suffix
        truncatedResult += suffix;
        break; // Max words reached
      }
    }
     if (currentWordCount >= maxWords && !truncatedResult.endsWith(suffix)) {
        truncatedResult = truncatedResult.trimEnd();
        truncatedResult += suffix;
     }
  }
  
  // Close any remaining open tags
  while (openTagsStack.length > 0) {
    truncatedResult += `</${openTagsStack.pop()}>`;
  }

  return truncatedResult;
}


/**
 * Repeats a string a specified number of times.
 * @param {string} str - The string to repeat.
 * @param {number} count - The number of times to repeat the string. Must be a non-negative integer.
 * @returns {string} The repeated string.
 * @throws {Error} If inputs are invalid.
 */
export function repeatString(str, count) {
  if (typeof str !== 'string') {
    throw new Error('repeatString requires a string as the first argument');
  }
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) {
    throw new Error('repeatString requires count to be a non-negative integer');
  }
  if (count === 0 || str.length === 0) {
    return '';
  }
  return str.repeat(count);
}

/**
 * Replaces all instances of a literal substring with another string.
 * For RegExp-based replacement, use `replaceAllWithPattern`.
 * @param {string} str - The input string.
 * @param {string} search - The literal substring to replace.
 * @param {string} replacement - The replacement string.
 * @returns {string} The modified string.
 * @throws {Error} If inputs are not strings.
 */
export function replaceAll(str, search, replacement) {
  if (typeof str !== 'string' || typeof search !== 'string' || typeof replacement !== 'string') {
    throw new Error('replaceAll requires all arguments to be strings');
  }
  if (search === '') { // Edge case: empty search string
    // Mimic behavior of String.prototype.replaceAll for empty search if desired,
    // or return str to avoid infinite loops or unexpected behavior.
    // Current String.prototype.replaceAll behavior for empty string:
    // "abc".replaceAll("", "-") -> "-a-b-c-"
    // For simplicity and common expectation, we can return str or implement the more complex behavior.
    // Let's stick to split/join which handles empty search by not changing the string if search is empty.
    return str;
  }
  return str.split(search).join(replacement);
}

/**
 * Checks if a string starts with the specified substring.
 * @param {string} str - The string to check.
 * @param {string} searchString - The substring to search for.
 * @param {number} [position=0] - The position in the string at which to begin searching.
 * @returns {boolean} True if the string starts with the substring, false otherwise.
 * @throws {Error} If inputs are invalid.
 */
export function startsWith(str, searchString, position = 0) {
  if (typeof str !== 'string' || typeof searchString !== 'string') {
    throw new Error('startsWith requires string arguments for str and searchString');
  }
  if (typeof position !== 'number' || position < 0) {
    throw new Error('startsWith requires position to be a non-negative number');
  }
  return str.startsWith(searchString, position);
}

/**
 * Checks if a string ends with the specified substring.
 * @param {string} str - The string to check.
 * @param {string} searchString - The substring to search for.
 * @param {number} [length=str.length] - The portion of the string to consider (effectively str.slice(0, length).endsWith(searchString)). Defaults to string's full length.
 * @returns {boolean} True if the string ends with the substring, false otherwise.
 * @throws {Error} If inputs are invalid.
 */
export function endsWith(str, searchString, length) {
  if (typeof str !== 'string' || typeof searchString !== 'string') {
    throw new Error('endsWith requires string arguments for str and searchString');
  }
  // 'length' parameter in String.prototype.endsWith is optional and defaults to str.length.
  // It specifies the portion of the string to be considered for the match.
  if (length !== undefined && (typeof length !== 'number' || length < 0)) {
      throw new Error('endsWith requires length to be a non-negative number if provided');
  }
  return str.endsWith(searchString, length);
}

/**
 * Pads a string with another string until it reaches the target length.
 * @param {string} str - The string to pad.
 * @param {number} targetLength - The desired length of the output string.
 * @param {string} [padString=' '] - The string to pad with. If empty, original string is returned if targetLength is not met.
 * @param {number} [padPosition=0] - The position to apply padding: 0 for left (padStart), 1 for right (padEnd).
 * @returns {string} The padded string.
 * @throws {Error} If inputs are invalid.
 */
export function padString(str, targetLength, padString = ' ', padPosition = 0) {
  if (typeof str !== 'string') {
    throw new Error('padString requires a string as the first argument');
  }
  if (typeof targetLength !== 'number' || targetLength < 0) {
    throw new Error('padString requires targetLength to be a non-negative number');
  }
  if (typeof padString !== 'string') {
    throw new Error('padString requires a string as padString argument');
  }
  if (typeof padPosition !== 'number' || !Number.isInteger(padPosition) || (padPosition !== 0 && padPosition !== 1)) {
    throw new Error('padString requires padPosition to be 0 (left) or 1 (right)');
  }

  if (str.length >= targetLength || padString.length === 0) {
    return str;
  }

  if (padPosition === 0) { // Left padding
    return str.padStart(targetLength, padString); // ES2017
  } else { // Right padding
    return str.padEnd(targetLength, padString); // ES2017
  }
}

const KEBAB_PASCAL_CAMEL_REGEX = /[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g;

/**
 * Converts a string to title case (e.g., "hello world" -> "Hello World").
 * Each word's first letter is capitalized, and the rest of the word is lowercased.
 * @param {string} str - The string to convert.
 * @returns {string} The title-cased string.
 * @throws {Error} If input is not a string.
 */
export function toTitleCase(str) {
  if (typeof str !== 'string') {
    throw new Error('toTitleCase requires a string as input');
  }
  if (str.length === 0) return '';
  // Regex targets words, \w includes _, which might not be desired for typical title case.
  // Using a simpler regex that splits by common word boundary characters might be more robust for "title case".
  // However, to be consistent with capitalizeWords, \b\w+ is fine if _ is part of a "word".
  // For classic title case, let's refine to split and rejoin.
  return str.replace(/\b\w+/g, txt => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
}

/**
 * Converts a string to snake_case.
 * @param {string} str - The string to convert.
 * @returns {string} The snake_case string.
 * @throws {Error} If input is not a string.
 */
export function toSnakeCase(str) {
  if (typeof str !== 'string') {
    throw new Error('toSnakeCase requires a string as input');
  }
  if (str.length === 0) return '';
  const match = str.match(KEBAB_PASCAL_CAMEL_REGEX);
  if (!match) return str.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, ''); // Handle cases like "---" or " "
  return match.map(x => x.toLowerCase()).join('_');
}

/**
 * Converts a string to kebab-case.
 * @param {string} str - The string to convert.
 * @returns {string} The kebab-case string.
 * @throws {Error} If input is not a string.
 */
export function toKebabCase(str) {
  if (typeof str !== 'string') {
    throw new Error('toKebabCase requires a string as input');
  }
  if (str.length === 0) return '';
  const match = str.match(KEBAB_PASCAL_CAMEL_REGEX);
  if (!match) return str.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  return match.map(x => x.toLowerCase()).join('-');
}

/**
 * Converts a string to PascalCase (aka UpperCamelCase).
 * @param {string} str - The string to convert.
 * @returns {string} The PascalCase string.
 * @throws {Error} If input is not a string.
 */
export function toPascalCase(str) {
  if (typeof str !== 'string') {
    throw new Error('toPascalCase requires a string as input');
  }
  if (str.length === 0) return '';
  const match = str.match(KEBAB_PASCAL_CAMEL_REGEX);
   if (!match) return str.replace(/[^a-zA-Z0-9]+/g, '').replace(/^(.)/, c => c.toUpperCase());
  return match.map(x => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase()).join('');
}

/**
 * Converts a string to camelCase.
 * @param {string} str - The string to convert.
 * @returns {string} The camelCase string.
 * @throws {Error} If input is not a string.
 */
export function toCamelCase(str) {
  if (typeof str !== 'string') {
    throw new Error('toCamelCase requires a string as input');
  }
  if (str.length === 0) return '';
  const pascal = toPascalCase(str);
  if (pascal.length === 0) return '';
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Truncates a string to a maximum length, preserving word boundaries and adding a suffix.
 * If the first word itself is longer than the allowed length (after suffix), only the suffix (or part of it) is returned.
 * Trailing punctuation immediately before the suffix may be removed.
 * @param {string} str - The input string.
 * @param {number} maxLength - The maximum length of the output string (including suffix).
 * @param {string} [suffix='...'] - The suffix to add if the string is truncated.
 * @returns {string} The truncated string.
 * @throws {Error} If inputs are invalid.
 */
export function smartTruncate(str, maxLength, suffix = '...') {
  if (typeof str !== 'string') {
    throw new Error('smartTruncate requires a string as the first argument');
  }
  if (typeof maxLength !== 'number' || maxLength < 0) {
    throw new Error('smartTruncate requires maxLength to be a non-negative number');
  }
  if (typeof suffix !== 'string') {
    throw new Error('smartTruncate requires a string as suffix');
  }

  if (str.length <= maxLength) {
    return str;
  }

  const limit = maxLength - suffix.length;

  if (limit <= 0) { // Not enough space even for one char + suffix
    return suffix.substring(0, Math.min(suffix.length, maxLength));
  }

  let truncated = str.substring(0, limit);

  // Check if we are cutting in the middle of a word and need to backtrack
  if (str.length > limit && // Original string was indeed longer
      limit > 0 && // We have some content
      str[limit] !== ' ' && // Character after cut is not a space
      truncated[truncated.length - 1] !== ' ') { // Character at cut is not a space
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace !== -1) { // Found a space to break at
      truncated = truncated.substring(0, lastSpace);
    } else { // No space found in the truncated part (e.g., "LooooongWord")
      // In this case, it's better to return only the suffix as no full word fits.
      return suffix.substring(0, Math.min(suffix.length, maxLength));
    }
  }

  // Remove trailing punctuation and spaces before adding suffix
  truncated = truncated.replace(/[.,!?;:\s]+$/, "");

  return truncated + suffix;
}

/**
 * Checks if a string contains another string.
 * @param {string} str - The string to search in.
 * @param {string} search - The string to search for.
 * @param {number} [position=0] - The position to start searching.
 * @returns {boolean} True if the string contains the search string.
 * @throws {Error} If inputs are invalid.
 */
export function containsString(str, search, position = 0) {
  if (typeof str !== 'string' || typeof search !== 'string') {
    throw new Error('containsString requires string arguments for str and search');
  }
  if (typeof position !== 'number' || position < 0) {
    throw new Error('containsString requires position to be a non-negative number');
  }
  return str.includes(search, position); // ES6
}

/**
 * Checks if a string contains another string, ignoring case.
 * @param {string} str - The string to search in.
 * @param {string} search - The string to search for.
 * @returns {boolean} True if the string contains the search string (case-insensitive).
 * @throws {Error} If inputs are invalid.
 */
export function containsStringIgnoreCase(str, search) {
  if (typeof str !== 'string' || typeof search !== 'string') {
    throw new Error('containsStringIgnoreCase requires string arguments');
  }
  if (search.length === 0) return true; // Empty search string is in any string
  if (str.length === 0) return false; // Non-empty search cannot be in empty string
  return str.toLowerCase().includes(search.toLowerCase());
}

/**
 * Repeats a string a specified number of times with a separator.
 * @param {string} str - The string to repeat.
 * @param {number} count - The number of times to repeat. Must be a non-negative integer.
 * @param {string} [separator=''] - The separator to use between repetitions.
 * @returns {string} The repeated string with separator.
 * @throws {Error} If inputs are invalid.
 */
export function repeatStringWithSeparator(str, count, separator = '') {
  if (typeof str !== 'string') {
    throw new Error('repeatStringWithSeparator requires a string as the first argument');
  }
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) {
    throw new Error('repeatStringWithSeparator requires count to be a non-negative integer');
  }
  if (typeof separator !== 'string') {
    throw new Error('repeatStringWithSeparator requires a string as separator');
  }

  if (count === 0) {
    return '';
  }
  if (count === 1) {
    return str;
  }
  if (str.length === 0) { // Repeating an empty string n times with a separator
    if (separator.length > 0) return new Array(count - 1).fill(separator).join('');
    return '';
  }

  return new Array(count).fill(str).join(separator);
}

/** Converts a string to a string with only alphanumeric characters. */
export function alphanumericOnly(str) {
  if (typeof str !== 'string') throw new Error('alphanumericOnly requires a string as input');
  return str.replace(/[^a-zA-Z0-9]/g, '');
}
/** Converts a string to a string with only letters. */
export function lettersOnly(str) {
  if (typeof str !== 'string') throw new Error('lettersOnly requires a string as input');
  return str.replace(/[^a-zA-Z]/g, '');
}
/** Converts a string to a string with only digits. */
export function digitsOnly(str) {
  if (typeof str !== 'string') throw new Error('digitsOnly requires a string as input');
  return str.replace(/[^0-9]/g, '');
}
/** Converts a string to a string with only letters and spaces. */
export function lettersWithSpacesOnly(str) {
  if (typeof str !== 'string') throw new Error('lettersWithSpacesOnly requires a string as input');
  return str.replace(/[^a-zA-Z\s]/g, '');
}
/** Converts a string to a string with only alphanumeric characters and spaces. */
export function alphanumericWithSpacesOnly(str) {
  if (typeof str !== 'string') throw new Error('alphanumericWithSpacesOnly requires a string as input');
  return str.replace(/[^a-zA-Z0-9\s]/g, '');
}
/** Converts a string to a string with only alphanumeric characters and hyphens. */
export function alphanumericWithHyphensOnly(str) {
  if (typeof str !== 'string') throw new Error('alphanumericWithHyphensOnly requires a string as input');
  return str.replace(/[^a-zA-Z0-9-]/g, '');
}
/** Converts a string to a string with only alphanumeric characters and underscores. */
export function alphanumericWithUnderscoresOnly(str) {
  if (typeof str !== 'string') throw new Error('alphanumericWithUnderscoresOnly requires a string as input');
  return str.replace(/[^a-zA-Z0-9_]/g, '');
}
/** Converts a string to a string with only alphanumeric characters, hyphens, and spaces. */
export function alphanumericWithHyphensAndSpacesOnly(str) {
  if (typeof str !== 'string') throw new Error('alphanumericWithHyphensAndSpacesOnly requires a string as input');
  return str.replace(/[^a-zA-Z0-9\s-]/g, '');
}
/** Converts a string to a string with only alphanumeric characters, underscores, and spaces. */
export function alphanumericWithUnderscoresAndSpacesOnly(str) {
  if (typeof str !== 'string') throw new Error('alphanumericWithUnderscoresAndSpacesOnly requires a string as input');
  return str.replace(/[^a-zA-Z0-9\s_]/g, '');
}

/**
 * Replaces multiple consecutive spaces with a single space and trims the string.
 * @param {string} str - The string to process.
 * @returns {string} The normalized string.
 * @throws {Error} If input is not a string.
 */
export function normalizeString(str) {
  if (typeof str !== 'string') {
    throw new Error('normalizeString requires a string as input');
  }
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Replaces multiple consecutive line breaks (CRLF, LF, CR) with a single LF line break.
 * Does not trim other whitespace unless it forms part of multiple line breaks.
 * @param {string} str - The string to process.
 * @returns {string} The string with single line breaks.
 * @throws {Error} If input is not a string.
 */
export function normalizeLineBreaks(str) {
  if (typeof str !== 'string') {
    throw new Error('normalizeLineBreaks requires a string as input');
  }
  return str.replace(/(\r\n|\r|\n){2,}/g, '\n');
}

/**
 * Replaces all occurrences of a search string (treated as a literal) with a replacement string using global regex.
 * @param {string} str - The string to process.
 * @param {string} patternString - The literal string pattern to replace.
 * @param {string} replacement - The replacement substring.
 * @returns {string} The modified string.
 * @throws {Error} If inputs are invalid.
 */
export function replaceAllWithRegex(str, patternString, replacement) {
  if (typeof str !== 'string' || typeof patternString !== 'string' || typeof replacement !== 'string') {
    throw new Error('replaceAllWithRegex requires all arguments to be strings');
  }
  if (patternString === '') {
    // Consistent with replaceAll, could make it insert like String.prototype.replaceAll
    return str;
  }
  const regex = new RegExp(_escapeRegExp(patternString), 'g');
  return str.replace(regex, replacement);
}

/**
 * Checks if two strings are equal, ignoring case.
 * @param {string} str1 - First string to compare.
 * @param {string} str2 - Second string to compare.
 * @returns {boolean} True if the strings are equal (case-insensitive).
 * @throws {Error} If inputs are not strings.
 */
export function equalsIgnoreCase(str1, str2) {
  if (typeof str1 !== 'string' || typeof str2 !== 'string') {
    throw new Error('equalsIgnoreCase requires string arguments');
  }
  return str1.toLowerCase() === str2.toLowerCase();
}

/**
 * Replaces all occurrences of a search string or regex pattern with a replacement string or the result of a replacer function.
 * This function mirrors the behavior of String.prototype.replace with a global flag for regex.
 * @param {string} str - The string to process.
 * @param {string|RegExp} pattern - The string or regular expression to search for. If a string, it's treated literally.
 * @param {string|((substring: string, ...args: any[]) => string)} replacer - The replacement string or a function.
 *        If `pattern` is a string, `replacer` function gets `(matchedSubstring, offset, originalString)`.
 *        If `pattern` is a RegExp, `replacer` function gets `(match, p1, p2, ..., offset, originalString, namedGroups)`.
 * @returns {string} The modified string.
 * @throws {Error} If inputs are invalid.
 */
export function replaceAllWithPattern(str, pattern, replacer) {
  if (typeof str !== 'string') {
    throw new Error('replaceAllWithPattern requires a string as the first argument');
  }
  if (typeof pattern !== 'string' && !(pattern instanceof RegExp)) {
    throw new Error('replaceAllWithPattern requires pattern to be a string or regular expression');
  }
  if (typeof replacer !== 'string' && typeof replacer !== 'function') {
    throw new Error('replaceAllWithPattern requires replacer to be a string or a function');
  }

  if (typeof pattern === 'string') {
    if (pattern === '') return str; // Or implement String.prototype.replaceAll behavior for ""
    // String.prototype.replaceAll is ES2021, this provides similar functionality for literal strings
    const escapedPattern = _escapeRegExp(pattern);
    const regex = new RegExp(escapedPattern, 'g');
    return str.replace(regex, replacer);
  } else { // pattern is RegExp
    // Ensure the global flag is set for RegExp
    const globalRegex = pattern.global ? pattern : new RegExp(pattern.source, pattern.flags + 'g');
    return str.replace(globalRegex, replacer);
  }
}

/**
 * Replaces all occurrences of a literal substring with the result of a callback function, with an optional limit on replacements.
 * The callback receives the search string and the 0-based index of the current replacement.
 * @param {string} str - The string to process.
 * @param {string} search - The literal substring to replace.
 * @param {(searchString: string, replacementIndex: number) => string} replacerFn - A function that returns the replacement string.
 * @param {number} [limit=Infinity] - Optional limit on the number of replacements. Must be a non-negative number or Infinity.
 * @returns {string} The modified string.
 * @throws {Error} If inputs are invalid.
 */
export function replaceAllWithCallbackAndLimit(str, search, replacerFn, limit = Infinity) {
  if (typeof str !== 'string') {
    throw new Error('replaceAllWithCallbackAndLimit requires str to be a string');
  }
  if (typeof search !== 'string') {
    throw new Error('replaceAllWithCallbackAndLimit requires search to be a string');
  }
  if (typeof replacerFn !== 'function') {
    throw new Error('replaceAllWithCallbackAndLimit requires replacerFn to be a function');
  }
  if (typeof limit !== 'number' || limit < 0) { // Infinity is a number
    throw new Error('replaceAllWithCallbackAndLimit requires limit to be a non-negative number or Infinity');
  }

  if (search === '' || limit === 0) {
    return str;
  }

  const resultParts = [];
  let currentIndex = 0;
  let replacementsCount = 0;
  let matchIndex;

  while (replacementsCount < limit && (matchIndex = str.indexOf(search, currentIndex)) !== -1) {
    resultParts.push(str.substring(currentIndex, matchIndex));
    resultParts.push(replacerFn(search, replacementsCount));
    currentIndex = matchIndex + search.length;
    replacementsCount++;
  }
  resultParts.push(str.substring(currentIndex)); // Add the rest of the string

  return resultParts.join('');
}

/**
 * Replaces all occurrences of a search string with a replacement string, attempting to preserve the case of the matched substring.
 * The search is case-insensitive.
 * @param {string} str - The string to process.
 * @param {string} search - The substring to replace (case-insensitively).
 * @param {string} replacement - The replacement substring (its case will be adjusted).
 * @returns {string} The modified string.
 * @throws {Error} If inputs are not strings.
 */
export function replaceAllPreserveCase(str, search, replacement) {
  if (typeof str !== 'string' || typeof search !== 'string' || typeof replacement !== 'string') {
    throw new Error('replaceAllPreserveCase requires all arguments to be strings');
  }
  if (search === '') { // If search is empty, no change
    return str;
  }

  const escapedSearch = _escapeRegExp(search);
  const regex = new RegExp(escapedSearch, 'gi'); // 'g' for global, 'i' for case-insensitive

  return str.replace(regex, (matchedText) => {
    return _transformReplacementCase(matchedText, replacement);
  });
}

/**
 * Replaces occurrences of a literal substring with another string, up to a specified limit.
 * @param {string} str - The input string.
 * @param {string} search - The literal substring to replace.
 * @param {string} replacement - The replacement string.
 * @param {number} [limit=Infinity] - The maximum number of replacements. Must be a non-negative number or Infinity.
 * @returns {string} The modified string.
 * @throws {Error} If inputs are invalid.
 */
export function replaceAllWithLimit(str, search, replacement, limit = Infinity) {
  if (typeof str !== 'string' || typeof search !== 'string' || typeof replacement !== 'string') {
    throw new Error('replaceAllWithLimit requires string arguments');
  }
  if (typeof limit !== 'number' || limit < 0) { // Infinity is a number
    throw new Error('replaceAllWithLimit requires limit to be a non-negative number or Infinity');
  }

  if (search === '' || limit === 0) {
    return str;
  }
  // Leverage replaceAllWithCallbackAndLimit
  return replaceAllWithCallbackAndLimit(str, search, () => replacement, limit);
}
