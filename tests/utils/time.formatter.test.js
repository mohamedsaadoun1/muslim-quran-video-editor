import { describe, it, expect } from 'vitest';
import { formatTime, parseTime } from '../../utils/time.formatter.js';

describe('Time Formatter Utilities', () => {
  // اختبار تنسيق الوقت من ثوانٍ إلى MM:SS أو HH:MM:SS
  it('should format seconds to MM:SS correctly', () => {
    expect(formatTime(0)).toBe('00:00'); // وقت الصفر
    expect(formatTime(30)).toBe('00:30'); // أقل من دقيقة
    expect(formatTime(60)).toBe('01:00'); // دقيقة واحدة
    expect(formatTime(90)).toBe('01:30'); // دقيقة ونصف
    expect(formatTime(3600)).toBe('01:00:00'); // ساعة واحدة
    expect(formatTime(3661)).toBe('01:01:01'); // ساعة ودقيقة وثانية
  });

  // اختبار تنسيق الوقت مع قيم سالبة (يجب أن يُرجع خطأ أو يعالجها بسلاسة)
  it('should handle negative time values gracefully', () => {
    expect(() => formatTime(-10)).toThrow('Invalid time value'); // رمي خطأ للقيم السالبة
  });

  // اختبار تحليل النصوص الزمنية (مثل "01:30" إلى ثوانٍ)
  it('should parse time strings to seconds correctly', () => {
    expect(parseTime('00:00')).toBe(0); // صفر ثوانٍ
    expect(parseTime('00:30')).toBe(30); // 30 ثانية
    expect(parseTime('01:00')).toBe(60); // دقيقة واحدة
    expect(parseTime('01:30')).toBe(90); // دقيقة ونصف
    expect(parseTime('01:00:00')).toBe(3600); // ساعة واحدة
    expect(parseTime('01:01:01')).toBe(3661); // ساعة ودقيقة وثانية
  });

  // اختبار تحليل نصوص زمنية غير صحيحة (يجب أن يُرجع خطأ)
  it('should throw error for invalid time strings', () => {
    expect(() => parseTime('invalid')).toThrow('Invalid time format'); // تنسيق غير صحيح
    expect(() => parseTime('25:00')).toThrow('Invalid time format'); // ساعات غير صحيحة
  });
});
