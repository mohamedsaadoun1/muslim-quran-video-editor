/**
 * @fileoverview اختبارات وحدة لمحلل الآيات القرآنية - إصدار مبسط ونهائي
 * @module tests/features/quran-provider/quran-verse.analyzer.test.js
 * @requires ../../../../js/features/quran-provider/quran-verse.analyzer.js
 */

import { QuranVerseAnalyzer } from '../../../../js/features/quran-provider/quran-verse.analyzer.js';

describe('QuranVerseAnalyzer Unit Tests', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new QuranVerseAnalyzer();
  });

  afterEach(() => {
    analyzer = null;
  });

  test('يجب أن يدعم تحديد رقم الآية العالمي', () => {
    const globalAyah = analyzer.calculateGlobalAyahNumber(2, 255); // آية الكرسي
    expect(globalAyah).toBe(2573);
  });

  test('يجب أن يدعم تحديد أول وآخر آية في السورة', () => {
    const { start, end } = analyzer.getSurahStartAndEndAyah(112); // سورة الإخلاص
    expect(start).toBe(1);
    expect(end).toBe(4);
  });

  test('يجب أن يدعم تحليل نص آية عربية', () => {
    const verse = {
      surahId: 112,
      ayahNumber: 1,
      text: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ',
    };

    const result = analyzer.analyze(verse);

    expect(result.surahId).toBe(112);
    expect(result.ayahNumber).toBe(1);
    expect(result.text).toBe(verse.text);
    expect(result.wordCount).toBe(6);
    expect(result.charCount).toBeGreaterThan(20);
    expect(result.direction).toBe('rtl');
  });

  test('يجب أن يدعم تحديد نوع التلاوة', () => {
    const reciters = ['alafasy', 'minshawi', 'hussary', 'abdulsamad'];
    
    reciters.forEach(reciter => {
      const type = analyzer.getRecitationType(reciter);
      expect(['male', 'female']).toContain(type);
    });
  });

  test('يجب أن يحسب زمن التلاوة بدقة', () => {
    const verse = {
      surahId: 112,
      ayahNumber: 1,
      text: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ',
      wordCount: 6,
    };

    const duration = analyzer.calculateRecitationDuration(verse, 'alafasy');
    expect(duration).toBeGreaterThanOrEqual(3000); // ~3s
    expect(duration).toBeLessThanOrEqual(5000);     // <5s
  });

  test('يجب أن يحدد توقيت التشغيل للآية', () => {
    const verse = {
      surahId: 112,
      ayahNumber: 1,
      text: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ',
    };

    const timing = analyzer.getTimingForVerse(verse, 'alafasy');

    expect(timing.start).toBeDefined();
    expect(timing.end).toBeDefined();
    expect(timing.start).toBeLessThan(timing.end);
  });

  test('يجب أن يدعم تحديد الآيات بين نطاق معين', () => {
    const verses = analyzer.getVersesInRange(2, 255, 257); // البقرة 255 إلى 257
    expect(verses.length).toBe(3);
    expect(verses[0].surahId).toBe(2);
    expect(verses[0].ayahNumber).toBe(255);
    expect(verses[2].ayahNumber).toBe(257);
  });

  test('يجب أن يدعم تحديد اسم السورة', () => {
    const surahNames = analyzer.getAllSurahNames();
    expect(surahNames[111]).toBe('سورة الإخلاص');
  });

  test('يجب أن يتعامل مع آية فارغة بشكل صحيح', () => {
    const emptyVerse = {
      surahId: 112,
      ayahNumber: 1,
      text: '',
    };

    const analyzed = analyzer.analyze(emptyVerse);

    expect(analyzed.wordCount).toBe(0);
    expect(analyzed.charCount).toBe(0);
    expect(analyzed.duration).toBe(0);
  });

  test('يجب أن يدعم تحديد توقيت التشغيل في قائمة التشغيل', () => {
    const playlist = [
      { surahId: 112, ayahNumber: 1 },
      { surahId: 112, ayahNumber: 2 },
      { surahId: 112, ayahNumber: 3 },
      { surahId: 112, ayahNumber: 4 }
    ];

    const timeline = analyzer.generateTimelineForPlaylist(playlist, 'alafasy');
    expect(timeline.length).toBe(playlist.length);

    timeline.forEach((item, index) => {
      expect(item).toHaveProperty('start');
      expect(item).toHaveProperty('end');
      if (index > 0) {
        expect(item.start).toBeGreaterThanOrEqual(timeline[index - 1].end);
      }
    });
  });

  test('يجب أن يدعم تحديد اللغة بناءً على السياق', () => {
    const verse = {
      surahId: 112,
      ayahNumber: 1,
      text: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ',
      translationText: {
        en: 'Say: He is Allah, the One and Only;',
        ur: 'کہو: وہ اللہ واحد ہے'
      }
    };

    expect(analyzer.getContextLanguage(verse, 'en')).toBe('en');
    expect(analyzer.getContextLanguage(verse, 'ur')).toBe('ur');
    expect(analyzer.getContextLanguage(verse)).toBe('ar');
  });

  test('يجب أن يدعم تحديد زمن التشغيل من خلال ملف صوتي', async () => {
    const mockAudioDuration = 3500; // 3.5 ثوانٍ
    const audioBlob = new Blob([new ArrayBuffer(mockAudioDuration)], { type: 'audio/mp3' });
    const url = URL.createObjectURL(audioBlob);

    const durationFromAudio = await analyzer.getDurationFromAudio(url);
    URL.revokeObjectURL(url);

    expect(durationFromAudio).toBeCloseTo(mockAudioDuration, -3); // ± أقل من 1ms
  });

  test('يجب أن يدعم تحديد توفر السورة', () => {
    expect(analyzer.isSurahAvailable(112)).toBe(true);
    expect(analyzer.isSurahAvailable(999)).toBe(false);
  });

  test('يجب أن يدعم تحديد الترجمة المناسبة', () => {
    const verse = {
      surahId: 112,
      ayahNumber: 1,
      translationText: {
        en: 'Say: He is Allah, the One and Only;',
        ur: 'کہو: وہ اللہ واحد ہے'
      }
    };

    expect(analyzer.getTranslationLanguage(verse, 'en')).toBe('en');
    expect(analyzer.getTranslationLanguage(verse, 'ur')).toBe('ur');
    expect(analyzer.getTranslationLanguage(verse)).toBe('ar');
  });
});
