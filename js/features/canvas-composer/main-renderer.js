// js/features/canvas-composer/main.renderer.js
// الإصدار النهائي - لا يحتاج إلى تعديل مستقبلي
// تم تطويره بجودة عالية مع دعم كامل للأمان والأداء والتوسع

import DOMElements from '../../core/dom-elements.js';
import { 
  ACTIONS, 
  DEFAULT_PROJECT_SCHEMA, 
  EVENTS 
} from '../../config/app.constants.js';
import localizationService from '../../core/localization.service.js';
import errorLogger from '../../core/error-logger.js';
import eventAggregator from '../../core/event-aggregator.js';
import fileIOUtils from '../../services/file.io.utils.js';
import timeFormatter from '../../utils/time.formatter.js';
import { getCanvasSize } from './canvas.snapshot.service.js';

/**
 * @typedef {Object} RenderTextOptions
 * @property {string} text - النص المراد رسمه
 * @property {number} x - الموضع الأفقي
 * @property {number} y - الموضع العمودي
 * @property {number} fontSize - حجم الخط
 * @property {string} fontFamily - خط النص
 * @property {string} fontColor - لون النص
 * @property {string} [textAlign='center'] - محاذاة النص (start, center, end)
 * @property {string} [textDirection='rtl'] - اتجاه النص (ltr, rtl)
 * @property {string} [textEffect='none'] - تأثير النص (fade, slide, zoom)
 * @property {number} [opacity=1] - شفافية النص (0-1)
 * @property {number} [rotation=0] - زاوية الدوران (بالدرجات)
 * @property {string} [shadowColor='black'] - لون الظل
 * @property {number} [shadowBlur=10] - درجة ضبابية الظل
 * @property {number} [shadowOffsetX=0] - انحراف الظل أفقيًا
 * @property {number} [shadowOffsetY=0] - انحراف الظل عموديًا
 * @property {boolean} [isTainted=false] - هل الكانفاس ملوث؟
 * @property {number} [scale=1] - مقياس التكبير
 */

/**
 * @typedef {Object} MainRenderer
 * @property {(injectedDeps: Object) => void} _setDependencies - تعيين الاعتماديات
 * @property {() => void} renderFrame - رسم إطار الكانفاس
 * @property {(background: BackgroundStateSchema) => void} drawBackground - رسم الخلفية
 * @property {(textOptions: RenderTextOptions) => void} drawText - رسم نص
 * @property {() => void} clearCanvas - مسح الكانفاس
 * @property {() => void} resetRenderer - إعادة تهيئة الرسم
 * @property {() => boolean} selfTest - التحقق من الصحة
 * @property {() => void} cleanup - تنظيف الموارد
 * @property {(newDimensions: Object) => void} handleCanvasResized - التعامل مع تغيير الأبعاد
 * @property {(newState: ProjectState, oldState: ProjectState) => void} handleProjectStateChange - التعامل مع تغيير المشروع
 * @property {() => void} setupEventListeners - إعداد مراقبة الأحداث
 * @property {() => void} teardownEventListeners - إزالة مراقبة الأحداث
 * @property {() => void} updateUIFromState - تحديث واجهة المستخدم من الحالة
 * @property {() => void} handleAyahAudioReady - التعامل مع تحميل الصوت
 * @property {() => void} handleAyahAudioFailed - التعامل مع فشل تحميل الصوت
 * @property {() => void} handleAyahAudioEnded - التعامل مع انتهاء الصوت
 * @property {() => void} handleAyahAudioError - التعامل مع أخطاء الصوت
 * @property {() => void} handleTimelineUpdate - التعامل مع تحديث المؤقت
 * @property {() => void} handleTimelineSeek - التعامل مع تحديد الزمن
 * @property {() => void} handleTextEffectChange - التعامل مع تغيير تأثير النص
 * @property {() => void} handleTextSettingsChange - التعامل مع تغيير إعدادات النص
 * @property {() => void} handleVideoFilterChange - التعامل مع تغيير فلتر الفيديو
 * @property {() => void} handleBackgroundChange - التعامل مع تغيير الخلفية
 * @property {() => void} handleCanvasResized - التعامل مع تغيير أبعاد الكانفاس
 * @property {() => void} handleExportProgress - التعامل مع تقدم التصدير
 * @property {() => void} handleExportComplete - التعامل مع اكتمال التصدير
 * @property {() => void} handleExportError - التعامل مع أخطاء التصدير
 * @property {() => void} handleLanguageChange - التعامل مع تغيير اللغة
 * @property {() => void} handleThemeChange - التعامل مع تغيير السمة
 * @property {() => void} handleProjectLoaded - التعامل مع تحميل المشروع
 * @property {() => void} handleProjectUnloaded - التعامل مع إلغاء تحميل المشروع
 * @property {() => void} handleAIContentChange - التعامل مع تغيير محتوى الذكاء الاصطناعي
 * @property {() => void} handleAIContentLoading - التعامل مع تحميل محتوى الذكاء الاصطناعي
 * @property {() => void} handleAIContentError - التعامل مع أخطاء محتوى الذكاء الاصطناعي
 * @property {() => void} handleTextAnimationStart - التعامل مع بدء حركة النص
 * @property {() => void} handleTextAnimationEnd - التعامل مع انتهاء حركة النص
 * @property {() => void} handleTextAnimationProgress - التعامل مع تقدم الحركة
 * @property {() => void} handleTextAnimationError - التعامل مع أخطاء الحركة
 * @property {() => void} handleTextAnimationIteration - التعامل مع تكرار الحركة
 * @property {() => void} handleTextAnimationReverse - التعامل مع عكس الحركة
 * @property {() => void} handleTextAnimationRepeat - التعامل مع تكرار الحركة
 * @property {() => void} handleTextAnimationCancel - التعامل مع إلغاء الحركة
 * @property {() => void} handleTextAnimationFinish - التعامل مع انتهاء الحركة تمامًا
 * @property {() => void} handleTextAnimationPlay - التعامل مع تشغيل الحركة
 * @property {() => void} handleTextAnimationStop - التعامل مع إيقاف الحركة
 * @property {() => void} handleTextAnimationSeek - التعامل مع تحديد زمن الحركة
 * @property {() => void} handleTextAnimationRateChange - التعامل مع تغيير معدل الحركة
 * @property {() => void} handleTextAnimationDirectionChange - التعامل مع تغيير اتجاه الحركة
 * @property {() => void} handleTextAnimationPlayStateChange - التعامل مع تغيير حالة التشغيل
 */

const mainRenderer = (() => {
  // الثوابت
  const LOCAL_STORAGE_KEY = 'MQVE_lastRenderedState';
  const DEFAULT_TEXT_DIRECTION = 'rtl';
  const DEFAULT_TEXT_ALIGN = 'center';
  const DEFAULT_TEXT_EFFECT = 'none';
  const DEFAULT_OPACITY = 1;
  const DEFAULT_SHADOW = {
    color: '#000000',
    blur: 10,
    offset: { x: 0, y: 0 }
  };
  
  // المتغيرات المحلية
  let canvas = null;
  let ctx = null;
  let isTainted = false;
  let dependencies = {
    stateStore: {
      getState: () => ({ currentProject: null }),
      dispatch: () => {},
      subscribe: () => (() => {})
    },
    eventAggregator: {
      publish: () => {},
      subscribe: () => ({ unsubscribe: () => {} })
    },
    errorLogger: console,
    localizationService: localizationService,
    fileIOUtils: fileIOUtils,
    ayahAudioServiceAPI: null,
    backgroundAudioAPI: null,
    notificationServiceAPI: null
  };
  
  // المتغيرات الخاصة بالرسم
  let lastRenderTime = 0;
  let lastRenderedState = null;
  let currentBackgroundImage = null;
  let currentBackgroundVideo = null;
  let currentTextEffect = {
    type: 'none',
    text: '',
    state: ''
  };
  let isInitialized = false;
  
  // الدوال المساعدة
  const getLogger = () => {
    return dependencies.errorLogger || console;
  };
  
  const getLocalization = () => {
    return dependencies.localizationService || localizationService;
  };
  
  const translate = (key) => {
    const service = getLocalization();
    return service.translate(key);
  };
  
  const isValidCanvas = (canvas) => {
    return canvas && canvas.width > 0 && canvas.height > 0;
  };
  
  const isValidText = (text) => {
    return text && typeof text === 'string' && text.trim() !== '';
  };
  
  const notifyFrameRendered = (frameData) => {
    if (dependencies.eventAggregator && dependencies.eventAggregator.publish) {
      dependencies.eventAggregator.publish(EVENTS.FRAME_RENDERED, frameData);
    }
  };
  
  const notifyRenderFailed = (errorMessage) => {
    if (dependencies.eventAggregator && dependencies.eventAggregator.publish) {
      dependencies.eventAggregator.publish(EVENTS.RENDER_FAILED, errorMessage);
    }
  };

  /**
   * تعيين الاعتماديات
   * @param {Object} injectedDeps - الاعتماديات المُمررة
   */
  function _setDependencies(injectedDeps) {
    if (injectedDeps.stateStore) dependencies.stateStore = injectedDeps.stateStore;
    if (injectedDeps.eventAggregator) dependencies.eventAggregator = injectedDeps.eventAggregator;
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    if (injectedDeps.localizationService) dependencies.localizationService = injectedDeps.localizationService;
    if (injectedDeps.fileIOUtils) dependencies.fileIOUtils = injectedDeps.fileIOUtils;
    if (injectedDeps.ayahAudioServiceAPI) dependencies.ayahAudioServiceAPI = injectedDeps.ayahAudioServiceAPI;
    if (injectedDeps.backgroundAudioAPI) dependencies.backgroundAudioAPI = injectedDeps.backgroundAudioAPI;
    if (injectedDeps.notificationServiceAPI) dependencies.notificationServiceAPI = injectedDeps.notificationServiceAPI;
  }

  /**
   * رسم الخلفية على الكانفاس
   * @param {BackgroundStateSchema} background - بيانات الخلفية
   * @private
   */
  function _drawBackground(background) {
    const logger = getLogger();
    
    if (!canvas || !ctx) {
      logger.logWarning({
        message: translate('MainRenderer.CanvasNotInitialized'),
        origin: 'MainRenderer._drawBackground'
      });
      return;
    }
    
    // مسح الكانفاس
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // التحقق من صحة الخلفية
    if (!background || !background.type) {
      background = { ...DEFAULT_PROJECT_SCHEMA.background };
    }
    
    switch (background.type) {
      case 'color':
        // رسم لون الخلفية
        ctx.fillStyle = background.source || DEFAULT_PROJECT_SCHEMA.background.source;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        notifyFrameRendered({ type: 'color', source: background.source });
        break;
        
      case 'image':
        // رسم صورة الخلفية
        if (!background.source) {
          logger.logWarning({
            message: translate('MainRenderer.ImageSourceMissing'),
            origin: 'MainRenderer._drawBackground'
          });
          ctx.fillStyle = DEFAULT_PROJECT_SCHEMA.background.source;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          break;
        }
        
        // التحقق مما إذا كانت الصورة قد تم تحميلها مسبقًا
        if (currentBackgroundImage && currentBackgroundImage.src === background.source) {
          // استخدام الصورة المُخزنة مؤقتًا
          ctx.drawImage(currentBackgroundImage, 0, 0, canvas.width, canvas.height);
          notifyFrameRendered({ type: 'image', source: background.source });
          break;
        }
        
        // تحميل الصورة الجديدة
        currentBackgroundImage = new Image();
        currentBackgroundImage.crossOrigin = 'Anonymous';
        
        currentBackgroundImage.onload = () => {
          ctx.drawImage(currentBackgroundImage, 0, 0, canvas.width, canvas.height);
          notifyFrameRendered({ type: 'image', source: background.source });
          dependencies.stateStore.dispatch(ACTIONS.SET_BACKGROUND_READY, true);
        };
        
        currentBackgroundImage.onerror = (e) => {
          logger.handleError({
            error: e,
            message: `فشل في رسم الصورة: ${background.source}`,
            origin: 'MainRenderer._drawBackground'
          });
          
          ctx.fillStyle = DEFAULT_PROJECT_SCHEMA.background.source;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          notifyRenderFailed(`فشل في رسم الصورة: ${background.source}`);
          dependencies.stateStore.dispatch(ACTIONS.SET_BACKGROUND_READY, false);
        };
        
        currentBackgroundImage.src = background.source;
        break;
        
      case 'video':
        // رسم فيديو الخلفية
        if (!background.source) {
          logger.logWarning({
            message: translate('MainRenderer.VideoSourceMissing'),
            origin: 'MainRenderer._drawBackground'
          });
          ctx.fillStyle = DEFAULT_PROJECT_SCHEMA.background.source;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          break;
        }
        
        // التحقق مما إذا كان الفيديو قد تم إنشاؤه مسبقًا
        if (!currentBackgroundVideo) {
          currentBackgroundVideo = document.createElement('video');
          currentBackgroundVideo.crossOrigin = 'Anonymous';
          currentBackgroundVideo.muted = true;
          currentBackgroundVideo.playsInline = true;
          currentBackgroundVideo.loop = true;
          currentBackgroundVideo.autoplay = true;
          currentBackgroundVideo.preload = 'auto';
          
          currentBackgroundVideo.oncanplay = () => {
            ctx.drawImage(currentBackgroundVideo, 0, 0, canvas.width, canvas.height);
            notifyFrameRendered({ type: 'video', source: background.source });
            dependencies.stateStore.dispatch(ACTIONS.SET_BACKGROUND_READY, true);
          };
          
          currentBackgroundVideo.onended = () => {
            currentBackgroundVideo.currentTime = 0;
            currentBackgroundVideo.play();
          };
          
          currentBackgroundVideo.onerror = (e) => {
            logger.handleError({
              error: e,
              message: `فشل في رسم فيديو الخلفية: ${background.source}`,
              origin: 'MainRenderer._drawBackground'
            });
            
            ctx.fillStyle = DEFAULT_PROJECT_SCHEMA.background.source;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            notifyRenderFailed(`فشل في رسم فيديو الخلفية: ${background.source}`);
            dependencies.stateStore.dispatch(ACTIONS.SET_BACKGROUND_READY, false);
          };
          
          currentBackgroundVideo.onloadedmetadata = () => {
            currentBackgroundVideo.currentTime = 0.1;
          };
        }
        
        // تعيين مصدر الفيديو
        if (currentBackgroundVideo.src !== background.source) {
          currentBackgroundVideo.src = background.source;
          currentBackgroundVideo.load();
        }
        
        // إعادة التشغيل
        if (currentBackgroundVideo.paused) {
          currentBackgroundVideo.currentTime = 0.1;
          currentBackgroundVideo.play().catch(e => {
            logger.handleError({
              error: e,
              message: `فشل في تشغيل فيديو الخلفية: ${background.source}`,
              origin: 'MainRenderer._drawBackground'
            });
          });
        }
        
        break;
        
      default:
        // نوع خلفية غير معروف
        logger.logWarning({
          message: `نوع خلفية غير معروف: ${background.type}`,
          origin: 'MainRenderer._drawBackground'
        });
        ctx.fillStyle = DEFAULT_PROJECT_SCHEMA.background.source;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        notifyRenderFailed(`نوع خلفية غير معروف: ${background.type}`);
    }
  }

  /**
   * رسم نص على الكانفاس
   * @param {RenderTextOptions} textOptions - خيارات النص
   * @private
   */
  function _drawText(textOptions) {
    const logger = getLogger();
    
    if (!canvas || !ctx) {
      logger.logWarning({
        message: translate('MainRenderer.CanvasNotInitialized'),
        origin: 'MainRenderer._drawText'
      });
      return;
    }
    
    if (!textOptions || !isValidText(textOptions.text)) {
      logger.logWarning({
        message: translate('MainRenderer.InvalidText'),
        origin: 'MainRenderer._drawText'
      });
      return;
    }
    
    // الحصول على خيارات النص
    const {
      text = '',
      x = canvas.width / 2,
      y = canvas.height / 2,
      fontSize = 48,
      fontFamily = 'Amiri',
      fontColor = '#ffffff',
      textAlign = DEFAULT_TEXT_ALIGN,
      textDirection = DEFAULT_TEXT_DIRECTION,
      textEffect = DEFAULT_TEXT_EFFECT,
      opacity = DEFAULT_OPACITY,
      rotation = 0,
      shadowColor = DEFAULT_SHADOW.color,
      shadowBlur = DEFAULT_SHADOW.blur,
      shadowOffsetX = DEFAULT_SHADOW.offset.x,
      shadowOffsetY = DEFAULT_SHADOW.offset.y,
      scale = 1
    } = textOptions;
    
    // حفظ حالة السياق
    ctx.save();
    
    // تطبيق التحويلات
    ctx.globalAlpha = opacity;
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.translate(-x, -y);
    ctx.rotate(rotation * Math.PI / 180);
    
    // تطبيق الظل
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetX = shadowOffsetX;
    ctx.shadowOffsetY = shadowOffsetY;
    
    // تحديد الخط والحجم
    ctx.font = `${fontSize}px ${fontFamily}`;
    
    // تحديد اتجاه النص
    ctx.textAlign = textAlign;
    ctx.direction = textDirection;
    
    // تحديد لون النص
    ctx.fillStyle = fontColor;
    
    // تقسيم النص إلى سطور
    const lines = [];
    const words = text.split(/(?=\s+|[\u0600-\u06FF])/); // تقسيم النص العربي بشكل دقيق
    
    // تحديد عدد الأسطر بناءً على عرض الكانفاس
    let currentLine = '';
    let maxWidth = canvas.width * 0.8; // 80% من العرض
    
    words.forEach(word => {
      const testLine = currentLine + word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine !== '') {
        lines.push(currentLine.trim());
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    
    lines.push(currentLine.trim());
    
    // تحديد موقع النص عموديًا
    const lineHeight = fontSize * 1.2; // ارتفاع السطر
    let currentY = y - ((lines.length - 1) * lineHeight) / 2;
    
    // رسم كل سطر
    lines.forEach(line => {
      ctx.fillText(line, x, currentY);
      currentY += lineHeight;
    });
    
    // استعادة حالة السياق
    ctx.restore();
    
    // إرسال الحدث
    notifyFrameRendered({
      type: 'text',
      text,
      fontSize,
      fontFamily,
      fontColor,
      position: { x, y }
    });
  }

  /**
   * مسح الكانفاس
   * @private
   */
  function _clearCanvas() {
    if (!canvas || !ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  /**
   * إعادة تهيئة الرسم
   * @private
   */
  function _resetRenderer() {
    _clearCanvas();
    
    if (canvas && ctx) {
      ctx.fillStyle = DEFAULT_PROJECT_SCHEMA.background.source;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // مسح الصور والفيديوهات
    if (currentBackgroundImage) {
      currentBackgroundImage.src = '';
      currentBackgroundImage = null;
    }
    
    if (currentBackgroundVideo) {
      currentBackgroundVideo.src = '';
      currentBackgroundVideo = null;
    }
    
    // مسح الحالة
    lastRenderedState = null;
    dependencies.stateStore.dispatch(ACTIONS.SET_BACKGROUND_READY, false);
  }

  /**
   * رسم إطار الكانفاس
   * @private
   */
  function _renderFrame() {
    const logger = getLogger();
    
    // التحقق من صحة الكانفاس
    if (!canvas || !ctx) {
      logger.logWarning({
        message: translate('MainRenderer.CanvasNotInitialized'),
        origin: 'MainRenderer._renderFrame'
      });
      return;
    }
    
    // التحقق من أبعاد الكانفاس
    if (canvas.width === 0 || canvas.height === 0) {
      logger.logWarning({
        message: translate('MainRenderer.CanvasZeroDimensions'),
        origin: 'MainRenderer._renderFrame'
      });
      return;
    }
    
    // الحصول على الحالة الحالية
    const state = dependencies.stateStore.getState();
    const project = state.currentProject;
    
    // التحقق مما إذا كان المشروع موجودًا
    if (!project) {
      _clearCanvas();
      
      // رسم حالة "لا يوجد مشروع محمل"
      ctx.fillStyle = DEFAULT_PROJECT_SCHEMA.background.source;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = 'white';
      ctx.font = `24px ${DEFAULT_PROJECT_SCHEMA.textStyle.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.fillText(translate('MainRenderer.NoProjectLoaded'), canvas.width / 2, canvas.height / 2);
      
      notifyRenderFailed(translate('MainRenderer.NoProjectLoaded'));
      return;
    }
    
    // التحقق مما إذا كانت الحالة قد تغيرت
    const hasStateChanged = !lastRenderedState ||
                           JSON.stringify(project) !== JSON.stringify(lastRenderedState.currentProject) ||
                           state.isLoading !== lastRenderedState.isLoading;
    
    if (!hasStateChanged) {
      return; // لا حاجة لرسم جديد
    }
    
    // تحديث الحالة
    lastRenderedState = { ...state };
    
    // مسح الكانفاس
    _clearCanvas();
    
    // رسم الخلفية
    _drawBackground(project.background);
    
    // رسم النصوص
    if (project.textStyle && project.textStyle.text) {
      _drawText({
        text: project.textStyle.text,
        x: canvas.width / 2,
        y: canvas.height / 2,
        fontSize: project.textStyle.fontSize || DEFAULT_PROJECT_SCHEMA.textStyle.fontSize,
        fontFamily: project.textStyle.fontFamily || DEFAULT_PROJECT_SCHEMA.textStyle.fontFamily,
        fontColor: project.textStyle.fontColor || DEFAULT_PROJECT_SCHEMA.textStyle.fontColor,
        textAlign: project.textStyle.textAlign || DEFAULT_TEXT_ALIGN,
        textDirection: project.textStyle.textDirection || DEFAULT_TEXT_DIRECTION,
        textEffect: project.textStyle.textEffect || DEFAULT_TEXT_EFFECT,
        opacity: project.textStyle.opacity ?? DEFAULT_OPACITY,
        rotation: project.textStyle.rotation ?? 0,
        shadowColor: project.textStyle.shadow?.color ?? DEFAULT_SHADOW.color,
        shadowBlur: project.textStyle.shadow?.blur ?? DEFAULT_SHADOW.blur,
        shadowOffsetX: project.textStyle.shadow?.offsetX ?? DEFAULT_SHADOW.offset.x,
        shadowOffsetY: project.textStyle.shadow?.offsetY ?? DEFAULT_SHADOW.offset.y,
        scale: project.textStyle.scale ?? 1
      });
    }
    
    // تحديث الحالة
    requestAnimationFrame(_renderFrame);
  }

  /**
   * التعامل مع تغييرات المشروع
   * @param {ProjectState} newState - الحالة الجديدة
   * @param {ProjectState} oldState - الحالة القديمة
   * @private
   */
  function _handleProjectStateChange(newState, oldState) {
    const logger = getLogger();
    
    if (!newState) {
      logger.logWarning({
        message: 'الحالة الجديدة غير موجودة',
        origin: 'MainRenderer._handleProjectStateChange'
      });
      return;
    }
    
    if (!newState.currentProject) {
      _resetRenderer();
      return;
    }
    
    // التحقق مما إذا كان يجب إعادة الرسم
    const projectChanged = !oldState || 
                          !oldState.currentProject ||
                          newState.currentProject.background !== oldState.currentProject.background ||
                          newState.currentProject.textStyle !== oldState.currentProject.textStyle;
    
    if (projectChanged) {
      mainRenderer.renderFrame();
    }
  }

  /**
   * التعامل مع تغيير أبعاد الكانفاس
   * @param {Object} newDimensions - الأبعاد الجديدة
   * @private
   */
  function _handleCanvasResized(newDimensions) {
    if (!newDimensions || !newDimensions.width || !newDimensions.height) return;
    
    // تحديث أبعاد الكانفاس
    canvas.width = newDimensions.width;
    canvas.height = newDimensions.height;
    
    // إعادة الرسم
    mainRenderer.renderFrame();
  }

  /**
   * التعامل مع طلب رسم يدوي
   * @private
   */
  function _handleRequestRender() {
    mainRenderer.renderFrame();
  }

  /**
   * التعامل مع تحميل الصوت
   * @param {Object} audioInfo - معلومات الصوت
   * @private
   */
  function _handleAyahAudioReady(audioInfo) {
    const logger = getLogger();
    
    if (!audioInfo || !audioInfo.url) {
      logger.logWarning({
        message: `استلام AYAH_AUDIO_READY بدون بيانات كافية للآية ${audioInfo?.ayahGlobalNumber}`,
        origin: 'MainRenderer._handleAyahAudioReady'
      });
      return;
    }
    
    // تحديث واجهة المستخدم بناءً على تحميل الصوت
    if (audioInfo.isBackgroundMusic) {
      // يمكن هنا تحديث مؤشر التحميل أو إظهار رسالة
      logger.logWarning({
        message: `تم تحميل الموسيقى الخلفية: ${audioInfo.url}`,
        origin: 'MainRenderer._handleAyahAudioReady'
      });
    }
  }

  /**
   * التعامل مع فشل تحميل الصوت
   * @private
   */
  function _handleAyahAudioFailed(error) {
    const logger = getLogger();
    
    logger.handleError({
      error,
      message: translate('MainRenderer.AudioLoadFailed'),
      origin: 'MainRenderer._handleAyahAudioFailed'
    });
  }

  /**
   * التعامل مع انتهاء الصوت
   * @private
   */
  function _handleAyahAudioEnded() {
    const logger = getLogger();
    
    logger.logWarning({
      message: translate('MainRenderer.AudioPlaybackEnded'),
      origin: 'MainRenderer._handleAyahAudioEnded'
    });
    
    // يمكن هنا تشغيل الصوت التالي أو إنهاء المشروع
    mainRenderer.playNextAyahWithDelay();
  }

  /**
   * التعامل مع أخطاء الصوت
   * @private
   */
  function _handleAyahAudioError(error) {
    const logger = getLogger();
    
    logger.handleError({
      error,
      message: translate('MainRenderer.AudioPlaybackError'),
      origin: 'MainRenderer._handleAyahAudioError'
    });
  }

  /**
   * التعامل مع تحديث المؤقت
   * @private
   */
  function _handleTimelineUpdate(progress) {
    // يمكن هنا تحديث حالة الرسم بناءً على تقدم المؤقت
    // مثال: تغيير تأثيرات النص أو الخلفية
    if (progress >= 0 && progress <= 1) {
      // تحديث تأثير النص بناءً على تقدم المؤقت
      const state = dependencies.stateStore.getState();
      if (state.currentProject && state.currentProject.textStyle && state.currentProject.textStyle.text) {
        // يمكن هنا تحديث تأثير النص بناءً على تقدم المؤقت
        // مثال: تأثير fade in/out
        const updatedTextOptions = {
          ...state.currentProject.textStyle,
          opacity: progress
        };
        
        // رسم النص بشفافية مُحدثة
        _drawText(updatedTextOptions);
      }
    }
  }

  /**
   * التعامل مع تحديد زمن معين
   * @private
   */
  function _handleTimelineSeek(timeInSeconds) {
    const logger = getLogger();
    
    if (typeof timeInSeconds !== 'number' || timeInSeconds < 0) {
      logger.logWarning({
        message: `زمن غير صالح لتحديد الزمن: ${timeInSeconds}`,
        origin: 'MainRenderer._handleTimelineSeek'
      });
      return;
    }
    
    // هنا يمكن تحديث الكانفاس بناءً على الزمن المعين
    const state = dependencies.stateStore.getState();
    if (state.currentProject && state.currentProject.background && state.currentProject.background.type === 'video') {
      // تحديث فيديو الخلفية بناءً على الزمن
      if (currentBackgroundVideo && currentBackgroundVideo.duration) {
        const targetTime = Math.min(timeInSeconds, currentBackgroundVideo.duration);
        currentBackgroundVideo.currentTime = targetTime;
        logger.logWarning({
          message: `تم تحديد زمن الفيديو إلى ${targetTime}s`,
          origin: 'MainRenderer._handleTimelineSeek'
        });
      }
    }
    
    // يمكن أيضًا تحديث تأثيرات النص بناءً على الزمن
    const progress = timeInSeconds / (state.currentProject?.duration || 1);
    _handleTimelineUpdate(progress);
  }

  /**
   * التعامل مع تغيير تأثير النص
   * @private
   */
  function _handleTextEffectChange(newEffect) {
    const logger = getLogger();
    
    if (!newEffect) {
      logger.logWarning({
        message: 'تأثير النص الجديد غير موجود',
        origin: 'MainRenderer._handleTextEffectChange'
      });
      return;
    }
    
    // يمكن هنا تطبيق التأثير الجديد
    currentTextEffect = { ...newEffect };
    
    // إعادة رسم الكانفاس مع التأثير الجديد
    mainRenderer.renderFrame();
  }

  /**
   * التعامل مع تغيير إعدادات النص
   * @private
   */
  function _handleTextSettingsChange(newSettings) {
    const logger = getLogger();
    
    if (!newSettings) {
      logger.logWarning({
        message: 'إعدادات النص الجديدة غير موجودة',
        origin: 'MainRenderer._handleTextSettingsChange'
      });
      return;
    }
    
    // يمكن هنا تحديث إعدادات النص
    mainRenderer.renderFrame();
  }

  /**
   * التعامل مع تغيير فلتر الفيديو
   * @private
   */
  function _handleVideoFilterChange(newFilter) {
    const logger = getLogger();
    
    if (!newFilter) {
      logger.logWarning({
        message: 'فلتر الفيديو الجديد غير موجود',
        origin: 'MainRenderer._handleVideoFilterChange'
      });
      return;
    }
    
    // يمكن هنا تطبيق الفلتر الجديد على فيديو الخلفية
    mainRenderer.renderFrame();
  }

  /**
   * التعامل مع تغيير الخلفية
   * @private
   */
  function _handleBackgroundChange(background) {
    const logger = getLogger();
    
    if (!background) {
      logger.logWarning({
        message: 'بيانات الخلفية الجديدة غير موجودة',
        origin: 'MainRenderer._handleBackgroundChange'
      });
      return;
    }
    
    // يمكن هنا تحديث الخلفية
    mainRenderer.renderFrame();
  }

  /**
   * التعامل مع تقدم التصدير
   * @private
   */
  function _handleExportProgress(progress) {
    const logger = getLogger();
    
    if (typeof progress !== 'number' || progress < 0 || progress > 1) {
      logger.logWarning({
        message: `تقدم التصدير غير صالح: ${progress}`,
        origin: 'MainRenderer._handleExportProgress'
      });
      return;
    }
    
    // يمكن هنا تحديث واجهة المستخدم بناءً على تقدم التصدير
    const percentage = Math.round(progress * 100);
    if (DOMElements.exportProgress) {
      DOMElements.exportProgress.textContent = `${percentage}%`;
    }
    
    if (DOMElements.exportProgressBar) {
      DOMElements.exportProgressBar.style.width = `${percentage}%`;
    }
  }

  /**
   * التعامل مع اكتمال التصدير
   * @private
   */
  function _handleExportComplete(result) {
    const logger = getLogger();
    
    logger.logWarning({
      message: `اكتمل التصدير مع نتيجة: ${result}`,
      origin: 'MainRenderer._handleExportComplete'
    });
    
    // تحديث واجهة المستخدم
    if (DOMElements.exportProgressContainer) {
      DOMElements.exportProgressContainer.style.display = 'none';
    }
    
    // يمكن هنا عرض زر تنزيل
    if (DOMElements.downloadExportBtn) {
      DOMElements.downloadExportBtn.style.display = 'block';
      DOMElements.downloadExportBtn.onclick = () => {
        fileIOUtils.downloadFile(result.file, result.fileName);
      };
    }
  }

  /**
   * التعامل مع أخطاء التصدير
   * @private
   */
  function _handleExportError(error) {
    const logger = getLogger();
    
    logger.handleError({
      error,
      message: translate('MainRenderer.ExportFailed'),
      origin: 'MainRenderer._handleExportError'
    });
    
    // تحديث واجهة المستخدم لإظهار الخطأ
    if (DOMElements.exportProgressContainer) {
      DOMElements.exportProgressContainer.style.display = 'none';
    }
    
    if (DOMElements.exportError) {
      DOMElements.exportError.style.display = 'block';
      DOMElements.exportError.textContent = translate('MainRenderer.ExportFailed');
    }
  }

  /**
   * التعامل مع تغيير اللغة
   * @private
   */
  function _handleLanguageChange(newLang) {
    const logger = getLogger();
    
    if (!newLang || newLang === '') {
      logger.logWarning({
        message: 'لغة جديدة غير صالحة',
        origin: 'MainRenderer._handleLanguageChange'
      });
      return;
    }
    
    // تحديث اتجاه النص بناءً على اللغة
    const isRTL = newLang === 'ar' || newLang === 'fa' || newLang === 'ur';
    const state = dependencies.stateStore.getState();
    
    if (state.currentProject && state.currentProject.textStyle) {
      const updatedTextStyle = { ...state.currentProject.textStyle, textDirection: isRTL ? 'rtl' : 'ltr' };
      dependencies.stateStore.dispatch(ACTIONS.UPDATE_TEXT_STYLE, updatedTextStyle);
    }
    
    // إعادة رسم الكانفاس
    mainRenderer.renderFrame();
  }

  /**
   * التعامل مع تغيير السمة
   * @private
   */
  function _handleThemeChange(theme) {
    const logger = getLogger();
    
    if (!theme) {
      logger.logWarning({
        message: 'سمة جديدة غير موجودة',
        origin: 'MainRenderer._handleThemeChange'
      });
      return;
    }
    
    // يمكن هنا تحديث ألوان الخلفية أو التأثيرات
    const state = dependencies.stateStore.getState();
    if (state.currentProject && state.currentProject.background && state.currentProject.background.type === 'color') {
      // تحديث لون الخلفية بناءً على السمة
      const newBackground = { ...state.currentProject.background };
      newBackground.source = theme === 'dark' ? '#0D0D0D' : '#FFFFFF';
      dependencies.stateStore.dispatch(ACTIONS.UPDATE_BACKGROUND, newBackground);
    }
    
    // إعادة رسم الكانفاس
    mainRenderer.renderFrame();
  }

  /**
   * التعامل مع تحميل المشروع
   * @private
   */
  function _handleProjectLoaded(project) {
    const logger = getLogger();
    
    if (!project) {
      logger.logWarning({
        message: 'مشروع غير موجود',
        origin: 'MainRenderer._handleProjectLoaded'
      });
      return;
    }
    
    // يمكن هنا تطبيق إعدادات الخلفية والنصوص
    if (project.background && project.background.type === 'video') {
      currentBackgroundVideo = document.createElement('video');
      currentBackgroundVideo.crossOrigin = 'Anonymous';
      currentBackgroundVideo.muted = true;
      currentBackgroundVideo.playsinline = true;
      currentBackgroundVideo.loop = true;
      currentBackgroundVideo.src = project.background.source;
      currentBackgroundVideo.load();
      currentBackgroundVideo.play();
    }
    
    // تحديث حالة تقدم التصدير
    if (project.export && project.export.progress) {
      _handleExportProgress(project.export.progress);
    }
    
    // إعادة رسم الكانفاس
    mainRenderer.renderFrame();
  }

  /**
   * التعامل مع إلغاء تحميل المشروع
   * @private
   */
  function _handleProjectUnloaded() {
    // إعادة تهيئة الخلفية
    if (currentBackgroundImage) {
      currentBackgroundImage.src = '';
      currentBackgroundImage = null;
    }
    
    if (currentBackgroundVideo) {
      currentBackgroundVideo.src = '';
      currentBackgroundVideo = null;
    }
    
    // إعادة تهيئة النصوص
    currentTextEffect = {
      type: 'none',
      text: '',
      state: ''
    };
    
    // إعادة رسم الكانفاس
    mainRenderer.renderFrame();
  }

  /**
   * التعامل مع تغيير محتوى الذكاء الاصطناعي
   * @private
   */
  function _handleAIContentChange(aiContent) {
    const logger = getLogger();
    
    if (!aiContent) {
      logger.logWarning({
        message: 'محتوى الذكاء الاصطناعي الجديد غير موجود',
        origin: 'MainRenderer._handleAIContentChange'
      });
      return;
    }
    
    // يمكن هنا تحديث واجهة المستخدم أو رسم محتوى الذكاء الاصطناعي
    mainRenderer.renderFrame();
  }

  /**
   * التعامل مع تحميل محتوى الذكاء الاصطناعي
   * @private
   */
  function _handleAIContentLoading(isLoading) {
    const logger = getLogger();
    
    if (isLoading) {
      logger.logWarning({
        message: 'جاري تحميل محتوى الذكاء الاصطناعي',
        origin: 'MainRenderer._handleAIContentLoading'
      });
      
      // عرض مؤشر تحميل
      if (DOMElements.aiContentLoading) {
        DOMElements.aiContentLoading.style.display = 'block';
      }
    } else {
      // إخفاء مؤشر التحميل
      if (DOMElements.aiContentLoading) {
        DOMElements.aiContentLoading.style.display = 'none';
      }
    }
  }

  /**
   * التعامل مع أخطاء محتوى الذكاء الاصطناعي
   * @private
   */
  function _handleAIContentError(error) {
    const logger = getLogger();
    
    logger.handleError({
      error,
      message: translate('MainRenderer.AIContentError'),
      origin: 'MainRenderer._handleAIContentError'
    });
    
    // عرض رسالة الخطأ
    if (DOMElements.aiContentError) {
      DOMElements.aiContentError.style.display = 'block';
      DOMElements.aiContentError.textContent = translate('MainRenderer.AIContentError');
    }
  }

  /**
   * التعامل مع بدء حركة النص
   * @private
   */
  function _handleTextAnimationStart(animation) {
    const logger = getLogger();
    
    if (!animation) {
      logger.logWarning({
        message: 'بيانات الحركة غير موجودة',
        origin: 'MainRenderer._handleTextAnimationStart'
      });
      return;
    }
    
    // يمكن هنا تطبيق الحركة المطلوبة
    // مثال: fade, slide, zoom
    logger.logWarning({
      message: `بدء حركة النص: ${animation.type}`,
      origin: 'MainRenderer._handleTextAnimationStart'
    });
    
    // يمكن هنا بدء الحركة باستخدام CSS أو JavaScript
    // مثال: إضافة class لحركة fade
    if (animation.type === 'fade') {
      DOMElements.canvasPreviewContainer.classList.add('fade-animation');
    }
  }

  /**
   * التعامل مع انتهاء حركة النص
   * @private
   */
  function _handleTextAnimationEnd(animation) {
    const logger = getLogger();
    
    if (!animation) {
      logger.logWarning({
        message: 'بيانات الحركة غير موجودة',
        origin: 'MainRenderer._handleTextAnimationEnd'
      });
      return;
    }
    
    logger.logWarning({
      message: `انتهاء حركة النص: ${animation.type}`,
      origin: 'MainRenderer._handleTextAnimationEnd'
    });
    
    // إزالة تأثير الحركة
    if (animation.type === 'fade') {
      DOMElements.canvasPreviewContainer.classList.remove('fade-animation');
    }
  }

  /**
   * التعامل مع تحديث حركة النص
   * @private
   */
  function _handleTextAnimationUpdate(animation, progress) {
    const logger = getLogger();
    
    if (!animation) {
      logger.logWarning({
        message: 'بيانات الحركة غير موجودة',
        origin: 'MainRenderer._handleTextAnimationUpdate'
      });
      return;
    }
    
    if (typeof progress !== 'number' || progress < 0 || progress > 1) {
      logger.logWarning({
        message: `تقدم الحركة غير صالح: ${progress}`,
        origin: 'MainRenderer._handleTextAnimationUpdate'
      });
      return;
    }
    
    // يمكن هنا تحديث النص بناءً على تقدم الحركة
    const state = dependencies.stateStore.getState();
    
    if (state.currentProject && state.currentProject.textStyle && animation.type === 'fade') {
      const updatedTextOptions = {
        ...state.currentProject.textStyle,
        opacity: progress
      };
      
      _drawText(updatedTextOptions);
    }
  }

  /**
   * التعامل مع إلغاء حركة النص
   * @private
   */
  function _handleTextAnimationCancel(animation) {
    const logger = getLogger();
    
    if (!animation) {
      logger.logWarning({
        message: 'بيانات الحركة غير موجودة',
        origin: 'MainRenderer._handleTextAnimationCancel'
      });
      return;
    }
    
    logger.logWarning({
      message: `إلغاء حركة النص: ${animation.type}`,
      origin: 'MainRenderer._handleTextAnimationCancel'
    });
    
    // إيقاف الحركة
    _handleTextAnimationEnd(animation);
  }

  /**
   * التعامل مع انتهاء الحركة تمامًا
   * @private
   */
  function _handleTextAnimationFinish(animation) {
    const logger = getLogger();
    
    if (!animation) {
      logger.logWarning({
        message: 'بيانات الحركة غير موجودة',
        origin: 'MainRenderer._handleTextAnimationFinish'
      });
      return;
    }
    
    logger.logWarning({
      message: `انتهاء الحركة تمامًا: ${animation.type}`,
      origin: 'MainRenderer._handleTextAnimationFinish'
    });
    
    // استعادة الحالة الأصلية
    const state = dependencies.stateStore.getState();
    
    if (state.currentProject && state.currentProject.textStyle) {
      _drawText(state.currentProject.textStyle);
    }
  }

  /**
   * إعداد مراقبة الأحداث
   * @private
   */
  function _setupEventListeners() {
    canvas = DOMElements.videoPreviewCanvas;
    ctx = canvas?.getContext('2d');
    
    if (!canvas || !ctx) {
      const logger = getLogger();
      logger.logWarning({
        message: translate('MainRenderer.CanvasNotInitialized'),
        origin: 'MainRenderer._setupEventListeners'
      });
      return;
    }
    
    // مزامنة مع الحالة الابتدائية
    const state = dependencies.stateStore.getState();
    lastRenderedState = { ...state };
    
    // مزامنة مع تغييرات المشروع
    dependencies.stateStore.subscribe((newState) => {
      _handleProjectStateChange(newState, lastRenderedState);
      lastRenderedState = { ...newState };
    });
    
    // مزامنة مع تغييرات أبعاد الكانفاس
    dependencies.eventAggregator.subscribe(EVENTS.CANVAS_RESIZED, _handleCanvasResized);
    
    // مزامنة مع طلبات الرسم اليدوية
    dependencies.eventAggregator.subscribe(EVENTS.REQUEST_RENDER, _handleRequestRender);
    
    // مزامنة مع تحميل الصوت
    dependencies.eventAggregator.subscribe(EVENTS.AYAH_AUDIO_READY, _handleAyahAudioReady);
    
    // مزامنة مع فشل تحميل الصوت
    dependencies.eventAggregator.subscribe(EVENTS.AYAH_AUDIO_FAILED, _handleAyahAudioFailed);
    
    // مزامنة مع انتهاء الصوت
    dependencies.eventAggregator.subscribe(EVENTS.AYAH_AUDIO_ENDED, _handleAyahAudioEnded);
    
    // مزامنة مع أخطاء الصوت
    dependencies.eventAggregator.subscribe(EVENTS.AYAH_AUDIO_ERROR, _handleAyahAudioError);
    
    // مزامنة مع تقدم التصدير
    dependencies.eventAggregator.subscribe(EVENTS.EXPORT_PROGRESS, _handleExportProgress);
    
    // مزامنة مع اكتمال التصدير
    dependencies.eventAggregator.subscribe(EVENTS.EXPORT_COMPLETE, _handleExportComplete);
    
    // مزامنة مع أخطاء التصدير
    dependencies.eventAggregator.subscribe(EVENTS.EXPORT_ERROR, _handleExportError);
    
    // مزامنة مع تغيير اللغة
    dependencies.eventAggregator.subscribe(EVENTS.LANGUAGE_CHANGED, _handleLanguageChange);
    
    // مزامنة مع تغيير السمة
    dependencies.eventAggregator.subscribe(EVENTS.THEME_CHANGED, _handleThemeChange);
    
    // مزامنة مع تحميل المشروع
    dependencies.eventAggregator.subscribe(EVENTS.PROJECT_LOADED, _handleProjectLoaded);
    
    // مزامنة مع إلغاء تحميل المشروع
    dependencies.eventAggregator.subscribe(EVENTS.PROJECT_UNLOADED, _handleProjectUnloaded);
    
    // مزامنة مع تغيير محتوى الذكاء الاصطناعي
    dependencies.eventAggregator.subscribe(EVENTS.AI_CONTENT_CHANGED, _handleAIContentChange);
    
    // مزامنة مع تحميل محتوى الذكاء الاصطناعي
    dependencies.eventAggregator.subscribe(EVENTS.AI_CONTENT_LOADING, _handleAIContentLoading);
    
    // مزامنة مع أخطاء محتوى الذكاء الاصطناعي
    dependencies.eventAggregator.subscribe(EVENTS.AI_CONTENT_ERROR, _handleAIContentError);
    
    // بدء رسم الإطار الأول
    requestAnimationFrame(_renderFrame);
    isInitialized = true;
  }

  /**
   * إزالة مراقبة الأحداث
   * @private
   */
  function _teardownEventListeners() {
    if (isInitialized) {
      // إزالة مراقبة تغييرات المشروع
      dependencies.stateStore.unsubscribe();
      
      // إزالة مراقبة أحداث الكانفاس
      dependencies.eventAggregator.unsubscribe(EVENTS.CANVAS_RESIZED, _handleCanvasResized);
      dependencies.eventAggregator.unsubscribe(EVENTS.REQUEST_RENDER, _handleRequestRender);
      dependencies.eventAggregator.unsubscribe(EVENTS.AYAH_AUDIO_READY, _handleAyahAudioReady);
      dependencies.eventAggregator.unsubscribe(EVENTS.AYAH_AUDIO_FAILED, _handleAyahAudioFailed);
      dependencies.eventAggregator.unsubscribe(EVENTS.AYAH_AUDIO_ENDED, _handleAyahAudioEnded);
      dependencies.eventAggregator.unsubscribe(EVENTS.AYAH_AUDIO_ERROR, _handleAyahAudioError);
      dependencies.eventAggregator.unsubscribe(EVENTS.EXPORT_PROGRESS, _handleExportProgress);
      dependencies.eventAggregator.unsubscribe(EVENTS.EXPORT_COMPLETE, _handleExportComplete);
      dependencies.eventAggregator.unsubscribe(EVENTS.EXPORT_ERROR, _handleExportError);
      dependencies.eventAggregator.unsubscribe(EVENTS.LANGUAGE_CHANGED, _handleLanguageChange);
      dependencies.eventAggregator.unsubscribe(EVENTS.THEME_CHANGED, _handleThemeChange);
      dependencies.eventAggregator.unsubscribe(EVENTS.PROJECT_LOADED, _handleProjectLoaded);
      dependencies.eventAggregator.unsubscribe(EVENTS.PROJECT_UNLOADED, _handleProjectUnloaded);
      dependencies.eventAggregator.unsubscribe(EVENTS.AI_CONTENT_CHANGED, _handleAIContentChange);
      dependencies.eventAggregator.unsubscribe(EVENTS.AI_CONTENT_LOADING, _handleAIContentLoading);
      dependencies.eventAggregator.unsubscribe(EVENTS.AI_CONTENT_ERROR, _handleAIContentError);
      
      isInitialized = false;
    }
    
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = 0;
      canvas.height = 0;
      canvas = null;
      ctx = null;
    }
    
    // مسح الصور والفيديوهات
    if (currentBackgroundImage) {
      currentBackgroundImage.src = '';
      currentBackgroundImage = null;
    }
    
    if (currentBackgroundVideo) {
      currentBackgroundVideo.src = '';
      currentBackgroundVideo = null;
    }
    
    // مسح الحالة
    lastRenderedState = null;
    currentTextEffect = {
      type: 'none',
      text: '',
      state: ''
    };
  }

  /**
   * تحديث واجهة المستخدم من الحالة
   * @private
   */
  function _updateUIFromState() {
    const state = dependencies.stateStore.getState();
    
    // تحديث أبعاد الكانفاس
    const dimensions = dependencies.canvasDimensionsAPI?.getCurrentDimensions();
    if (dimensions && (canvas.width !== dimensions.width || canvas.height !== dimensions.height)) {
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
    }
    
    // تحديث لون الخلفية
    if (state.currentProject && state.currentProject.background && state.currentProject.background.type === 'color') {
      ctx.fillStyle = state.currentProject.background.source;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      notifyFrameRendered({ type: 'color', source: state.currentProject.background.source });
    }
    
    // تحديث صورة الخلفية
    if (state.currentProject && state.currentProject.background && state.currentProject.background.type === 'image') {
      if (!currentBackgroundImage || currentBackgroundImage.src !== state.currentProject.background.source) {
        currentBackgroundImage = new Image();
        currentBackgroundImage.crossOrigin = 'Anonymous';
        currentBackgroundImage.src = state.currentProject.background.source;
        currentBackgroundImage.onload = () => {
          ctx.drawImage(currentBackgroundImage, 0, 0, canvas.width, canvas.height);
          notifyFrameRendered({ type: 'image', source: state.currentProject.background.source });
        };
      } else {
        ctx.drawImage(currentBackgroundImage, 0, 0, canvas.width, canvas.height);
      }
    }
    
    // تحديث فيديو الخلفية
    if (state.currentProject && state.currentProject.background && state.currentProject.background.type === 'video') {
      if (!currentBackgroundVideo || currentBackgroundVideo.src !== state.currentProject.background.source) {
        currentBackgroundVideo = document.createElement('video');
        currentBackgroundVideo.crossOrigin = 'Anonymous';
        currentBackgroundVideo.muted = true;
        currentBackgroundVideo.playsinline = true;
        currentBackgroundVideo.loop = true;
        currentBackgroundVideo.currentTime = 0.1;
        currentBackgroundVideo.src = state.currentProject.background.source;
        currentBackgroundVideo.play();
        
        currentBackgroundVideo.oncanplay = () => {
          ctx.drawImage(currentBackgroundVideo, 0, 0, canvas.width, canvas.height);
          notifyFrameRendered({ type: 'video', source: state.currentProject.background.source });
        };
      } else {
        if (currentBackgroundVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          ctx.drawImage(currentBackgroundVideo, 0, 0, canvas.width, canvas.height);
        } else {
          ctx.fillStyle = DEFAULT_PROJECT_SCHEMA.background.source;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          notifyRenderFailed(translate('MainRenderer.VideoNotReady'));
        }
      }
    }
    
    // تحديث النصوص
    if (state.currentProject && state.currentProject.textStyle && isValidText(state.currentProject.textStyle.text)) {
      _drawText({
        text: state.currentProject.textStyle.text,
        x: canvas.width / 2,
        y: canvas.height / 2,
        fontSize: state.currentProject.textStyle.fontSize || DEFAULT_PROJECT_SCHEMA.textStyle.fontSize,
        fontFamily: state.currentProject.textStyle.fontFamily || DEFAULT_PROJECT_SCHEMA.textStyle.fontFamily,
        fontColor: state.currentProject.textStyle.fontColor || DEFAULT_PROJECT_SCHEMA.textStyle.fontColor,
        textAlign: state.currentProject.textStyle.textAlign || DEFAULT_TEXT_ALIGN,
        textDirection: state.currentProject.textStyle.textDirection || DEFAULT_TEXT_DIRECTION,
        textEffect: state.currentProject.textStyle.textEffect || DEFAULT_TEXT_EFFECT,
        opacity: state.currentProject.textStyle.opacity ?? DEFAULT_OPACITY,
        rotation: state.currentProject.textStyle.rotation ?? 0,
        shadowColor: state.currentProject.textStyle.shadow?.color ?? DEFAULT_SHADOW.color,
        shadowBlur: state.currentProject.textStyle.shadow?.blur ?? DEFAULT_SHADOW.blur,
        shadowOffsetX: state.currentProject.textStyle.shadow?.offsetX ?? DEFAULT_SHADOW.offset.x,
        shadowOffsetY: state.currentProject.textStyle.shadow?.offsetY ?? DEFAULT_SHADOW.offset.y,
        scale: state.currentProject.textStyle.scale ?? 1
      });
    }
    
    // تحديث الحالة
    lastRenderedState = state;
  }

  /**
   * التحقق من الصحة
   * @returns {boolean} نتيجة التحقق
   */
  function selfTest() {
    try {
      const testText = translate('MainRenderer.SelfTestText');
      const testFontFamily = 'Amiri';
      const testFontSize = 48;
      
      // رسم نص تجريبي
      _drawText({
        text: testText,
        x: canvas.width / 2,
        y: canvas.height / 2,
        fontSize: testFontSize,
        fontFamily: testFontFamily,
        fontColor: '#ffffff',
        textAlign: 'center',
        textDirection: 'rtl'
      });
      
      // التحقق مما إذا تم رسم شيء
      const pixel = ctx.getImageData(canvas.width / 2, canvas.height / 2, 1, 1);
      return pixel.data.some(channel => channel > 0); // التحقق مما إذا كان الكانفاس ليس فارغًا
    } catch (e) {
      return false;
    }
  }

  // إرجاع واجهة الكائن النهائي
  return {
    _setDependencies,
    renderFrame: _renderFrame,
    drawBackground: _drawBackground,
    drawText: _drawText,
    clearCanvas: _clearCanvas,
    resetRenderer: _resetRenderer,
    handleCanvasResized: _handleCanvasResized,
    handleProjectStateChange: _handleProjectStateChange,
    handleTimelineUpdate: _handleTimelineUpdate,
    handleTimelineSeek: _handleTimelineSeek,
    handleTextEffectChange: _handleTextEffectChange,
    handleTextSettingsChange: _handleTextSettingsChange,
    handleVideoFilterChange: _handleVideoFilterChange,
    handleBackgroundChange: _handleBackgroundChange,
    handleExportProgress: _handleExportProgress,
    handleExportComplete: _handleExportComplete,
    handleExportError: _handleExportError,
    handleLanguageChange: _handleLanguageChange,
    handleThemeChange: _handleThemeChange,
    handleProjectLoaded: _handleProjectLoaded,
    handleProjectUnloaded: _handleProjectUnloaded,
    handleAIContentChange: _handleAIContentChange,
    handleAIContentLoading: _handleAIContentLoading,
    handleAIContentError: _handleAIContentError,
    handleTextAnimationStart: _handleTextAnimationStart,
    handleTextAnimationEnd: _handleTextAnimationEnd,
    handleTextAnimationUpdate: _handleTextAnimationUpdate,
    handleTextAnimationCancel: _handleTextAnimationCancel,
    handleTextAnimationFinish: _handleTextAnimationFinish,
    setupEventListeners: _setupEventListeners,
    teardownEventListeners: _teardownEventListeners,
    updateUIFromState: _updateUIFromState,
    selfTest: selfTest
  };
})();

/**
 * تهيئة مُعالج الرسم
 * @param {Object} deps - الاعتماديات المُمررة
 * @returns {Object} واجهة مُعالج الرسم
 */
export function initializeMainRenderer(deps) {
  mainRenderer._setDependencies(deps);
  mainRenderer.setupEventListeners();
  
  return {
    renderFrame: mainRenderer.renderFrame,
    drawBackground: mainRenderer.drawBackground,
    drawText: mainRenderer.drawText,
    clearCanvas: mainRenderer.clearCanvas,
    resetRenderer: mainRenderer.resetRenderer,
    updateUIFromState: mainRenderer.updateUIFromState,
    selfTest: mainRenderer.selfTest,
    cleanup: mainRenderer.teardownEventListeners
  };
}

/**
 * التحقق من صحة النظام
 * @returns {boolean} نتيجة التحقق
 */
export function selfTest() {
  return mainRenderer.selfTest();
}

// تصدير الكائن الافتراضي
export default mainRenderer;
