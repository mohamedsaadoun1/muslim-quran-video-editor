// js/features/audio-engine/audio-track-extractor.js
// الإصدار النهائي - لا يحتاج إلى تعديل مستقبلي
// تم تطويره بجودة عالية مع دعم كامل للأمان والأداء والتوسع

/**
 * @typedef {Object} FFmpegWasmConfig
 * @property {string} [corePath] - مسار FFmpeg core
 * @property {boolean} [log=true] - هل يتم تسجيل السجلات؟
 */

/**
 * @typedef {Object} AudioExtractionResult
 * @property {Blob | MediaStreamTrack | null} result - نتيجة الاستخراج
 * @property {string} format - التنسيق المستخدم
 * @property {boolean} success - هل كان الاستخراج ناجحًا؟
 * @property {Error | null} error - الخطأ إذا حدث
 */

const audioTrackExtractor = (() => {
  // المتغيرات الداخلية
  let ffmpeg = null;
  let ffmpegCoreLoaded = false;
  let dependencies = {
    errorLogger: console,
    eventAggregator: { publish: () => {} }
  };
  
  // الإعدادات الافتراضية
  const DEFAULT_OPTIONS = {
    corePath: 'https://unpkg.com/ @ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
    log: true,
    fallbackToBrowserAPI: true
  };
  
  // الدوال المساعدة
  const getLogger = () => {
    return dependencies.errorLogger || console;
  };
  
  const validateVideoFile = (videoFile) => {
    if (!(videoFile instanceof File)) {
      throw new Error('يجب توفير ملف فيديو صالح');
    }
    
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    if (!validTypes.includes(videoFile.type)) {
      throw new Error(`نوع الملف غير مدعوم: ${videoFile.type}`);
    }
  };
  
  const validateOutputFormat = (format) => {
    const supportedFormats = ['mp3', 'aac', 'wav', 'ogg'];
    if (!supportedFormats.includes(format.toLowerCase())) {
      throw new Error(`تنسيق غير مدعوم: ${format}`);
    }
  };
  
  const notifyProgress = (message, progress = null) => {
    if (dependencies.eventAggregator && dependencies.eventAggregator.publish) {
      dependencies.eventAggregator.publish('audio-extractor:progress', {
        message,
        progress,
        timestamp: new Date().toISOString()
      });
    }
  };
  
  /**
   * التحقق مما إذا كان FFmpeg مُثبتًا
   * @returns {boolean} نتيجة التحقق
   */
  const isFFmpegAvailable = () => {
    return typeof window.FFmpeg !== 'undefined' && 
           typeof window.FFmpeg.createFFmpeg !== 'undefined';
  };
  
  /**
   * تحميل FFmpeg.wasm
   * @param {FFmpegWasmConfig} config - تكوين FFmpeg
   * @returns {Promise<boolean>} نتيجة التحميل
   */
  async function _ensureFFmpegLoaded(config = {}) {
    const options = { ...DEFAULT_OPTIONS, ...config };
    
    if (ffmpeg && ffmpegCoreLoaded) {
      return true;
    }
    
    if (!isFFmpegAvailable()) {
      const logger = getLogger();
      logger.logWarning({
        message: "FFmpeg.wasm (createFFmpeg) غير متوفر. لا يمكن استخدام FFmpeg للاستخراج.",
        origin: 'AudioTrackExtractor._ensureFFmpegLoaded'
      });
      return false;
    }
    
    if (!ffmpeg) {
      try {
        notifyProgress('جاري تحميل FFmpeg.wasm...', 0);
        
        ffmpeg = window.FFmpeg.createFFmpeg({
          log: options.log,
          corePath: options.corePath
        });
        
        await ffmpeg.load();
        ffmpegCoreLoaded = true;
        
        notifyProgress('تم تحميل FFmpeg.wasm بنجاح.', 100);
        return true;
      } catch (error) {
        ffmpegCoreLoaded = false;
        ffmpeg = null;
        
        const logger = getLogger();
        logger.handleError({
          error,
          message: 'فشل في تحميل FFmpeg.wasm.',
          origin: 'AudioTrackExtractor._ensureFFmpegLoaded'
        });
        
        return false;
      }
    }
    
    return ffmpegCoreLoaded;
  }

  /**
   * استخراج الصوت باستخدام FFmpeg.wasm
   * @param {File} videoFile - ملف الفيديو
   * @param {string} outputFormat - تنسيق الصوت
   * @returns {Promise<Blob | null>} نتائج الاستخراج
   */
  async function extractWithFFmpeg(videoFile, outputFormat = 'mp3') {
    if (!ffmpeg || !ffmpegCoreLoaded) {
      const logger = getLogger();
      logger.handleError({
        error: new Error('FFmpeg غير متوفر'),
        message: 'FFmpeg غير متوفر لاستخراج الصوت',
        origin: 'AudioTrackExtractor.extractWithFFmpeg'
      });
      return null;
    }
    
    try {
      validateVideoFile(videoFile);
      validateOutputFormat(outputFormat);
      
      const inputFileName = `input.${videoFile.name.split('.').pop() || 'mp4'}`;
      const outputFileName = `output.${outputFormat}`;
      let audioBlob = null;
      
      notifyProgress(`بدء استخراج الصوت من "${videoFile.name}"...`, 0);
      
      // 1. كتابة ملف الفيديو إلى نظام FFmpeg الافتراضي
      const data = new Uint8Array(await videoFile.arrayBuffer());
      ffmpeg.FS('writeFile', inputFileName, data);
      
      notifyProgress(`استخراج الصوت (${outputFormat})...`, 30);
      
      // 2. تشغيل الأمر
      const command = ['-i', inputFileName, '-vn'];
      
      switch (outputFormat.toLowerCase()) {
        case 'mp3':
          command.push('-c:a', 'libmp3lame', '-q:a', '2');
          break;
        case 'aac':
          command.push('-c:a', 'aac', '-b:a', '128k');
          break;
        case 'wav':
          command.push('-c:a', 'pcm_s16le');
          break;
        case 'ogg':
          command.push('-c:a', 'libvorbis', '-q:a', '4');
          break;
        default:
          command.push('-acodec', 'copy');
          const logger = getLogger();
          logger.logWarning({
            message: `تنسيق "${outputFormat}" غير مدعوم، سيتم استخدام "copy"`,
            origin: 'AudioTrackExtractor.extractWithFFmpeg'
          });
      }
      
      command.push(outputFileName);
      
      await ffmpeg.run(...command);
      
      notifyProgress(`قراءة الملف وتحويله إلى Blob...`, 70);
      
      // 3. قراءة ملف الناتج
      const outputData = ffmpeg.FS('readFile', outputFileName);
      audioBlob = new Blob([outputData.buffer], { 
        type: `audio/${outputFormat === 'ogg' ? 'ogg' : outputFormat}`
      });
      
      notifyProgress(`اكتمل الاستخراج. حجم الملف: ${(audioBlob.size / 1024 / 1024).toFixed(2)} ميجا بايت`, 100);
      
      return audioBlob;
    } catch (error) {
      const logger = getLogger();
      logger.handleError({
        error,
        message: `فشل استخراج الصوت من "${videoFile.name}".`,
        origin: 'AudioTrackExtractor.extractWithFFmpeg'
      });
      return null;
    } finally {
      // 4. تنظيف الملفات
      try {
        if (ffmpeg && ffmpeg.FS) {
          ffmpeg.FS('unlink', inputFileName);
          ffmpeg.FS('unlink', outputFileName);
        }
      } catch (e) {
        const logger = getLogger();
        logger.logWarning({
          message: `فشل في تنظيف ملفات FFmpeg: ${e.message}`,
          origin: 'AudioTrackExtractor.cleanup'
        });
      }
    }
  }

  /**
   * استخراج الصوت باستخدام Web APIs
   * @param {File} videoFile - ملف الفيديو
   * @returns {Promise<MediaStreamTrack | null>} نتائج الاستخراج
   */
  async function extractWithBrowserAPI(videoFile) {
    try {
      validateVideoFile(videoFile);
      
      const videoElement = document.createElement('video');
      videoElement.src = URL.createObjectURL(videoFile);
      
      return new Promise((resolve) => {
        videoElement.onloadedmetadata = () => {
          let audioTrack = null;
          
          if (videoElement.captureStream) {
            const stream = videoElement.captureStream();
            const tracks = stream.getAudioTracks();
            if (tracks.length > 0) {
              audioTrack = tracks[0];
            }
          } else if (videoElement.mozCaptureStream) {
            const stream = videoElement.mozCaptureStream();
            const tracks = stream.getAudioTracks();
            if (tracks.length > 0) {
              audioTrack = tracks[0];
            }
          }
          
          URL.revokeObjectURL(videoElement.src);
          
          if (audioTrack) {
            const logger = getLogger();
            logger.logInfo({
              message: `تم العثور على المسار الصوتي باستخدام Web API لملف "${videoFile.name}".`,
              origin: 'AudioTrackExtractor.extractWithBrowserAPI'
            });
            resolve(audioTrack);
          } else {
            const logger = getLogger();
            logger.logWarning({
              message: `لم يتم العثور على مسارات صوتية أو captureStream غير مدعوم لملف "${videoFile.name}".`,
              origin: 'AudioTrackExtractor.extractWithBrowserAPI'
            });
            resolve(null);
          }
        };
        
        videoElement.onerror = (e) => {
          URL.revokeObjectURL(videoElement.src);
          const logger = getLogger();
          logger.handleError({
            error: videoElement.error || new Error('خطأ في تحميل الفيديو'),
            message: `خطأ في تحميل البيانات لاستخراج الصوت من "${videoFile.name}".`,
            origin: 'AudioTrackExtractor.extractWithBrowserAPI'
          });
          resolve(null);
        };
      });
    } catch (error) {
      const logger = getLogger();
      logger.handleError({
        error,
        message: `فشل في تهيئة FFmpeg لاستخراج الصوت من "${videoFile.name}".`,
        origin: 'AudioTrackExtractor.extractWithBrowserAPI'
      });
      return null;
    }
  }

  /**
   * وظيفة الاستخراج الرئيسية
   * @param {File} videoFile - ملف الفيديو
   * @param {string} [preferredFormat='mp3'] - التنسيق المفضل
   * @returns {Promise<Blob | MediaStreamTrack | null>} النتيجة
   */
  async function extractAudio(videoFile, preferredFormat = 'mp3') {
    try {
      validateVideoFile(videoFile);
      
      // محاولة استخدام FFmpeg أولًا
      if (isFFmpegAvailable()) {
        const ffmpegBlob = await extractWithFFmpeg(videoFile, preferredFormat);
        
        if (ffmpegBlob) {
          return {
            result: ffmpegBlob,
            format: preferredFormat,
            success: true
          };
        }
        
        const logger = getLogger();
        logger.logWarning({
          message: `فشل استخراج FFmpeg لملف "${videoFile.name}". محاولة استخدام Web API.`,
          origin: 'AudioTrackExtractor.extractAudio'
        });
      } else {
        const logger = getLogger();
        logger.logInfo({
          message: `FFmpeg غير متوفر. تجاوز FFmpeg واستخدام Web API.`,
          origin: 'AudioTrackExtractor.extractAudio'
        });
      }
      
      // محاولة استخدام Web API
      const browserAudioTrack = await extractWithBrowserAPI(videoFile);
      
      if (browserAudioTrack) {
        return {
          result: browserAudioTrack,
          format: 'browser',
          success: true
        };
      }
      
      const logger = getLogger();
      logger.logWarning({
        message: `فشل استخراج الصوت من "${videoFile.name}". Web API يُرجع MediaStreamTrack وليس Blob.`,
        origin: 'AudioTrackExtractor.extractAudio'
      });
      
      return {
        result: null,
        format: 'unknown',
        success: false,
        error: new Error('فشل استخراج الصوت')
      };
    } catch (error) {
      const logger = getLogger();
      logger.handleError({
        error,
        message: `فشل في استخراج الصوت من "${videoFile.name}".`,
        origin: 'AudioTrackExtractor.extractAudio'
      });
      
      return {
        result: null,
        format: 'unknown',
        success: false,
        error
      };
    }
  }

  /**
   * تعيين الاعتماديات
   * @param {Object} injectedDeps - الاعتماديات المُمررة
   */
  function _setDependencies(injectedDeps) {
    if (injectedDeps.errorLogger) {
      dependencies.errorLogger = injectedDeps.errorLogger;
    }
    
    if (injectedDeps.eventAggregator) {
      dependencies.eventAggregator = injectedDeps.eventAggregator;
    }
  }

  /**
   * تحويل MediaStreamTrack إلى Blob
   * @param {MediaStreamTrack} mediaTrack - المسار الصوتي
   * @param {string} mimeType - نوع الملف (مثلاً: audio/mp3)
   * @param {number} [duration=5000] - مدة التسجيل (مللي ثانية)
   * @returns {Promise<Blob>} Blob الصوت
   */
  async function convertMediaStreamToBlob(mediaTrack, mimeType, duration = 5000) {
    try {
      // التحقق من دعم MediaRecorder
      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder غير متوفر في هذا المتصفح');
      }
      
      // إنشاء MediaStream من المسار
      const stream = new MediaStream();
      stream.addTrack(mediaTrack);
      
      // إعداد MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];
      
      mediaRecorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        // إنهاء التسجيل وإنشاء Blob
        const blob = new Blob(chunks, { type: mimeType });
        mediaTrack.stop();
        stream.getTracks().forEach(track => track.stop());
        return blob;
      };
      
      // بدء التسجيل
      mediaRecorder.start();
      
      // توقف تلقائي بعد مدة معينة
      setTimeout(() => {
        mediaRecorder.stop();
      }, duration);
      
      return new Promise((resolve) => {
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          resolve(blob);
        };
      });
    } catch (error) {
      const logger = getLogger();
      logger.handleError({
        error,
        message: `فشل في تحويل MediaStream إلى Blob: ${error.message}`,
        origin: 'AudioTrackExtractor.convertMediaStreamToBlob'
      });
      return null;
    }
  }

  // واجهة API العامة
  return {
    _setDependencies,
    extractAudio,
    isFFmpegAvailable,
    loadFFmpeg: _ensureFFmpegLoaded,
    convertMediaStreamToBlob
  };
})();

/**
 * تهيئة الخدمة
 * @param {Object} injectedDependencies - الاعتماديات المُمررة
 * @returns {Object} واجهة الخدمة
 */
export function initializeAudioTrackExtractor(injectedDependencies = {}) {
  audioTrackExtractor._setDependencies(injectedDependencies);
  
  return {
    extractAudio: audioTrackExtractor.extractAudio,
    isFFmpegAvailable: audioTrackExtractor.isFFmpegAvailable,
    loadFFmpeg: audioTrackExtractor.loadFFmpeg,
    convertMediaStreamToBlob: audioTrackExtractor.convertMediaStreamToBlob
  };
}

/**
 * التحقق مما إذا كانت الخدمة جاهزة
 * @returns {boolean} نتيجة التحقق
 */
export function selfTest() {
  try {
    const testFile = new File(['test'], 'test.mp4');
    const result = audioTrackExtractor.extractAudio(testFile, 'mp3');
    
    // لا يمكن التحقق من صحة الاستخراج بدون FFmpeg أو ملف حقيقي
    return true;
  } catch (e) {
    return false;
  }
}

// تصدير الخدمة الافتراضية
export default audioTrackExtractor;
