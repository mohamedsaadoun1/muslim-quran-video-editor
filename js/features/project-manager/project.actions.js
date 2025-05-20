// js/features/project-manager/project.actions.js
import { 
  ACTIONS, 
  EVENTS, 
  DEFAULT_PROJECT_SCHEMA,
  LS_KEY_SAVED_PROJECTS,
  APP_CONSTANTS
} from '../../config/app.constants.js';
import DOMElements from '../../core/dom-elements.js';
import notificationPresenter from '../../shared-ui-components/notification.presenter.js';
import modalFactory from '../../shared-ui-components/modal.factory.js';
import timeFormatter from '../../utils/time.formatter.js';

/**
 * وظائف إدارة المشاريع
 */
const projectActions = (() => {
  // الاعتمادات
  let dependencies = {
    stateStore: { 
      getState: () => ({ 
        savedProjects: [], 
        currentProject: null, 
        activeScreen: 'initial' 
      }),
      dispatch: () => {},
      subscribe: () => (() => {})
    },
    localStorageAdapter: { 
      getItem: () => [], 
      setItem: () => true, 
      removeItem: () => {} 
    },
    errorLogger: console,
    notificationServiceAPI: { 
      showSuccess: (msg) => {}, 
      showError: (msg) => {}, 
      showWarning: (msg) => {}
    },
    eventAggregator: { publish: () => {}, subscribe: () => ({ unsubscribe: () => {} }) },
    localizationService: { translate: key => key }
  };
  
  // الحالة الحالية للمشروع
  let currentProjectState = {
    id: null,
    title: null,
    createdAt: null,
    updatedAt: null
  };
  
  /**
   * إنشاء معرف مشروع جديد
   * @private
   * @returns {string} - معرف المشروع
   */
  function _generateProjectId() {
    return `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * إنشاء كائن مشروع جديد
   * @param {Object} initialOverrides - الإعدادات الافتراضية
   * @returns {Object} - المشروع الجديد
   */
  function createNewProjectObject(initialOverrides = {}) {
    const now = Date.now();
    const defaultProject = JSON.parse(JSON.stringify(DEFAULT_PROJECT_SCHEMA));
    
    return {
      ...defaultProject,
      id: _generateProjectId(),
      title: initialOverrides.title || defaultProject.title || 'مشروع جديد',
      createdAt: now,
      updatedAt: now,
      ...initialOverrides,
      quranSelection: { 
        ...defaultProject.quranSelection, 
        ...(initialOverrides.quranSelection || {}) 
      },
      background: { 
        ...defaultProject.background, 
        ...(initialOverrides.background || {}) 
      },
      textStyle: { 
        ...defaultProject.textStyle, 
        ...(initialOverrides.textStyle || {}) 
      },
      videoComposition: { 
        ...defaultProject.videoComposition, 
        ...(initialOverrides.videoComposition || {}) 
      },
      exportSettings: { 
        ...defaultProject.exportSettings, 
        ...(initialOverrides.exportSettings || {}) 
      }
    };
  }
  
  /**
   * تحميل مشروع جديد في المحرر
   */
  function loadNewProject() {
    try {
      const newProject = createNewProjectObject();
      dependencies.stateStore.dispatch(ACTIONS.LOAD_PROJECT, newProject);
      dependencies.eventAggregator.publish(EVENTS.PROJECT_LOADED, newProject);
      dependencies.notificationServiceAPI?.showSuccess(
        dependencies.localizationService.translate('project.loaded.new') || 'تم تحميل مشروع جديد.'
      );
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.project.create') || 'فشل في إنشاء مشروع جديد.',
        origin: 'ProjectActions.loadNewProject'
      });
      
      dependencies.notificationServiceAPI?.showError(
        dependencies.localizationService.translate('project.create.failed') || 'فشل في إنشاء مشروع جديد.'
      );
    }
  }
  
  /**
   * تحميل مشروع موجود من خلال المعرف
   * @param {string} projectId - معرف المشروع
   */
  function loadExistingProjectById(projectId) {
    if (!projectId) {
      dependencies.errorLogger.warn({
        message: dependencies.localizationService.translate('warning.project.id.required') || 'معرف المشروع غير موجود.',
        origin: 'ProjectActions.loadExistingProjectById'
      });
      return;
    }
    
    try {
      const savedProjects = dependencies.localStorageAdapter.getItem(LS_KEY_SAVED_PROJECTS, []);
      const projectToLoad = savedProjects.find(p => p.id === projectId);
      
      if (projectToLoad) {
        const hydratedProject = _deepHydrateProject(projectToLoad);
        dependencies.stateStore.dispatch(ACTIONS.LOAD_PROJECT, hydratedProject);
        dependencies.eventAggregator.publish(EVENTS.PROJECT_LOADED, hydratedProject);
        
        dependencies.notificationServiceAPI?.showSuccess(
          dependencies.localizationService.translate('project.loaded.success', { title: hydratedProject.title }) || 
          `تم تحميل المشروع "${hydratedProject.title}" بنجاح.`
        );
      } else {
        dependencies.errorLogger.warn({
          message: dependencies.localizationService.translate('warning.project.not.found', { id: projectId }) || 
                   `المشروع غير موجود: ${projectId}`,
          origin: 'ProjectActions.loadExistingProjectById'
        });
        
        dependencies.notificationServiceAPI?.showError(
          dependencies.localizationService.translate('project.load.failed', { id: projectId }) || 
          `فشل في تحميل المشروع ${projectId}`
        );
      }
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.project.load', { id: projectId }) || 
                 `فشل في تحميل المشروع ${projectId}`,
        origin: 'ProjectActions.loadExistingProjectById'
      });
      
      dependencies.notificationServiceAPI?.showError(
        dependencies.localizationService.translate('project.load.failed', { id: projectId }) || 
        `فشل في تحميل المشروع ${projectId}`
      );
    }
  }
  
  /**
   * حفظ المشروع الحالي إلى التخزين المحلي
   * @returns {boolean} هل تمت العملية؟
   */
  function saveCurrentProject() {
    const currentState = dependencies.stateStore.getState();
    const currentProject = currentState.currentProject;
    
    if (!currentProject || !currentProject.id) {
      dependencies.errorLogger.warn({
        message: dependencies.localizationService.translate('warning.project.no.current') || 'لا يوجد مشروع حالي.',
        origin: 'ProjectActions.saveCurrentProject'
      });
      
      dependencies.notificationServiceAPI?.showError(
        dependencies.localizationService.translate('project.save.no.current') || 'لا يوجد مشروع حالي للحفظ.'
      );
      
      return false;
    }
    
    try {
      // الحصول على عنوان المشروع من DOM
      let projectTitleFromDOM = DOMElements.getProjectTitleInput?.textContent?.trim() || 
                               currentProject.title || 
                               DEFAULT_PROJECT_SCHEMA.title;
      
      // تحديث بيانات المشروع
      const projectToSave = {
        ...currentProject,
        title: projectTitleFromDOM,
        updatedAt: Date.now()
      };
      
      // قراءة البيانات من التخزين
      let savedProjects = dependencies.localStorageAdapter.getItem(LS_KEY_SAVED_PROJECTS, []);
      
      // التحقق من وجود المشروع
      const existingProjectIndex = savedProjects.findIndex(p => p.id === projectToSave.id);
      
      // تحديث أو إضافة المشروع
      if (existingProjectIndex > -1) {
        savedProjects[existingProjectIndex] = projectToSave;
      } else {
        savedProjects.push(projectToSave);
      }
      
      // ترتيب المشاريع حسب التاريخ
      savedProjects.sort((a, b) => {
        return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
      });
      
      // حفظ البيانات
      const success = dependencies.localStorageAdapter.setItem(LS_KEY_SAVED_PROJECTS, savedProjects);
      
      if (success) {
        dependencies.stateStore.dispatch(ACTIONS.UPDATE_SAVED_PROJECTS_LIST, savedProjects);
        dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
          title: projectTitleFromDOM,
          updatedAt: projectToSave.updatedAt
        });
        
        dependencies.notificationServiceAPI?.showSuccess(
          dependencies.localizationService.translate('project.saved.success', { title: projectTitleFromDOM }) || 
          `تم حفظ مشروع "${projectTitleFromDOM}" بنجاح!`
        );
        
        dependencies.eventAggregator.publish(EVENTS.PROJECT_SAVED, projectToSave);
        return true;
      } else {
        throw new Error('فشل في كتابة البيانات إلى التخزين المحلي.');
      }
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.project.save', { title: currentProject.title }) || 
                 'فشل حفظ المشروع.',
        origin: 'ProjectActions.saveCurrentProject'
      });
      
      dependencies.notificationServiceAPI?.showError(
        dependencies.localizationService.translate('project.save.failed', { title: currentProject.title }) || 
        `فشل حفظ المشروع "${currentProject.title}". قد تكون مساحة التخزين ممتلئة.`
      );
      
      return false;
    }
  }
  
  /**
   * حذف مشروع من خلال معرفه
   * @param {string} projectId - معرف المشروع
   * @returns {boolean} هل تمت العملية؟
   */
  function deleteProjectById(projectId) {
    if (!projectId) {
      dependencies.errorLogger.warn({
        message: dependencies.localizationService.translate('warning.project.id.required') || 'معرف المشروع غير موجود.',
        origin: 'ProjectActions.deleteProjectById'
      });
      return false;
    }
    
    try {
      // قراءة البيانات من التخزين
      let savedProjects = dependencies.localStorageAdapter.getItem(LS_KEY_SAVED_PROJECTS, []);
      const projectIndex = savedProjects.findIndex(p => p.id === projectId);
      
      if (projectIndex === -1) {
        dependencies.errorLogger.warn({
          message: dependencies.localizationService.translate('warning.project.not.found', { id: projectId }) || 
                   `المشروع غير موجود: ${projectId}`,
          origin: 'ProjectActions.deleteProjectById'
        });
        return false;
      }
      
      // إظهار نافذة التأكيد
      const projectToDelete = savedProjects[projectIndex];
      const confirmed = dependencies.modalFactoryAPI.showConfirm({
        title: dependencies.localizationService.translate('project.delete.confirm.title') || 'تأكيد الحذف',
        message: dependencies.localizationService.translate('project.delete.confirm.message', {
          projectName: projectToDelete?.title || projectId
        }) || `هل أنت متأكد من حذف مشروع "${projectToDelete?.title || projectId}"؟ هذا الإجراء لا يمكن التراجع عنه.`,
        confirmText: dependencies.localizationService.translate('button.delete') || 'حذف',
        cancelText: dependencies.localizationService.translate('button.cancel') || 'إلغاء',
        type: 'danger'
      });
      
      if (confirmed) {
        // إزالة المشروع من القائمة
        savedProjects.splice(projectIndex, 1);
        const success = dependencies.localStorageAdapter.setItem(LS_KEY_SAVED_PROJECTS, savedProjects);
        
        if (success) {
          dependencies.stateStore.dispatch(ACTIONS.UPDATE_SAVED_PROJECTS_LIST, savedProjects);
          
          // إذا كان المشروع المحذوف هو المشروع الحالي، قم بتفريغه
          const currentState = dependencies.stateStore.getState();
          if (currentState.currentProject?.id === projectId) {
            dependencies.stateStore.dispatch(ACTIONS.LOAD_PROJECT, null);
          }
          
          dependencies.eventAggregator.publish(EVENTS.PROJECT_DELETED, { projectId });
          dependencies.notificationServiceAPI?.showSuccess(
            dependencies.localizationService.translate('project.deleted.success', { id: projectId }) || 
            `تم حذف المشروع ${projectId} بنجاح.`
          );
          return true;
        } else {
          throw new Error('فشل في تحديث التخزين المحلي بعد الحذف.');
        }
      }
      
      return false;
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.project.delete', { id: projectId }) || 
                 `فشل في حذف المشروع ${projectId}`,
        origin: 'ProjectActions.deleteProjectById'
      });
      
      dependencies.notificationServiceAPI?.showError(
        dependencies.localizationService.translate('project.delete.failed', { id: projectId }) || 
        `فشل في حذف المشروع ${projectId}`
      );
      
      return false;
    }
  }
  
  /**
   * تحميل كل المشاريع المحفوظة من التخزين
   */
  function loadAllSavedProjectsFromStorage() {
    try {
      const projects = dependencies.localStorageAdapter.getItem(LS_KEY_SAVED_PROJECTS, []);
      
      // تحديث كل المشاريع بإضافة الحقول الافتراضية
      const defaultStructure = JSON.parse(JSON.stringify(DEFAULT_PROJECT_SCHEMA));
      const hydratedProjects = projects.map(p => ({
        ...defaultStructure,
        ...p,
        quranSelection: { 
          ...defaultStructure.quranSelection, 
          ...(p.quranSelection || {}) 
        },
        background: { 
          ...defaultStructure.background, 
          ...(p.background || {}) 
        },
        textStyle: { 
          ...defaultStructure.textStyle, 
          ...(p.textStyle || {}) 
        },
        videoComposition: { 
          ...defaultStructure.videoComposition, 
          ...(p.videoComposition || {}) 
        },
        exportSettings: { 
          ...defaultStructure.exportSettings, 
          ...(p.exportSettings || {}) 
        }
      })).sort((a, b) => {
        return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
      });
      
      // تحديث الحالة
      dependencies.stateStore.dispatch(ACTIONS.UPDATE_SAVED_PROJECTS_LIST, hydratedProjects);
      
      // إرسال إشعار بتحميل المشاريع
      dependencies.eventAggregator.publish(EVENTS.PROJECTS_LOADED, {
        count: hydratedProjects.length,
        timestamp: Date.now()
      });
      
      return hydratedProjects;
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.projects.load') || 'فشل في تحميل المشاريع من التخزين.',
        origin: 'ProjectActions.loadAllSavedProjectsFromStorage'
      });
      
      dependencies.notificationServiceAPI?.showError(
        dependencies.localizationService.translate('project.load.failed') || 'فشل في تحميل المشاريع.'
      );
      
      return [];
    }
  }
  
  /**
   * دمج المشروع مع الإعدادات الافتراضية
   * @param {Object} project - المشروع المراد دمجه
   * @returns {Object} المشروع بعد الدمج
   */
  function _deepHydrateProject(project) {
    const defaultStructure = JSON.parse(JSON.stringify(DEFAULT_PROJECT_SCHEMA));
    
    return {
      ...defaultStructure,
      ...project,
      quranSelection: { 
        ...defaultStructure.quranSelection, 
        ...(project.quranSelection || {}) 
      },
      background: { 
        ...defaultStructure.background, 
        ...(project.background || {}) 
      },
      textStyle: { 
        ...defaultStructure.textStyle, 
        ...(project.textStyle || {}) 
      },
      videoComposition: { 
        ...defaultStructure.videoComposition, 
        ...(project.videoComposition || {}) 
      },
      exportSettings: { 
        ...defaultStructure.exportSettings, 
        ...(project.exportSettings || {}) 
      }
    };
  }
  
  /**
   * دمج الحالة الحالية مع الحالة الجديدة
   * @param {Object} currentState - الحالة الحالية
   * @param {Object} newState - الحالة الجديدة
   * @returns {Object} الحالة المدمجة
   */
  function _mergeProjectState(currentState, newState) {
    return {
      ...currentState,
      ...newState
    };
  }
  
  /**
   * تحديد الاعتمادات
   * @param {Object} injectedDeps - الاعتمادات
   */
  function _setDependencies(injectedDeps) {
    Object.keys(injectedDeps).forEach(key => {
      if (injectedDeps[key]) {
        dependencies[key] = injectedDeps[key];
      }
    });
  }
  
  return {
    _setDependencies,
    createNewProjectObject,
    loadNewProject,
    loadExistingProjectById,
    saveCurrentProject,
    deleteProjectById,
    loadAllSavedProjectsFromStorage
  };
})();

/**
 * وظيفة التهيئة
 * @param {Object} deps - الاعتمادات
 * @returns {Object} واجهة عامة للوحدة
 */
export function initializeProjectActions(deps) {
  projectActions._setDependencies(deps);
  
  const {
    stateStore,
    localStorageAdapter,
    errorLogger,
    notificationServiceAPI,
    eventAggregator
  } = deps;
  
  // تعيين مراجع العناصر
  projectActions.projectTitleInputRef = DOMElements.projectTitleInput || DOMElements.getProjectTitleInput;
  projectActions.projectListContainerRef = DOMElements.projectsListContainer;
  projectActions.projectCardRefs = DOMElements.projectCards;
  
  // تحميل المشاريع المحفوظة
  const loadedProjects = projectActions.loadAllSavedProjectsFromStorage();
  
  // إعداد مستمعي الأحداث
  eventAggregator.subscribe(EVENTS.REQUEST_PROJECT_SAVE, () => {
    projectActions.saveCurrentProject();
  });
  
  eventAggregator.subscribe(EVENTS.NAVIGATE_TO_EDITOR_NEW_PROJECT, () => {
    projectActions.loadNewProject();
  });
  
  eventAggregator.subscribe(EVENTS.PROJECT_LOADED, (project) => {
    currentProjectState = {
      id: project.id,
      title: project.title,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    };
  });
  
  eventAggregator.subscribe(EVENTS.PROJECT_DELETED, ({ projectId }) => {
    if (currentProjectState.id === projectId) {
      currentProjectState = { id: null, title: null, createdAt: null, updatedAt: null };
    }
  });
  
  // إرجاع الواجهة العامة
  return {
    loadNewProject: projectActions.loadNewProject,
    loadExistingProjectById: (projectId) => projectActions.loadExistingProjectById(projectId),
    saveCurrentProject: projectActions.saveCurrentProject,
    deleteProjectById: (projectId) => projectActions.deleteProjectById(projectId),
    loadAllSavedProjectsFromStorage: projectActions.loadAllSavedProjectsFromStorage
  };
}
