// js/features/project-manager/project-list.renderer.js
import DOMElements from '../../core/dom-elements.js';
import {
  ACTIONS,
  EVENTS,
  DEFAULT_PROJECT_SCHEMA,
  APP_CONSTANTS
} from '../../config/app.constants.js';
import {
  createElement,
  setDataAttribute,
  removeElement,
  addClass,
  removeClass
} from '../../utils/dom.manipulator.js';
import timeFormatter from '../../utils/time.formatter.js';
// notificationPresenter و modalFactory قد لا تحتاج إلى استيرادهم هنا مباشرة إذا كانت تعتمد عليهم في مكان آخر
// لكن سأبقيهم إذا كانوا يُستخدمون في مكان آخر من هذا الملف
// import notificationPresenter from '../../shared-ui-components/notification.presenter.js';
// import modalFactory from '../../shared-ui-components/modal.factory.js';

/**
 * مُنشئ قائمة المشاريع
 */
const projectListRenderer = (() => {
  // مراجع عناصر DOM (تبقى كما هي)
  // ... (كود projectListRenderer الداخلي يبقى كما هو) ...

  /**
   * معالجة تفاعل المستخدم مع القائمة (يبقى كما هو)
   * @param {Event} event - حدث المستخدم
   */
  async function _handleListInteraction(event) {
    // ... (هذا الكود يتعامل مع النقر على بطاقات المشاريع وحذفها، وليس زر "إنشاء جديد")
    // لذا سيبقى كما هو
    const card = event.target.closest('.project-card');
    
    if (!card) return;
    
    const projectId = card.dataset.projectId;
    if (!projectId) return;
    
    // معالجة الحذف
    if (event.target.closest('.delete-project-btn')) {
      // ... (كود الحذف يبقى كما هو) ...
    } 
    // معالجة التكرار
    else if (event.target.closest('.duplicate-project-btn') && APP_CONSTANTS.ENABLE_PROJECT_DUPLICATION) {
      // ... (كود التكرار يبقى كما هو) ...
    }
    // معالجة فتح المشروع
    else if (event.target.closest('.project-card') || event.target.closest('h3')) {
      try {
        const projectToLoad = dependencies.stateStore.getState().savedProjects.find(p => p.id === projectId);
        
        if (!projectToLoad) {
          dependencies.errorLogger.warn({
            message: dependencies.localizationService.translate('warning.project.not.found', { id: projectId }) || 
                     `المشروع غير موجود: ${projectId}`,
            origin: 'ProjectListRenderer._handleListInteraction'
          });
          return;
        }
        
        // تحميل المشروع
        dependencies.stateStore.dispatch(ACTIONS.LOAD_PROJECT, { ...projectToLoad });
        
        // نشر حدث لتخطيط التطبيق
        //  ScreenNavigator يستمع لـ EVENTS.PROJECT_LOADED وسيقوم بالانتقال إلى 'editor'
        dependencies.eventAggregator.publish(EVENTS.PROJECT_LOADED, { project: projectToLoad });
        
        //  لم نعد بحاجة لاستدعاء screenNavigator.navigateTo('editor') مباشرة هنا
        //  لأن ScreenNavigator سيفعل ذلك عند استقبال EVENTS.PROJECT_LOADED
        /* 
        if (dependencies.screenNavigator) { // screenNavigator قد لا يكون جزءًا من dependencies هنا مباشرة
          dependencies.screenNavigator.navigateTo('editor'); 
        }
        */

      } catch (error) {
        dependencies.errorLogger.error({
          error,
          message: dependencies.localizationService.translate('error.project.load', { id: projectId }) || 
                   `فشل في تحميل المشروع ${projectId}`,
          origin: 'ProjectListRenderer._handleListInteraction'
        });
        
        dependencies.notificationServiceAPI?.showError(
          dependencies.localizationService.translate('project.load.failed', { id: projectId }) || 
          `فشل في تحميل المشروع ${projectId}`
        );
      }
    }
  }
  
  // ... (باقي دوال projectListRenderer الداخلية تبقى كما هي) ...
  
  return {
    _setDependencies,
    _renderProjects: _renderProjects, // تأكد أن هذه الدوال معرفة في الكود الأصلي
    _handleListInteraction,
    cleanup // تأكد أن هذه الدالة معرفة في الكود الأصلي
  };
})();

/**
 * وظيفة التهيئة
 * @param {Object} deps - الاعتمادات
 * @returns {Object} - واجهة عامة للوحدة
 */
export function initializeProjectListRenderer(deps) {
  projectListRenderer._setDependencies(deps);

  const {
    stateStore,
    errorLogger,
    eventAggregator,
    localizationService // تأكد من تمرير localizationService ضمن deps من main.js
    // notificationServiceAPI, // إذا كنت ستستخدمها في زر الإنشاء
    // modalFactoryAPI, // إذا كنت ستستخدمها في زر الإنشاء
  } = deps;

  // تعيين مراجع العناصر
  projectListRenderer.listContainerRef = DOMElements.projectsListContainer;
  projectListRenderer.noProjectsMsgElRef = DOMElements.noProjectsMessage;

  // التحقق من وجود الحاوية
  if (!projectListRenderer.listContainerRef || !projectListRenderer.noProjectsMsgElRef) {
    errorLogger.warn({
      message: (localizationService && typeof localizationService.translate === 'function' ? localizationService.translate('warning.projects.container.not.found') : 'Project container or no-projects message element not found.') + ' Cannot initialize project list rendering.',
      origin: 'initializeProjectListRenderer'
    });
    return {
      cleanup: () => {}
    };
  }
  
  // *********************************************************************
  // *** START OF ADDED CODE for "Create New Project" button           ***
  // *********************************************************************
  const createNewProjectButton = DOMElements.goToEditorBtn;

  if (createNewProjectButton) {
    const handleCreateNewProjectClick = () => { // دالة منفصلة لتسهيل إزالتها لاحقًا إذا لزم الأمر
      try {
        //  نرسل الحدث الذي يستمع إليه ScreenNavigator لبدء مشروع جديد والانتقال
        //  ScreenNavigator سيقوم بـ stateStore.dispatch(ACTIONS.CREATE_NEW_PROJECT_AND_NAVIGATE)
        //  هذا الـ action بدوره سيحدث الحالة (activeScreen, currentProject)
        //  و ScreenNavigator سيلتقط تغير activeScreen وينتقل.
        eventAggregator.publish(EVENTS.NAVIGATE_TO_EDITOR_NEW_PROJECT);

        // للتأكد من أن النقر يعمل:
        console.log('[ProjectListRenderer] "Create New Project" button clicked. Event NAVIGATE_TO_EDITOR_NEW_PROJECT published.');

      } catch (e) {
        const errorMsg = (localizationService && typeof localizationService.translate === 'function' ? localizationService.translate('error.navigate.editor.new', 'Failed to process new project creation.') : 'Failed to process new project creation.');
        errorLogger.error({
          message: errorMsg,
          error: e,
          origin: 'initializeProjectListRenderer.createNewProjectClick'
        });
        // يمكنك إظهار إشعار للمستخدم إذا فشل الإجراء
        // notificationServiceAPI?.showError(errorMsg);
      }
    };
    createNewProjectButton.addEventListener('click', handleCreateNewProjectClick);
    
    // نحفظ الدالة لإزالتها عند التنظيف
    projectListRenderer._handleCreateNewProjectClick = handleCreateNewProjectClick; 
  } else {
    errorLogger.warn({
      message: (localizationService && typeof localizationService.translate === 'function' ? localizationService.translate('warning.button.create.project.not.found') : 'Create New Project button (go-to-editor-btn) not found in DOMElements or DOM.'),
      origin: 'initializeProjectListRenderer'
    });
  }
  // *********************************************************************
  // *** END OF ADDED CODE                                             ***
  // *********************************************************************


  // --- دوال العرض المحلية (بقيت كما هي من كودك الأصلي ولكن أضفت error handling بسيط لـ deps) ---
  const _renderProjectsLocal = (projects) => {
    // ... (الكود الداخلي لدالة _renderProjectsLocal يبقى كما هو من كودك الأصلي)
    // تأكد فقط أنك تستخدم deps.localizationService بدلاً من localizationService مباشرة إذا كانت ضمن deps
  };


  // إضافة مستمعي الأحداث للحاوية (كما هي)
  if (projectListRenderer.listContainerRef) {
    projectListRenderer.listContainerRef.addEventListener('click', projectListRenderer._handleListInteraction);
    // ... (إذا كان هناك مستمع keydown، يبقى كما هو)
    if (typeof projectListRenderer._handleKeyboardNavigation === 'function') {
         projectListRenderer.listContainerRef.addEventListener('keydown', projectListRenderer._handleKeyboardNavigation);
    }
  }

  // الاشتراك في تغييرات الحالة (كما هي)
  const unsubscribeState = stateStore.subscribe((newState) => {
    if (newState && newState.activeScreen === 'initial' && newState.savedProjects) { // تحقق من newState و newState.savedProjects
      _renderProjectsLocal(newState.savedProjects);
    }
  });
  
  // تهيئة عرض المشاريع (كما هي، مع التحقق)
  const currentState = stateStore.getState();
  if (currentState && currentState.activeScreen === 'initial' && currentState.savedProjects) { // تحقق من currentState و currentState.savedProjects
    _renderProjectsLocal(currentState.savedProjects);
  }

  // الواجهة التي تُرجعها الدالة
  return {
    cleanup: () => {
      unsubscribeState();
      if (projectListRenderer.listContainerRef) {
        projectListRenderer.listContainerRef.removeEventListener('click', projectListRenderer._handleListInteraction);
        if (typeof projectListRenderer._handleKeyboardNavigation === 'function') {
            projectListRenderer.listContainerRef.removeEventListener('keydown', projectListRenderer._handleKeyboardNavigation);
        }
      }
      // *********************************************************************
      // *** START OF ADDED CLEANUP CODE for "Create New Project" button   ***
      // *********************************************************************
      if (createNewProjectButton && projectListRenderer._handleCreateNewProjectClick) {
        createNewProjectButton.removeEventListener('click', projectListRenderer._handleCreateNewProjectClick);
      }
      // *********************************************************************
      // *** END OF ADDED CLEANUP CODE                                     ***
      // *********************************************************************

      // إذا كان projectListRenderer الأصلي لديه دالة cleanup، استدعها
      if (typeof projectListRenderer.cleanup === 'function') {
          projectListRenderer.cleanup(); // استدعاء دالة التنظيف الداخلية للوحدة إذا كانت موجودة
      }
    }
  };
}
