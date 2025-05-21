// js/features/project-manager/project-list.renderer.js
import DOMElements from '../../core/dom-elements.js';
import {
  ACTIONS,
  EVENTS,
  DEFAULT_PROJECT_SCHEMA,
  APP_CONSTANTS
} from '../../config/app.constants.js';
import {
  createElement
  // setDataAttribute, // لم يتم استخدامه في الكود الذي قدمته لهذه الوحدة
  // removeElement,    // لم يتم استخدامه
  // addClass,         // لم يتم استخدامه
  // removeClass       // لم يتم استخدامه
} from '../../utils/dom.manipulator.js'; // يمكنك إزالة الـ imports غير المستخدمة إذا أردت
import timeFormatter from '../../utils/time.formatter.js';
// سأبقي notificationPresenter و modalFactory مستوردين للاستخدام في _handleListInteraction
import notificationPresenter from '../../shared-ui-components/notification.presenter.js';
import modalFactory from '../../shared-ui-components/modal.factory.js';

/**
 * مُنشئ قائمة المشاريع
 */
const projectListRenderer = (() => {
  // تم نقل مراجع عناصر DOM إلى دالة التهيئة initializeProjectListRenderer
  // للحصول عليها من DOMElements بعد تهيئتها بشكل صحيح

  // الاعتمادات (تبقى كما هي في تصميمك الحالي)
  let dependencies = {
    stateStore: { /* ... placeholder ... */ },
    eventAggregator: { /* ... placeholder ... */ },
    errorLogger: console,
    localizationService: { /* ... placeholder ... */ },
    modalFactoryAPI: { /* ... placeholder ... */ },
    notificationServiceAPI: { /* ... placeholder ... */ }
    // قد تحتاج إلى إضافة notificationServiceAPI هنا إذا لم تكن موجودة وتم استخدامها
  };

  /**
   * إنشاء بطاقة مشروع (تبقى كما هي من كودك، مع التأكد من استخدام dependencies)
   */
  function _createProjectCard(project) {
    // ... (الكود الأصلي لـ _createProjectCard مع التأكد أن dependencies مُهيأة بشكل صحيح) ...
    // مثال لتعديل بسيط للتأكد من استخدام الاعتمادات المُهيأة:
    if (!project || !project.id) {
      (dependencies.errorLogger || console).warn?.({ // استخدام مشروط لـ errorLogger
        message: 'لا يمكن إنشاء بطاقة مشروع بدون بيانات صحيحة',
        origin: 'ProjectListRenderer._createProjectCard',
        context: { project }
      });
      return null;
    }
    // ... (باقي كود إنشاء البطاقة) ...
    // تأكد أن كل استدعاءات مثل dependencies.localizationService.translate تعمل
    // لأن dependencies يتم تعيينها عبر _setDependencies
    const card = createElement('div', { /* ... */ });
    // ...
    return card;
  }

  /**
   * عرض قائمة المشاريع (تبقى كما هي من كودك، مع التأكد من استخدام DOMElements المُهيأ)
   */
  function _renderProjects(projects) {
    // سيتم الحصول على listContainer و noProjectsMsgElement من DOMElements
    const listContainer = DOMElements.panels.initial.projectsList; // استخدام المسار الصحيح
    const noProjectsMsgElement = DOMElements.panels.initial.noProjectsMessage; // استخدام المسار الصحيح

    if (!listContainer || !noProjectsMsgElement) {
      (dependencies.errorLogger || console).warn?.({
        message: (dependencies.localizationService?.translate('warning.projects.container.not.found') || 'حاوية المشاريع غير موجودة. لا يمكن عرض المشاريع.'),
        origin: 'ProjectListRenderer._renderProjects'
      });
      return;
    }
    // ... (باقي كود _renderProjects كما هو) ...
  }

  /**
   * معالجة تفاعل المستخدم مع القائمة (تبقى كما هي من كودك)
   */
  async function _handleListInteraction(event) {
    // ... (الكود الأصلي لـ _handleListInteraction كما هو، مع التأكد من أن dependencies مُهيأة) ...
    // مثال بسيط للتحقق:
    const card = event.target.closest('.project-card');
    if (!card) return;
    const projectId = card.dataset.projectId;
    // ...
    // عند فتح مشروع:
    // dependencies.stateStore.dispatch(ACTIONS.LOAD_PROJECT, { ...projectToLoad });
    // dependencies.eventAggregator.publish(EVENTS.PROJECT_LOADED, { project: projectToLoad });
    // ScreenNavigator سيتعامل مع الانتقال
  }

  /**
   * معالجة تفاعل لوحة المفاتيح (تبقى كما هي)
   */
  function _handleKeyboardNavigation(event) {
    // ... (الكود الأصلي لـ _handleKeyboardNavigation كما هو) ...
  }


  function _setDependencies(injectedDeps) {
    if (injectedDeps) {
      Object.keys(injectedDeps).forEach(key => {
        if (injectedDeps[key] !== undefined) { // تحقق من عدم كونه undefined بدلاً من مجرد truthy
          dependencies[key] = injectedDeps[key];
        }
      });
    }
  }
  
  function cleanup() {
    // إزالة المستمعين (سنتعامل مع هذا بشكل أكثر تحديدًا في initializeProjectListRenderer)
    // dependencies سيتم مسحها في السياق الأعلى إذا لزم الأمر
  }

  return {
    _setDependencies,
    _renderProjects, // هذه الدوال يجب أن تُعرض إذا كانت initializeProjectListRenderer تعتمد عليها
    _handleListInteraction,
    _handleKeyboardNavigation, // إذا كانت تُستخدم
    cleanup
  };
})();

/**
 * وظيفة التهيئة
 * @param {Object} deps - الاعتمادات
 * @returns {Object} - واجهة عامة للوحدة
 */
export function initializeProjectListRenderer(deps) {
  projectListRenderer._setDependencies(deps); // مهم لتهيئة الاعتمادات للوظائف الداخلية للوحدة

  const {
    stateStore,
    errorLogger,
    eventAggregator,
    localizationService, // تأكد من وجود هذا في deps
    notificationServiceAPI, // لزر الإنشاء إذا فشل
    // DOMElements يتم استيراده مباشرة في الأعلى
  } = deps;

  const projectsListContainer = DOMElements.panels.initial.projectsList;
  const noProjectsMessage = DOMElements.panels.initial.noProjectsMessage;

  if (!projectsListContainer || !noProjectsMessage) {
    errorLogger.error({ // استخدام error بدلاً من warn إذا كانت هذه العناصر حيوية
      message: (localizationService?.translate('error.projects.container.missing', 'Project list container or no-projects message element is missing.') || 'عنصر حاوية المشاريع أو رسالة "لا توجد مشاريع" مفقود.'),
      origin: 'initializeProjectListRenderer'
    });
    return {
      cleanup: () => { console.log('[ProjectListRenderer] Cleanup called on missing DOM elements.'); }
    };
  }

  // --- الكود المضاف لزر "إنشاء فيديو جديد" ---
  const createNewProjectButton = DOMElements.panels.initial.goToEditorBtn;
  let handleCreateNewProjectClickCallback = null; // لتخزين الدالة لإزالتها لاحقًا

  if (createNewProjectButton) {
    handleCreateNewProjectClickCallback = () => {
      try {
        errorLogger.logInfo({message:'[ProjectListRenderer] "Create New Project" button clicked.', origin:'createNewProjectButton.click'});
        eventAggregator.publish(EVENTS.NAVIGATE_TO_EDITOR_NEW_PROJECT);
      } catch (e) {
        const errorMsg = (localizationService?.translate('error.navigate.editor.new', 'Failed to initiate new project creation.') || 'فشل في بدء إنشاء مشروع جديد.');
        errorLogger.error({
          message: errorMsg,
          error: e,
          origin: 'initializeProjectListRenderer.createNewProjectClick'
        });
        notificationServiceAPI?.showError(errorMsg); // استخدم notificationServiceAPI هنا
      }
    };
    createNewProjectButton.addEventListener('click', handleCreateNewProjectClickCallback);
  } else {
    errorLogger.warn({
      message: (localizationService?.translate('warning.button.create.project.not.found', 'Create New Project button (go-to-editor-btn) not found.') || 'زر "إنشاء فيديو جديد" (go-to-editor-btn) غير موجود.'),
      origin: 'initializeProjectListRenderer'
    });
  }
  // --- نهاية الكود المضاف ---

  // استخدام الدوال المُهيأة داخل projectListRenderer للوصول إلى DOMElements
  const _renderProjectsLocal = (projects) => projectListRenderer._renderProjects(projects);


  // إضافة مستمعي الأحداث للحاوية
  // تأكد أن projectListRenderer._handleListInteraction و _handleKeyboardNavigation تم ربطهما بالسياق الصحيح
  // أو اجعلهما دوال عادية يتم تمرير dependencies إليها
  const boundHandleListInteraction = projectListRenderer._handleListInteraction.bind(projectListRenderer);
  const boundHandleKeyboardNavigation = projectListRenderer._handleKeyboardNavigation.bind(projectListRenderer);


  if (projectsListContainer) {
    projectsListContainer.addEventListener('click', boundHandleListInteraction);
    projectsListContainer.addEventListener('keydown', boundHandleKeyboardNavigation);
  }

  // الاشتراك في تغييرات الحالة
  const unsubscribeState = stateStore.subscribe((newState, oldState) => {
    // تحقق من وجود newState و oldState وخصائصهما قبل الوصول إليها
    const newScreen = newState?.activeScreen;
    const oldScreen = oldState?.activeScreen;
    const newProjects = newState?.savedProjects;

    if (newScreen === 'initial' && (newScreen !== oldScreen || newProjects !== oldState?.savedProjects)) {
        if(newProjects !== undefined) { // تأكد أن newProjects ليست undefined
            _renderProjectsLocal(newProjects);
        }
    }
  });
  
  // تهيئة عرض المشاريع عند التحميل الأول
  const currentState = stateStore.getState();
  if (currentState?.activeScreen === 'initial' && currentState?.savedProjects) {
    _renderProjectsLocal(currentState.savedProjects);
  }

  return {
    cleanup: () => {
      unsubscribeState();
      if (projectsListContainer) {
        projectsListContainer.removeEventListener('click', boundHandleListInteraction);
        projectsListContainer.removeEventListener('keydown', boundHandleKeyboardNavigation);
      }
      if (createNewProjectButton && handleCreateNewProjectClickCallback) {
        createNewProjectButton.removeEventListener('click', handleCreateNewProjectClickCallback);
      }
      if (typeof projectListRenderer.cleanup === 'function') {
        projectListRenderer.cleanup();
      }
       errorLogger.logInfo({message:'[ProjectListRenderer] Cleaned up.', origin:'cleanup'});
    }
  };
}
