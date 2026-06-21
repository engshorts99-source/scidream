import store from './data/store.js';
import { createSidebar } from './components/Sidebar.js';
import { createDetailPanel } from './components/DetailPanel.js';
import { createViewToggle } from './views/ViewToggle.js';
import { createNodeView } from './views/NodeView.js';
import { createTextView } from './views/TextView.js';
import { createActionView } from './views/ActionView.js';

document.addEventListener('DOMContentLoaded', () => {
  const sidebarContainer = document.getElementById('sidebar-container');
  const topBar = document.getElementById('top-bar');
  const viewContainer = document.getElementById('view-container');
  const detailPanelContainer = document.getElementById('detail-panel-container');

  // Initialize components
  const sidebar = createSidebar(sidebarContainer, store);
  const detailPanel = createDetailPanel(detailPanelContainer, store);
  const viewToggle = createViewToggle(topBar);

  // Initialize views
  const nodeView = createNodeView(viewContainer, store);
  const textView = createTextView(viewContainer, store);
  const actionView = createActionView(viewContainer, store);

  let currentView = 'node';
  let selectedEntityId = null;

  // Render current view
  function updateView() {
    viewContainer.innerHTML = '';
    if (currentView === 'node') {
      nodeView.render(selectedEntityId);
    } else if (currentView === 'text') {
      textView.render(selectedEntityId);
    } else if (currentView === 'action') {
      actionView.render(selectedEntityId);
    }
  }

  // Event Listeners
  topBar.addEventListener('viewChange', (e) => {
    currentView = e.detail.view;
    updateView();
  });

  sidebarContainer.addEventListener('entitySelect', (e) => {
    selectedEntityId = e.detail.id;
    if (currentView === 'node') {
        detailPanel.show(selectedEntityId);
    }
    updateView();
  });

  viewContainer.addEventListener('entitySelect', (e) => {
    selectedEntityId = e.detail.id;
    detailPanel.show(selectedEntityId);
    // Sync sidebar selection if needed
    // sidebar.select(selectedEntityId);
    updateView();
  });

  // Initial render
  updateView();
});
