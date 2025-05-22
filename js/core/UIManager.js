/**
 * UIManager.js
 * 
 * Manages the display of different workflow areas in the application.
 */

/**
 * Hides all elements with the class 'workflow-area' and shows the 
 * element with the given workflowId.
 * @param {string} workflowId - The ID of the workflow area to show.
 */
function showWorkflow(workflowId) {
    // Hide all workflow areas
    const workflowAreas = document.querySelectorAll('.workflow-area');
    workflowAreas.forEach(area => {
        area.style.display = 'none';
    });

    // Show the target workflow area
    const targetWorkflow = document.getElementById(workflowId);
    if (targetWorkflow) {
        targetWorkflow.style.display = 'block'; // Or 'flex', 'grid' as needed
    } else {
        console.warn(`Workflow area with ID '${workflowId}' not found.`);
    }
}

/**
 * Initializes the workflow switcher buttons.
 * Adds event listeners to switch between workflow areas and manage active button state.
 */
function initWorkflowSwitcher() {
    const quranicEditorBtn = document.getElementById('quranic-editor-btn');
    const regularEditorBtn = document.getElementById('regular-editor-btn');

    if (quranicEditorBtn && regularEditorBtn) {
        quranicEditorBtn.addEventListener('click', () => {
            showWorkflow('quranic-editor-workflow');
            quranicEditorBtn.classList.add('active');
            regularEditorBtn.classList.remove('active');
        });

        regularEditorBtn.addEventListener('click', () => {
            showWorkflow('regular-editor-workflow');
            regularEditorBtn.classList.add('active');
            quranicEditorBtn.classList.remove('active');
        });
    } else {
        console.warn('Workflow switcher buttons not found. Ensure #quranic-editor-btn and #regular-editor-btn exist.');
    }
}

// Export the functions to be used in other modules
export { showWorkflow, initWorkflowSwitcher };
