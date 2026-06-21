/**
 * Scidream v1.4 — Sidebar (Hierarchy Navigation)
 * Tree view of all 6 tiers with search, collapse, and selection.
 */

import { TIERS } from '../store/store.js';

function injectStyles() {
  if (document.getElementById('sd-sidebar-styles')) return;
  const style = document.createElement('style');
  style.id = 'sd-sidebar-styles';
  style.textContent = `
    .sd-sidebar {
      width: 280px;
      min-width: 280px;
      height: 100vh;
      background: #0c0d12;
      border-right: 1px solid rgba(102, 252, 241, 0.12);
      display: flex;
      flex-direction: column;
      position: relative;
      transition: margin-left 0.3s cubic-bezier(0.22, 1, 0.36, 1), min-width 0.3s cubic-bezier(0.22, 1, 0.36, 1), width 0.3s cubic-bezier(0.22, 1, 0.36, 1);
      z-index: 100;
      overflow: hidden;
    }

    .sd-sidebar--collapsed {
      width: 0;
      min-width: 0;
      border-right: none;
    }

    .sd-sidebar__toggle {
      position: absolute;
      top: 12px;
      right: -32px;
      width: 28px;
      height: 28px;
      background: #0c0d12;
      border: 1px solid rgba(102, 252, 241, 0.2);
      color: #66fcf1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      z-index: 110;
      clip-path: polygon(
        4px 0%, calc(100% - 4px) 0%,
        100% 4px, 100% calc(100% - 4px),
        calc(100% - 4px) 100%, 4px 100%,
        0% calc(100% - 4px), 0% 4px
      );
      transition: background 0.2s;
    }

    .sd-sidebar__toggle:hover {
      background: rgba(102, 252, 241, 0.1);
    }

    .sd-sidebar__header {
      padding: 16px 16px 0;
      flex-shrink: 0;
    }

    .sd-sidebar__brand {
      font-family: 'Rajdhani', sans-serif;
      font-size: 18px;
      font-weight: 700;
      color: #66fcf1;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin: 0 0 12px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sd-sidebar__brand-icon {
      display: inline-block;
      width: 8px;
      height: 8px;
      background: #66fcf1;
      box-shadow: 0 0 8px #66fcf1;
      clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
    }

    .sd-sidebar__search {
      position: relative;
      margin-bottom: 12px;
    }

    .sd-sidebar__search-input {
      width: 100%;
      padding: 8px 12px 8px 32px;
      background: rgba(31, 40, 51, 0.6);
      border: 1px solid rgba(102, 252, 241, 0.12);
      color: #c5c6c7;
      font-family: 'Share Tech Mono', monospace;
      font-size: 12px;
      outline: none;
      box-sizing: border-box;
      clip-path: polygon(
        6px 0%, calc(100% - 6px) 0%,
        100% 6px, 100% calc(100% - 6px),
        calc(100% - 6px) 100%, 6px 100%,
        0% calc(100% - 6px), 0% 6px
      );
      transition: border-color 0.2s;
    }

    .sd-sidebar__search-input:focus {
      border-color: rgba(102, 252, 241, 0.4);
    }

    .sd-sidebar__search-input::placeholder {
      color: #4b5563;
    }

    .sd-sidebar__search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: #4b5563;
      font-size: 12px;
      pointer-events: none;
    }

    .sd-sidebar__tree {
      flex: 1;
      overflow-y: auto;
      padding: 0 8px 16px;
    }

    .sd-sidebar__tree::-webkit-scrollbar {
      width: 4px;
    }
    .sd-sidebar__tree::-webkit-scrollbar-track {
      background: transparent;
    }
    .sd-sidebar__tree::-webkit-scrollbar-thumb {
      background: rgba(102, 252, 241, 0.15);
      border-radius: 2px;
    }

    .sd-sidebar__tier-group {
      margin-bottom: 4px;
    }

    .sd-sidebar__tier-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      cursor: pointer;
      user-select: none;
      transition: background 0.15s;
      border-radius: 2px;
    }

    .sd-sidebar__tier-header:hover {
      background: rgba(102, 252, 241, 0.04);
    }

    .sd-sidebar__tier-arrow {
      font-size: 8px;
      color: #4b5563;
      transition: transform 0.2s;
      width: 12px;
      text-align: center;
    }

    .sd-sidebar__tier-arrow--open {
      transform: rotate(90deg);
    }

    .sd-sidebar__tier-icon {
      font-size: 14px;
      flex-shrink: 0;
    }

    .sd-sidebar__tier-label {
      font-family: 'Rajdhani', sans-serif;
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      flex: 1;
    }

    .sd-sidebar__tier-count {
      font-family: 'Share Tech Mono', monospace;
      font-size: 10px;
      color: #4b5563;
      padding: 1px 6px;
      background: rgba(31, 40, 51, 0.5);
      border-radius: 2px;
    }

    .sd-sidebar__tier-items {
      overflow: hidden;
      transition: max-height 0.3s ease;
    }

    .sd-sidebar__tier-items--collapsed {
      max-height: 0 !important;
    }

    .sd-sidebar__item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px 6px 28px;
      cursor: pointer;
      transition: all 0.15s;
      border-left: 2px solid transparent;
      margin: 1px 0;
    }

    .sd-sidebar__item:hover {
      background: rgba(102, 252, 241, 0.04);
      border-left-color: rgba(102, 252, 241, 0.2);
    }

    .sd-sidebar__item--selected {
      background: rgba(102, 252, 241, 0.08);
      border-left-color: #66fcf1;
    }

    .sd-sidebar__item-icon {
      font-size: 12px;
      flex-shrink: 0;
    }

    .sd-sidebar__item-title {
      font-family: 'Rajdhani', sans-serif;
      font-size: 13px;
      font-weight: 500;
      color: #c5c6c7;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }

    .sd-sidebar__item--selected .sd-sidebar__item-title {
      color: #66fcf1;
    }

    .sd-sidebar__item-status {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .sd-sidebar__item-status--active,
    .sd-sidebar__item-status--in-progress,
    .sd-sidebar__item-status--validated {
      background: #66fcf1;
      box-shadow: 0 0 4px rgba(102, 252, 241, 0.5);
    }
    .sd-sidebar__item-status--complete {
      background: #34d399;
      box-shadow: 0 0 4px rgba(52, 211, 153, 0.5);
    }
    .sd-sidebar__item-status--draft,
    .sd-sidebar__item-status--planned,
    .sd-sidebar__item-status--pending {
      background: #4b5563;
    }
    .sd-sidebar__item-status--in-review {
      background: #ffb03b;
      box-shadow: 0 0 4px rgba(255, 176, 59, 0.5);
    }

    .sd-sidebar__empty {
      padding: 20px 16px;
      text-align: center;
      font-family: 'Share Tech Mono', monospace;
      font-size: 12px;
      color: #4b5563;
    }
  `;
  document.head.appendChild(style);
}

const TIER_ORDER = ['dream', 'project', 'manuscript', 'figure', 'experiment', 'protocol'];

/**
 * @param {HTMLElement} container
 * @param {import('../store/store.js').default} store
 */
export function createSidebar(container, store) {
  injectStyles();

  const sidebar = document.createElement('div');
  sidebar.className = 'sd-sidebar';
  sidebar.id = 'sd-sidebar';

  let collapsed = false;

  // Toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'sd-sidebar__toggle';
  toggleBtn.id = 'sd-sidebar-toggle';
  toggleBtn.textContent = '◀';
  toggleBtn.type = 'button';
  toggleBtn.title = 'Toggle sidebar';
  toggleBtn.addEventListener('click', () => {
    collapsed = !collapsed;
    sidebar.classList.toggle('sd-sidebar--collapsed', collapsed);
    toggleBtn.textContent = collapsed ? '▶' : '◀';
  });
  sidebar.appendChild(toggleBtn);

  // Header
  const headerDiv = document.createElement('div');
  headerDiv.className = 'sd-sidebar__header';

  const brand = document.createElement('div');
  brand.className = 'sd-sidebar__brand';
  const brandIcon = document.createElement('span');
  brandIcon.className = 'sd-sidebar__brand-icon';
  brand.appendChild(brandIcon);
  brand.appendChild(document.createTextNode('Scidream'));
  headerDiv.appendChild(brand);

  // Search
  const searchWrap = document.createElement('div');
  searchWrap.className = 'sd-sidebar__search';

  const searchIcon = document.createElement('span');
  searchIcon.className = 'sd-sidebar__search-icon';
  searchIcon.textContent = '⌕';
  searchWrap.appendChild(searchIcon);

  const searchInput = document.createElement('input');
  searchInput.className = 'sd-sidebar__search-input';
  searchInput.id = 'sd-sidebar-search';
  searchInput.type = 'text';
  searchInput.placeholder = 'Search entities...';
  searchWrap.appendChild(searchInput);

  headerDiv.appendChild(searchWrap);
  sidebar.appendChild(headerDiv);

  // Tree container
  const tree = document.createElement('div');
  tree.className = 'sd-sidebar__tree';
  tree.id = 'sd-sidebar-tree';
  sidebar.appendChild(tree);

  // Bottom Action Area
  const actionArea = document.createElement('div');
  actionArea.style.padding = '20px';
  actionArea.style.borderTop = '1px solid rgba(102, 252, 241, 0.1)';
  
  const addBtn = document.createElement('button');
  addBtn.className = 'btn-tactical btn-cyan chamfered-sm';
  addBtn.style.width = '100%';
  addBtn.textContent = '+ Add Entity';
  
  addBtn.addEventListener('click', async () => {
    const title = prompt('Enter Entity Title:');
    if (!title) return;
    
    let tier = prompt('Enter Tier (dream, project, manuscript, figure, experiment, protocol, inventory):', 'inventory');
    if (!tier) return;
    tier = tier.toLowerCase();
    
    const id = `${tier.substring(0,3)}-${Date.now().toString().slice(-6)}`;
    
    try {
      if (window.electronAPI && window.electronAPI.createVaultData) {
        await window.electronAPI.createVaultData(tier, id, {
          id: id,
          tier: tier,
          title: title,
          created: new Date().toISOString().split('T')[0],
          status: 'planned'
        });
        alert('Created: ' + id);
      } else {
        alert('Electron API not found or createVaultData not implemented.');
      }
    } catch (e) {
      alert('Error creating entity: ' + e.message);
    }
  });

  actionArea.appendChild(addBtn);
  sidebar.appendChild(actionArea);

  container.appendChild(sidebar);

  // State
  const tierOpen = {};
  TIER_ORDER.forEach(t => tierOpen[t] = true);

  let filterText = '';

  function render() {
    while (tree.firstChild) tree.removeChild(tree.firstChild);

    const lowerFilter = filterText.toLowerCase();

    TIER_ORDER.forEach(tierKey => {
      const tierMeta = TIERS[tierKey];
      let items = store.getAllByTier(tierKey);

      // Filter
      if (lowerFilter) {
        items = items.filter(it => it.title.toLowerCase().includes(lowerFilter));
      }

      const group = document.createElement('div');
      group.className = 'sd-sidebar__tier-group';

      // Tier header
      const header = document.createElement('div');
      header.className = 'sd-sidebar__tier-header';

      const arrow = document.createElement('span');
      arrow.className = 'sd-sidebar__tier-arrow' + (tierOpen[tierKey] ? ' sd-sidebar__tier-arrow--open' : '');
      arrow.textContent = '▸';

      const icon = document.createElement('span');
      icon.className = 'sd-sidebar__tier-icon';
      icon.textContent = tierMeta.icon;
      icon.style.color = tierMeta.color;

      const label = document.createElement('span');
      label.className = 'sd-sidebar__tier-label';
      label.textContent = tierMeta.label;

      const count = document.createElement('span');
      count.className = 'sd-sidebar__tier-count';
      count.textContent = items.length;

      header.appendChild(arrow);
      header.appendChild(icon);
      header.appendChild(label);
      header.appendChild(count);

      header.addEventListener('click', () => {
        tierOpen[tierKey] = !tierOpen[tierKey];
        render();
      });

      group.appendChild(header);

      // Items
      const itemsContainer = document.createElement('div');
      itemsContainer.className = 'sd-sidebar__tier-items' + (!tierOpen[tierKey] ? ' sd-sidebar__tier-items--collapsed' : '');
      // Set max-height for animation
      itemsContainer.style.maxHeight = tierOpen[tierKey] ? (items.length * 36 + 10) + 'px' : '0';

      items.forEach(entity => {
        const item = document.createElement('div');
        item.className = 'sd-sidebar__item';
        item.id = `sd-sidebar-item-${entity.id}`;

        if (store.selectedId === entity.id) {
          item.classList.add('sd-sidebar__item--selected');
        }

        const itemIcon = document.createElement('span');
        itemIcon.className = 'sd-sidebar__item-icon';
        itemIcon.textContent = tierMeta.icon;
        itemIcon.style.color = tierMeta.color;

        const itemTitle = document.createElement('span');
        itemTitle.className = 'sd-sidebar__item-title';
        itemTitle.textContent = entity.title;
        itemTitle.title = entity.title;

        item.appendChild(itemIcon);
        item.appendChild(itemTitle);

        if (entity.status) {
          const statusDot = document.createElement('span');
          statusDot.className = `sd-sidebar__item-status sd-sidebar__item-status--${entity.status}`;
          item.appendChild(statusDot);
        }

        item.addEventListener('click', () => {
          store.select(entity.id);

          // Also emit custom event
          container.dispatchEvent(new CustomEvent('entitySelect', {
            bubbles: true,
            detail: { id: entity.id, tier: entity.tier },
          }));
        });

        itemsContainer.appendChild(item);
      });

      group.appendChild(itemsContainer);
      tree.appendChild(group);
    });

    // Show empty state if no results
    if (lowerFilter) {
      let total = 0;
      TIER_ORDER.forEach(t => { total += store.getAllByTier(t).filter(it => it.title.toLowerCase().includes(lowerFilter)).length; });
      if (total === 0) {
        const empty = document.createElement('div');
        empty.className = 'sd-sidebar__empty';
        empty.textContent = 'No matching entities';
        tree.appendChild(empty);
      }
    }
  }

  // Search handler
  searchInput.addEventListener('input', (e) => {
    filterText = e.target.value;
    render();
  });

  // React to store changes
  store.on('select', () => render());

  // Initial render
  render();

  return {
    render,
    destroy() { sidebar.remove(); },
  };
}
