// js/features/quran-provider/translation-selector.ui.js

import { ACTIONS, EVENTS } from '../../config/app.constants.js';
// Assuming quranDataCacheAPI, stateStore, eventAggregator will be injected or are singletons.

const translationSelectorUI = (() => {
  let dependencies = {
    quranDataCacheAPI: null,
    stateStore: null,
    eventAggregator: null, // Optional, for reacting to project loads etc.
    // DOMElements: null, // If needed for predefined containers
    errorLogger: console,
  };

  let currentContainerElement = null;

  /**
   * Renders the translation selector component into the given container.
   * @param {HTMLElement} containerElement - The HTML element to render the selector into.
   */
  async function render(containerElement) {
    if (!containerElement) {
      dependencies.errorLogger.error({
        message: 'Translation Selector: Container element not provided for rendering.',
        origin: 'translationSelectorUI.render'
      });
      return;
    }
    currentContainerElement = containerElement;

    if (!dependencies.quranDataCacheAPI || !dependencies.stateStore) {
      dependencies.errorLogger.error({
        message: 'Translation Selector: Missing dependencies (quranDataCacheAPI or stateStore).',
        origin: 'translationSelectorUI.render'
      });
      // Render a message indicating unavailability
      containerElement.innerHTML = '<p>Translation selector is currently unavailable. Dependencies missing.</p>';
      return;
    }

    // 1. Clear the container
    containerElement.innerHTML = '';

    // 2. Create the main structure
    const selectorDiv = document.createElement('div');
    selectorDiv.id = 'translation-selector-container';
    
    const title = document.createElement('h3');
    title.textContent = 'Select Translations/Tafsirs:'; // TODO: Localize
    selectorDiv.appendChild(title);

    const list = document.createElement('ul');
    list.id = 'translation-list';
    selectorDiv.appendChild(list);

    containerElement.appendChild(selectorDiv);

    try {
      // 3. Fetch available translations
      const availableEditions = await dependencies.quranDataCacheAPI.getAvailableEditions();
      const availableTranslations = availableEditions.filter(
        (ed) => ed.type === 'translation' || ed.type === 'tafsir'
      );

      if (!availableTranslations || availableTranslations.length === 0) {
        list.innerHTML = '<li>No translations/tafsirs available.</li>'; // TODO: Localize
        return;
      }

      // 4. Get current selections from state
      const projectState = dependencies.stateStore.getState().currentProject;
      const selectedIds = projectState?.quranSelection?.selectedTranslationIds || [];

      // 5. Populate the list
      availableTranslations.forEach(edition => {
        const listItem = document.createElement('li');
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        
        checkbox.type = 'checkbox';
        checkbox.name = 'translation';
        checkbox.value = edition.identifier;
        checkbox.checked = selectedIds.includes(edition.identifier);
        
        // Event listener for checkbox change
        checkbox.addEventListener('change', _handleSelectionChange);

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(` ${edition.name} (${edition.language})`)); // TODO: Consider more robust localization for language name
        
        listItem.appendChild(label);
        list.appendChild(listItem);
      });

    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: 'Failed to fetch or render translation editions.',
        origin: 'translationSelectorUI.render'
      });
      list.innerHTML = '<li>Error loading translations.</li>'; // TODO: Localize
    }
  }

  /**
   * Handles the change event on checkboxes.
   * @private
   */
  function _handleSelectionChange() {
    if (!currentContainerElement || !dependencies.stateStore) return;

    const list = currentContainerElement.querySelector('#translation-list');
    if (!list) return;

    const checkedCheckboxes = list.querySelectorAll('input[name="translation"]:checked');
    const newSelectedIds = Array.from(checkedCheckboxes).map(cb => cb.value);

    // Dispatch action to update state
    // Ensure quranSelection object and its properties exist or are initialized correctly
    const currentProject = dependencies.stateStore.getState().currentProject;
    if (currentProject && currentProject.quranSelection) {
        const updatedQuranSelection = {
            ...currentProject.quranSelection,
            selectedTranslationIds: newSelectedIds
        };
        dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, { quranSelection: updatedQuranSelection });
    } else {
        dependencies.errorLogger.warn({
            message: 'Cannot update selected translations: current project or quranSelection is null.',
            origin: 'translationSelectorUI._handleSelectionChange'
        });
    }
  }
  
  /**
   * Re-renders the component, typically when project changes or settings are updated externally.
   */
  function refresh() {
    if (currentContainerElement) {
        // console.log("TranslationSelectorUI: Refreshing...")
        render(currentContainerElement);
    }
  }

  /**
   * Initializes the component, potentially setting up listeners.
   * @param {object} injectedDeps - Dependencies like stateStore, quranDataCacheAPI.
   */
  function init(injectedDeps) {
    if (injectedDeps.quranDataCacheAPI) dependencies.quranDataCacheAPI = injectedDeps.quranDataCacheAPI;
    if (injectedDeps.stateStore) dependencies.stateStore = injectedDeps.stateStore;
    if (injectedDeps.eventAggregator) dependencies.eventAggregator = injectedDeps.eventAggregator;
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    // if (injectedDeps.DOMElements) dependencies.DOMElements = injectedDeps.DOMElements;

    // Example: Listen for project load to re-render
    if (dependencies.eventAggregator) {
        dependencies.eventAggregator.subscribe(EVENTS.PROJECT_LOADED, refresh);
        // Also listen for when quranSelection.selectedTranslationIds changes externally to keep checkboxes in sync
        // This requires a more granular state subscription or specific event.
        // For now, PROJECT_SETTINGS_UPDATED might be too broad but could work if such an event exists.
        // A simpler way is if the panel housing this calls refresh() when it knows settings might have changed.
    }
     if (dependencies.stateStore) {
        // More robust: subscribe to state changes and check if selectedTranslationIds changed
        let previousSelectedIds = dependencies.stateStore.getState().currentProject?.quranSelection?.selectedTranslationIds?.join(',');
        
        dependencies.stateStore.subscribe((newState) => {
            const newSelectedIds = newState.currentProject?.quranSelection?.selectedTranslationIds?.join(',');
            if (newSelectedIds !== previousSelectedIds) {
                previousSelectedIds = newSelectedIds;
                // Check if the change originated from this component to avoid re-render loop
                // This simple refresh might cause a loop if not careful, or if an external change happens.
                // A more sophisticated check or event system might be needed.
                // For now, let's assume direct re-render is okay for simplicity or that the parent will manage this.
                // refresh(); // Might be too aggressive. Let's rely on PROJECT_LOADED or manual refresh calls.
            }
        });
    }
    // console.log("Translation Selector UI Initialized with dependencies:", dependencies);
  }

  return {
    init,
    render,
    refresh, // Expose refresh if parent components need to trigger re-render
  };
})();

export default translationSelectorUI;
