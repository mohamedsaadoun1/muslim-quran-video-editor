// js/utils/time.formatter.js

/**
 * @typedef {Object} TimeFormatOptions
 * General formatting options applicable to durations and timestamps.
 * @property {boolean} [padWithZero=true] - Whether to pad single-digit numbers with zero (e.g., 01, 05).
 * @property {string} [separator=':'] - Separator for time units (HH:MM:SS). For human-readable durations, space or comma might be preferred.
 * @property {'en'|'ar'} [language='en'] - Language for localized formatting (unit names, AM/PM).
 * @property {boolean} [useArabicNumerals=false] - Whether to use Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩) if language is 'ar'.
 *
 * Duration-specific options:
 * @property {boolean} [alwaysShowHours=false] - Always show hours component, even if zero.
 * @property {boolean} [alwaysShowMinutes=true] - Always show minutes component, even if zero (and hours are shown or non-zero).
 * @property {boolean} [alwaysShowSeconds=true] - Always show seconds component, even if zero (and minutes/hours are shown or non-zero).
 * @property {boolean} [includeMilliseconds=false] - Whether to include milliseconds in the formatted duration.
 * @property {boolean} [useFullWords=false] - For human-readable durations, whether to use full words (e.g., "hours", "minutes") or abbreviations (e.g., "h", "m").
 *
 * Timestamp-specific options (for Date objects):
 * @property {boolean} [showDate=true] - Whether to include the date part.
 * @property {boolean} [showTime=true] - Whether to include the time part.
 * @property {boolean} [use24HourFormat=false] - For time part, whether to use 24-hour format (true) or 12-hour format with AM/PM (false).
 * @property {boolean} [useAmPm=true] - If using 12-hour format, whether to show AM/PM. Ignored if use24HourFormat is true.
 * @property {boolean} [showWeekday=false] - Whether to show the full name of the weekday.
 * @property {boolean} [showMonthName=true] - Whether to show the full name of the month.
 * @property {boolean} [showFullYear=true] - Whether to show the full 4-digit year (true) or 2-digit year (false).
 * @property {boolean} [showDaySuffix=false] - For English dates, whether to show day suffixes (1st, 2nd, 3rd, th).
 * @property {boolean} [showTimezone=false] - Attempt to show timezone offset (e.g., GMT+3). Note: JavaScript's native Date timezone handling can be limited.
 */

/**
 * @typedef {Object} TimeComponents
 * @property {number} days
 * @property {number} hours
 * @property {number} minutes
 * @property {number} seconds
 * @property {number} milliseconds
 * @property {number} totalDays
 * @property {number} totalHours
 * @property {number} totalMinutes
 * @property {number} totalSeconds
 * @property {number} totalMilliseconds
 */

/**
 * @typedef {Object} TimeFormatError
 * @property {string} message - Description of the error
 * @property {string} origin - The function where the error occurred
 * @property {any[]} [inputs] - The input values that caused the error
 * @property {string} [code] - Error code
 */

const MS_IN_SECOND = 1000;
const MS_IN_MINUTE = MS_IN_SECOND * 60;
const MS_IN_HOUR = MS_IN_MINUTE * 60;
const MS_IN_DAY = MS_IN_HOUR * 24;

const ARABIC_NUMERALS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/**
 * Converts English digits in a string to Eastern Arabic numerals.
 * @param {string|number} input - The string or number containing digits.
 * @returns {string} String with Eastern Arabic numerals.
 * @private
 */
function _toArabicNumerals(input) {
    return String(input).replace(/\d/g, digit => ARABIC_NUMERALS[parseInt(digit, 10)]);
}

/**
 * Gets the suffix for a day number (e.g., 1st, 2nd, 3rd, 4th).
 * @param {number} day - The day of the month.
 * @returns {string} The day suffix.
 * @private
 */
function _getDaySuffix(day) {
    if (day > 3 && day < 21) return 'th'; // Covers 11th, 12th, 13th
    switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

/**
 * Converts a duration in milliseconds to a time object with components.
 * @param {number} ms - The duration in milliseconds.
 * @returns {TimeComponents | null} An object with time components, or null if input is invalid.
 */
export function parseTimeComponents(ms) {
  if (typeof ms !== 'number' || isNaN(ms) || !isFinite(ms)) {
    // console.error('parseTimeComponents requires a valid number as input. Received:', ms);
    return null; // Return null for invalid input to allow graceful handling
  }

  const totalMilliseconds = Math.max(0, ms); // Ensure non-negative

  const days = Math.floor(totalMilliseconds / MS_IN_DAY);
  const hours = Math.floor((totalMilliseconds % MS_IN_DAY) / MS_IN_HOUR);
  const minutes = Math.floor((totalMilliseconds % MS_IN_HOUR) / MS_IN_MINUTE);
  const seconds = Math.floor((totalMilliseconds % MS_IN_MINUTE) / MS_IN_SECOND);
  const milliseconds = Math.floor(totalMilliseconds % MS_IN_SECOND);

  return {
    days,
    hours,
    minutes,
    seconds,
    milliseconds,
    totalDays: totalMilliseconds / MS_IN_DAY,
    totalHours: totalMilliseconds / MS_IN_HOUR,
    totalMinutes: totalMilliseconds / MS_IN_MINUTE,
    totalSeconds: totalMilliseconds / MS_IN_SECOND,
    totalMilliseconds
  };
}

/**
 * Formats a duration into a string (e.g., HH:MM:SS or human-readable).
 * @param {number} durationMs - Duration in milliseconds.
 * @param {TimeFormatOptions} [options={}] - Formatting options.
 * @returns {string} The formatted time string.
 * @throws {Error} If durationMs input is invalid and not handled by parseTimeComponents.
 */
export function formatDuration(durationMs, options = {}) {
  const components = parseTimeComponents(durationMs);
  if (!components) {
    // Handle invalid duration based on desired behavior, e.g., return default error string
    return options.language === 'ar' ? '٠٠:٠٠' : '00:00';
  }

  const settings = {
    padWithZero: true,
    separator: ':',
    language: 'en',
    useArabicNumerals: false,
    alwaysShowHours: durationMs >= MS_IN_HOUR, // Default to show hours if duration is an hour or more
    alwaysShowMinutes: true,
    alwaysShowSeconds: true,
    includeMilliseconds: false,
    useFullWords: false, // Default to short format like 01:02:03
    ...options
  };

  let { days, hours, minutes, seconds, milliseconds } = components;

  if (settings.useFullWords) { // Human-readable format
    const parts = [];
    const lang = settings.language;
    const num = (n) => (settings.useArabicNumerals && lang === 'ar' ? _toArabicNumerals(n) : String(n));

    if (days > 0) parts.push(`${num(days)} ${lang === 'ar' ? (days === 1 ? 'يوم' : (days === 2 ? 'يومان' : (days >=3 && days <=10 ? `${num(days)} أيام` : `${num(days)} يومًا`))) : (days === 1 ? 'day' : 'days')}`);
    if (hours > 0 || (settings.alwaysShowHours && days > 0)) parts.push(`${num(hours)} ${lang === 'ar' ? (hours === 1 ? 'ساعة' : (hours === 2 ? 'ساعتان' : (hours >=3 && hours <=10 ? `${num(hours)} ساعات` : `${num(hours)} ساعة`))) : (hours === 1 ? 'hour' : 'hours')}`);
    if (minutes > 0 || (settings.alwaysShowMinutes && (hours > 0 || days > 0))) parts.push(`${num(minutes)} ${lang === 'ar' ? (minutes === 1 ? 'دقيقة' : (minutes === 2 ? 'دقيقتان' : (minutes >=3 && minutes <=10 ? `${num(minutes)} دقائق` : `${num(minutes)} دقيقة`))) : (minutes === 1 ? 'minute' : 'minutes')}`);
    if (seconds > 0 || (settings.alwaysShowSeconds && (minutes > 0 || hours > 0 || days > 0))) parts.push(`${num(seconds)} ${lang === 'ar' ? (seconds === 1 ? 'ثانية' : (seconds === 2 ? 'ثانيتان' : (seconds >=3 && seconds <=10 ? `${num(seconds)} ثواني` : `${num(seconds)} ثانية`))) : (seconds === 1 ? 'second' : 'seconds')}`);
    if (settings.includeMilliseconds && milliseconds > 0) parts.push(`${num(milliseconds)} ${lang === 'ar' ? 'جزء من الثانية' : 'ms'}`);

    if (parts.length === 0) {
        return `${num(0)} ${lang === 'ar' ? 'ثانية' : 'seconds'}`;
    }
    // Simplified joining for human-readable
    const humanSeparator = lang === 'ar' ? ' و ' : ', ';
    if (parts.length > 1 && lang === 'en') {
        const lastPart = parts.pop();
        return parts.join(humanSeparator) + (parts.length > 0 ? ' and ' : '') + lastPart;
    }
    return parts.join(humanSeparator);

  } else { // HH:MM:SS like format
    const showHours = settings.alwaysShowHours || hours > 0 || days > 0;
    const showMinutes = settings.alwaysShowMinutes || showHours || minutes > 0;

    let h = String(days > 0 ? (days * 24 + hours) : hours); // Combine days into hours if shown
    let m = String(minutes);
    let s = String(seconds);
    let msPart = '';

    if (settings.padWithZero) {
        h = h.padStart(2, '0');
        m = m.padStart(2, '0');
        s = s.padStart(2, '0');
    }

    if (settings.useArabicNumerals && settings.language === 'ar') {
        h = _toArabicNumerals(h);
        m = _toArabicNumerals(m);
        s = _toArabicNumerals(s);
        if (settings.includeMilliseconds) {
            msPart = `.${_toArabicNumerals(String(milliseconds).padStart(3, '0'))}`;
        }
    } else if (settings.includeMilliseconds) {
        msPart = `.${String(milliseconds).padStart(3, '0')}`;
    }

    const timeParts = [];
    if (showHours) timeParts.push(h);
    if (showMinutes || showHours) timeParts.push(m); // Always show minutes if hours are shown
    if (settings.alwaysShowSeconds || showMinutes || showHours) timeParts.push(s); // Always show seconds if minutes/hours are shown

    if (timeParts.length === 0) { // e.g. duration is < 1s and only seconds not forced
        return (settings.useArabicNumerals && settings.language === 'ar') ? `٠${settings.separator}٠٠${msPart}` : `0${settings.separator}00${msPart}`;
    }
    return timeParts.join(settings.separator) + msPart;
  }
}

/**
 * Formats a Date object into a string.
 * @param {Date} dateObj - The Date object to format.
 * @param {TimeFormatOptions} [options={}] - Formatting options.
 * @returns {string} The formatted date/time string.
 */
export function formatTimestamp(dateObj, options = {}) {
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return options.language === 'ar' ? 'تاريخ غير صالح' : 'Invalid date';
  }

  const settings = {
    padWithZero: true,
    separator: ' ', // Default separator between date and time
    timeSeparator: ':', // Default separator for H:M:S
    dateSeparator: '-', // Default separator for Y-M-D
    language: 'en',
    useArabicNumerals: false,
    showDate: true,
    showTime: true,
    use24HourFormat: false,
    useAmPm: true,
    includeMilliseconds: false, // For time part
    showWeekday: false,
    showMonthName: true,
    showFullYear: true,
    showDaySuffix: false, // English specific
    showTimezone: false,
    ...options
  };

  const year = dateObj.getFullYear();
  const month = dateObj.getMonth(); // 0-indexed
  const day = dateObj.getDate();
  const weekday = dateObj.getDay(); // 0 for Sunday, 1 for Monday...
  let hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  const seconds = dateObj.getSeconds();
  const milliseconds = dateObj.getMilliseconds();

  const lang = settings.language;
  const useArabicNum = settings.useArabicNumerals && lang === 'ar';
  const num = (n, pad = 0) => {
      const s = String(n);
      const padded = pad > 0 ? s.padStart(pad, '0') : s;
      return useArabicNum ? _toArabicNumerals(padded) : padded;
  };

  const dateParts = [];
  const timeParts = [];

  // Format Date Part
  if (settings.showDate) {
    if (settings.showWeekday) {
        const weekdays = lang === 'ar' ?
            ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] :
            ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        dateParts.push(weekdays[weekday]);
    }

    const dayStr = num(day, settings.padWithZero ? 2 : 0) + (lang === 'en' && settings.showDaySuffix ? _getDaySuffix(day) : '');

    if (settings.showMonthName) {
        const months = lang === 'ar' ?
            ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'] :
            ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        // Order might vary by locale, e.g., "Month Day, Year" vs "Day Month Year"
        if (lang === 'ar') {
            dateParts.push(dayStr);
            dateParts.push(months[month]);
        } else {
            dateParts.push(months[month]);
            dateParts.push(dayStr);
        }
    } else {
        dateParts.push(num(month + 1, settings.padWithZero ? 2 : 0));
        dateParts.push(dayStr);
    }
    dateParts.push(num(settings.showFullYear ? year : year % 100, settings.showFullYear ? 0 : 2));
  }

  // Format Time Part
  if (settings.showTime) {
    let ampm = '';
    if (!settings.use24HourFormat && settings.useAmPm) {
        ampm = hours >= 12 ? (lang === 'ar' ? 'م' : 'PM') : (lang === 'ar' ? 'ص' : 'AM');
        hours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
    }
    timeParts.push(num(hours, settings.padWithZero ? 2 : 0));
    timeParts.push(num(minutes, settings.padWithZero ? 2 : 0));
    if (settings.alwaysShowSeconds !== false || seconds > 0) { // options.alwaysShowSeconds defaults to true in formatDuration, ensure consistency
        timeParts.push(num(seconds, settings.padWithZero ? 2 : 0));
    }
    if (settings.includeMilliseconds) {
        timeParts.push(num(milliseconds, 3)); // Milliseconds usually padded to 3 digits
    }
    if (ampm) timeParts.push(ampm);

    if (settings.showTimezone) {
        const offset = -dateObj.getTimezoneOffset();
        const sign = offset >= 0 ? '+' : '-';
        const absOffsetHours = Math.floor(Math.abs(offset) / 60);
        const absOffsetMinutes = Math.abs(offset) % 60;
        timeParts.push(`GMT${sign}${num(absOffsetHours,2)}${num(absOffsetMinutes,2)}`);
    }
  }

  const dateStr = dateParts.join(lang === 'ar' ? ' ' : (settings.showMonthName ? ' ' : settings.dateSeparator));
  const timeStr = timeParts.join(settings.timeSeparator);

  if (settings.showDate && settings.showTime) {
    return `${dateStr}${settings.separator}${timeStr}`;
  } else if (settings.showDate) {
    return dateStr;
  } else if (settings.showTime) {
    return timeStr;
  }
  return ''; // Should not happen if options are valid
}
