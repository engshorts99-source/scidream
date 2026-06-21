/**
 * Scidream v1.4 — Builder View
 * Drag and Drop interface for re-organizing entity hierarchies.
 */

import { TIERS } from '../store/store.js';

function injectStyles() {
  if (document.getElementById('sd-builder-view-styles')) return;
  const style = document.createElement('style');
  style.id = 'sd-builder-view-styles';
  style.textContent = `
    .sd-builder-view {
      width: 100%;
      height: 100%;
      overflow-y: auto;
      background: #0b0c10;
      padding: 40px;
    }
    
    .builder-grid {
      display: flex;
      gap: 40px;
      align-items: flex-start;
      height: 100%;
    }

    .builder-column {
      flex: 1;
      background: rgba(31, 40, 51, 0.4);
      border: 1px solid rgba(102, 252, 241, 0.15);
      border-radius: 8px;
      padding: 20px;
      min-height: 500px;
    }

    .builder-column h2 {
      color: #66fcf1;
      font-family: 'Rajdhani', sans-serif;
      margin-bottom: 20px;
      font-size: 1.2rem;
      border-bottom: 1px solid rgba(102, 252, 241, 0.2);
      padding-bottom: 10px;
    }

    .builder-block {
      background: #12131a;
      border: 1px solid #45a29e;
      padding: 12px 16px;
      margin-bottom: 12px;
      border-radius: 4px;
      color: #c5c6c7;
      cursor: grab;
      font-family: 'Share Tech Mono', monospace;
      font-size: 13px;
      transition: all 0.2s ease;
      position: relative;
    }

    .builder-block:active {
      cursor: grabbing;
    }

    .builder-block.drag-over {
      border: 2px dashed #ffb03b;
      background: rgba(255, 176, 59, 0.1);
      transform: scale(1.02);
    }
    
    .builder-block .tier-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      background: rgba(102, 252, 241, 0.1);
      color: #66fcf1;
      font-size: 10px;
      margin-right: 8px;
      vertical-align: middle;
    }

    .builder-children {
      margin-top: 10px;
      padding-left: 20px;
      border-left: 1px dashed rgba(102, 252, 241, 0.3);
      min-height: 10px; /* target for empty children */
    }
    
    .builder-children.drag-over {
      background: rgba(102, 252, 241, 0.05);
    }
  `;
  document.head.appendChild(style);
}

export function createBuilderView(container, store) {
  injectStyles();

  const wrapper = document.createElement('div');
  wrapper.className = 'sd-builder-view';

  let draggedEntityId = null;

  function handleDragStart(e, entityId) {
    draggedEntityId = entityId;
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
    e.stopPropagation();
  }

  function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
    e.stopPropagation();
  }

  async function handleDropOnEntity(e, targetId) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    e.stopPropagation();

    if (!draggedEntityId || draggedEntityId === targetId) return;

    const sourceEntity = store.getById(draggedEntityId);
    const targetEntity = store.getById(targetId);

    if (!sourceEntity || !targetEntity) return;

    // Prevent cyclic dependencies (cannot drop parent into child)
    const ancestors = store.getAncestors(targetId);
    if (ancestors.some(a => a.id === sourceEntity.id)) {
      alert("Cannot drop a parent into its own child!");
      return;
    }

    // Update parentId
    try {
      if (window.electronAPI) {
        await window.electronAPI.updateVaultData(sourceEntity.tier, sourceEntity.id, {
          parentId: targetId
        });
        // Store will refresh via IPC 'data-updated'
      }
    } catch (err) {
      console.error("Failed to update parent:", err);
      alert("Error saving hierarchy change.");
    }
    
    draggedEntityId = null;
  }

  async function handleDropOnRoot(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    e.stopPropagation();

    if (!draggedEntityId) return;
    const sourceEntity = store.getById(draggedEntityId);
    if (!sourceEntity) return;

    try {
      if (window.electronAPI) {
        // Remove parentId to make it a root node
        await window.electronAPI.updateVaultData(sourceEntity.tier, sourceEntity.id, {
          parentId: null
        });
      }
    } catch (err) {
      console.error(err);
    }
    draggedEntityId = null;
  }

  function createBlock(entity) {
    const block = document.createElement('div');
    block.className = 'builder-block';
    block.draggable = true;

    // Drag events
    block.addEventListener('dragstart', (e) => handleDragStart(e, entity.id));
    
    // Drop target events (for dropping onto this entity)
    block.addEventListener('dragover', handleDragOver);
    block.addEventListener('dragleave', handleDragLeave);
    block.addEventListener('drop', (e) => handleDropOnEntity(e, entity.id));

    // Content
    const tierMeta = TIERS[entity.tier] || { color: '#ccc' };
    const badge = document.createElement('span');
    badge.className = 'tier-badge';
    badge.style.color = tierMeta.color;
    badge.textContent = entity.tier.toUpperCase();
    
    const title = document.createTextNode(entity.title || entity.id);
    
    block.appendChild(badge);
    block.appendChild(title);

    // Render children recursively
    const children = store.getChildren(entity.id);
    if (children.length > 0) {
      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'builder-children';
      children.forEach(child => {
        childrenContainer.appendChild(createBlock(child));
      });
      block.appendChild(childrenContainer);
    }

    return block;
  }

  function render() {
    wrapper.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'builder-grid';

    // Column 1: Root items (no parentId)
    const rootCol = document.createElement('div');
    rootCol.className = 'builder-column';
    rootCol.innerHTML = '<h2>Root Entities (Drag here to detach)</h2>';
    
    // Allow dropping into root
    rootCol.addEventListener('dragover', handleDragOver);
    rootCol.addEventListener('dragleave', handleDragLeave);
    rootCol.addEventListener('drop', handleDropOnRoot);

    const allEntities = Array.from(store.entities.values());
    const roots = allEntities.filter(e => !e.parentId && e.tier !== 'inventory');

    roots.forEach(r => {
      rootCol.appendChild(createBlock(r));
    });

    grid.appendChild(rootCol);
    wrapper.appendChild(grid);
  }

  store.on('select', () => render());
  render();
  
  container.appendChild(wrapper);

  return {
    render,
    destroy() {
      wrapper.remove();
    }
  };
}
