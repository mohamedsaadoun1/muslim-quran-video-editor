// js/utils/math.operations.js

/**
 * @typedef {Object} MathError
 * @property {string} message - Description of the error
 * @property {string} origin - The function where the error occurred
 * @property {any[]} [inputs] - The input values that caused the error
 */

/**
 * Clamps a value between a minimum and maximum.
 * @param {number} value - The value to clamp.
 * @param {number} min - The minimum allowed value.
 * @param {number} max - The maximum allowed value.
 * @returns {number} The clamped value.
 * @throws {Error} If any input is not a number
 */
export function clamp(value, min, max) {
  if (typeof value !== 'number' || typeof min !== 'number' || typeof max !== 'number') {
    throw new Error('clamp requires all arguments to be numbers');
  }
  
  if (min > max) {
    [min, max] = [max, min]; // Swap if min > max
  }
  
  return Math.max(min, Math.min(value, max));
}

/**
 * Linearly interpolates between two values.
 * @param {number} start - The start value.
 * @param {number} end - The end value.
 * @param {number} t - The interpolation factor (usually between 0 and 1).
 *                     If t=0, returns start. If t=1, returns end.
 * @returns {number} The interpolated value.
 * @throws {Error} If any input is not a number
 */
export function lerp(start, end, t) {
  if (typeof start !== 'number' || typeof end !== 'number' || typeof t !== 'number') {
    throw new Error('lerp requires all arguments to be numbers');
  }
  
  return start * (1 - t) + end * t;
}

/**
 * Maps a value from one range to another range.
 * @param {number} value - The value to map.
 * @param {number} inMin - The minimum of the input range.
 * @param {number} inMax - The maximum of the input range.
 * @param {number} outMin - The minimum of the output range.
 * @param {number} outMax - The maximum of the output range.
 * @returns {number} The mapped value.
 * @throws {Error} If any input is not a number or inMin equals inMax
 */
export function mapRange(value, inMin, inMax, outMin, outMax) {
  if ([value, inMin, inMax, outMin, outMax].some(v => typeof v !== 'number')) {
    throw new Error('mapRange requires all arguments to be numbers');
  }
  
  if (inMin === inMax) {
    throw new Error('mapRange cannot map when inMin equals inMax');
  }
  
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * Normalizes a value to a range between 0 and 1.
 * @param {number} value - The value to normalize.
 * @param {number} min - The minimum of the value's original range.
 * @param {number} max - The maximum of the value's original range.
 * @returns {number} The normalized value (between 0 and 1).
 * @throws {Error} If any input is not a number or min equals max
 */
export function normalize(value, min, max) {
  if ([value, min, max].some(v => typeof v !== 'number')) {
    throw new Error('normalize requires all arguments to be numbers');
  }
  
  if (min === max) {
    throw new Error('normalize cannot normalize when min equals max');
  }
  
  return (value - min) / (max - min);
}

/**
 * Generates a random integer within a specified range.
 * @param {number} min - The minimum value of the range.
 * @param {number} max - The maximum value of the range.
 * @returns {number} A random integer between min and max.
 * @throws {Error} If any input is not a number or min > max
 */
export function randomInt(min, max) {
  if (typeof min !== 'number' || typeof max !== 'number') {
    throw new Error('randomInt requires both min and max to be numbers');
  }
  
  if (min > max) {
    [min, max] = [max, min]; // Swap if min > max
  }
  
  min = Math.ceil(min);
  max = Math.floor(max);
  
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a random floating-point number within a specified range.
 * @param {number} min - The minimum value of the range.
 * @param {number} max - The maximum value of the range.
 * @param {number} [decimals] - Optional number of decimal places for the result.
 * @returns {number} A random float between min and max.
 * @throws {Error} If min or max are not numbers or min > max
 */
export function randomFloat(min, max, decimals) {
  if (typeof min !== 'number' || typeof max !== 'number') {
    throw new Error('randomFloat requires both min and max to be numbers');
  }
  
  if (min > max) {
    [min, max] = [max, min]; // Swap if min > max
  }
  
  const randomNumber = Math.random() * (max - min) + min;
  
  if (typeof decimals === 'number' && decimals >= 0) {
    if (typeof decimals !== 'number' || decimals < 0 || decimals > 100) {
      throw new Error('randomFloat requires decimals to be a non-negative number (recommended: 0-100)');
    }
    
    const factor = Math.pow(10, decimals);
    return Math.round(randomNumber * factor) / factor;
  }
  
  return randomNumber;
}

/**
 * Converts an angle from degrees to radians.
 * @param {number} degrees - The angle in degrees.
 * @returns {number} The angle in radians.
 * @throws {Error} If degrees is not a number
 */
export function degreesToRadians(degrees) {
  if (typeof degrees !== 'number') {
    throw new Error('degreesToRadians requires degrees to be a number');
  }
  
  return degrees * (Math.PI / 180);
}

/**
 * Converts an angle from radians to degrees.
 * @param {number} radians - The angle in radians.
 * @returns {number} The angle in degrees.
 * @throws {Error} If radians is not a number
 */
export function radiansToDegrees(radians) {
  if (typeof radians !== 'number') {
    throw new Error('radiansToDegrees requires radians to be a number');
  }
  
  return radians * (180 / Math.PI);
}

/**
 * Checks if two floating-point numbers are approximately equal within a given epsilon.
 * Useful for comparing floats due to precision issues.
 * @param {number} a - First number.
 * @param {number} b - Second number.
 * @param {number} [epsilon=Number.EPSILON] - The maximum allowed difference.
 * @returns {boolean} True if the numbers are approximately equal.
 * @throws {Error} If any input is not a number
 */
export function approximatelyEquals(a, b, epsilon = Number.EPSILON) {
  if (typeof a !== 'number' || typeof b !== 'number' || typeof epsilon !== 'number') {
    throw new Error('approximatelyEquals requires all arguments to be numbers');
  }
  
  return Math.abs(a - b) < epsilon;
}

/**
 * Rounds a number to a specified number of decimal places.
 * @param {number} number - The number to round.
 * @param {number} [decimalPlaces=0] - The number of decimal places (non-negative integer).
 * @returns {number} The rounded number.
 * @throws {Error} If any input is not a valid number or decimalPlaces is invalid
 */
export function roundToDecimalPlaces(number, decimalPlaces = 0) {
  if (typeof number !== 'number') {
    throw new Error('roundToDecimalPlaces requires a valid number');
  }
  
  if (typeof decimalPlaces !== 'number' || decimalPlaces < 0 || decimalPlaces > 100) {
    throw new Error('roundToDecimalPlaces requires decimalPlaces to be between 0 and 100');
  }
  
  const factor = Math.pow(10, Math.floor(decimalPlaces));
  return Math.round(number * factor) / factor;
}

/**
 * Calculates the average of a list of numbers.
 * @param {number[]} numbers - An array of numbers.
 * @returns {number} The average, or NaN if the array is empty or contains non-numbers.
 * @throws {Error} If input is not an array
 */
export function average(numbers) {
  if (!Array.isArray(numbers)) {
    throw new Error('average requires an array of numbers');
  }
  
  if (numbers.length === 0) {
    return NaN;
  }
  
  let sum = 0;
  let count = 0;
  
  for (const num of numbers) {
    if (typeof num === 'number' && !isNaN(num)) {
      sum += num;
      count++;
    }
  }
  
  if (count === 0) {
    return NaN;
  }
  
  return sum / count;
}

/**
 * Calculates the standard deviation of a list of numbers.
 * @param {number[]} numbers - An array of numbers.
 * @returns {number} The standard deviation, or NaN if invalid.
 * @throws {Error} If input is not an array
 */
export function standardDeviation(numbers) {
  if (!Array.isArray(numbers)) {
    throw new Error('standardDeviation requires an array of numbers');
  }
  
  if (numbers.length === 0) {
    return NaN;
  }
  
  const filteredNumbers = numbers.filter(n => typeof n === 'number' && !isNaN(n));
  
  if (filteredNumbers.length === 0) {
    return NaN;
  }
  
  const avg = average(filteredNumbers);
  const squaredDiffs = filteredNumbers.map(n => Math.pow(n - avg, 2));
  const variance = average(squaredDiffs);
  
  return Math.sqrt(variance);
}

/**
 * Calculates the median of a list of numbers.
 * @param {number[]} numbers - An array of numbers.
 * @returns {number} The median, or NaN if invalid.
 * @throws {Error} If input is not an array
 */
export function median(numbers) {
  if (!Array.isArray(numbers)) {
    throw new Error('median requires an array of numbers');
  }
  
  if (numbers.length === 0) {
    return NaN;
  }
  
  const sortedNumbers = numbers
    .filter(n => typeof n === 'number' && !isNaN(n))
    .sort((a, b) => a - b);
  
  const mid = Math.floor(sortedNumbers.length / 2);
  
  if (sortedNumbers.length % 2 === 0) {
    return average([sortedNumbers[mid - 1], sortedNumbers[mid]]);
  }
  
  return sortedNumbers[mid];
}

/**
 * Calculates the factorial of a number.
 * @param {number} n - The number to calculate the factorial for.
 * @returns {number} The factorial of n.
 * @throws {Error} If n is negative or not a number
 */
export function factorial(n) {
  if (typeof n !== 'number') {
    throw new Error('factorial requires a number');
  }
  
  if (n < 0) {
    throw new Error('factorial cannot be calculated for negative numbers');
  }
  
  if (n === 0 || n === 1) {
    return 1;
  }
  
  if (n > 170) {
    return Infinity; // Factorials above 170 exceed JavaScript's maximum number
  }
  
  let result = 1;
  
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  
  return result;
}

/**
 * Calculates the binomial coefficient (n choose k).
 * @param {number} n - Total items.
 * @param {number} k - Items to choose.
 * @returns {number} The binomial coefficient.
 * @throws {Error} If inputs are invalid or negative
 */
export function binomialCoefficient(n, k) {
  if (typeof n !== 'number' || typeof k !== 'number') {
    throw new Error('binomialCoefficient requires both n and k to be numbers');
  }
  
  if (n < 0 || k < 0) {
    throw new Error('binomialCoefficient requires non-negative inputs');
  }
  
  if (k > n) {
    return 0;
  }
  
  // Use multiplicative formula for efficiency
  let result = 1;
  
  for (let i = 0; i < k; i++) {
    result *= (n - i) / (i + 1);
  }
  
  return result;
}

/**
 * Calculates the greatest common divisor (GCD) of two numbers.
 * @param {number} a - First number.
 * @param {number} b - Second number.
 * @returns {number} The GCD.
 * @throws {Error} If inputs are not numbers
 */
export function gcd(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new Error('gcd requires both numbers to be numeric');
  }
  
  a = Math.abs(a);
  b = Math.abs(b);
  
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  
  return a;
}

/**
 * Calculates the least common multiple (LCM) of two numbers.
 * @param {number} a - First number.
 * @param {number} b - Second number.
 * @returns {number} The LCM.
 * @throws {Error} If inputs are not numbers
 */
export function lcm(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new Error('lcm requires both numbers to be numeric');
  }
  
  if (a === 0 || b === 0) {
    return 0;
  }
  
  return Math.abs(a * b) / gcd(a, b);
}

/**
 * Returns the Euclidean distance between two points.
 * @param {number} x1 - X-coordinate of the first point.
 * @param {number} y1 - Y-coordinate of the first point.
 * @param {number} x2 - X-coordinate of the second point.
 * @param {number} y2 - Y-coordinate of the second point.
 * @returns {number} The Euclidean distance.
 * @throws {Error} If any input is not a number
 */
export function euclideanDistance(x1, y1, x2, y2) {
  if ([x1, y1, x2, y2].some(v => typeof v !== 'number')) {
    throw new Error('euclideanDistance requires all coordinates to be numbers');
  }
  
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Returns the Euclidean distance in N-dimensional space.
 * @param {number[]} point1 - First point as an array of numbers.
 * @param {number[]} point2 - Second point as an array of numbers.
 * @returns {number} The Euclidean distance.
 * @throws {Error} If inputs are invalid
 */
export function euclideanDistanceN(point1, point2) {
  if (!Array.isArray(point1) || !Array.isArray(point2)) {
    throw new Error('euclideanDistanceN requires two arrays as input');
  }
  
  if (point1.length !== point2.length) {
    throw new Error('euclideanDistanceN requires both points to have the same dimensionality');
  }
  
  if (point1.some(n => typeof n !== 'number') || point2.some(n => typeof n !== 'number')) {
    throw new Error('euclideanDistanceN requires all coordinates to be numbers');
  }
  
  const squaredSum = point1.reduce((sum, val, i) => {
    return sum + Math.pow(val - point2[i], 2);
  }, 0);
  
  return Math.sqrt(squaredSum);
}

/**
 * Calculates the percentage of a value within a range.
 * @param {number} value - The value to calculate percentage for.
 * @param {number} min - The minimum of the range.
 * @param {number} max - The maximum of the range.
 * @returns {number} The percentage (0-1).
 * @throws {Error} If inputs are invalid
 */
export function calculatePercentage(value, min, max) {
  if ([value, min, max].some(v => typeof v !== 'number')) {
    throw new Error('calculatePercentage requires all arguments to be numbers');
  }
  
  if (min === max) {
    return 0;
  }
  
  return (value - min) / (max - min);
}

/**
 * Calculates the value at a given percentage within a range.
 * @param {number} percentage - The percentage (0-1).
 * @param {number} min - The minimum of the range.
 * @param {number} max - The maximum of the range.
 * @returns {number} The value at the given percentage.
 * @throws {Error} If inputs are invalid
 */
export function valueAtPercentage(percentage, min, max) {
  if ([percentage, min, max].some(v => typeof v !== 'number')) {
    throw new Error('valueAtPercentage requires all arguments to be numbers');
  }
  
  if (percentage < 0 || percentage > 1) {
    throw new Error('valueAtPercentage requires percentage to be between 0 and 1');
  }
  
  return min + (max - min) * percentage;
}

/**
 * Calculates the linear interpolation between two values based on a percentage.
 * @param {number} a - The starting value.
 * @param {number} b - The ending value.
 * @param {number} percentage - The percentage (0-1) between a and b.
 * @returns {number} The interpolated value.
 * @throws {Error} If inputs are invalid
 */
export function lerpPercentage(a, b, percentage) {
  if ([a, b, percentage].some(v => typeof v !== 'number')) {
    throw new Error('lerpPercentage requires all arguments to be numbers');
  }
  
  if (percentage < 0 || percentage > 1) {
    throw new Error('lerpPercentage requires percentage to be between 0 and 1');
  }
  
  return a + (b - a) * percentage;
}

/**
 * Calculates the distance between two points on Earth using the haversine formula.
 * @param {number} lat1 - Latitude of the first point in degrees.
 * @param {number} lon1 - Longitude of the first point in degrees.
 * @param {number} lat2 - Latitude of the second point in degrees.
 * @param {number} lon2 - Longitude of the second point in degrees.
 * @param {string} [unit='km'] - Unit of measurement ('km' for kilometers, 'mi' for miles).
 * @returns {number} The distance between the points.
 * @throws {Error} If inputs are invalid
 */
export function haversineDistance(lat1, lon1, lat2, lon2, unit = 'km') {
  if ([lat1, lon1, lat2, lon2].some(v => typeof v !== 'number')) {
    throw new Error('haversineDistance requires all coordinates to be numbers');
  }
  
  if (unit !== 'km' && unit !== 'mi') {
    throw new Error('haversineDistance requires unit to be "km" or "mi"');
  }
  
  const earthRadiusKm = 6371;
  const earthRadiusMi = 3958.756;
  const earthRadius = unit === 'km' ? earthRadiusKm : earthRadiusMi;
  
  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);
  
  const lat1Rad = degreesToRadians(lat1);
  const lat2Rad = degreesToRadians(lat2);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return earthRadius * c;
}

/**
 * Calculates the percentage difference between two values.
 * @param {number} value1 - First value.
 * @param {number} value2 - Second value.
 * @returns {number} The percentage difference.
 * @throws {Error} If inputs are invalid
 */
export function percentageDifference(value1, value2) {
  if (typeof value1 !== 'number' || typeof value2 !== 'number') {
    throw new Error('percentageDifference requires both values to be numbers');
  }
  
  if (value1 === 0 && value2 === 0) {
    return 0;
  }
  
  const base = Math.abs(value1 + value2) / 2;
  if (base === 0) {
    return 0;
  }
  
  return Math.abs(value1 - value2) / base * 100;
}

/**
 * Calculates the percentage change from one value to another.
 * @param {number} oldValue - The old value.
 * @param {number} newValue - The new value.
 * @returns {number} The percentage change.
 * @throws {Error} If inputs are invalid
 */
export function percentageChange(oldValue, newValue) {
  if (typeof oldValue !== 'number' || typeof newValue !== 'number') {
    throw new Error('percentageChange requires both values to be numbers');
  }
  
  if (oldValue === 0) {
    return newValue === 0 ? 0 : Infinity;
  }
  
  return (newValue - oldValue) / Math.abs(oldValue) * 100;
}

/**
 * Calculates the percentage of a value relative to a total.
 * @param {number} value - The value to calculate percentage for.
 * @param {number} total - The total value.
 * @returns {number} The percentage.
 * @throws {Error} If inputs are invalid
 */
export function percentageOf(value, total) {
  if (typeof value !== 'number' || typeof total !== 'number') {
    throw new Error('percentageOf requires both value and total to be numbers');
  }
  
  if (total === 0) {
    return 0;
  }
  
  return (value / total) * 100;
}

/**
 * Calculates the value of a percentage of a total.
 * @param {number} percentage - The percentage.
 * @param {number} total - The total value.
 * @returns {number} The value of the given percentage.
 * @throws {Error} If inputs are invalid
 */
export function valueOfPercentage(percentage, total) {
  if (typeof percentage !== 'number' || typeof total !== 'number') {
    throw new Error('valueOfPercentage requires both percentage and total to be numbers');
  }
  
  return (percentage / 100) * total;
}

/**
 * Calculates the percentage of a value relative to a target value.
 * @param {number} value - The value to calculate percentage for.
 * @param {number} target - The target value.
 * @returns {number} The percentage.
 * @throws {Error} If inputs are invalid
 */
export function percentageOfTarget(value, target) {
  if (typeof value !== 'number' || typeof target !== 'number') {
    throw new Error('percentageOfTarget requires both value and target to be numbers');
  }
  
  if (target === 0) {
    return value === 0 ? 0 : Infinity;
  }
  
  return (value / target) * 100;
}

/**
 * Calculates the value of a percentage of a target value.
 * @param {number} percentage - The percentage.
 * @param {number} target - The target value.
 * @returns {number} The value of the given percentage.
 * @throws {Error} If inputs are invalid
 */
export function valueOfTargetPercentage(percentage, target) {
  if (typeof percentage !== 'number' || typeof target !== 'number') {
    throw new Error('valueOfTargetPercentage requires both percentage and target to be numbers');
  }
  
  return (percentage / 100) * target;
}

/**
 * Calculates the percentage of a value relative to a range.
 * @param {number} value - The value to calculate percentage for.
 * @param {number} min - The minimum of the range.
 * @param {number} max - The maximum of the range.
 * @returns {number} The percentage.
 * @throws {Error} If inputs are invalid
 */
export function percentageOfRange(value, min, max) {
  if ([value, min, max].some(v => typeof v !== 'number')) {
    throw new Error('percentageOfRange requires all arguments to be numbers');
  }
  
  if (min === max) {
    return 0;
  }
  
  return ((value - min) / (max - min)) * 100;
}

/**
 * Calculates the value at a percentage within a range.
 * @param {number} percentage - The percentage (0-100).
 * @param {number} min - The minimum of the range.
 * @param {number} max - The maximum of the range.
 * @returns {number} The value at the given percentage.
 * @throws {Error} If inputs are invalid
 */
export function valueAtPercentageInARange(percentage, min, max) {
  if ([percentage, min, max].some(v => typeof v !== 'number')) {
    throw new Error('valueAtPercentageInARange requires all arguments to be numbers');
  }
  
  if (percentage < 0 || percentage > 100) {
    throw new Error('valueAtPercentageInARange requires percentage to be between 0 and 100');
  }
  
  return min + ((percentage / 100) * (max - min));
}

/**
 * Calculates the weighted average of a list of values with corresponding weights.
 * @param {number[]} values - An array of numbers.
 * @param {number[]} weights - An array of weights corresponding to the values.
 * @returns {number} The weighted average, or NaN if invalid.
 * @throws {Error} If inputs are invalid
 */
export function weightedAverage(values, weights) {
  if (!Array.isArray(values) || !Array.isArray(weights)) {
    throw new Error('weightedAverage requires both values and weights to be arrays');
  }
  
  if (values.length === 0 || weights.length === 0) {
    return NaN;
  }
  
  if (values.length !== weights.length) {
    throw new Error('weightedAverage requires values and weights to be the same length');
  }
  
  let weightedSum = 0;
  let weightSum = 0;
  
  for (let i = 0; i < values.length; i++) {
    if (typeof values[i] !== 'number' || typeof weights[i] !== 'number') {
      continue; // Skip non-numeric values
    }
    
    weightedSum += values[i] * weights[i];
    weightSum += Math.abs(weights[i]);
  }
  
  if (weightSum === 0) {
    return NaN;
  }
  
  return weightedSum / weightSum;
}

/**
 * Calculates the exponential moving average of a list of numbers.
 * @param {number[]} numbers - An array of numbers.
 * @param {number} [weight=2] - The weight to apply to the most recent numbers.
 * @returns {number} The exponential moving average, or NaN if invalid.
 * @throws {Error} If inputs are invalid
 */
export function exponentialMovingAverage(numbers, weight = 2) {
  if (!Array.isArray(numbers)) {
    throw new Error('exponentialMovingAverage requires numbers to be an array');
  }
  
  if (typeof weight !== 'number' || weight <= 0) {
    throw new Error('exponentialMovingAverage requires weight to be a positive number');
  }
  
  if (numbers.length === 0) {
    return NaN;
  }
  
  let ema = numbers[0];
  
  for (let i = 1; i < numbers.length; i++) {
    ema = numbers[i] * weight + ema * (1 - weight);
  }
  
  return ema;
}

/**
 * Calculates the percentage of values in an array that match a condition.
 * @param {Array<any>} array - The array to analyze.
 * @param {Function} condition - A function that returns true for matching values.
 * @returns {number} The percentage of matching values.
 * @throws {Error} If inputs are invalid
 */
export function percentageMatching(array, condition) {
  if (!Array.isArray(array) || typeof condition !== 'function') {
    throw new Error('percentageMatching requires an array and a condition function');
  }
  
  if (array.length === 0) {
    return 0;
  }
  
  let count = 0;
  let matches = 0;
  
  for (const item of array) {
    if (typeof item === 'number' && !isNaN(item)) {
      count++;
      if (condition(item)) {
        matches++;
      }
    }
  }
  
  if (count === 0) {
    return 0;
  }
  
  return (matches / count) * 100;
}

/**
 * Calculates the percentage of numbers in an array that are within a range.
 * @param {number[]} numbers - An array of numbers.
 * @param {number} min - The minimum of the range.
 * @param {number} max - The maximum of the range.
 * @returns {number} The percentage of numbers within the range.
 * @throws {Error} If inputs are invalid
 */
export function percentageInRange(numbers, min, max) {
  if (!Array.isArray(numbers)) {
    throw new Error('percentageInRange requires numbers to be an array');
  }
  
  if (typeof min !== 'number' || typeof max !== 'number') {
    throw new Error('percentageInRange requires min and max to be numbers');
  }
  
  if (numbers.length === 0) {
    return 0;
  }
  
  let count = 0;
  let inRangeCount = 0;
  
  for (const num of numbers) {
    if (typeof num === 'number' && !isNaN(num)) {
      count++;
      if (num >= min && num <= max) {
        inRangeCount++;
      }
    }
  }
  
  if (count === 0) {
    return 0;
  }
  
  return (inRangeCount / count) * 100;
}

/**
 * Calculates the percentage of numbers in an array that are above a threshold.
 * @param {number[]} numbers - An array of numbers.
 * @param {number} threshold - The threshold value.
 * @returns {number} The percentage of numbers above the threshold.
 * @throws {Error} If inputs are invalid
 */
export function percentageAbove(numbers, threshold) {
  if (!Array.isArray(numbers)) {
    throw new Error('percentageAbove requires numbers to be an array');
  }
  
  if (typeof threshold !== 'number') {
    throw new Error('percentageAbove requires threshold to be a number');
  }
  
  if (numbers.length === 0) {
    return 0;
  }
  
  let count = 0;
  let aboveCount = 0;
  
  for (const num of numbers) {
    if (typeof num === 'number' && !isNaN(num)) {
      count++;
      if (num > threshold) {
        aboveCount++;
      }
    }
  }
  
  if (count === 0) {
    return 0;
  }
  
  return (aboveCount / count) * 100;
}

/**
 * Calculates the percentage of numbers in an array that are below a threshold.
 * @param {number[]} numbers - An array of numbers.
 * @param {number} threshold - The threshold value.
 * @returns {number} The percentage of numbers below the threshold.
 * @throws {Error} If inputs are invalid
 */
export function percentageBelow(numbers, threshold) {
  if (!Array.isArray(numbers)) {
    throw new Error('percentageBelow requires numbers to be an array');
  }
  
  if (typeof threshold !== 'number') {
    throw new Error('percentageBelow requires threshold to be a number');
  }
  
  if (numbers.length === 0) {
    return 0;
  }
  
  let count = 0;
  let belowCount = 0;
  
  for (const num of numbers) {
    if (typeof num === 'number' && !isNaN(num)) {
      count++;
      if (num < threshold) {
        belowCount++;
      }
    }
  }
  
  if (count === 0) {
    return 0;
  }
  
  return (belowCount / count) * 100;
}

/**
 * Calculates the percentage of numbers in an array that are equal to a value.
 * @param {Array<any>} array - The array to analyze.
 * @param {any} value - The value to compare against.
 * @returns {number} The percentage of matching values.
 * @throws {Error} If array is invalid
 */
export function percentageEqualTo(array, value) {
  if (!Array.isArray(array)) {
    throw new Error('percentageEqualTo requires array to be an array');
  }
  
  if (array.length === 0) {
    return 0;
  }
  
  let count = 0;
  let equalCount = 0;
  
  for (const item of array) {
    if (typeof item === 'number' && !isNaN(item)) {
      count++;
      if (item === value) {
        equalCount++;
      }
    }
  }
  
  if (count === 0) {
    return 0;
  }
  
  return (equalCount / count) * 100;
}

/**
 * Calculates the percentage of numbers in an array that are not equal to a value.
 * @param {Array<any>} array - The array to analyze.
 * @param {any} value - The value to compare against.
 * @returns {number} The percentage of non-matching values.
 * @throws {Error} If array is invalid
 */
export function percentageNotEqualTo(array, value) {
  if (!Array.isArray(array)) {
    throw new Error('percentageNotEqualTo requires array to be an array');
  }
  
  if (array.length === 0) {
    return 0;
  }
  
  let count = 0;
  let notEqualCount = 0;
  
  for (const item of array) {
    if (typeof item === 'number' && !isNaN(item)) {
      count++;
      if (item !== value) {
        notEqualCount++;
      }
    }
  }
  
  if (count === 0) {
    return 0;
  }
  
  return (notEqualCount / count) * 100;
}

/**
 * Calculates the percentage of numbers in an array that are greater than zero.
 * @param {Array<number>} array - The array to analyze.
 * @returns {number} The percentage of numbers greater than zero.
 * @throws {Error} If array is invalid
 */
export function percentageGreaterThanZero(array) {
  if (!Array.isArray(array)) {
    throw new Error('percentageGreaterThanZero requires array to be an array');
  }
  
  if (array.length === 0) {
    return 0;
  }
  
  let count = 0;
  let gtZeroCount = 0;
  
  for (const num of array) {
    if (typeof num === 'number' && !isNaN(num)) {
      count++;
      if (num > 0) {
        gtZeroCount++;
      }
    }
  }
  
  if (count === 0) {
    return 0;
  }
  
  return (gtZeroCount / count) * 100;
}

/**
 * Calculates the percentage of numbers in an array that are less than zero.
 * @param {Array<number>} array - The array to analyze.
 * @returns {number} The percentage of numbers less than zero.
 * @throws {Error} If array is invalid
 */
export function percentageLessThanZero(array) {
  if (!Array.isArray(array)) {
    throw new Error('percentageLessThanZero requires array to be an array');
  }
  
  if (array.length === 0) {
    return 0;
  }
  
  let count = 0;
  let ltZeroCount = 0;
  
  for (const num of array) {
    if (typeof num === 'number' && !isNaN(num)) {
      count++;
      if (num < 0) {
        ltZeroCount++;
      }
    }
  }
  
  if (count === 0) {
    return 0;
  }
  
  return (ltZeroCount / count) * 100;
}

/**
 * Calculates the percentage of numbers in an array that are zero.
 * @param {Array<number>} array - The array to analyze.
 * @returns {number} The percentage of zeros.
 * @throws {Error} If array is invalid
 */
export function percentageZero(array) {
  if (!Array.isArray(array)) {
    throw new Error('percentageZero requires array to be an array');
  }
  
  if (array.length === 0) {
    return 0;
  }
  
  let count = 0;
  let zeroCount = 0;
  
  for (const num of array) {
    if (typeof num === 'number' && !isNaN(num)) {
      count++;
      if (num === 0) {
        zeroCount++;
      }
    }
  }
  
  if (count === 0) {
    return 0;
  }
  
  return (zeroCount / count) * 100;
}

/**
 * Calculates the percentage of numbers in an array that are positive.
 * @param {Array<number>} array - The array to analyze.
 * @returns {number} The percentage of positive numbers.
 * @throws {Error} If array is invalid
 */
export function percentagePositive(array) {
  if (!Array.isArray(array)) {
    throw new Error('percentagePositive requires array to be an array');
  }
  
  if (array.length === 0) {
    return 0;
  }
  
  let count = 0;
  let positiveCount = 0;
  
  for (const num of array) {
    if (typeof num === 'number' && !isNaN(num)) {
      count++;
      if (num > 0) {
        positiveCount++;
      }
    }
  }
  
  if (count === 0) {
    return 0;
  }
  
  return (positiveCount / count) * 100;
}

/**
 * Calculates the percentage of numbers in an array that are negative.
 * @param {Array<number>} array - The array to analyze.
 * @returns {number} The percentage of negative numbers.
 * @throws {Error} If array is invalid
 */
export function percentageNegative(array) {
  if (!Array.isArray(array)) {
    throw new Error('percentageNegative requires array to be an array');
  }
  
  if (array.length === 0) {
    return 0;
  }
  
  let count = 0;
  let negativeCount = 0;
  
  for (const num of array) {
    if (typeof num === 'number' && !isNaN(num)) {
      count++;
      if (num < 0) {
        negativeCount++;
      }
    }
  }
  
  if (count === 0) {
    return 0;
  }
  
  return (negativeCount / count) * 100;
}

/**
 * Calculates the percentage of numbers in an array that are even.
 * @param {Array<number>} array - The array to analyze.
 * @returns {number} The percentage of even numbers.
 * @throws {Error} If array is invalid
 */
export function percentageEven(array) {
  if (!Array.isArray(array)) {
    throw new Error('percentageEven requires array to be an array');
  }
  
  if (array.length === 0) {
    return 0;
  }
  
  let count = 0;
  let evenCount = 0;
  
  for (const num of array) {
    if (typeof num === 'number' && !isNaN(num)) {
      count++;
      if (num % 2 === 0) {
        evenCount++;
      }
    }
  }
  
  if (count === 0) {
    return 0;
  }
  
  return (evenCount / count) * 100;
}

/**
 * Calculates the percentage of numbers in an array that are odd.
 * @param {Array<number>} array - The array to analyze.
 * @returns {number} The percentage of odd numbers.
 * @throws {Error} If array is invalid
 */
export function percentageOdd(array) {
  if (!Array.isArray(array)) {
    throw new Error('percentageOdd requires array to be an array');
  }
  
  if (array.length === 0) {
    return 0;
  }
  
  let count = 0;
  let oddCount = 0;
  
  for (const num of array) {
    if (typeof num === 'number' && !isNaN(num)) {
      count++;
      if (num % 2 !== 0) {
        oddCount++;
      }
    }
  }
  
  if (count === 0) {
    return 0;
  }
  
  return (oddCount / count) * 100;
}

/**
 * Calculates the percentage of numbers in an array that are even.
 * @param {Array<number>} array - The array to analyze.
 * @returns {number} The percentage of even numbers.
 * @throws {Error} If array is invalid
 */
export function percentageWhole(array) {
  if (!Array.isArray(array)) {
    throw new Error('percentageWhole requires array to be an array');
  }
  
  if (array.length === 0) {
    return 0;
  }
  
  let count = 0;
  let wholeCount = 0;
  
  for (const num of array) {
    if (typeof num === 'number' && !isNaN(num)) {
      count++;
      if (num % 1 === 0) {
        wholeCount++;
      }
    }
  }
  
  if (count === 0) {
    return 0;
  }
  
  return (wholeCount / count) * 100;
}

/**
 * Calculates the percentage of numbers in an array that are fractional.
 * @param {Array<number>} array - The array to analyze.
 * @returns {number} The percentage of fractional numbers.
 * @throws {Error} If array is invalid
 */
export function percentageFractional(array) {
  if (!Array.isArray(array)) {
    throw new Error('percentageFractional requires array to be an array');
  }
  
  if (array.length === 0) {
    return 0;
  }
  
  let count = 0;
  let fractionalCount = 0;
  
  for (const num of array) {
    if (typeof num === 'number' && !isNaN(num)) {
      count++;
      if (num % 1 !== 0) {
        fractionalCount++;
      }
    }
  }
  
  if (count === 0) {
    return 0;
  }
  
  return (fractionalCount / count) * 100;
}

/**
 * Calculates the percentage of numbers in an array that are prime.
 * @param {Array<number>} array - The array to analyze.
 * @returns {number} The percentage of prime numbers.
 * @throws {Error} If array is invalid
 */
export function percentagePrime(array) {
  if (!Array.isArray(array)) {
    throw new Error('percentagePrime requires array to be an array');
  }
  
  if (array.length === 0) {
    return 0;
  }
  
  let count = 0;
  let primeCount = 0;
  
  for (const num of array) {
    if (typeof num === 'number' && !isNaN(num)) {
      count++;
      if (isPrime(num)) {
        primeCount++;
      }
    }
  }
  
  if (count === 0) {
    return 0;
  }
  
  return (primeCount / count) * 100;
}

/**
 * Checks if a number is prime.
 * @param {number} n - The number to check.
 * @returns {boolean} True if the number is prime.
 * @throws {Error} If input is invalid
 */
export function isPrime(n) {
  if (typeof n !== 'number' || n < 2) {
    return false;
  }
  
  if (n === 2) {
    return true;
  }
  
  if (n % 2 === 0) {
    return false;
  }
  
  const sqrt = Math.sqrt(n);
  
  for (let i = 3; i <= sqrt; i += 2) {
    if (n % i === 0) {
      return false;
    }
  }
  
  return true;
}

/**
 * Calculates the percentage of numbers in an array that are even.
 * @param {Array<number>} array - The array to analyze.
 * @returns {number} The percentage of even numbers.
 * @throws {Error} If array is invalid
 */
export function percentageEvenNumbers(array) {
  if (!Array.isArray(array)) {
    throw new Error('percentageEvenNumbers requires array to be an array');
  }
  
  if (array.length === 0) {
    return 0;
  }
  
  let count = 0;
  let evenCount = 0;
  
  for (const num of array) {
    if (typeof num === 'number' && !isNaN(num)) {
      count++;
      if (num % 2 === 0) {
        evenCount++;
      }
    }
  }
  
  if (count === 0) {
    return 0;
  }
  
  return (evenCount / count) * 100;
}

/**
 * Calculates the percentage of numbers in an array that are odd.
 * @param {Array<number>} array - The array to analyze.
 * @returns {number} The percentage of odd numbers.
 * @throws {Error} If array is invalid
 */
export function percentageOddNumbers(array) {
  if (!Array.isArray(array)) {
    throw new Error('percentageOddNumbers requires array to be an array');
  }
  
  if (array.length === 0) {
    return 0;
  }
  
  let count = 0;
  let oddCount = 0;
  
  for (const num of array) {
    if (typeof num === 'number' && !isNaN(num)) {
      count++;
      if (num % 2 !== 0) {
        oddCount++;
      }
    }
  }
  
  if (count === 0) {
    return 0;
  }
  
  return (oddCount / count) * 100;
}

/**
 * Calculates the percentage of numbers in an array that are even.
 * @param {Array<number>} array - The array to analyze.
 * @returns {number} The percentage of even numbers.
 * @throws {Error} If array is invalid
 */
export function percentageWholeNumbers(array) {
  if (!Array.isArray(array)) {
    throw new Error('percentageWholeNumbers requires array to be an array');
  }
  
  if (array.length === 0) {
    return 0;
  }
  
  let count = 0;
  let wholeCount = 0;
  
  for (const num of array) {
    if (typeof num === 'number' && !isNaN(num)) {
      count++;
      if (num % 1 === 0) {
        wholeCount++;
      }
    }
  }
  
  if (count === 0) {
    return 0;
  }
  
  return (wholeCount / count) * 100;
}

/**
 * Calculates the percentage of numbers in an array that are fractional.
 * @param {Array<number>} array - The array to analyze.
 * @returns {number} The percentage of fractional numbers.
 * @throws {Error} If array is invalid
 */
export function percentageFractionalNumbers(array) {
  if (!Array.isArray(array)) {
    throw new Error('percentageFractionalNumbers requires array to be an array');
  }
  
  if (array.length === 0) {
    return 0;
  }
  
  let count = 0;
  let fractionalCount = 0;
  
  for (const num of array) {
    if (typeof num === 'number' && !isNaN(num)) {
      count++;
      if (num % 1 !== 0) {
        fractionalCount++;
      }
    }
  }
  
  if (count === 0) {
    return 0;
  }
  
  return (fractionalCount / count) * 100;
}
