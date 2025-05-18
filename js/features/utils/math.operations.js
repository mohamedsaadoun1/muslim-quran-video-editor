// js/utils/math.operations.js

/**
 * Clamps a value between a minimum and maximum.
 * @param {number} value - The value to clamp.
 * @param {number} min - The minimum allowed value.
 * @param {number} max - The maximum allowed value.
 * @returns {number} The clamped value.
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

/**
 * Linearly interpolates between two values.
 * @param {number} start - The start value.
 * @param {number} end - The end value.
 * @param {number} t - The interpolation factor (usually between 0 and 1).
 *                     If t=0, returns start. If t=1, returns end.
 * @returns {number} The interpolated value.
 */
export function lerp(start, end, t) {
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
 */
export function mapRange(value, inMin, inMax, outMin, outMax) {
  // Avoid division by zero if inMin and inMax are the same
  if (inMin === inMax) {
    return outMin; // Or handle as an error, or return average of outMin/outMax
  }
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * Normalizes a value to a range between 0 and 1.
 * @param {number} value - The value to normalize.
 * @param {number} min - The minimum of the value's original range.
 * @param {number} max - The maximum of the value's original range.
 * @returns {number} The normalized value (between 0 and 1).
 */
export function normalize(value, min, max) {
  // Avoid division by zero
  if (max === min) {
    return 0; // Or 0.5, or handle error. If value equals min/max, it's at the boundary.
  }
  return (value - min) / (max - min);
}

/**
 * Generates a random integer within a specified range (inclusive).
 * @param {number} min - The minimum value of the range.
 * @param {number} max - The maximum value of the range.
 * @returns {number} A random integer between min and max.
 */
export function randomInt(min, max) {
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
 */
export function randomFloat(min, max, decimals) {
  const randomNumber = Math.random() * (max - min) + min;
  if (typeof decimals === 'number' && decimals >= 0) {
    return parseFloat(randomNumber.toFixed(decimals));
  }
  return randomNumber;
}

/**
 * Converts an angle from degrees to radians.
 * @param {number} degrees - The angle in degrees.
 * @returns {number} The angle in radians.
 */
export function degreesToRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Converts an angle from radians to degrees.
 * @param {number} radians - The angle in radians.
 * @returns {number} The angle in degrees.
 */
export function radiansToDegrees(radians) {
  return radians * (180 / Math.PI);
}

/**
 * Checks if two floating-point numbers are approximately equal within a given epsilon.
 * Useful for comparing floats due to precision issues.
 * @param {number} a - First number.
 * @param {number} b - Second number.
 * @param {number} [epsilon=Number.EPSILON] - The maximum allowed difference.
 * @returns {boolean} True if the numbers are approximately equal.
 */
export function approximatelyEquals(a, b, epsilon = Number.EPSILON) {
  return Math.abs(a - b) < epsilon;
}

/**
 * Rounds a number to a specified number of decimal places.
 * @param {number} number - The number to round.
 * @param {number} [decimalPlaces=0] - The number of decimal places (non-negative integer).
 * @returns {number} The rounded number.
 */
export function roundToDecimalPlaces(number, decimalPlaces = 0) {
    if (isNaN(number) || typeof decimalPlaces !== 'number' || decimalPlaces < 0) {
        return NaN; // Or throw an error
    }
    const factor = Math.pow(10, Math.floor(decimalPlaces));
    return Math.round(number * factor) / factor;
}

/**
 * Calculates the average of a list of numbers.
 * @param {number[]} numbers - An array of numbers.
 * @returns {number} The average, or NaN if the array is empty or contains non-numbers.
 */
export function average(numbers) {
    if (!Array.isArray(numbers) || numbers.length === 0) {
        return NaN;
    }
    const sum = numbers.reduce((acc, val) => {
        if (typeof val !== 'number') {
            // Or throw an error / skip non-numbers
            return NaN;
        }
        return acc + val;
    }, 0);

    if (isNaN(sum)) {
        return NaN;
    }
    return sum / numbers.length;
}


// This module exports utility functions directly. No complex initialization.
// No `initialize...` function needed from moduleBootstrap.
