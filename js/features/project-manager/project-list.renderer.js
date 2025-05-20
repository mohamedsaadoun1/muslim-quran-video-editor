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
import notificationPresenter from '../../shared-ui-components/notification.presenter.js';
import modalFactory from '../../shared-ui-components/modal.factory.js';

/**
 * مُنشئ قائمة المشاريع
 */
const projectListRenderer = (() => {
  // مراجع عناصر DOM
  let listContainer = null;
  let noProjectsMsgElement = null;
  
  // الاعتمادات
  let dependencies = {
    stateStore: { 
      getState: () => ({ 
        savedProjects: [],
        activeScreen: 'initial',
        currentProject: null
      }),
      dispatch: () => {},
      subscribe: () => (() => {})
    },
    eventAggregator: { 
      publish: () => {}, 
      subscribe: () => ({ unsubscribe: () => {} }) 
    },
    errorLogger: console,
    localizationService: { 
      translate: (key, fallback) => fallback || key,
      getCurrentLanguage: () => 'ar'
    },
    modalFactoryAPI: { 
      showConfirm: async () => false 
    }
  };
  
  /**
   * إنشاء بطاقة مشروع
   * @param {Object} project - بيانات المشروع
   * @returns {HTMLElement} - بطاقة المشروع
   */
  function _createProjectCard(project) {
    if (!project || !project.id) {
      dependencies.errorLogger.warn({
        message: 'لا يمكن إنشاء بطاقة مشروع بدون بيانات صحيحة',
        origin: 'ProjectListRenderer._createProjectCard',
        context: { project }
      });
      return null;
    }
    
    try {
      // إنشاء العناصر الأساسية
      const card = createElement('div', {
        classNames: ['project-card'],
        attributes: { 
          'data-project-id': project.id,
          'tabindex': '0',
          'role': 'button',
          'aria-label': dependencies.localizationService.translate('project.card.aria.label', {
            title: project.title || 'مشروع جديد',
            updated: project.updatedAt ? timeFormatter.format(project.updatedAt, 'datetime') : 'جديد'
          }) || `مشروع ${project.title || 'بدون عنوان'} - تم التحديث: ${project.updatedAt ? new Date(project.updatedAt).toLocaleString() : 'جديد'}`,
          'aria-role': 'button'
        }
      });
      
      // عنوان المشروع
      const title = createElement('h3', {
        textContent: project.title || DEFAULT_PROJECT_SCHEMA.title
      });
      
      // معلومات إضافية عن المشروع
      const meta = createElement('div', { classNames: ['project-meta'] });
      
      // آخر تحديث
      const lastUpdated = project.updatedAt ? 
        timeFormatter.format(project.updatedAt, 'datetime') : 
        dependencies.localizationService.translate('project.never.updated') || 'لم يتم التحديث';
        
      const dateSpan = createElement('span', {
        textContent: `${dependencies.localizationService.translate('project.last.updated') || 'آخر تحديث'}: ${lastUpdated}`
      });
      
      // معلومات السورة والآيات
      if (project.quranSelection && project.quranSelection.surahId) {
        const surahInfo = createElement('span', {
          textContent: `${dependencies.localizationService.translate('project.surah') || 'السورة'}: ${project.quranSelection.surahId}, ${dependencies.localizationService.translate('project.verses') || 'الآيات'}: ${project.quranSelection.startAyah}-${project.quranSelection.endAyah}`
        });
        meta.appendChild(surahInfo);
      }
      
      // إضافة العناصر إلى البطاقة
      card.appendChild(title);
      meta.appendChild(dateSpan);
      card.appendChild(meta);
      
      // عناصر الإجراءات
      const actionsWrapper = createElement('div', { classNames: ['project-actions'] });
      
      // زر الحذف
      const deleteBtn = createElement('button', {
        classNames: ['project-action-btn', 'delete-project-btn'],
        attributes: {
          'title': dependencies.localizationService.translate('button.delete.project') || 'حذف المشروع'
        }
      });
      
      deleteBtn.innerHTML = `<i class="fas fa-trash-alt"></i> ${dependencies.localizationService.translate('button.delete') || 'حذف'}`;
      actionsWrapper.appendChild(deleteBtn);
      
      // زر التكرار (في المستقبل)
      if (APP_CONSTANTS.ENABLE_PROJECT_DUPLICATION) {
        const duplicateBtn = createElement('button', {
          classNames: ['project-action-btn', 'duplicate-project-btn'],
          attributes: {
            'title': dependencies.localizationService.translate('button.duplicate.project') || 'تكرار المشروع'
          }
        });
        
        duplicateBtn.innerHTML = `<i class="fas fa-copy"></i> ${dependencies.localizationService.translate('button.duplicate') || 'تكرار'}`;
        actionsWrapper.appendChild(duplicateBtn);
      }
      
      // زر المشاركة (في المستقبل)
      if (APP_CONSTANTS.ENABLE_PROJECT_SHARING) {
        const shareBtn = createElement('button', {
          classNames: ['project-action-btn', 'share-project-btn'],
          attributes: {
            'title': dependencies.localizationService.translate('button.share.project') || 'مشاركة المشروع'
          }
        });
        
        shareBtn.innerHTML = `<i class="fas fa-share-alt"></i> ${dependencies.localizationService.translate('button.share') || 'مشاركة'}`;
        actionsWrapper.appendChild(shareBtn);
      }
      
      card.appendChild(actionsWrapper);
      
      // إضافة معلومات إضافية (في المستقبل)
      if (APP_CONSTANTS.SHOW_PROJECT_PREVIEW) {
        const preview = createElement('div', { classNames: ['project-preview'] });
        card.appendChild(preview);
      }
      
      return card;
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.project.card.create') || 
                 'فشل في إنشاء بطاقة المشروع',
        origin: 'ProjectListRenderer._createProjectCard'
      });
      
      return null;
    }
  }
  
  /**
   * عرض قائمة المشاريع
   * @param {Array} projects - قائمة المشاريع
   */
  function _renderProjects(projects) {
    if (!listContainer || !noProjectsMsgElement) {
      dependencies.errorLogger.warn({
        message: dependencies.localizationService.translate('warning.projects.container.not.found') || 
                 'حاوية المشاريع غير موجودة. لا يمكن عرض المشاريع.',
        origin: 'ProjectListRenderer._renderProjects'
      });
      return;
    }
    
    try {
      // مسح الحاوية الحالية
      listContainer.innerHTML = '';
      
      // التحقق من وجود مشاريع
      if (projects && projects.length > 0) {
        // ترتيب المشاريع حسب التاريخ
        const sortedProjects = [...projects].sort((a, b) => {
          return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
        });
        
        // إنشاء البطاقات
        sortedProjects.forEach(project => {
          const card = _createProjectCard(project);
          if (card) listContainer.appendChild(card);
        });
        
        // إخفاء رسالة "لا توجد مشاريع"
        noProjectsMsgElement.style.display = 'none';
      } else {
        // لا توجد مشاريع
        noProjectsMsgElement.style.display = 'block';
        noProjectsMsgElement.textContent = dependencies.localizationService.translate('project.list.empty') || 
                                            'لا توجد مشاريع محفوظة بعد.';
      }
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.projects.render') || 
                 'فشل في عرض المشاريع',
        origin: 'ProjectListRenderer._renderProjects'
      });
    }
  }
  
  /**
   * معالجة تفاعل المستخدم مع القائمة
   * @param {Event} event - حدث المستخدم
   */
  async function _handleListInteraction(event) {
    const card = event.target.closest('.project-card');
    
    if (!card) return;
    
    const projectId = card.dataset.projectId;
    if (!projectId) return;
    
    // معالجة الحذف
    if (event.target.closest('.delete-project-btn')) {
      try {
        const projectToDelete = dependencies.stateStore.getState().savedProjects.find(p => p.id === projectId);
        
        if (!projectToDelete) {
          dependencies.errorLogger.warn({
            message: dependencies.localizationService.translate('warning.project.not.found', { id: projectId }) || 
                     `المشروع غير موجود: ${projectId}`,
            origin: 'ProjectListRenderer._handleListInteraction'
          });
          return;
        }
        
        // إظهار نافذة التأكيد
        const confirmed = await dependencies.modalFactoryAPI.showConfirm({
          title: dependencies.localizationService.translate('project.delete.confirm.title') || 
                 'تأكيد الحذف',
          message: dependencies.localizationService.translate('project.delete.confirm.message', {
            projectName: projectToDelete?.title || projectId
          }) || 
          `هل أنت متأكد أنك تريد حذف مشروع "${projectToDelete?.title || projectId}"؟ هذا الإجراء لا يمكن التراجع عنه.`,
          confirmText: dependencies.localizationService.translate('button.delete') || 'حذف',
          cancelText: dependencies.localizationService.translate('button.cancel') || 'إلغاء',
          type: 'danger'
        });
        
        if (confirmed) {
          dependencies.stateStore.dispatch(ACTIONS.DELETE_PROJECT_FROM_LIST, projectId);
          
          // إرسال إشعار بنجاح الحذف
          dependencies.notificationServiceAPI?.showSuccess(
            dependencies.localizationService.translate('project.deleted.success') || 'تم حذف المشروع بنجاح.'
          );
          
          // نشر حدث لتخطيط التطبيق
          dependencies.eventAggregator.publish(EVENTS.PROJECT_DELETED, { projectId });
        }
      } catch (error) {
        dependencies.errorLogger.error({
          error,
          message: dependencies.localizationService.translate('error.project.delete', { id: projectId }) || 
                   `فشل في حذف المشروع ${projectId}`,
          origin: 'ProjectListRenderer._handleListInteraction'
        });
        
        dependencies.notificationServiceAPI?.showError(
          dependencies.localizationService.translate('project.delete.failed', { id: projectId }) || 
          `فشل في حذف المشروع ${projectId}`
        );
      }
    } 
    // معالجة التكرار
    else if (event.target.closest('.duplicate-project-btn') && APP_CONSTANTS.ENABLE_PROJECT_DUPLICATION) {
      try {
        const projectToDuplicate = dependencies.stateStore.getState().savedProjects.find(p => p.id === projectId);
        
        if (!projectToDuplicate) {
          dependencies.errorLogger.warn({
            message: dependencies.localizationService.translate('warning.project.not.found', { id: projectId }) || 
                     `المشروع غير موجود: ${projectId}`,
            origin: 'ProjectListRenderer._handleListInteraction'
          });
          return;
        }
        
        // نسخ المشروع
        const duplicatedProject = {
          ...projectToDuplicate,
          id: `dup-${Date.now()}`,
          title: `${projectToDuplicate.title} (${dependencies.localizationService.translate('project.copy') || 'نسخ'})`,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        
        // إرسال الحدث
        dependencies.eventAggregator.publish(EVENTS.PROJECT_DUPLICATED, { project: duplicatedProject });
        
        // إضافة المشروع الجديد إلى الحالة
        dependencies.stateStore.dispatch(ACTIONS.ADD_PROJECT, duplicatedProject);
        
        // إشعار نجاح
        dependencies.notificationServiceAPI?.showSuccess(
          dependencies.localizationService.translate('project.duplicated.success') || 'تم تكرار المشروع بنجاح.'
        );
      } catch (error) {
        dependencies.errorLogger.error({
          error,
          message: dependencies.localizationService.translate('error.project.duplicate', { id: projectId }) || 
                   `فشل في تكرار المشروع ${projectId}`,
          origin: 'ProjectListRenderer._handleListInteraction'
        });
        
        dependencies.notificationServiceAPI?.showError(
          dependencies.localizationService.translate('project.duplicate.failed', { id: projectId }) || 
          `فشل في تكرار المشروع ${projectId}`
        );
      }
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
        dependencies.eventAggregator.publish(EVENTS.PROJECT_LOADED, { project: projectToLoad });
        
        // تحديث شاشة التحرير
        if (dependencies.screenNavigator) {
          dependencies.screenNavigator.navigateTo('editor');
        }
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
  
  /**
   * معالجة تفاعل لوحة المفاتيح
   * @param {Event} event - حدث لوحة المفاتيح
   */
  function _handleKeyboardNavigation(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      const card = event.target.closest('.project-card');
      if (card && card.dataset.projectId) {
        event.preventDefault(); // منع المسافة من التمرير
        _handleListInteraction(event);
      }
    }
  }
  
  /**
   * تحديد الاعتمادات
   * @param {Object} injectedDeps - الاعتمادات
   */
  function _setDependencies(injectedDeps) {
    if (injectedDeps) {
      Object.keys(injectedDeps).forEach(key => {
        if (injectedDeps[key]) {
          dependencies[key] = injectedDeps[key];
        }
      });
    }
  }
  
  /**
   * تنظيف الموارد
   */
  function cleanup() {
    // إزالة المستمعين
    if (listContainer) {
      listContainer.removeEventListener('click', _handleListInteraction);
      listContainer.removeEventListener('keydown', _handleKeyboardNavigation);
    }
  }
  
  return {
    _setDependencies,
    _renderProjects: _renderProjects,
    _handleListInteraction,
    cleanup
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
    screenNavigator
  } = deps;
  
  // تعيين مراجع العناصر
  projectListRenderer.listContainerRef = DOMElements.projectsListContainer;
  projectListRenderer.noProjectsMsgElRef = DOMElements.noProjectsMessage;
  projectListRenderer.screenNavigator = screenNavigator;
  
  // التحقق من وجود الحاوية
  if (!projectListRenderer.listContainerRef || !projectListRenderer.noProjectsMsgElRef) {
    errorLogger.warn({
      message: 'حاوية المشاريع غير موجودة. لا يمكن تهيئة عرض المشاريع.',
      origin: 'initializeProjectListRenderer'
    });
    return {
      cleanup: () => {}
    };
  }
  
  // عرض المشاريع
  const _renderProjectsLocal = (projects) => {
    if (!projectListRenderer.listContainerRef || !projectListRenderer.noProjectsMsgElRef) return;
    
    try {
      projectListRenderer.listContainerRef.innerHTML = '';
      
      if (projects && projects.length > 0) {
        // ترتيب المشاريع حسب التاريخ
        const sortedProjects = [...projects].sort((a, b) => {
          return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
        });
        
        // إنشاء بطاقات المشاريع
        sortedProjects.forEach(project => {
          const card = (function _createProjectCardLocal(project) {
            if (!project || !project.id) return null;
            
            try {
              const card = createElement('div', {
                classNames: ['project-card'],
                attributes: { 
                  'data-project-id': project.id,
                  'tabindex': '0',
                  'role': 'button',
                  'aria-label': deps.localizationService.translate('project.card.aria.label', {
                    title: project.title || 'مشروع جديد',
                    updated: project.updatedAt ? timeFormatter.format(project.updatedAt, 'datetime') : 'جديد'
                  }) || `مشروع ${project.title || 'بدون عنوان'} - تم التحديث: ${project.updatedAt ? new Date(project.updatedAt).toLocaleString() : 'جديد'}`
                }
              });
              
              // عنوان المشروع
              const title = createElement('h3', {
                textContent: project.title || DEFAULT_PROJECT_SCHEMA.title
              });
              
              // معلومات إضافية
              const meta = createElement('div', { classNames: ['project-meta'] });
              
              // آخر تحديث
              const lastUpdated = project.updatedAt ? 
                timeFormatter.format(project.updatedAt, 'datetime') : 
                deps.localizationService.translate('project.never.updated') || 'لم يتم التحديث';
                
              const dateSpan = createElement('span', {
                textContent: `${deps.localizationService.translate('project.last.updated') || 'آخر تحديث'}: ${lastUpdated}`
              });
              
              // إضافة العناصر إلى البطاقة
              card.appendChild(title);
              meta.appendChild(dateSpan);
              
              // معلومات السورة والآيات
              if (project.quranSelection && project.quranSelection.surahId) {
                const surahInfo = createElement('span', {
                  textContent: `${deps.localizationService.translate('project.surah') || 'السورة'}: ${project.quranSelection.surahId}, ${deps.localizationService.translate('project.verses') || 'الآيات'}: ${project.quranSelection.startAyah}-${project.quranSelection.endAyah}`
                });
                meta.appendChild(surahInfo);
              }
              
              card.appendChild(meta);
              
              // عناصر الإجراءات
              const actionsWrapper = createElement('div', { classNames: ['project-actions'] });
              
              // زر الحذف
              const deleteBtn = createElement('button', {
                classNames: ['project-action-btn', 'delete-project-btn'],
                attributes: {
                  'title': deps.localizationService.translate('button.delete.project') || 'حذف المشروع'
                }
              });
              
              deleteBtn.innerHTML = `<i class="fas fa-trash-alt"></i> ${deps.localizationService.translate('button.delete') || 'حذف'}`;
              actionsWrapper.appendChild(deleteBtn);
              
              // زر التكرار
              if (APP_CONSTANTS.ENABLE_PROJECT_DUPLICATION) {
                const duplicateBtn = createElement('button', {
                  classNames: ['project-action-btn', 'duplicate-project-btn'],
                  attributes: {
                    'title': deps.localizationService.translate('button.duplicate.project') || 'تكرار المشروع'
                  }
                });
                
                duplicateBtn.innerHTML = `<i class="fas fa-copy"></i> ${deps.localizationService.translate('button.duplicate') || 'تكرار'}`;
                actionsWrapper.appendChild(duplicateBtn);
              }
              
              // زر المشاركة
              if (APP_CONSTANTS.ENABLE_PROJECT_SHARING) {
                const shareBtn = createElement('button', {
                  classNames: ['project-action-btn', 'share-project-btn'],
                  attributes: {
                    'title': deps.localizationService.translate('button.share.project') || 'مشاركة المشروع'
                  }
                });
                
                shareBtn.innerHTML = `<i class="fas fa-share-alt"></i> ${deps.localizationService.translate('button.share') || 'مشاركة'}`;
                actionsWrapper.appendChild(shareBtn);
              }
              
              card.appendChild(actionsWrapper);
              return card;
            } catch (error) {
              deps.errorLogger.error({
                error,
                message: deps.localizationService.translate('error.project.card.create') || 'فشل في إنشاء بطاقة المشروع',
                origin: 'ProjectListRenderer._createProjectCardLocal'
              });
              return null;
            }
          })(project);
          
          if (card) projectListRenderer.listContainerRef.appendChild(card);
        });
        
        // إخفاء رسالة "لا توجد مشاريع"
        projectListRenderer.noProjectsMsgElRef.style.display = 'none';
      } else {
        // لا توجد مشاريع
        projectListRenderer.noProjectsMsgElRef.style.display = 'block';
        projectListRenderer.noProjectsMsgElRef.textContent = deps.localizationService.translate('project.list.empty') || 'لا توجد مشاريع محفوظة بعد.';
      }
    } catch (error) {
      deps.errorLogger.error({
        error,
        message: deps.localizationService.translate('error.projects.render') || 'فشل في عرض المشاريع',
        origin: 'initializeProjectListRenderer._renderProjectsLocal'
      });
    }
  }
  
  // إضافة مستمعي الأحداث
  if (projectListRenderer.listContainerRef) {
    projectListRenderer.listContainerRef.addEventListener('click', projectListRenderer._handleListInteraction);
    projectListRenderer.listContainerRef.addEventListener('keydown', _handleKeyboardNavigation);
  }
  
  // الاشتراك في تغييرات الحالة
  const unsubscribeState = stateStore.subscribe((newState) => {
    // فقط تحديث إذا كانت الشاشة النشطة هي الشاشة الافتراضية
    if (newState.activeScreen === 'initial') {
      _renderProjectsLocal(newState.savedProjects);
    }
  });
  
  // تهيئة عرض المشاريع
  if (stateStore.getState().activeScreen === 'initial') {
    _renderProjectsLocal(stateStore.getState().savedProjects);
  }
  
  return {
    cleanup: () => {
      unsubscribeState();
      
      if (projectListRenderer.listContainerRef) {
        projectListRenderer.listContainerRef.removeEventListener('click', projectListRenderer._handleListInteraction);
        projectListRenderer.listContainerRef.removeEventListener('keydown', _handleKeyboardNavigation);
      }
    }
  };
}
