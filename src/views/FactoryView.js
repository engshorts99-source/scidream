/**
 * Scidream v1.4 — Factory View (DAG)
 * Factorio-style top-down 2D grid rendering with accordion hierarchy and pipeline connections.
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

    .factory-grid {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      gap: 150px;
      min-width: min-content;
      position: relative;
      z-index: 2;
    }

    .factory-col {
      display: flex;
      flex-direction: column;
      gap: 30px;
      align-items: center;
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
      transition: all 0.3s;
      min-width: 220px;
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
      flex-shrink: 0;
    }

    .machine-info {
      flex: 1;
      min-width: 0;
    }

    .machine-title {
      font-family: 'Rajdhani', sans-serif;
      font-size: 16px;
      font-weight: 700;
      color: #e5e7eb;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .machine-title-input {
      width: 100%;
      background: rgba(255,255,255,0.1);
      border: 1px solid #66fcf1;
      color: #fff;
      font-family: 'Rajdhani', sans-serif;
      font-size: 16px;
      font-weight: 700;
      outline: none;
      padding: 2px 4px;
    }

    .machine-tier {
      font-size: 10px;
      color: #66fcf1;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .machine-blueprint {
      margin-top: 20px;
      padding: 20px;
      background: rgba(31, 40, 51, 0.4);
      border: 1px dashed rgba(102, 252, 241, 0.3);
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* Ports for Connections */
    .port {
      width: 14px;
      height: 14px;
      background: #2a303c;
      border: 2px solid #ffb03b;
      border-radius: 50%;
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 10;
      cursor: crosshair;
      transition: background 0.2s, transform 0.2s;
    }

    .port:hover {
      background: #ffb03b;
      transform: translateY(-50%) scale(1.3);
    }

    .port.input {
      left: -7px;
    }

    .port.output {
      right: -7px;
    }

    /* SVG Overlay for Conveyor Lines */
    #svg-overlay {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      pointer-events: none;
      z-index: 1;
    }

    .conveyor-line {
      fill: none;
      stroke: #45a29e;
      stroke-width: 12;
      stroke-linejoin: round;
      pointer-events: stroke;
      cursor: pointer;
    }

    .conveyor-belt-anim {
      fill: none;
      stroke: rgba(255, 176, 59, 0.6);
      stroke-width: 8;
      stroke-dasharray: 10 10;
      animation: beltMove 2s linear infinite; /* 2s = 0.5 cycle per second */
      pointer-events: none;
    }

    @keyframes beltMove {
      from { stroke-dashoffset: 40; }
      to { stroke-dashoffset: 0; }
    }

  `;
  document.head.appendChild(style);
}

export function createFactoryView(container, store) {
  injectStyles();

  const wrapper = document.createElement('div');
  wrapper.className = 'sd-factory-view';
  
  const svgOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgOverlay.id = 'svg-overlay';
  wrapper.appendChild(svgOverlay);

  const gridContainer = document.createElement('div');
  gridContainer.className = 'factory-grid';
  wrapper.appendChild(gridContainer);

  container.appendChild(wrapper);

  let openNodes = {}; // parentId -> childId
  let dragLine = null;
  let dragSourceEntity = null;
  const elementsMap = new Map(); // id -> DOM element

  function toggleNode(entity) {
    store.select(entity.id);
    if (openNodes[entity.parentId] === entity.id) {
      // Close this node
      delete openNodes[entity.parentId];
      // Recursively clear open state for all descendants so they are folded when reopened
      clearOpenState(entity.id);
    } else {
      // Open this node
      openNodes[entity.parentId] = entity.id;
    }
    render();
  }

  function clearOpenState(parentId) {
    const children = store.getChildren(parentId);
    children.forEach(child => {
      if (openNodes[child.parentId] === child.id) {
        delete openNodes[child.parentId];
        clearOpenState(child.id);
      }
    });
  }

  // ... (Title editing and Port mousedown logic remain same)
  // Let me re-inject the entire chunk cleanly.
  async function handleTitleEdit(entity, newValue) {
    if (newValue && newValue !== entity.title) {
      if (window.electronAPI) {
        await window.electronAPI.updateVaultData(entity.tier, entity.id, { title: newValue });
      }
    }
    render();
  }

  function handlePortMousedown(e, entity, type) {
    e.stopPropagation();
    if (type !== 'output') return;
    
    dragSourceEntity = entity;
    const rect = e.target.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    
    const startX = rect.left + rect.width / 2 - wrapperRect.left + wrapper.scrollLeft;
    const startY = rect.top + rect.height / 2 - wrapperRect.top + wrapper.scrollTop;

    dragLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    dragLine.setAttribute('stroke', '#ffb03b');
    dragLine.setAttribute('stroke-width', '4');
    dragLine.setAttribute('fill', 'none');
    dragLine.setAttribute('stroke-dasharray', '5 5');
    svgOverlay.appendChild(dragLine);

    const onMove = (moveEvent) => {
      const endX = moveEvent.clientX - wrapperRect.left + wrapper.scrollLeft;
      const endY = moveEvent.clientY - wrapperRect.top + wrapper.scrollTop;
      const d = `M ${startX} ${startY} C ${startX + 100} ${startY}, ${endX - 100} ${endY}, ${endX} ${endY}`;
      dragLine.setAttribute('d', d);
    };

    const onUp = async (upEvent) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      
      dragLine.remove();
      dragLine = null;

      const targetPort = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
      if (targetPort && targetPort.classList.contains('input')) {
        const targetId = targetPort.dataset.id;
        const targetEntity = store.getById(targetId);
        
        if (targetEntity && targetEntity.id !== dragSourceEntity.id) {
          const newInputs = Array.isArray(targetEntity.inputs) ? [...targetEntity.inputs] : [];
          if (!newInputs.includes(dragSourceEntity.id)) {
            newInputs.push(dragSourceEntity.id);
            if (window.electronAPI) {
              await window.electronAPI.updateVaultData(targetEntity.tier, targetEntity.id, { inputs: newInputs });
            }
          }
        }
      }
      dragSourceEntity = null;
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function renderMachine(entity, isRoot = false) {
    const block = document.createElement('div');
    block.className = 'machine-block';
    block.dataset.id = entity.id;
    if (openNodes[entity.parentId] === entity.id) {
      block.classList.add('is-open');
    }

    const inPort = document.createElement('div');
    inPort.className = 'port input';
    inPort.dataset.id = entity.id;
    block.appendChild(inPort);

    const outPort = document.createElement('div');
    outPort.className = 'port output';
    outPort.dataset.id = entity.id;
    outPort.addEventListener('mousedown', (e) => handlePortMousedown(e, entity, 'output'));
    block.appendChild(outPort);

    const header = document.createElement('div');
    header.className = 'machine-header';
    
    const tierMeta = TIERS[entity.tier] || { icon: '⚙', color: '#c5c6c7' };
    
    const icon = document.createElement('div');
    icon.className = 'machine-icon';
    icon.textContent = tierMeta.icon;
    icon.style.borderColor = tierMeta.color;
    icon.style.color = tierMeta.color;
    
    const info = document.createElement('div');
    info.className = 'machine-info';
    
    const title = document.createElement('div');
    title.className = 'machine-title';
    title.textContent = entity.title;
    
    title.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'machine-title-input';
      input.value = entity.title;
      
      input.addEventListener('blur', () => handleTitleEdit(entity, input.value));
      input.addEventListener('keydown', (ke) => {
        if (ke.key === 'Enter') handleTitleEdit(entity, input.value);
        if (ke.key === 'Escape') render();
      });
      
      info.replaceChild(input, title);
      input.focus();
    });

    const tierLabel = document.createElement('div');
    tierLabel.className = 'machine-tier';
    tierLabel.textContent = entity.tier;
    tierLabel.style.color = tierMeta.color;

    info.appendChild(tierLabel);
    info.appendChild(title);
    
    header.appendChild(icon);
    header.appendChild(info);
    block.appendChild(header);

    block.addEventListener('click', (e) => {
      if (e.target.tagName !== 'INPUT' && !e.target.classList.contains('port')) {
        toggleNode(entity);
      }
    });

    if (openNodes[entity.parentId] === entity.id) {
      const children = store.getChildren(entity.id);
      if (children.length > 0) {
        const blueprint = document.createElement('div');
        blueprint.className = 'machine-blueprint';
        
        children.forEach(child => {
          const childBlock = renderMachine(child, false);
          blueprint.appendChild(childBlock);
        });

        block.appendChild(blueprint);
      }
    }

    elementsMap.set(entity.id, block);
    return block;
  }

  function drawConnections() {
    svgOverlay.innerHTML = '';
    const wrapperRect = wrapper.getBoundingClientRect();

    store.entities.forEach((entity) => {
      const targetEl = elementsMap.get(entity.id);
      if (!targetEl) return;

      if (Array.isArray(entity.inputs)) {
        entity.inputs.forEach((sourceId) => {
          const sourceEl = elementsMap.get(sourceId);
          if (sourceEl) {
            const outPort = sourceEl.querySelector('.port.output');
            const inPort = targetEl.querySelector('.port.input');
            
            if (outPort && inPort) {
              const outRect = outPort.getBoundingClientRect();
              const inRect = inPort.getBoundingClientRect();

              const startX = outRect.left + outRect.width/2 - wrapperRect.left + wrapper.scrollLeft;
              const startY = outRect.top + outRect.height/2 - wrapperRect.top + wrapper.scrollTop;
              const endX = inRect.left + inRect.width/2 - wrapperRect.left + wrapper.scrollLeft;
              const endY = inRect.top + inRect.height/2 - wrapperRect.top + wrapper.scrollTop;

              const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
              const d = `M ${startX} ${startY} C ${startX + 80} ${startY}, ${endX - 80} ${endY}, ${endX} ${endY}`;
              
              path.setAttribute('d', d);
              path.setAttribute('class', 'conveyor-line');
              svgOverlay.appendChild(path);

              const animPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
              animPath.setAttribute('d', d);
              animPath.setAttribute('class', 'conveyor-belt-anim');
              svgOverlay.appendChild(animPath);
            }
          }
        });
      }
    });
  }

  function render() {
    gridContainer.innerHTML = '';
    elementsMap.clear();

    const allEntities = Array.from(store.entities.values());
    const warehouseItems = allEntities.filter(e => e.tier === 'inventory');

    // ── Inventory Warehouse Palette (Sticky Left Side) ──
    const colWarehouse = document.createElement('div');
    colWarehouse.className = 'factory-col';
    colWarehouse.style.width = '240px';
    colWarehouse.style.flexShrink = '0';
    colWarehouse.style.background = 'rgba(0,0,0,0.4)';
    colWarehouse.style.padding = '20px';
    colWarehouse.style.borderRadius = '8px';
    colWarehouse.style.border = '1px solid #ffb03b';
    
    const whTitle = document.createElement('h2');
    whTitle.style.color = '#ffb03b';
    whTitle.style.fontSize = '18px';
    whTitle.style.marginTop = '0';
    whTitle.textContent = '📦 WAREHOUSE';
    colWarehouse.appendChild(whTitle);

    warehouseItems.forEach(item => {
      // Inventory items are rendered as small mini-blocks to save space
      const block = renderMachine(item, true);
      block.style.minWidth = '100%';
      colWarehouse.appendChild(block);
    });
    gridContainer.appendChild(colWarehouse);

    // ── Main Pipeline Area (Selected Hierarchy) ──
    const colProcessors = document.createElement('div');
    colProcessors.className = 'factory-col';
    colProcessors.style.flex = '1';
    colProcessors.style.alignItems = 'flex-start';

    const procTitle = document.createElement('h2');
    procTitle.style.color = '#66fcf1';
    procTitle.style.fontSize = '18px';
    procTitle.style.marginTop = '0';
    procTitle.textContent = '⚙️ ACTIVE PIPELINE';
    colProcessors.appendChild(procTitle);

    if (!store.selectedId) {
      const emptyMsg = document.createElement('div');
      emptyMsg.style.color = '#c5c6c7';
      emptyMsg.textContent = 'Select a Project or Experiment from the Sidebar to view its pipeline.';
      colProcessors.appendChild(emptyMsg);
    } else {
      // Find the topmost ancestor of the selected node that is NOT an inventory item
      // Wait, let's just render the top root of the selected item.
      const ancestors = store.getAncestors(store.selectedId);
      const rootItem = ancestors.length > 0 ? ancestors[ancestors.length - 1] : store.getSelected();

      if (rootItem && rootItem.tier !== 'inventory') {
        colProcessors.appendChild(renderMachine(rootItem, true));
      }
    }
    
    gridContainer.appendChild(colProcessors);

    setTimeout(drawConnections, 50);
  }

  store.on('select', ({ entity }) => {
    if (entity) {
      let curr = entity;
      while(curr && curr.parentId) {
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
