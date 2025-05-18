// js/utils/time.formatter.js

const timeFormatter = {
  /**
   * Formats a duration given in total seconds into a MM:SS string.
   * Example: 125 seconds -> "2:05"
   * Example: 5 seconds -> "0:05"
   *
   * @param {number} totalSeconds - The total duration in seconds.
   * @returns {string} The formatted time string in MM:SS format, or "0:00" if input is invalid.
   */
  formatSecondsToMMSS(totalSeconds) {
    if (typeof totalSeconds !== 'number' || isNaN(totalSeconds) || totalSeconds < 0) {
      return '0:00'; // Default or error representation
    }

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const formattedMinutes = String(minutes); // No padding for minutes usually
    const formattedSeconds = String(seconds).padStart(2, '0'); // Pad seconds with a leading zero if needed

    return `${formattedMinutes}:${formattedSeconds}`;
  },

  /**
   * Formats a duration given in total seconds into an HH:MM:SS string.
   * Example: 3665 seconds -> "1:01:05"
   *
   * @param {number} totalSeconds - The total duration in seconds.
   * @param {boolean} [alwaysShowHours=false] - If true, hours will always be shown (e.g., "0:01:05").
   *                                            If false, hours are shown only if duration is >= 1 hour.
   * @returns {string} The formatted time string in HH:MM:SS or MM:SS format.
   */
  formatSecondsToHHMMSS(totalSeconds, alwaysShowHours = false) {
    if (typeof totalSeconds !== 'number' || isNaN(totalSeconds) || totalSeconds < 0) {
      return alwaysShowHours ? '0:00:00' : '0:00';
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');

    if (hours > 0 || alwaysShowHours) {
      const formattedHours = String(hours); // No padding for hours usually for the first digit
      return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
    } else {
      // If no hours and not always showing hours, return MM:SS
      // (padStart for minutes here if they can also be single digit when hours are 0)
      const displayMinutes = String(minutes); // No pad if it's the leading unit like 2:05
      return `${displayMinutes}:${formattedSeconds}`;
    }
  }

  // You can add more time formatting functions here if needed, e.g.,
  // - Formatting timestamps (Date objects) into human-readable strings.
  // - Converting milliseconds to formatted strings.
};

// This module exports utility functions directly.
// No `initialize...` function needed from moduleBootstrap.

export default timeFormatter;
