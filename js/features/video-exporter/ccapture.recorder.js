// js/features/video-exporter/ccapture.recorder.js

// ... (imports and other code) ...

const ccaptureRecorder = (() => {
  let capturer = null;
  // ... (other variables) ...

  const WORKER_PATHS = {
    // غير هذا مؤقتًا ليعتمد بالكامل على CDN للـ workers أيضًا، أو تأكد من وجود الملفات محليًا
    gif: 'https://cdn.jsdelivr.net/npm/ccapture.js@1.0.0/build/', // <-- التغيير هنا
    default: 'https://cdn.jsdelivr.net/npm/ccapture.js@1.0.0/build/'
  };

  // ... (dependencies) ...

  async function _initializeCapturer(exportSettings) {
    if (typeof window.CCapture === 'undefined') {
      try {
        await _loadCCaptureLibrary(); // تأكد من أن هذا الـ await يعمل بشكل صحيح
      } catch (e) {
        // _loadCCaptureLibrary بالفعل يتعامل مع الخطأ، لكن فقط للتوضيح
        _handleCriticalError('CCapture.js library failed to load. Video export unavailable.');
        return false;
      }
    }

    // تحقق مرة أخرى بعد محاولة التحميل
    if (typeof window.CCapture === 'undefined') {
      _handleCriticalError('CCapture.js library still not available after load attempt.');
      return false;
    }

    try {
      console.log("Attempting to initialize CCapture with settings:", exportSettings); // سجل الإعدادات قبل التهيئة
      const settings = _buildCapturerSettings(exportSettings);
      console.log("Built CCapture settings:", settings); // سجل الإعدادات المبنية
      
      capturer = new window.CCapture(settings);
      
      // أضف تحققًا مهمًا هنا:
      if (!capturer || typeof capturer.start !== 'function') {
        console.error("CCapture initialization failed or returned an invalid object. Capturer:", capturer);
        _handleCriticalError('CCapture failed to initialize properly, capturer object is invalid.');
        capturer = null; // تأكد من أنه null إذا فشل
        return false;
      }
      
      console.log("CCapture initialized successfully:", capturer);
      dependencies.eventAggregator.publish(EVENTS.EXPORT_PROGRESS, 0);
      return true;
    } catch (error) {
      console.error("Error during new CCapture() or related setup:", error); // سجل الخطأ الفعلي
      _handleCriticalError('CCapture initialization threw an error', error);
      capturer = null; // تأكد من أنه null عند الخطأ
      return false;
    }
  }

  function _buildCapturerSettings(exportSettings) {
    const format = ['gif', 'webm', 'png', 'jpg'].includes(exportSettings.format) 
      ? exportSettings.format 
      : 'webm';

    // تأكد أن DOMElements.videoPreviewCanvas موجود وصالح هنا
    if (!DOMElements || !DOMElements.videoPreviewCanvas || !(DOMElements.videoPreviewCanvas instanceof HTMLCanvasElement)) {
        console.error("videoPreviewCanvas is not a valid canvas element or DOMElements not initialized.");
        // قد تحتاج إلى معالجة هذا الخطأ بشكل أفضل، ربما بإرجاع null وإيقاف العملية
        throw new Error("videoPreviewCanvas is invalid for CCapture setup."); // إلقاء خطأ لمنع المتابعة
    }

    const settings = {
      format,
      framerate: Math.max(1, Math.min(60, exportSettings.fps || DEFAULT_PROJECT_SCHEMA.exportSettings.fps)),
      verbose: true, // اجعلها true مؤقتًا لمزيد من التفاصيل من CCapture
      display: false,
      name: exportSettings.name || `quran_video_${Date.now()}`,
      workersPath: WORKER_PATHS[format === 'gif' ? 'gif' : 'default'], // استخدم المسار المناسب للصيغة
      // fallbackWorkerPath: WORKER_PATHS.default, // لم تعد ضرورية إذا كان workersPath شاملًا
      quality: _calculateQuality(format, exportSettings.quality)
    };
    
    // ... (rest of the function)
    return settings;
  }
  
  // ... (بقية الكود كما هو مع تعديلات طفيفة قد تكون ضرورية بناءً على ما سبق) ...

  // في دالة startRecording:
  async function startRecording(duration) {
    // ... (الكود السابق) ...

    // Initialize capturer
    // أضف تسجيل قبل وبعد التهيئة
    console.log("Calling _initializeCapturer...");
    const initializedSuccessfully = await _initializeCapturer(project.exportSettings);
    console.log("_initializeCapturer result:", initializedSuccessfully, "Current capturer:", capturer);

    if (!initializedSuccessfully || !capturer) { // تحقق إضافي من capturer هنا
      _handleCriticalError('فشل تهيئة مسجل الفيديو بشكل كامل.'); // رسالة أكثر وضوحًا
      return false;
    }

    // ... (الكود السابق) ...
    try {
      console.log("Attempting to call capturer.start(). Capturer object:", capturer);
      capturer.start(); // <-- هنا يحدث الخطأ
    } catch (e) {
      console.error("Error calling capturer.start():", e, "Capturer was:", capturer);
      _handleCriticalError('فشل استدعاء دالة بدء التسجيل.', e);
      _cleanup();
      return false;
    }
    // ... (الكود السابق) ...
  }

  // ... (rest of the module)
})();
// ... (export function)
