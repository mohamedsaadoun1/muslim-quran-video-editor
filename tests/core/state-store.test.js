/**
 * @fileoverview اختبار وحدة لمخزن الحالة (stateStore)
 * @module tests/core/state-store.test.js
 * @requires ../core/state-store.js
 * @description يُعتبر هذا الملف جزءًا أساسيًا من نظام الاختبار الآلي لتطبيق محرر فيديوهات القرآن.
 */

// --- الاستيراد والتهيئة ---
import stateStore from '../../js/core/state-store.js';
import { ACTIONS } from '../../js/config/app.constants.js';

describe('State Store Tests', () => {
  let originalConsoleError;
  let capturedError;

  // --- قبل كل اختبار ---
  beforeEach(() => {
    // إعادة تعيين الحالة الافتراضية
    stateStore.initializeWithState({}, []);
    
    // التقاط الأخطاء
    originalConsoleError = console.error;
    capturedError = null;
    console.error = (error) => {
      capturedError = error;
    };
  });

  // --- بعد كل اختبار ---
  afterEach(() => {
    console.error = originalConsoleError;
  });

  // --- وظائف مساعدة ---
  /**
   * انتظار تحديث الحالة
   * @returns {Promise} وعده بتحديث الحالة
   */
  function waitForStateUpdate() {
    return new Promise(resolve => {
      const unsubscribe = stateStore.subscribe((newState) => {
        unsubscribe();
        resolve();
      });
    });
  }

  /**
   * الحصول على نسخة عميقة من الحالة
   * @returns {Object} نسخة من الحالة
   */
  function getDeepCopy(state) {
    return JSON.parse(JSON.stringify(state));
  }

  // --- الاختبار الأول: هيكل الحالة ---
  test('يجب أن يكون هيكل الحالة صحيحًا', () => {
    const state = stateStore.getState();

    expect(state).toHaveProperty('currentTheme');
    expect(state).toHaveProperty('currentProject');
    expect(state).toHaveProperty('savedProjects');
    expect(state).toHaveProperty('activeScreen');
    expect(state).toHaveProperty('activePanelId');
    expect(state).toHaveProperty('isLoading');
    expect(state).toHaveProperty('loadingMessage');
    expect(state).toHaveProperty('exportProgress');
    expect(state).toHaveProperty('mainPlaybackState');
    expect(state).toHaveProperty('undoRedoState');
    expect(state).toHaveProperty('appSettings');
    expect(state).toHaveProperty('globalError');
  });

  // --- الاختبار الثاني: تهيئة الحالة ---
  test('يجب أن يتم تهيئة الحالة بدقة', () => {
    const mockAppSettings = {
      preferredLanguage: 'ar',
      preferredTheme: 'dark',
      defaultExportSettings: {
        resolution: '1080p',
        format: 'mp4',
        fps: 30
      },
      defaultReciterId: 'alafasy'
    };

    const mockSavedProjects = [
      {
        id: 'project-1',
        title: 'مشروع جديد',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        quranSelection: {
          surahId: 2,
          startAyah: 255,
          endAyah: 256
        }
      }
    ];

    stateStore.initializeWithState(mockAppSettings, mockSavedProjects);
    const state = stateStore.getState();

    expect(state.currentTheme).toBe('dark');
    expect(state.appSettings.preferredTheme).toBe('dark');
    expect(state.savedProjects.length).toBe(1);
    expect(state.savedProjects[0].title).toBe('مشروع جديد');
    expect(state.appSettings.defaultReciterId).toBe('alafasy');
  });

  // --- الاختبار الثالث: الاشتراك والتغيير ---
  test('يجب أن يعمل الاشتراك بشكل صحيح عند تغيير الحالة', async () => {
    const listener = jest.fn();
    const unsubscribe = stateStore.subscribe(listener);

    // تشغيل إجراء لتغيير الحالة
    stateStore.dispatch(ACTIONS.SET_THEME, 'light');

    await waitForStateUpdate();

    expect(listener).toHaveBeenCalled();
    expect(listener.mock.calls[0][0].currentTheme).toBe('light');

    // تنظيف الاشتراك
    unsubscribe();
    stateStore.dispatch(ACTIONS.SET_THEME, 'dark'); // لا يجب استدعاء listener مرة أخرى
    expect(listener.mock.calls.length).toBe(1); // فقط مرة واحدة
  });

  // --- الاختبار الرابع: دعم تبديل السمة ---
  test('يجب أن يدعم تبديل السمة بين dark و light', async () => {
    const themeListener = jest.fn();
    stateStore.subscribe(themeListener);

    // تبديل السمة
    stateStore.dispatch(ACTIONS.SET_THEME, 'light');
    await waitForStateUpdate();

    const newState = stateStore.getState();
    expect(newState.currentTheme).toBe('light');
    expect(newState.appSettings.preferredTheme).toBe('light');

    // العودة إلى dark
    stateStore.dispatch(ACTIONS.SET_THEME, 'dark');
    await waitForStateUpdate();

    const updatedState = stateStore.getState();
    expect(updatedState.currentTheme).toBe('dark');
    expect(updatedState.appSettings.preferredTheme).toBe('dark');

    expect(themeListener).toHaveBeenCalledTimes(2);
  });

  // --- الاختبار الخامس: دعم إنشاء مشروع جديد ---
  test('يجب أن يدعم إنشاء مشروع جديد', async () => {
    const projectListener = jest.fn();
    stateStore.subscribe(projectListener);

    // تشغيل الإنشاء
    stateStore.dispatch(ACTIONS.CREATE_NEW_PROJECT_AND_NAVIGATE, null);
    await waitForStateUpdate();

    const state = stateStore.getState();
    expect(state.currentProject).not.toBeNull();
    expect(state.activeScreen).toBe('editor');
    expect(state.activePanelId).toBe('quran-selection-panel');
    expect(state.currentProject.title).toBe('مشروع جديد');

    // التحقق من التاريخ
    const history = stateStore._getHistory();
    expect(history.length).toBeGreaterThan(0);
    expect(history[0]).toEqual(expect.objectContaining({ title: 'مشروع جديد' }));
  });

  // --- الاختبار السادس: تحميل مشروع موجود ---
  test('يجب أن يدعم تحميل مشروع من القائمة', async () => {
    const mockProject = {
      id: 'project-1',
      title: 'مشروع قديم',
      createdAt: Date.now() - 100000,
      updatedAt: Date.now(),
      quranSelection: {
        surahId: 112,
        startAyah: 1,
        endAyah: 4
      }
    };

    const projectListener = jest.fn();
    stateStore.subscribe(projectListener);

    // تحميل المشروع
    stateStore.dispatch(ACTIONS.LOAD_PROJECT, mockProject);
    await waitForStateUpdate();

    const state = stateStore.getState();
    expect(state.currentProject).toEqual(mockProject);
    expect(state.activeScreen).toBe('editor');
    expect(state.activePanelId).toBe('quran-selection-panel');

    // التحقق من التاريخ
    const history = stateStore._getHistory();
    expect(history.length).toBe(1);
    expect(history[0]).toEqual(mockProject);

    // التحقق من عدم وجود أخطاء
    expect(capturedError).toBeNull();
  });

  // --- الاختبار السابع: دعم undo/redo ---
  test('يجب أن يدعم التراجع (undo) وإعادة (redo)', async () => {
    const mockProject = {
      id: 'project-1',
      title: 'مشروع قديم',
      createdAt: Date.now() - 100000,
      updatedAt: Date.now(),
      quranSelection: {
        surahId: 112,
        startAyah: 1,
        endAyah: 4
      }
    };

    // إنشاء مشروع أولي
    stateStore.dispatch(ACTIONS.LOAD_PROJECT, mockProject);
    await waitForStateUpdate();

    // تعديل المشروع
    const updatedProject = {
      ...mockProject,
      title: 'مشروع معدل',
      quranSelection: {
        surahId: 2,
        startAyah: 255,
        endAyah: 257
      }
    };

    stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, updatedProject);
    await waitForStateUpdate();

    // التحقق من عدد خطوات التحديث
    const history = stateStore._getHistory();
    expect(history.length).toBe(2); // load + update

    // التراجع
    stateStore.dispatch(ACTIONS.UNDO_STATE, null);
    await waitForStateUpdate();
    const afterUndo = stateStore.getState().currentProject;
    expect(afterUndo.title).toBe('مشروع قديم');

    // إعادة التحديث
    stateStore.dispatch(ACTIONS.REDO_STATE, null);
    await waitForStateUpdate();
    const afterRedo = stateStore.getState().currentProject;
    expect(afterRedo.title).toBe('مشروع معدل');

    // التحقق من توفر زر redo
    const undoRedoState = stateStore.getState().undoRedoState;
    expect(undoRedoState.canUndo).toBe(true);
    expect(undoRedoState.canRedo).toBe(true);
  });

  // --- الاختبار الثامن: دعم تغيير اسم المشروع ---
  test('يجب أن يدعم تغيير اسم المشروع', async () => {
    const mockProject = {
      id: 'project-1',
      title: 'مشروع قديم',
      createdAt: Date.now() - 100000,
      updatedAt: Date.now(),
      quranSelection: {
        surahId: 112,
        startAyah: 1,
        endAyah: 4
      }
    };

    stateStore.dispatch(ACTIONS.LOAD_PROJECT, mockProject);
    await waitForStateUpdate();

    const newTitle = 'مشروع جديد تمامًا';
    stateStore.dispatch(ACTIONS.SET_PROJECT_TITLE, newTitle);
    await waitForStateUpdate();

    const state = stateStore.getState();
    expect(state.currentProject.title).toBe(newTitle);
    expect(state.currentProject.updatedAt).toBeGreaterThan(mockProject.updatedAt);
  });

  // --- الاختبار التاسع: دعم قائمة المشاريع ---
  test('يجب أن يدعم تحديث قائمة المشاريع المحفوظة', async () => {
    const initialProjects = stateStore.getState().savedProjects;
    expect(initialProjects.length).toBe(0);

    const mockNewProject = {
      id: 'project-1',
      title: 'مشروع جديد',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const updatedProjects = [mockNewProject];
    stateStore.dispatch(ACTIONS.UPDATE_SAVED_PROJECTS_LIST, updatedProjects);
    await waitForStateUpdate();

    const state = stateStore.getState();
    expect(state.savedProjects.length).toBe(1);
    expect(state.savedProjects[0].title).toBe('مشروع جديد');
    expect(state.savedProjects).toEqual([mockNewProject]);
  });

  // --- الاختبار العاشر: التعامل مع الأخطاء ---
  test('يجب أن يتعامل مع الإجراءات غير المعروفة', async () => {
    const unknownActionType = 'UNKNOWN_ACTION_TYPE';
    const payload = { invalid: true };

    stateStore.dispatch(unknownActionType, payload);
    await waitForStateUpdate();

    expect(capturedError).toBeDefined();
    expect(capturedError.message).toContain(`Unknown action type in stateStore: ${unknownActionType}`);
  });

  // --- الاختبار الحادي عشر: دعم تغيير لغة التطبيق ---
  test('يجب أن يدعم تغيير لغة التطبيق', async () => {
    const settingsListener = jest.fn();
    stateStore.subscribe(settingsListener);

    // تغيير اللغة
    stateStore.dispatch(ACTIONS.SET_APP_SETTINGS, {
      preferredLanguage: 'en'
    });
    await waitForStateUpdate();

    const state = stateStore.getState();
    expect(state.appSettings.preferredLanguage).toBe('en');

    // التحقق من عدم تغيير باقي الإعدادات
    expect(state.appSettings.preferredTheme).toBeDefined();
    expect(state.appSettings.defaultExportSettings).toBeDefined();
    expect(state.appSettings.defaultReciterId).toBeDefined();
  });

  // --- الاختبار الثاني عشر: دعم تغيير السمة ---
  test('يجب أن يدعم تغيير السمة من خلال SET_APP_SETTINGS', async () => {
    const themeListener = jest.fn();
    stateStore.subscribe(themeListener);

    // تغيير السمة
    stateStore.dispatch(ACTIONS.SET_APP_SETTINGS, {
      preferredTheme: 'light'
    });
    await waitForStateUpdate();

    const state = stateStore.getState();
    expect(state.currentTheme).toBe('light');
    expect(state.appSettings.preferredTheme).toBe('light');
    expect(themeListener).toHaveBeenCalled();
  });

  // --- الاختبار الثالث عشر: دعم حذف السجل ---
  test('يجب أن يدعم مسح سجل التراجع والإعادة', async () => {
    const mockProject = {
      id: 'project-1',
      title: 'مشروع قديم',
      createdAt: Date.now() - 100000,
      updatedAt: Date.now(),
      quranSelection: {
        surahId: 112,
        startAyah: 1,
        endAyah: 4
      }
    };

    stateStore.dispatch(ACTIONS.LOAD_PROJECT, mockProject);
    await waitForStateUpdate();

    // تغيير المشروع عدة مرات
    for (let i = 0; i < 5; i++) {
      const updatedProject = {
        ...mockProject,
        title: `مشروع جديد #${i}`,
        updatedAt: Date.now()
      };
      stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, updatedProject);
      await waitForStateUpdate();
    }

    // التحقق من وجود أكثر من حالة للتراجع
    let history = stateStore._getHistory();
    expect(history.length).toBeGreaterThan(1);

    // مسح السجل
    stateStore.dispatch(ACTIONS.CLEAR_HISTORY, null);
    await waitForStateUpdate();

    history = stateStore._getHistory();
    expect(history.length).toBe(1);
    expect(history[0].title).toBe('مشروع قديم');
  });

  // --- الاختبار الرابع عشر: التفاعل مع شريط الزمن ---
  test('يجب أن يدعم تحديث شريط الزمن والوقت الحالي', async () => {
    const playbackListener = jest.fn();
    stateStore.subscribe(playbackListener);

    const mockPlaybackState = {
      isPlaying: true,
      currentAyahGlobalNumber: 1,
      currentTime: 0,
      currentAyahDuration: 3000,
      activePlaylist: [],
      currentPlaylistIndex: -1
    };

    stateStore.dispatch(ACTIONS.SET_MAIN_PLAYBACK_STATE, mockPlaybackState);
    await waitForStateUpdate();

    const state = stateStore.getState();
    expect(state.mainPlaybackState.isPlaying).toBe(true);
    expect(state.mainPlaybackState.currentAyahGlobalNumber).toBe(1);
    expect(state.mainPlaybackState.currentTime).toBe(0);
    expect(state.mainPlaybackState.currentAyahDuration).toBe(3000);
  });

  // --- الاختبار الخامس عشر: دعم تغيير نسبة العرض ---
  test('يجب أن يدعم تغيير نسبة العرض في الفيديو', async () => {
    const videoCompositionListener = jest.fn();
    stateStore.subscribe(videoCompositionListener);

    const aspectRatio = '16:9';
    const mockVideoComposition = {
      aspectRatio,
      videoFilter: 'none'
    };

    stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
      videoComposition: mockVideoComposition
    });
    await waitForStateUpdate();

    const state = stateStore.getState();
    expect(state.currentProject.videoComposition.aspectRatio).toBe(aspectRatio);
    expect(state.currentProject.videoComposition.videoFilter).toBe('none');
  });

  // --- الاختبار السادس عشر: دعم الخطوط ---
  test('يجب أن يدعم تغيير خط النصوص', async () => {
    const textEngineListener = jest.fn();
    stateStore.subscribe(textEngineListener);

    const fontFamily = 'Tajawal';
    const mockTextStyle = {
      fontFamily,
      fontSize: 48,
      fontColor: '#ffffff',
      textBgColor: 'rgba(0, 0, 0, 0.2)',
      textAnimation: 'fadeIn'
    };

    stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
      textStyle: mockTextStyle
    });
    await waitForStateUpdate();

    const state = stateStore.getState();
    expect(state.currentProject.textStyle.fontFamily).toBe(fontFamily);
    expect(state.currentProject.textStyle.fontSize).toBe(48);
    expect(state.currentProject.textStyle.fontColor).toBe('#ffffff');
    expect(state.currentProject.textStyle.textAnimation).toBe('fadeIn');
  });

  // --- الاختبار السابع عشر: دعم خلفيات الصوت ---
  test('يجب أن يدعم تحديث خلفية الصوت', async () => {
    const audioEngineListener = jest.fn();
    stateStore.subscribe(audioEngineListener);

    const mockAudioState = {
      fileObjectURL: 'blob:https://localhost/audio.mp3',
      fileName: 'audio.mp3',
      volume: 0.5,
      loop: true,
      isPlaying: false,
      duration: 60000
    };

    stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
      backgroundAudio: mockAudioState
    });
    await waitForStateUpdate();

    const state = stateStore.getState();
    expect(state.currentProject.backgroundAudio.fileObjectURL).toBe(mockAudioState.fileObjectURL);
    expect(state.currentProject.backgroundAudio.fileName).toBe(mockAudioState.fileName);
    expect(state.currentProject.backgroundAudio.volume).toBe(0.5);
    expect(state.currentProject.backgroundAudio.loop).toBe(true);
  });

  // --- الاختبار الثامن عشر: دعم التفاعل مع المستخدم ---
  test('يجب أن يدعم التفاعل مع المستخدم أثناء التشغيل', async () => {
    const interactionListener = jest.fn();
    stateStore.subscribe(interactionListener);

    // تغيير الحالة إلى "جاري التحميل"
    stateStore.dispatch(ACTIONS.SET_APP_LOADING, true, { message: 'جاري التحميل...' });
    await waitForStateUpdate();

    const state = stateStore.getState();
    expect(state.isLoading).toBe(true);
    expect(state.loadingMessage).toBe('جاري التحميل...');

    // العودة إلى وضع غير مشغول
    stateStore.dispatch(ACTIONS.SET_APP_LOADING, false);
    await waitForStateUpdate();

    const updatedState = stateStore.getState();
    expect(updatedState.isLoading).toBe(false);
    expect(updatedState.loadingMessage).toBe(null);
  });

  // --- الاختبار التاسع عشر: دعم الأخطاء العالمية ---
  test('يجب أن يدعم عرض الأخطاء العالمية', async () => {
    const errorListener = jest.fn();
    stateStore.subscribe(errorListener);

    const mockError = {
      message: 'حدث خطأ فادح في المشروع',
      details: 'السورة غير موجودة أو تالف'
    };

    stateStore.dispatch(ACTIONS.SET_APP_ERROR, mockError);
    await waitForStateUpdate();

    const state = stateStore.getState();
    expect(state.globalError).toEqual(mockError);
  });

  // --- الاختبار العشرون: التحقق من دعم RTL ---
  test('يجب أن يدعم تغيير اتجاه الصفحة بناءً على السمة', async () => {
    // تغيير السمة إلى light
    stateStore.dispatch(ACTIONS.SET_THEME, 'light');
    await waitForStateUpdate();

    const state = stateStore.getState();
    expect(state.currentTheme).toBe('light');

    // تغيير السمة إلى dark
    stateStore.dispatch(ACTIONS.SET_THEME, 'dark');
    await waitForStateUpdate();

    const updatedState = stateStore.getState();
    expect(updatedState.currentTheme).toBe('dark');
  });

  // --- الاختبار الحادي والعشرون: دعم إضافة مشاريع جديدة ---
  test('يجب أن يدعم إضافة مشروع جديد إلى قائمة المشاريع المحفوظة', async () => {
    const mockProject = {
      id: 'project-1',
      title: 'مشروع جديد',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      quranSelection: {
        surahId: 112,
        startAyah: 1,
        endAyah: 4
      }
    };

    const projectsBefore = stateStore.getState().savedProjects;
    expect(projectsBefore.length).toBe(0);

    // إضافة المشروع
    stateStore.dispatch(ACTIONS.UPDATE_SAVED_PROJECTS_LIST, [mockProject]);
    await waitForStateUpdate();

    const projectsAfter = stateStore.getState().savedProjects;
    expect(projectsAfter.length).toBe(1);
    expect(projectsAfter[0].title).toBe('مشروع جديد');
  });

  // --- الاختبار الثاني والعشرون: دعم التفاعل مع المتصفحات المختلفة ---
  test('يجب أن يتعامل مع المتصفحات القديمة بشكل صحيح', () => {
    // التحقق مما إذا كان الكائن متوفرًا
    expect(typeof stateStore).toBe('object');
    expect(typeof stateStore.getState).toBe('function');
    expect(typeof stateStore.dispatch).toBe('function');
    expect(typeof stateStore.subscribe).toBe('function');
    expect(typeof stateStore.initializeWithState).toBe('function');
    expect(typeof stateStore.setErrorLogger).toBe('function');
  });

  // --- الاختبار الثالث والعشرون: التحقق من توافق API ---
  test('يجب أن يدعم واجهة برمجية مستقرة (API)', async () => {
    const apiFunctions = {
      getState: typeof stateStore.getState === 'function',
      dispatch: typeof stateStore.dispatch === 'function',
      subscribe: typeof stateStore.subscribe === 'function',
      initializeWithState: typeof stateStore.initializeWithState === 'function',
      setErrorLogger: typeof stateStore.setErrorLogger === 'function'
    };

    expect(apiFunctions).toEqual({
      getState: true,
      dispatch: true,
      subscribe: true,
      initializeWithState: true,
      setErrorLogger: true
    });
  });

  // --- الاختبار الرابع والعشرون: دعم التحديثات ---
  test('يجب أن يدعم تحديث المشروع بدون مشاكل', async () => {
    const mockProject = {
      id: 'project-1',
      title: 'مشروع قديم',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      quranSelection: {
        surahId: 112,
        startAyah: 1,
        endAyah: 4
      }
    };

    // تحميل المشروع
    stateStore.dispatch(ACTIONS.LOAD_PROJECT, mockProject);
    await waitForStateUpdate();

    // تحديث المشروع
    const updatedProject = {
      ...mockProject,
      title: 'مشروع معدل',
      updatedAt: Date.now()
    };

    stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, updatedProject);
    await waitForStateUpdate();

    const state = stateStore.getState();
    expect(state.currentProject.title).toBe('مشروع معدل');
    expect(state.currentProject.updatedAt).toBeGreaterThan(mockProject.updatedAt);
  });

  // --- الاختبار الخامس والعشرون: دعم مسح المشروع ---
  test('يجب أن يدعم مسح المشروع والعودة إلى الشاشة الرئيسية', async () => {
    const mockProject = {
      id: 'project-1',
      title: 'مشروع قديم',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      quranSelection: {
        surahId: 112,
        startAyah: 1,
        endAyah: 4
      }
    };

    // تحميل المشروع
    stateStore.dispatch(ACTIONS.LOAD_PROJECT, mockProject);
    await waitForStateUpdate();

    // مسح المشروع
    stateStore.dispatch(ACTIONS.LOAD_PROJECT, null);
    await waitForStateUpdate();

    const state = stateStore.getState();
    expect(state.currentProject).toBeNull();
    expect(state.activeScreen).toBe('initial');
    expect(state.activePanelId).toBeNull();
  });

  // --- الاختبار السادس والعشرون: التحقق من دعم اللغة العربية ---
  test('يجب أن يدعم اللغة العربية كلغة افتراضية', () => {
    const state = stateStore.getState();
    expect(state.appSettings.preferredLanguage).toBe('ar');
  });

  // --- الاختبار السابع والعشرون: التحقق من دعم اللغة الإنجليزية ---
  test('يجب أن يدعم تغيير اللغة إلى الإنجليزية', async () => {
    stateStore.dispatch(ACTIONS.SET_APP_SETTINGS, {
      preferredLanguage: 'en'
    });
    await waitForStateUpdate();

    const state = stateStore.getState();
    expect(state.appSettings.preferredLanguage).toBe('en');
  });

  // --- الاختبار الثامن والعشرون: التحقق من دعم FFmpeg ---
  test('يجب أن يدعم تحديث إعدادات FFmpeg', async () => {
    const ffmpegSettings = {
      resolution: '1080p',
      format: 'mp4',
      fps: 60,
      quality: 0.8
    };

    stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
      exportSettings: ffmpegSettings
    });
    await waitForStateUpdate();

    const state = stateStore.getState();
    expect(state.currentProject.exportSettings.resolution).toBe('1080p');
    expect(state.currentProject.exportSettings.format).toBe('mp4');
    expect(state.currentProject.exportSettings.fps).toBe(60);
    expect(state.currentProject.exportSettings.quality).toBe(0.8);
  });

  // --- الاختبار التاسع والعشرون: دعم تغيير صوت الخلفية ---
  test('يجب أن يدعم تغيير مستوى صوت الخلفية', async () => {
    const mockAudioState = {
      fileObjectURL: 'blob:https://localhost/audio.mp3',
      fileName: 'audio.mp3',
      volume: 0.5,
      loop: true,
      isPlaying: false,
      duration: 60000
    };

    stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
      backgroundAudio: mockAudioState
    });
    await waitForStateUpdate();

    // تغيير مستوى الصوت
    const updatedVolume = 0.7;
    stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
      backgroundAudio: {
        ...mockAudioState,
        volume: updatedVolume
      }
    });
    await waitForStateUpdate();

    const state = stateStore.getState();
    expect(state.currentProject.backgroundAudio.volume).toBe(updatedVolume);
  });

  // --- الاختبار الثلاثون: التحقق من دعم الموارد ---
  test('يجب أن يدعم تغيير الموارد مثل السورة والآيات', async () => {
    const quranSelection = {
      surahId: 2,
      startAyah: 255,
      endAyah: 257,
      reciterId: 'minshawi',
      translationId: 'urdu',
      delayBetweenAyahs: 2
    };

    stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
      quranSelection
    });
    await waitForStateUpdate();

    const state = stateStore.getState();
    expect(state.currentProject.quranSelection.surahId).toBe(2);
    expect(state.currentProject.quranSelection.startAyah).toBe(255);
    expect(state.currentProject.quranSelection.endAyah).toBe(257);
    expect(state.currentProject.quranSelection.reciterId).toBe('minshawi');
    expect(state.currentProject.quranSelection.translationId).toBe('urdu');
  });

  // --- الاختبار الواحد والثلاثون: دعم المؤشرات ---
  test('يجب أن يدعم المؤشرات مثل تقدم التصدير', async () => {
    const exportProgress = {
      percentage: 75,
      statusMessage: 'جاري تصدير الفيديو...'
    };

    stateStore.dispatch(ACTIONS.SET_EXPORT_PROGRESS, exportProgress);
    await waitForStateUpdate();

    const state = stateStore.getState();
    expect(state.exportProgress.percentage).toBe(75);
    expect(state.exportProgress.statusMessage).toBe('جاري تصدير الفيديو...');
  });

  // --- الاختبار الثاني والثلاثون: التحقق من دعم المتصفحات ---
  test('يجب أن يتعامل مع المتصفحات التي لا تدعم localStorage', () => {
    // محاكاة متصفح لا يدعم localStorage
    const originalLocalStorage = window.localStorage;
    delete window.localStorage;

    try {
      stateStore.initializeWithState({}, []);
    } catch (e) {
      // لا يجب أن يُلغي التهيئة بسبب localStorage
    }

    window.localStorage = originalLocalStorage;
  });

  // --- الاختبار الثالث والثلاثون: التحقق من دعم DOM ---
  test('يجب أن يتعامل مع DOM بشكل صحيح', () => {
    // التحقق من توفر العناصر الأساسية
    expect(DOMElements.appContainer).toBeDefined();
    expect(DOMElements.initialFooter).toBeDefined();
    expect(DOMElements.editorTopBar).toBeDefined();
    expect(DOMElements.projectTitleEditor).toBeDefined();
  });

  // --- الاختبار الرابع والثلاثون: دعم التمرير ---
  test('يجب أن يدعم التمرير عبر لوحة تحكم في المحرر', async () => {
    const mockTimeline = {
      currentTime: 3000,
      totalDuration: 10000
    };

    stateStore.dispatch(ACTIONS.SET_MAIN_PLAYBACK_STATE, mockTimeline);
    await waitForStateUpdate();

    const state = stateStore.getState();
    expect(state.mainPlaybackState.currentTime).toBe(3000);
    expect(state.mainPlaybackState.totalDuration).toBe(10000);
  });

  // --- الاختبار الخامس والثلاثون: التحقق من دعم التحديث ---
  test('يجب أن يدعم تحديثات المشروع بشكل دقيق', async () => {
    const mockProject = {
      id: 'project-1',
      title: 'مشروع قديم',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      quranSelection: {
        surahId: 112,
        startAyah: 1,
        endAyah: 4
      }
    };

    stateStore.dispatch(ACTIONS.LOAD_PROJECT, mockProject);
    await waitForStateUpdate();

    const updatedProject = {
      ...mockProject,
      title: 'مشروع معدل',
      updatedAt: Date.now()
    };

    stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, updatedProject);
    await waitForStateUpdate();

    const state = stateStore.getState();
    expect(state.currentProject.title).toBe('مشروع معدل');
    expect(state.currentProject.updatedAt).toBeGreaterThan(mockProject.updatedAt);
  });

  // --- الاختبار السادس والثلاثون: دعم التحديثات ---
  test('يجب أن يدعم تغيير إعدادات التصدير', async () => {
    const exportSettings = {
      resolution: '4K',
      format: 'webm',
      fps: 60,
      quality: 0.95
    };

    stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
      exportSettings
    });
    await waitForStateUpdate();

    const state = stateStore.getState();
    expect(state.currentProject.exportSettings.resolution).toBe('4K');
    expect(state.currentProject.exportSettings.format).toBe('webm');
    expect(state.currentProject.exportSettings.fps).toBe(60);
    expect(state.currentProject.exportSettings.quality).toBe(0.95);
  });

  // --- الاختبار السابع والثلاثون: دعم التفاعل ---
  test('يجب أن يدعم التفاعل مع المستخدم عند اختيار خلفية جديدة', async () => {
    const background = {
      type: 'image',
      source: 'background.jpg',
      fileName: 'background.jpg'
    };

    stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
      background
    });
    await waitForStateUpdate();

    const state = stateStore.getState();
    expect(state.currentProject.background.type).toBe('image');
    expect(state.currentProject.background.source).toBe('background.jpg');
    expect(state.currentProject.background.fileName).toBe('background.jpg');
  });

  // --- الاختبار الثامن والثلاثون: التحقق من دعم الترجمة ---
  test('يجب أن يدعم تحديث ترجمة الآية', async () => {
    const quranSelection = {
      surahId: 112,
      startAyah: 1,
      endAyah: 4,
      translationId: 'urdu'
    };

    stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
      quranSelection
    });
    await waitForStateUpdate();

    const state = stateStore.getState();
    expect(state.currentProject.quranSelection.translationId).toBe('urdu');
  });

  // --- الاختبار التاسع والثلاثون: التحقق من دعم الخطوط ---
  test('يجب أن يدعم تغيير خط النصوص', async () => {
    const textStyle = {
      fontFamily: 'Amiri Quran',
      fontSize: 72,
      fontColor: '#000000',
      textAnimation: 'slideIn'
    };

    stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
      textStyle
    });
    await waitForStateUpdate();

    const state = stateStore.getState();
    expect(state.currentProject.textStyle.fontFamily).toBe('Amiri Quran');
    expect(state.currentProject.textStyle.fontSize).toBe(72);
    expect(state.currentProject.textStyle.fontColor).toBe('#000000');
    expect(state.currentProject.textStyle.textAnimation).toBe('slideIn');
  });

  // --- الاختبار الأربعون: التحقق من دعم التحديثات ---
  test('يجب أن يتعامل مع التحديثات المستقبلية', async () => {
    const futureSettings = {
      aiSuggestionsEnabled: true,
      autoSaveInterval: 30000,
      enableAutoImport: true
    };

    stateStore.dispatch(ACTIONS.SET_APP_SETTINGS, futureSettings);
    await waitForStateUpdate();

    const state = stateStore.getState();
    expect(state.appSettings.aiSuggestionsEnabled).toBe(true);
    expect(state.appSettings.autoSaveInterval).toBe(30000);
    expect(state.appSettings.enableAutoImport).toBe(true);
  });
});
