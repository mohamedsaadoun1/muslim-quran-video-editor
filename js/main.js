/**
 * main.js
 * 
 * Main entry point for the Bismillah Editor application.
 * Initializes UI, managers, and sets up the default state.
 */

import { showWorkflow, initWorkflowSwitcher } from './core/UIManager.js';
import QuranEditorManager from './QuranEditorManager.js';
import RegularEditorManager from './RegularEditorManager.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize the workflow switcher buttons
    initWorkflowSwitcher();

    // Create instances of the editor managers
    // These instances can be used to manage the state and functionality
    // of their respective workflows.
    const quranEditor = new QuranEditorManager();
    const regularEditor = new RegularEditorManager();

    // Set the default workflow to display
    // Show the Quranic Editor by default.
    showWorkflow('quranic-editor-workflow');
    
    // Also, make sure the correct button is marked as active by default.
    const quranicEditorBtn = document.getElementById('quranic-editor-btn');
    const regularEditorBtn = document.getElementById('regular-editor-btn'); // Added for completeness

    if (quranicEditorBtn) {
        quranicEditorBtn.classList.add('active');
    }
    // Ensure the other button is not active initially
    if (regularEditorBtn) {
        regularEditorBtn.classList.remove('active');
    }

    console.log("Bismillah Editor initialized.");
});
