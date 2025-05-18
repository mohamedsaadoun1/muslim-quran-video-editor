// js/features/project-manager/project-list.renderer.js

import DOMElements from '../../core/dom-elements.js';
import { ACTIONS, EVENTS, DEFAULT_PROJECT_SCHEMA } from '../../config/app.constants.js';
import { createElement, setDataAttribute } from '../../utils/dom.manipulator.js'; // Assuming this exists
import timeFormatter from '../../utils/time.formatter.js'; // Assuming this exists

const projectListRenderer = (() => {
  let listContainer = null;
  let noProjectsMsgElement = null;

  let dependencies = {
    stateStore: {
        getState: () => ({ savedProjects: [], activeScreen: 'initial' }),
        dispatch: () => {},
        subscribe: () => (() => {})
    },
    eventAggregator: { publish: () => {}, subscribe: () => ({ unsubscribe: () => {} }) },
    errorLogger: console,
    localizationService: { translate: (key, fallback) => fallback || key },
    modalFactoryAPI: { showConfirm: async () => false } // From modal.factory.js
  };

  /**
   * Creates a single project card HTML element.
   * @private
   * @param {import('../../core/state-store.js').ProjectState} project - The project data.
   * @returns {HTMLElement | null} The created card element or null on error.
   */
  function _createProjectCard(project) {
    if (!project || !project.id) {
      (dependencies.errorLogger.logWarning || console.warn)('Cannot create project card: Invalid project data.', project);
      return null;
    }

    const card = createElement('div', { classNames: 'project-card', attributes: { 'data-project-id': project.id, 'tabindex': '0', 'role': 'button' } });

    const title = createElement('h3', { textContent: project.title || DEFAULT_PROJECT_SCHEMA.title });
    card.appendChild(title);

    const meta = createElement('div', { classNames: 'project-meta' });
    const lastUpdated = project.updatedAt ?
        new Date(project.updatedAt).toLocaleString(dependencies.localizationService.getCurrentLanguage() || 'ar-SA') : // Needs locale
        (dependencies.localizationService.translate('projectCard.neverUpdated', 'لم يتم التحديث') || 'لم يتم التحديث');
    
    const dateSpan = createElement('span', { textContent: `${dependencies.localizationService.translate('projectCard.lastUpdated', 'آخر تحديث') || 'آخر تحديث'}: ${lastUpdated}` });
    meta.appendChild(dateSpan);
    // You can add more meta info here, e.g., Surah range
    // const surahInfo = project.quranSelection ? `السورة: ${project.quranSelection.surahId}, الآيات: ${project.quranSelection.startAyah}-${project.quranSelection.endAyah}` : '';
    // meta.appendChild(createElement('span', {textContent: surahInfo}));
    card.appendChild(meta);

    const actionsWrapper = createElement('div', { classNames: 'project-actions' });

    // Edit/Load Button (the card itself is clickable for this)
    // card.addEventListener('click', () => _handleLoadProject(project.id)); is handled by delegation below

    // Duplicate Button (Future)
    // const duplicateBtn = createElement('button', { classNames: 'project-action-btn duplicate-project-btn', textContent: 'تكرار', attributes: {'title': 'تكرار المشروع'} });
    // duplicateBtn.innerHTML = '<i class="fas fa-copy"></i> ' + (dependencies.localizationService.translate('button.duplicate', 'تكرار') || 'تكرار');
    // actionsWrapper.appendChild(duplicateBtn);

    // Delete Button
    const deleteBtn = createElement('button', {
        classNames: 'project-action-btn delete-project-btn',
        attributes: { 'title': dependencies.localizationService.translate('button.delete.project', 'حذف المشروع') || 'حذف المشروع' }
    });
    deleteBtn.innerHTML = `<i class="fas fa-trash-alt"></i> ${dependencies.localizationService.translate('button.delete', 'حذف') || 'حذف'}`;
    // Event listener for delete will be attached via delegation in initialize
    actionsWrapper.appendChild(deleteBtn);

    card.appendChild(actionsWrapper);
    return card;
  }

  /**
   * Renders the list of saved projects in the DOM.
   * @private
   * @param {Array<import('../../core/state-store.js').ProjectState>} projects - Array of project objects.
   */
  function _renderProjects(projects) {
    if (!listContainer || !noProjectsMsgElement) {
      (dependencies.errorLogger.logWarning || console.warn)('Project list container or no-projects message element not found. Cannot render projects.');
      return;
    }

    listContainer.innerHTML = ''; // Clear previous list

    if (projects && projects.length > 0) {
      projects.sort((a,b) => (b.updatedAt || 0) - (a.updatedAt || 0)); // Show newest first
      projects.forEach(project => {
        const card = _createProjectCard(project);
        if (card) {
          listContainer.appendChild(card);
        }
      });
      noProjectsMsgElement.style.display = 'none';
    } else {
      noProjectsMsgElement.style.display = 'block'; // Or 'grid-column: 1 / -1; text-align: center;'
    }
  }

  /**
   * Handles clicking on a project card (to load it) or one of its action buttons.
   * Uses event delegation.
   * @private
   * @param {Event} event
   */
  async function _handleListInteraction(event) {
    const card = event.target.closest('.project-card');
    if (!card) return;

    const projectId = card.dataset.projectId;
    if (!projectId) return;

    if (event.target.closest('.delete-project-btn')) {
      // Handle Delete
      const projectToDelete = dependencies.stateStore.getState().savedProjects.find(p => p.id === projectId);
      const confirmed = await dependencies.modalFactoryAPI.showConfirm({
        title: dependencies.localizationService.translate('project.delete.confirmTitle', 'تأكيد الحذف') || 'تأكيد الحذف',
        message: dependencies.localizationService.translate('project.delete.confirmMessage', { projectName: projectToDelete?.title || projectId }) 
                 || `هل أنت متأكد أنك تريد حذف مشروع "${projectToDelete?.title || projectId}"؟ هذا الإجراء لا يمكن التراجع عنه.`,
        confirmText: dependencies.localizationService.translate('button.delete', 'حذف'),
        cancelText: dependencies.localizationService.translate('button.cancel', 'إلغاء')
      });

      if (confirmed) {
        dependencies.stateStore.dispatch(ACTIONS.DELETE_PROJECT_FROM_LIST, projectId);
        dependencies.notificationServiceAPI?.showSuccess(dependencies.localizationService.translate('project.deleted.success', 'تم حذف المشروع بنجاح.') || 'تم حذف المشروع بنجاح.');
      }
    } else if (event.target.closest('.duplicate-project-btn')) {
      // Handle Duplicate (Future)
      // dependencies.stateStore.dispatch(ACTIONS.DUPLICATE_PROJECT, projectId);
      // dependencies.notificationServiceAPI?.showInfo('جاري تكرار المشروع...');
      (dependencies.errorLogger.logInfo || console.info)('Duplicate project action clicked for:', projectId);
    } else {
      // Clicked on card itself (or title/meta, not a specific action button) -> Load project
      const projectToLoad = dependencies.stateStore.getState().savedProjects.find(p => p.id === projectId);
      if (projectToLoad) {
        dependencies.stateStore.dispatch(ACTIONS.LOAD_PROJECT, { ...projectToLoad }); // Dispatch a copy
        // Screen navigation should be handled by stateStore's activeScreen update
        // or by screenNavigator listening to project load
      } else {
        (dependencies.errorLogger.logWarning || console.warn)('Project to load not found in state:', projectId);
      }
    }
  }
  
  function _setDependencies(injectedDeps) {
    Object.assign(dependencies, injectedDeps);
  }

  // Public API is mainly the initializer
  return {
    _setDependencies,
    // render: _renderProjects, // Could expose if manual re-render needed, but state-driven is better
  };

})(); // IIFE removed


/**
 * Initialization function for the ProjectListRenderer.
 * @param {object} deps
 * @param {import('../../core/state-store.js').default} deps.stateStore
 * @param {import('../../core/event-aggregator.js').default} deps.eventAggregator
 * @param {import('../../core/error-logger.js').default} deps.errorLogger
 * @param {import('../../core/localization.service.js').default} deps.localizationService
 * @param {ReturnType<import('../../shared-ui-components/modal.factory.js').initializeModalFactory>} deps.modalFactoryAPI
 * @param {ReturnType<import('../../shared-ui-components/notification.presenter.js').initializeNotificationPresenter>} [deps.notificationServiceAPI]
 */
export function initializeProjectListRenderer(deps) {
  projectListRenderer._setDependencies(deps);
  const { stateStore, errorLogger, eventAggregator } = deps;

  projectListRenderer.listContainerRef = DOMElements.projectsListContainer;
  projectListRenderer.noProjectsMsgElRef = DOMElements.noProjectsMessage;
  
  const _renderProjectsLocal = (projects) => { // Local scoped version of _renderProjects
    if (!projectListRenderer.listContainerRef || !projectListRenderer.noProjectsMsgElRef) return;
    projectListRenderer.listContainerRef.innerHTML = '';
    if (projects && projects.length > 0) {
      projects.sort((a,b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      projects.forEach(p => {
        const card = (function _createProjectCardLocal(project) { /* ... logic of _createProjectCard using deps ... */ 
            if (!project || !project.id) return null;
            const card = createElement('div', { classNames: 'project-card', attributes: { 'data-project-id': project.id, 'tabindex': '0', 'role': 'button' } });
            card.appendChild(createElement('h3', { textContent: project.title || DEFAULT_PROJECT_SCHEMA.title }));
            const meta = createElement('div', { classNames: 'project-meta' });
            const lu = project.updatedAt ? new Date(project.updatedAt).toLocaleString(deps.localizationService.getCurrentLanguage() || 'ar-SA') : 'N/A';
            meta.appendChild(createElement('span', { textContent: `آخر تحديث: ${lu}` }));
            card.appendChild(meta);
            const actions = createElement('div', {classNames:'project-actions'});
            const delBtn = createElement('button', {classNames:'project-action-btn delete-project-btn',innerHTML: '<i class="fas fa-trash-alt"></i> حذف'});
            actions.appendChild(delBtn);
            card.appendChild(actions);
            return card;
        })(p);
        if (card) projectListRenderer.listContainerRef.appendChild(card);
      });
      projectListRenderer.noProjectsMsgElRef.style.display = 'none';
    } else {
      projectListRenderer.noProjectsMsgElRef.style.display = 'block';
    }
  };

  const _handleListInteractionLocal = async (event) => { /* ... logic of _handleListInteraction using deps ... */ 
    const card = event.target.closest('.project-card');
    if (!card || !card.dataset.projectId) return;
    const projectId = card.dataset.projectId;

    if (event.target.closest('.delete-project-btn')) {
        const project = stateStore.getState().savedProjects.find(p => p.id === projectId);
        const confirmed = await deps.modalFactoryAPI.showConfirm({
            title: 'تأكيد الحذف', message: `هل أنت متأكد من حذف مشروع "${project?.title || projectId}"؟`
        });
        if (confirmed) stateStore.dispatch(ACTIONS.DELETE_PROJECT_FROM_LIST, projectId);
    } else { // Click on card body/title
        const project = stateStore.getState().savedProjects.find(p => p.id === projectId);
        if (project) stateStore.dispatch(ACTIONS.LOAD_PROJECT, { ...project });
    }
  };

  if (projectListRenderer.listContainerRef) {
    projectListRenderer.listContainerRef.addEventListener('click', _handleListInteractionLocal);
    // Add keydown listener for accessibility (Enter/Space to activate card)
    projectListRenderer.listContainerRef.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            const card = event.target.closest('.project-card');
            if (card && card.dataset.projectId) {
                event.preventDefault(); // Prevent space from scrolling
                _handleListInteractionLocal(event); // Treat as click
            }
        }
    });
  } else {
    (errorLogger.logWarning || console.warn)('Project list container not found for event delegation.');
  }


  // Subscribe to changes in savedProjects from stateStore
  const unsubscribeState = stateStore.subscribe((newState) => {
    // Re-render only if savedProjects array identity changes or active screen is initial
    // A more robust check might compare actual content if identity doesn't always change.
    if (newState.activeScreen === 'initial') { // Only render if this screen is active
        _renderProjectsLocal(newState.savedProjects);
    }
  });

  // Initial render
  if (stateStore.getState().activeScreen === 'initial') {
      _renderProjectsLocal(stateStore.getState().savedProjects);
  }

  // console.info('[ProjectListRenderer] Initialized.');

  return {
    cleanup: () => {
      unsubscribeState();
      if (projectListRenderer.listContainerRef) {
        projectListRenderer.listContainerRef.removeEventListener('click', _handleListInteractionLocal);
        projectListRenderer.listContainerRef.removeEventListener('keydown', /* keydown handler ref */ () => {});
      }
      // console.info('[ProjectListRenderer] Cleaned up.');
    },
    // renderManually: (projects) => _renderProjectsLocal(projects) // If manual trigger needed
  };
}

export default projectListRenderer;
