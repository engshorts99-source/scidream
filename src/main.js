import store from './data/store.js';
import { createSidebar } from './components/Sidebar.js';
import { createDetailPanel } from './components/DetailPanel.js';
import { createViewToggle } from './views/ViewToggle.js';
import { createNodeView } from './views/NodeView.js';
import { createTextView } from './views/TextView.js';
import { createActionView } from './views/ActionView.js';
import { createBuilderView } from './views/BuilderView.js';

document.addEventListener('DOMContentLoaded', async () => {
  const sidebarContainer = document.getElementById('sidebar-container');
  const topBar = document.getElementById('top-bar');
  const viewContainer = document.getElementById('view-container');
  const detailPanelContainer = document.getElementById('detail-panel-container');

  // Add Git Sync button to topBar
  const syncBtn = document.createElement('button');
  syncBtn.className = 'btn-tactical btn-amber chamfered-sm';
  syncBtn.style.marginRight = '20px';
  syncBtn.innerHTML = '⟳ GIT SYNC';
  syncBtn.onclick = async () => {
    syncBtn.innerHTML = 'SYNCING...';
    syncBtn.disabled = true;
    if (window.electronAPI) {
      const res = await window.electronAPI.gitSync();
      if (res.success) {
        syncBtn.innerHTML = '✔ SYNCED';
      } else {
        syncBtn.innerHTML = '❌ ERROR';
        console.error(res.error);
      }
    }
    setTimeout(() => {
      syncBtn.innerHTML = '⟳ GIT SYNC';
      syncBtn.disabled = false;
    }, 2000);
  };
  topBar.appendChild(syncBtn);

  // Initialize store asynchronously (Electron IPC)
  await store.init();

  // Initialize components
  const sidebar = createSidebar(sidebarContainer, store);
  const detailPanel = createDetailPanel(detailPanelContainer, store);
  const viewToggle = createViewToggle(topBar);

  // Initialize views
  const nodeView = createNodeView(viewContainer, store);
  const textView = createTextView(viewContainer, store);
  const actionView = createActionView(viewContainer, store);
  const builderView = createBuilderView(viewContainer, store);

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
    } else if (currentView === 'builder') {
      builderView.render();
    }
    sidebar.render();
    if (selectedEntityId) {
      detailPanel.show(selectedEntityId);
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
    updateView();
  });

  // Re-render when file system updates via Electron watcher
  window.addEventListener('storeUpdated', () => {
    updateView();
  });

  // Initial render
  updateView();
});
