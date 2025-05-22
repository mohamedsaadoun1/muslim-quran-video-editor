// js/features/quran-provider/reciter-selector.ui.js

import { ACTIONS, EVENTS } from '../../config/app.constants.js';

const reciterSelectorUI = (() => {
  let dependencies = {
    quranDataCacheAPI: null,
    stateStore: null,
    eventAggregator: null,
    errorLogger: console,
  };

  let currentContainerElement = null;
  let currentSelectElement = null;

  /**
   * Fetches available reciter editions from the quranDataCacheAPI.
   * Filters for audio editions.
   * @private
   * @returns {Promise<Array<Object>>} A promise that resolves to an array of reciter editions.
   */
  async function _fetchAvailableReciters() {
    if (!dependencies.quranDataCacheAPI) {
      dependencies.errorLogger.error({
        message: 'Reciter Selector: quranDataCacheAPI dependency is missing.',
        origin: 'reciterSelectorUI._fetchAvailableReciters'
      });
      return [];
    }
    try {
      const editions = await dependencies.quranDataCacheAPI.getAvailableEditions();
      // Assuming reciters are audio editions. Adjust filter if necessary.
      return editions.filter(ed => ed.format === 'audio' && (ed.type === 'versebyverse' || ed.type === 'translation')); // Common types for recitations
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: 'Reciter Selector: Failed to fetch available reciters.',
        origin: 'reciterSelectorUI._fetchAvailableReciters'
      });
      return [];
    }
  }

  /**
   * Renders the reciter selector component into the given container.
   * @param {HTMLElement} containerElement - The HTML element to render the selector into.
   */
  async function render(containerElement) {
    if (!containerElement) {
      dependencies.errorLogger.error({
        message: 'Reciter Selector: Container element not provided for rendering.',
        origin: 'reciterSelectorUI.render'
      });
      return;
    }
    currentContainerElement = containerElement;

    if (!dependencies.stateStore) {
      dependencies.errorLogger.error({
        message: 'Reciter Selector: Missing stateStore dependency.',
        origin: 'reciterSelectorUI.render'
      });
      containerElement.innerHTML = '<p>Reciter selector is currently unavailable. StateStore missing.</p>';
      return;
    }

    containerElement.innerHTML = ''; // Clear previous content

    const selectorDiv = document.createElement('div');
    selectorDiv.id = 'reciter-selector-container';

    const label = document.createElement('label');
    label.htmlFor = 'reciter-select';
    label.textContent = 'Select Reciter:'; // TODO: Localize
    selectorDiv.appendChild(label);

    currentSelectElement = document.createElement('select');
    currentSelectElement.id = 'reciter-select';
    selectorDiv.appendChild(currentSelectElement);

    containerElement.appendChild(selectorDiv);

    const loadingOption = document.createElement('option');
    loadingOption.textContent = 'Loading reciters...'; // TODO: Localize
    loadingOption.disabled = true;
    currentSelectElement.appendChild(loadingOption);

    const reciters = await _fetchAvailableReciters();
    currentSelectElement.removeChild(loadingOption);

    if (reciters.length === 0) {
      const noRecitersOption = document.createElement('option');
      noRecitersOption.textContent = 'No reciters available.'; // TODO: Localize
      currentSelectElement.appendChild(noRecitersOption);
      return;
    }

    const projectState = dependencies.stateStore.getState().currentProject;
    const currentReciterId = projectState?.quranSelection?.reciterId;

    reciters.forEach(reciter => {
      const option = document.createElement('option');
      option.value = reciter.identifier;
      // Prefer reciter.name (often in the language of the reciter) or fallback to englishName
      option.textContent = `${reciter.name || reciter.englishName} (${reciter.language})`; 
      if (reciter.identifier === currentReciterId) {
        option.selected = true;
      }
      currentSelectElement.appendChild(option);
    });

    currentSelectElement.addEventListener('change', _handleSelectionChange);
  }

  /**
   * Handles the change event on the select element.
   * @private
   */
  function _handleSelectionChange(event) {
    if (!dependencies.stateStore || !event.target) return;

    const selectedReciterIdentifier = event.target.value;
    
    const currentProject = dependencies.stateStore.getState().currentProject;
    if (currentProject && currentProject.quranSelection) {
      const updatedQuranSelection = {
        ...currentProject.quranSelection,
        reciterId: selectedReciterIdentifier
      };
      dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, { quranSelection: updatedQuranSelection });
    } else {
       dependencies.errorLogger.warn({
            message: 'Cannot update reciter: current project or quranSelection is null.',
            origin: 'reciterSelectorUI._handleSelectionChange'
        });
    }
  }
  
  /**
   * Re-renders the component.
   */
  function refresh() {
    if (currentContainerElement) {
      render(currentContainerElement);
    }
  }

  /**
   * Initializes the component.
   * @param {object} injectedDeps - Dependencies.
   */
  function init(injectedDeps) {
    dependencies.quranDataCacheAPI = injectedDeps.quranDataCacheAPI || dependencies.quranDataCacheAPI;
    dependencies.stateStore = injectedDeps.stateStore || dependencies.stateStore;
    dependencies.eventAggregator = injectedDeps.eventAggregator || dependencies.eventAggregator;
    dependencies.errorLogger = injectedDeps.errorLogger || console;

    if (dependencies.eventAggregator) {
      dependencies.eventAggregator.subscribe(EVENTS.PROJECT_LOADED, refresh);
      // Could add more specific state subscription if needed, e.g., if reciterId can change externally
      // and the UI needs to reflect that without a full project load.
    }
     if (dependencies.stateStore) {
        let previousReciterId = dependencies.stateStore.getState().currentProject?.quranSelection?.reciterId;
        dependencies.stateStore.subscribe((newState) => {
            const newReciterId = newState.currentProject?.quranSelection?.reciterId;
            if (newReciterId !== previousReciterId) {
                previousReciterId = newReciterId;
                // If the select element exists and its value is different, update it.
                // This avoids a full re-render if only the selection changed internally.
                if(currentSelectElement && currentSelectElement.value !== newReciterId) {
                    currentSelectElement.value = newReciterId || '';
                }
            }
        });
    }
    // console.log("Reciter Selector UI Initialized.");
  }

  return {
    init,
    render,
    refresh,
  };
})();

export default reciterSelectorUI;
