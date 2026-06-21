/**
 * Scidream v1.4 — Factory View
 * Factorio-style top-down 2D grid rendering with accordion hierarchy.
 */

import { TIERS } from '../store/store.js';

function injectStyles() {
  if (document.getElementById('sd-factory-view-styles')) return;
  const style = document.createElement('style');
  style.id = 'sd-factory-view-styles';
  style.textContent = `
    .sd-factory-view {
      width: 100%;
      height: 100%;
      overflow: auto;
      background-color: #1a1e24;
      background-image:
        linear-gradient(rgba(102, 252, 241, 0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(102, 252, 241, 0.05) 1px, transparent 1px),
        linear-gradient(rgba(102, 252, 241, 0.02) 2px, transparent 2px),
        linear-gradient(90deg, rgba(102, 252, 241, 0.02) 2px, transparent 2px);
      background-size: 20px 20px, 20px 20px, 100px 100px, 100px 100px;
      padding: 40px;
      position: relative;
    }

    .factory-container {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 30px;
      min-width: min-content;
    }

    /* Belt connection down */
    .conveyor-belt {
      width: 20px;
      height: 30px;
      margin: 0 auto;
      background: #2a303c;
      border-left: 2px solid #ffb03b;
      border-right: 2px solid #ffb03b;
      position: relative;
      overflow: hidden;
    }

    /* Animated arrows on belt */
    .conveyor-belt::after {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background-image: linear-gradient(180deg, 
        transparent 25%, 
        rgba(255, 176, 59, 0.4) 25%, 
        rgba(255, 176, 59, 0.4) 50%, 
        transparent 50%, 
        transparent 75%, 
        rgba(255, 176, 59, 0.4) 75%, 
        rgba(255, 176, 59, 0.4) 100%);
      background-size: 100% 20px;
      animation: moveBelt 1s linear infinite;
    }

    .conveyor-belt.horizontal {
      width: 30px;
      height: 20px;
      border-top: 2px solid #ffb03b;
      border-bottom: 2px solid #ffb03b;
      border-left: none;
      border-right: none;
      margin: auto 0;
    }

    .conveyor-belt.horizontal::after {
      background-image: linear-gradient(90deg, 
        transparent 25%, 
        rgba(255, 176, 59, 0.4) 25%, 
        rgba(255, 176, 59, 0.4) 50%, 
        transparent 50%, 
        transparent 75%, 
        rgba(255, 176, 59, 0.4) 75%, 
        rgba(255, 176, 59, 0.4) 100%);
      background-size: 20px 100%;
      animation: moveBeltHorizontal 1s linear infinite;
    }

    @keyframes moveBelt {
      0% { background-position: 0 0; }
      100% { background-position: 0 20px; }
    }

    @keyframes moveBeltHorizontal {
      0% { background-position: 0 0; }
      100% { background-position: 20px 0; }
    }

    .machine-block {
      background: rgba(18, 19, 26, 0.95);
      border: 2px solid #45a29e;
      border-radius: 4px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.6), inset 0 0 20px rgba(102, 252, 241, 0.05);
      padding: 16px;
      color: #c5c6c7;
      font-family: 'Share Tech Mono', monospace;
      position: relative;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      display: flex;
      flex-direction: column;
      min-width: 200px;
    }

    .machine-block:hover {
      border-color: #66fcf1;
      box-shadow: 0 8px 30px rgba(0,0,0,0.6), inset 0 0 20px rgba(102, 252, 241, 0.15), 0 0 15px rgba(102, 252, 241, 0.3);
    }

    .machine-block.is-open {
      border-color: #ffb03b;
      box-shadow: 0 12px 40px rgba(0,0,0,0.8), inset 0 0 20px rgba(255, 176, 59, 0.1);
    }

    .machine-header {
      display: flex;
      align-items: center;
      gap: 12px;
      pointer-events: none;
    }

    .machine-icon {
      width: 32px;
      height: 32px;
      background: #1f2833;
      border: 1px solid #45a29e;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      border-radius: 4px;
    }

    .machine-title {
      font-family: 'Rajdhani', sans-serif;
      font-size: 16px;
      font-weight: 700;
      color: #e5e7eb;
      white-space: nowrap;
    }

    .machine-tier {
      font-size: 10px;
      color: #66fcf1;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    /* Inner Blueprint area */
    .machine-blueprint {
      margin-top: 20px;
      padding: 20px;
      background: rgba(31, 40, 51, 0.4);
      border: 1px dashed rgba(102, 252, 241, 0.3);
      border-radius: 4px;
      display: flex;
      gap: 30px; /* Horizontal layout for children to simulate parallel pipelines */
      overflow-x: auto;
      overflow-y: hidden;
      max-width: 80vw;
    }

    /* Children pipeline container */
    .pipeline-column {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

  `;
  document.head.appendChild(style);
}

export function createFactoryView(container, store) {
  injectStyles();

  const wrapper = document.createElement('div');
  wrapper.className = 'sd-factory-view';
  
  const factoryContainer = document.createElement('div');
  factoryContainer.className = 'factory-container';
  wrapper.appendChild(factoryContainer);

  container.appendChild(wrapper);

  // Keep track of which node is 'open' at each depth/hierarchy level
  // openNodes[parentId] = childId
  let openNodes = {};

  function toggleNode(entity) {
    store.select(entity.id);
    
    // Toggle expand/collapse
    if (openNodes[entity.parentId] === entity.id) {
      // If already open, close it
      delete openNodes[entity.parentId];
    } else {
      // Open this, which automatically closes siblings because of the map
      openNodes[entity.parentId] = entity.id;
    }
    
    // Also recursively close all children of siblings that just got closed
    // A simple way is just to clear anything deeper, but map structure naturally orphans them visually.
    render();
  }

  function renderMachine(entity, isRoot = false) {
    const pipeline = document.createElement('div');
    pipeline.className = 'pipeline-column';

    // Incoming Belt (if not root)
    if (!isRoot) {
      const belt = document.createElement('div');
      belt.className = 'conveyor-belt';
      pipeline.appendChild(belt);
    }

    const block = document.createElement('div');
    block.className = 'machine-block';
    if (openNodes[entity.parentId] === entity.id) {
      block.classList.add('is-open');
    }

    const header = document.createElement('div');
    header.className = 'machine-header';
    
    const tierMeta = TIERS[entity.tier] || { icon: '⚙', color: '#c5c6c7' };
    
    const icon = document.createElement('div');
    icon.className = 'machine-icon';
    icon.textContent = tierMeta.icon;
    icon.style.borderColor = tierMeta.color;
    icon.style.color = tierMeta.color;
    
    const info = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'machine-title';
    title.textContent = entity.title;
    
    const tierLabel = document.createElement('div');
    tierLabel.className = 'machine-tier';
    tierLabel.textContent = entity.tier;
    tierLabel.style.color = tierMeta.color;

    info.appendChild(tierLabel);
    info.appendChild(title);
    
    header.appendChild(icon);
    header.appendChild(info);
    block.appendChild(header);

    // Event listener
    block.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleNode(entity);
    });

    pipeline.appendChild(block);

    // If Open, render children inside a blueprint area appended to the block
    if (openNodes[entity.parentId] === entity.id) {
      const children = store.getChildren(entity.id);
      if (children.length > 0) {
        const blueprint = document.createElement('div');
        blueprint.className = 'machine-blueprint';
        
        children.forEach(child => {
          blueprint.appendChild(renderMachine(child, false));
        });

        block.appendChild(blueprint);
      }
    }

    return pipeline;
  }

  function render() {
    factoryContainer.innerHTML = '';
    
    // Find Roots
    const allEntities = Array.from(store.entities.values());
    const roots = allEntities.filter(e => !e.parentId);

    if (roots.length === 0) {
      factoryContainer.innerHTML = '<div style="color:#66fcf1; font-family:monospace;">No items in Vault. Add Entities from the sidebar.</div>';
      return;
    }

    // In Factory view, we layout roots horizontally as parallel top-level pipelines
    const rootsRow = document.createElement('div');
    rootsRow.style.display = 'flex';
    rootsRow.style.gap = '40px';
    rootsRow.style.flexWrap = 'wrap';

    roots.forEach(r => {
      rootsRow.appendChild(renderMachine(r, true));
    });

    factoryContainer.appendChild(rootsRow);
  }

  store.on('select', ({ entity }) => {
    // If selected from outside (e.g. sidebar), ensure it is opened
    if (entity) {
      let curr = entity;
      while(curr) {
        openNodes[curr.parentId] = curr.id;
        curr = store.getParent(curr.id);
      }
      render();
    }
  });

  store.on('data-updated', () => render());

  render();

  return {
    render,
    destroy() {
      wrapper.remove();
    }
  };
}
