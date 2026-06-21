export function createActionView(container, store) {
  let currentEntity = null;
  let actionViewContainer = null;

  function init() {
    container.innerHTML = '';
    actionViewContainer = document.createElement('div');
    actionViewContainer.className = 'action-view-container';
    container.appendChild(actionViewContainer);
  }

  function renderEmpty() {
    actionViewContainer.innerHTML = `
      <div class="action-empty-state">
        <div class="empty-icon">⚡</div>
        <h3>No Experiment or Protocol Selected</h3>
        <p>Select an Experiment or Protocol from the Node View or Sidebar to view the Action Pipeline.</p>
      </div>
    `;
  }

  function render(entityId) {
    if (!entityId) {
      renderEmpty();
      return;
    }

    currentEntity = store.getById(entityId);
    if (!currentEntity) {
      renderEmpty();
      return;
    }

    const tier = store.getTierName(entityId);
    
    actionViewContainer.innerHTML = '';

    if (tier === 'experiment') {
      const protocols = store.getChildren(entityId);
      if (protocols.length === 0) {
        actionViewContainer.innerHTML = '<div class="action-empty-state">No protocols in this experiment.</div>';
        return;
      }
      
      const header = document.createElement('div');
      header.className = 'action-view-header';
      header.innerHTML = `<h2>Experiment: ${currentEntity.title}</h2><p>${currentEntity.description}</p>`;
      actionViewContainer.appendChild(header);

      protocols.forEach(proto => {
        const fullProto = store.getProtocolById(proto.id);
        if (fullProto) {
          actionViewContainer.appendChild(createProtocolPipeline(fullProto));
        }
      });
    } else if (tier === 'protocol') {
      const fullProto = store.getProtocolById(entityId);
      if (fullProto) {
        actionViewContainer.appendChild(createProtocolPipeline(fullProto));
      } else {
         actionViewContainer.innerHTML = '<div class="action-empty-state">Protocol data not found.</div>';
      }
    } else {
      renderEmpty();
    }
  }

  function createProtocolPipeline(protocol) {
    const pipelineWrapper = document.createElement('div');
    pipelineWrapper.className = 'protocol-pipeline-wrapper';

    const header = document.createElement('div');
    header.className = 'protocol-pipeline-header section-header';
    header.innerHTML = `
      <span class="protocol-icon">▶</span>
      <span class="protocol-title">${protocol.title}</span>
      <span class="protocol-duration">⏱ ${protocol.duration}</span>
    `;
    pipelineWrapper.appendChild(header);

    const track = document.createElement('div');
    track.className = 'action-track';

    if (protocol.actions && protocol.actions.length > 0) {
      protocol.actions.forEach((action, index) => {
        track.appendChild(createActionBlock(action, protocol.actions));
        if (index < protocol.actions.length - 1) {
          const connector = document.createElement('div');
          connector.className = 'action-connector';
          connector.innerHTML = '<div class="connector-line"></div><div class="connector-arrow">▶</div>';
          track.appendChild(connector);
        }
      });
    } else {
      track.innerHTML = '<div class="action-empty-state">No actions defined for this protocol.</div>';
    }

    pipelineWrapper.appendChild(track);
    return pipelineWrapper;
  }

  function createActionBlock(action, allActions) {
    const block = document.createElement('div');
    block.className = `action-block ${action.status}`;
    block.id = action.id;

    // Check if inputs are available (simplified logic: all previous actions in the protocol must be complete, or explicit outputs match)
    let isError = false;
    if (action.inputs && action.inputs.length > 0) {
       // Just a simple simulation: if status is idle and inputs exist, maybe previous step isn't complete
       const prevAction = allActions.find(a => a.outputs && a.outputs.some(out => action.inputs.includes(out)));
       if (prevAction && prevAction.status !== 'complete') {
           isError = true;
           block.classList.add('error');
       }
    }

    let variablesHtml = '';
    if (action.variables && action.variables.length > 0) {
      variablesHtml = '<div class="action-variables">';
      action.variables.forEach(v => {
        variablesHtml += `
          <div class="variable-control">
            <label>${v.name}</label>
            <select class="variable-dropdown">
              ${v.options.map(opt => `<option value="${opt}" ${opt === v.default ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>
          </div>
        `;
      });
      variablesHtml += '</div>';
    }

    let inventoryHtml = '';
    if (action.inventoryRefs && action.inventoryRefs.length > 0) {
      const items = store.resolveInventoryRefs ? store.resolveInventoryRefs(action.inventoryRefs) : action.inventoryRefs.map(id => store.getInventoryById(id)).filter(Boolean);
      
      inventoryHtml = '<div class="resource-panel">';
      inventoryHtml += '<div class="resource-panel-header">📦 Resources <span>▼</span></div>';
      inventoryHtml += '<div class="resource-list" style="display:none;">';
      items.forEach(item => {
        inventoryHtml += `
          <div class="resource-item">
            <span class="resource-name">${item.name}</span>
            <span class="resource-detail">${item.catalog || ''}</span>
          </div>
        `;
      });
      inventoryHtml += '</div></div>';
    }

    let inputHtml = '';
    if (action.inputs && action.inputs.length > 0) {
       inputHtml = `
         <div class="action-slot input-slot ${isError ? 'missing' : 'available'}">
           <span class="slot-label">IN:</span> ${action.inputs.join(', ')}
         </div>
       `;
    }

    let outputHtml = '';
    if (action.outputs && action.outputs.length > 0) {
       outputHtml = `
         <div class="action-slot output-slot">
           <span class="slot-label">OUT:</span> ${action.outputs.join(', ')}
         </div>
       `;
    }

    block.innerHTML = `
      <div class="action-header">
        <h4>${action.title}</h4>
        <div class="action-meta">
          <span class="action-duration">${action.duration}</span>
          <span class="status-badge ${action.status}">${action.status}</span>
        </div>
      </div>
      ${inputHtml}
      ${inventoryHtml}
      ${variablesHtml}
      <div class="toggle-container">
        <label class="toggle-switch">
          <input type="checkbox" ${action.status === 'complete' ? 'checked' : ''} ${isError ? 'disabled' : ''}>
          <span class="toggle-slider"></span>
        </label>
        <span class="toggle-label">${action.status === 'complete' ? 'POWER ON' : 'POWER OFF'}</span>
      </div>
      ${outputHtml}
    `;

    // Event listeners
    const toggle = block.querySelector('input[type="checkbox"]');
    if (toggle) {
      toggle.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        action.status = isChecked ? 'complete' : 'idle';
        // In a real app, we would update the store and re-render or selectively update the UI
        render(currentEntity.id);
      });
    }

    const resourceHeader = block.querySelector('.resource-panel-header');
    if (resourceHeader) {
      resourceHeader.addEventListener('click', () => {
        const list = block.querySelector('.resource-list');
        if (list.style.display === 'none') {
          list.style.display = 'block';
          resourceHeader.querySelector('span').textContent = '▲';
        } else {
          list.style.display = 'none';
          resourceHeader.querySelector('span').textContent = '▼';
        }
      });
    }

    return block;
  }

  function destroy() {
    container.innerHTML = '';
  }

  init();

  return {
    render,
    destroy
  };
}
