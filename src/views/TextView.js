/**
 * Scidream v1.4 — Text View
 * Document/paper reading mode with structured rendering,
 * breadcrumb navigation, and inventory tooltips.
 */

import { TIERS } from '../store/store.js';
import { createInventoryTooltip } from '../components/InventoryTooltip.js';

function injectStyles() {
  if (document.getElementById('sd-text-view-styles')) return;
  const style = document.createElement('style');
  style.id = 'sd-text-view-styles';
  style.textContent = `
    .sd-text-view {
      width: 100%;
      height: 100%;
      overflow-y: auto;
      background: #0b0c10;
      padding: 0;
    }

    .sd-text-view::-webkit-scrollbar {
      width: 6px;
    }
    .sd-text-view::-webkit-scrollbar-track {
      background: #0b0c10;
    }
    .sd-text-view::-webkit-scrollbar-thumb {
      background: rgba(102, 252, 241, 0.15);
      border-radius: 3px;
    }

    /* Crosshair watermark */
    .sd-text-view::before {
      content: '';
      position: fixed;
      inset: 0;
      background-image:
        radial-gradient(circle, rgba(102, 252, 241, 0.02) 1px, transparent 1px);
      background-size: 40px 40px;
      pointer-events: none;
      z-index: 0;
    }

    .sd-text-view__inner {
      max-width: 780px;
      margin: 0 auto;
      padding: 32px 40px 60px;
      position: relative;
      z-index: 1;
    }

    /* Breadcrumb */
    .sd-text-view__breadcrumb {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 24px;
      padding: 10px 14px;
      background: rgba(31, 40, 51, 0.4);
      border: 1px solid rgba(102, 252, 241, 0.08);
      clip-path: polygon(
        6px 0%, calc(100% - 6px) 0%,
        100% 6px, 100% calc(100% - 6px),
        calc(100% - 6px) 100%, 6px 100%,
        0% calc(100% - 6px), 0% 6px
      );
      flex-wrap: wrap;
    }

    .sd-text-view__crumb {
      font-family: 'Share Tech Mono', monospace;
      font-size: 11px;
      color: #6b7280;
      cursor: pointer;
      transition: color 0.15s;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .sd-text-view__crumb:hover {
      color: #66fcf1;
    }

    .sd-text-view__crumb--active {
      color: #66fcf1;
      cursor: default;
    }

    .sd-text-view__crumb-sep {
      color: #374151;
      font-size: 10px;
      user-select: none;
    }

    .sd-text-view__crumb-icon {
      font-size: 10px;
    }

    /* Document Styling */
    .sd-text-view__title {
      font-family: 'Rajdhani', sans-serif;
      font-size: 32px;
      font-weight: 700;
      color: #e5e7eb;
      margin: 0 0 8px 0;
      letter-spacing: -0.5px;
      line-height: 1.2;
    }

    .sd-text-view__meta {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .sd-text-view__meta-item {
      font-family: 'Share Tech Mono', monospace;
      font-size: 11px;
      color: #6b7280;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .sd-text-view__meta-value {
      color: #9ca3af;
    }

    .sd-text-view__status {
      display: inline-block;
      padding: 2px 10px;
      font-family: 'Share Tech Mono', monospace;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      clip-path: polygon(4px 0%, calc(100% - 4px) 0%, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0% calc(100% - 4px), 0% 4px);
    }

    .sd-text-view__status--active,
    .sd-text-view__status--in-progress,
    .sd-text-view__status--validated {
      background: rgba(102, 252, 241, 0.12);
      color: #66fcf1;
      border: 1px solid rgba(102, 252, 241, 0.3);
    }
    .sd-text-view__status--complete {
      background: rgba(52, 211, 153, 0.12);
      color: #34d399;
      border: 1px solid rgba(52, 211, 153, 0.3);
    }
    .sd-text-view__status--draft,
    .sd-text-view__status--planned {
      background: rgba(156, 163, 175, 0.12);
      color: #9ca3af;
      border: 1px solid rgba(156, 163, 175, 0.3);
    }
    .sd-text-view__status--in-review {
      background: rgba(255, 176, 59, 0.12);
      color: #ffb03b;
      border: 1px solid rgba(255, 176, 59, 0.3);
    }
    .sd-text-view__status--pending {
      background: rgba(255, 176, 59, 0.08);
      color: #d4a04a;
      border: 1px solid rgba(255, 176, 59, 0.2);
    }

    .sd-text-view__divider {
      border: none;
      border-top: 1px solid rgba(102, 252, 241, 0.08);
      margin: 24px 0;
    }

    .sd-text-view h2 {
      font-family: 'Rajdhani', sans-serif;
      font-size: 22px;
      font-weight: 700;
      color: #c5c6c7;
      margin: 28px 0 12px 0;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(102, 252, 241, 0.08);
      letter-spacing: 0.5px;
    }

    .sd-text-view h3 {
      font-family: 'Rajdhani', sans-serif;
      font-size: 17px;
      font-weight: 600;
      color: #9ca3af;
      margin: 20px 0 8px 0;
    }

    .sd-text-view p {
      font-family: 'Share Tech Mono', monospace;
      font-size: 13px;
      color: #9ca3af;
      line-height: 1.8;
      margin: 0 0 12px 0;
    }

    .sd-text-view ol,
    .sd-text-view ul {
      font-family: 'Share Tech Mono', monospace;
      font-size: 13px;
      color: #9ca3af;
      line-height: 1.8;
      padding-left: 24px;
      margin: 0 0 12px 0;
    }

    .sd-text-view li {
      margin: 6px 0;
    }

    /* Section cards for figures */
    .sd-text-view__section-card {
      background: rgba(31, 40, 51, 0.3);
      border: 1px solid rgba(102, 252, 241, 0.06);
      padding: 20px 24px;
      margin: 16px 0;
      clip-path: polygon(
        8px 0%, calc(100% - 8px) 0%,
        100% 8px, 100% calc(100% - 8px),
        calc(100% - 8px) 100%, 8px 100%,
        0% calc(100% - 8px), 0% 8px
      );
      cursor: pointer;
      transition: all 0.2s;
    }

    .sd-text-view__section-card:hover {
      background: rgba(31, 40, 51, 0.5);
      border-color: rgba(102, 252, 241, 0.15);
    }

    .sd-text-view__section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .sd-text-view__section-title {
      font-family: 'Rajdhani', sans-serif;
      font-size: 16px;
      font-weight: 600;
      color: #c5c6c7;
    }

    /* Inventory tag */
    .sd-text-view__inv-tag {
      display: inline-block;
      padding: 1px 8px;
      background: rgba(255, 176, 59, 0.1);
      border: 1px solid rgba(255, 176, 59, 0.25);
      color: #ffb03b;
      font-family: 'Share Tech Mono', monospace;
      font-size: 11px;
      cursor: help;
      margin: 0 2px;
      transition: all 0.15s;
      clip-path: polygon(3px 0%, calc(100% - 3px) 0%, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0% calc(100% - 3px), 0% 3px);
    }

    .sd-text-view__inv-tag:hover {
      background: rgba(255, 176, 59, 0.2);
      border-color: rgba(255, 176, 59, 0.5);
    }

    /* Empty state */
    .sd-text-view__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 40px;
      text-align: center;
    }

    .sd-text-view__empty-icon {
      font-size: 48px;
      color: rgba(102, 252, 241, 0.15);
      margin-bottom: 16px;
    }

    .sd-text-view__empty-text {
      font-family: 'Rajdhani', sans-serif;
      font-size: 18px;
      color: #4b5563;
    }

    .sd-text-view__empty-hint {
      font-family: 'Share Tech Mono', monospace;
      font-size: 12px;
      color: #374151;
      margin-top: 8px;
    }

    /* Action list */
    .sd-text-view__action-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid rgba(102, 252, 241, 0.04);
    }

    .sd-text-view__action-num {
      font-family: 'Share Tech Mono', monospace;
      font-size: 12px;
      color: #66fcf1;
      background: rgba(102, 252, 241, 0.08);
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      clip-path: polygon(4px 0%, calc(100% - 4px) 0%, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0% calc(100% - 4px), 0% 4px);
    }

    .sd-text-view__action-body {
      flex: 1;
    }

    .sd-text-view__action-title {
      font-family: 'Rajdhani', sans-serif;
      font-size: 14px;
      font-weight: 600;
      color: #c5c6c7;
    }

    .sd-text-view__action-detail {
      font-family: 'Share Tech Mono', monospace;
      font-size: 11px;
      color: #6b7280;
      margin-top: 2px;
    }
  `;
  document.head.appendChild(style);
}

/**
 * @param {HTMLElement} container
 * @param {import('../store/store.js').default} store
 */
export function createTextView(container, store) {
  injectStyles();

  const wrapper = document.createElement('div');
  wrapper.className = 'sd-text-view';
  wrapper.id = 'sd-text-view';

  const inner = document.createElement('div');
  inner.className = 'sd-text-view__inner';
  wrapper.appendChild(inner);

  container.appendChild(wrapper);

  const tooltip = createInventoryTooltip();

  function createStatusBadge(status) {
    const badge = document.createElement('span');
    badge.className = `sd-text-view__status sd-text-view__status--${status}`;
    badge.textContent = status.replace(/-/g, ' ');
    return badge;
  }

  function createInvTag(invId) {
    const item = store.getInventoryItem(invId);
    if (!item) return null;

    const tag = document.createElement('span');
    tag.className = 'sd-text-view__inv-tag';
    tag.id = `sd-text-inv-${invId}`;
    tag.textContent = `⬢ ${item.name}`;

    tag.addEventListener('mouseenter', () => tooltip.show(item, tag));
    tag.addEventListener('mouseleave', () => tooltip.hide());

    return tag;
  }

  function renderBreadcrumb(entity) {
    const bc = document.createElement('div');
    bc.className = 'sd-text-view__breadcrumb';

    const ancestors = store.getAncestors(entity.id);
    const chain = [...ancestors, entity];

    chain.forEach((item, idx) => {
      if (idx > 0) {
        const sep = document.createElement('span');
        sep.className = 'sd-text-view__crumb-sep';
        sep.textContent = '›';
        bc.appendChild(sep);
      }

      const crumb = document.createElement('span');
      crumb.className = 'sd-text-view__crumb';
      if (idx === chain.length - 1) crumb.classList.add('sd-text-view__crumb--active');

      const tierMeta = TIERS[item.tier] || { icon: '?', color: '#c5c6c7' };

      const icon = document.createElement('span');
      icon.className = 'sd-text-view__crumb-icon';
      icon.textContent = tierMeta.icon;
      icon.style.color = tierMeta.color;
      crumb.appendChild(icon);
      crumb.appendChild(document.createTextNode(item.title));

      if (idx < chain.length - 1) {
        crumb.addEventListener('click', () => store.select(item.id));
      }

      bc.appendChild(crumb);
    });

    return bc;
  }

  function renderManuscript(entity) {
    // Title
    const title = document.createElement('h1');
    title.className = 'sd-text-view__title';
    title.textContent = entity.title;
    inner.appendChild(title);

    // Meta
    const meta = document.createElement('div');
    meta.className = 'sd-text-view__meta';

    if (entity.status) {
      meta.appendChild(createStatusBadge(entity.status));
    }

    if (entity.journal) {
      const journalItem = document.createElement('span');
      journalItem.className = 'sd-text-view__meta-item';
      journalItem.textContent = '📰 ';
      const jVal = document.createElement('span');
      jVal.className = 'sd-text-view__meta-value';
      jVal.textContent = entity.journal;
      journalItem.appendChild(jVal);
      meta.appendChild(journalItem);
    }

    if (entity.created) {
      const dateItem = document.createElement('span');
      dateItem.className = 'sd-text-view__meta-item';
      dateItem.textContent = '📅 ';
      const dVal = document.createElement('span');
      dVal.className = 'sd-text-view__meta-value';
      dVal.textContent = entity.created;
      dateItem.appendChild(dVal);
      meta.appendChild(dateItem);
    }

    inner.appendChild(meta);

    // Description
    if (entity.description) {
      const desc = document.createElement('p');
      desc.textContent = entity.description;
      inner.appendChild(desc);
    }

    inner.appendChild(document.createElement('hr')).className = 'sd-text-view__divider';

    // Figures
    const figures = store.getChildren(entity.id);
    if (figures.length > 0) {
      const figHeader = document.createElement('h2');
      figHeader.textContent = `Figures (${figures.length})`;
      inner.appendChild(figHeader);

      figures.forEach(fig => {
        const card = document.createElement('div');
        card.className = 'sd-text-view__section-card';
        card.id = `sd-text-fig-${fig.id}`;

        const header = document.createElement('div');
        header.className = 'sd-text-view__section-header';

        const secTitle = document.createElement('span');
        secTitle.className = 'sd-text-view__section-title';
        secTitle.textContent = fig.title;
        header.appendChild(secTitle);

        if (fig.status) header.appendChild(createStatusBadge(fig.status));

        card.appendChild(header);

        if (fig.description) {
          const desc = document.createElement('p');
          desc.textContent = fig.description;
          card.appendChild(desc);
        }

        // Show experiments under this figure
        const exps = store.getChildren(fig.id);
        if (exps.length > 0) {
          const expHeader = document.createElement('h3');
          expHeader.textContent = 'Experiments';
          card.appendChild(expHeader);

          exps.forEach(exp => {
            const expP = document.createElement('p');
            expP.textContent = `⚙ ${exp.title}`;
            if (exp.duration) expP.textContent += ` — ${exp.duration}`;
            card.appendChild(expP);
          });
        }

        card.addEventListener('click', () => store.select(fig.id));
        inner.appendChild(card);
      });
    }
  }

  function renderFigure(entity) {
    const title = document.createElement('h1');
    title.className = 'sd-text-view__title';
    title.textContent = entity.title;
    inner.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'sd-text-view__meta';
    if (entity.status) meta.appendChild(createStatusBadge(entity.status));
    inner.appendChild(meta);

    if (entity.description) {
      const desc = document.createElement('p');
      desc.textContent = entity.description;
      inner.appendChild(desc);
    }

    inner.appendChild(document.createElement('hr')).className = 'sd-text-view__divider';

    // Experiments
    const exps = store.getChildren(entity.id);
    if (exps.length > 0) {
      const expHeader = document.createElement('h2');
      expHeader.textContent = 'Experiments';
      inner.appendChild(expHeader);

      exps.forEach(exp => {
        const card = document.createElement('div');
        card.className = 'sd-text-view__section-card';
        card.id = `sd-text-exp-${exp.id}`;

        const header = document.createElement('div');
        header.className = 'sd-text-view__section-header';

        const secTitle = document.createElement('span');
        secTitle.className = 'sd-text-view__section-title';
        secTitle.textContent = `⚙ ${exp.title}`;
        header.appendChild(secTitle);

        if (exp.status) header.appendChild(createStatusBadge(exp.status));
        card.appendChild(header);

        if (exp.description) {
          const desc = document.createElement('p');
          desc.textContent = exp.description;
          card.appendChild(desc);
        }

        if (exp.duration) {
          const durP = document.createElement('p');
          durP.textContent = `Duration: ${exp.duration}`;
          card.appendChild(durP);
        }

        card.addEventListener('click', () => store.select(exp.id));
        inner.appendChild(card);
      });
    }
  }

  function renderProtocol(entity) {
    const title = document.createElement('h1');
    title.className = 'sd-text-view__title';
    title.textContent = entity.title;
    inner.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'sd-text-view__meta';
    if (entity.status) meta.appendChild(createStatusBadge(entity.status));
    if (entity.duration) {
      const durItem = document.createElement('span');
      durItem.className = 'sd-text-view__meta-item';
      durItem.textContent = '⏱ ';
      const dVal = document.createElement('span');
      dVal.className = 'sd-text-view__meta-value';
      dVal.textContent = entity.duration;
      durItem.appendChild(dVal);
      meta.appendChild(durItem);
    }
    inner.appendChild(meta);

    if (entity.description) {
      const desc = document.createElement('p');
      desc.textContent = entity.description;
      inner.appendChild(desc);
    }

    inner.appendChild(document.createElement('hr')).className = 'sd-text-view__divider';

    // Actions as numbered list
    if (entity.actions && entity.actions.length > 0) {
      const actHeader = document.createElement('h2');
      actHeader.textContent = 'Action Fragments';
      inner.appendChild(actHeader);

      entity.actions.forEach((action, idx) => {
        const item = document.createElement('div');
        item.className = 'sd-text-view__action-item';

        const num = document.createElement('div');
        num.className = 'sd-text-view__action-num';
        num.textContent = String(idx + 1);
        item.appendChild(num);

        const body = document.createElement('div');
        body.className = 'sd-text-view__action-body';

        const actionTitle = document.createElement('div');
        actionTitle.className = 'sd-text-view__action-title';
        actionTitle.textContent = action.title;
        if (action.duration) actionTitle.textContent += ` (${action.duration})`;
        body.appendChild(actionTitle);

        // Inputs
        if (action.inputs && action.inputs.length > 0) {
          const detail = document.createElement('div');
          detail.className = 'sd-text-view__action-detail';
          detail.textContent = `Inputs: ${action.inputs.join(', ')}`;
          body.appendChild(detail);
        }

        // Outputs
        if (action.outputs && action.outputs.length > 0) {
          const detail = document.createElement('div');
          detail.className = 'sd-text-view__action-detail';
          detail.textContent = `Outputs: ${action.outputs.join(', ')}`;
          body.appendChild(detail);
        }

        // Inventory references
        if (action.inventoryRefs && action.inventoryRefs.length > 0) {
          const invLine = document.createElement('div');
          invLine.className = 'sd-text-view__action-detail';
          invLine.appendChild(document.createTextNode('Resources: '));
          action.inventoryRefs.forEach(ref => {
            const tag = createInvTag(ref);
            if (tag) invLine.appendChild(tag);
          });
          body.appendChild(invLine);
        }

        item.appendChild(body);

        if (action.status) {
          item.appendChild(createStatusBadge(action.status));
        }

        inner.appendChild(item);
      });
    }
  }

  function renderGeneric(entity) {
    const title = document.createElement('h1');
    title.className = 'sd-text-view__title';
    title.textContent = entity.title;
    inner.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'sd-text-view__meta';
    if (entity.status) meta.appendChild(createStatusBadge(entity.status));

    const tierMeta = TIERS[entity.tier] || { label: entity.tier };
    const tierItem = document.createElement('span');
    tierItem.className = 'sd-text-view__meta-item';
    const tVal = document.createElement('span');
    tVal.className = 'sd-text-view__meta-value';
    tVal.textContent = tierMeta.label;
    tierItem.appendChild(tVal);
    meta.appendChild(tierItem);

    inner.appendChild(meta);

    if (entity.description) {
      const desc = document.createElement('p');
      desc.textContent = entity.description;
      inner.appendChild(desc);
    }

    inner.appendChild(document.createElement('hr')).className = 'sd-text-view__divider';

    // Children
    const children = store.getChildren(entity.id);
    if (children.length > 0) {
      const childHeader = document.createElement('h2');
      childHeader.textContent = 'Contents';
      inner.appendChild(childHeader);

      children.forEach(child => {
        const card = document.createElement('div');
        card.className = 'sd-text-view__section-card';

        const header = document.createElement('div');
        header.className = 'sd-text-view__section-header';

        const childTierMeta = TIERS[child.tier] || { icon: '?', color: '#c5c6c7' };
        const secTitle = document.createElement('span');
        secTitle.className = 'sd-text-view__section-title';
        secTitle.textContent = `${childTierMeta.icon} ${child.title}`;
        header.appendChild(secTitle);

        if (child.status) header.appendChild(createStatusBadge(child.status));
        card.appendChild(header);

        if (child.description) {
          const desc = document.createElement('p');
          desc.textContent = child.description;
          card.appendChild(desc);
        }

        card.addEventListener('click', () => store.select(child.id));
        inner.appendChild(card);
      });
    }
  }

  function renderEmpty() {
    const empty = document.createElement('div');
    empty.className = 'sd-text-view__empty';

    const icon = document.createElement('div');
    icon.className = 'sd-text-view__empty-icon';
    icon.textContent = '📄';
    empty.appendChild(icon);

    const text = document.createElement('div');
    text.className = 'sd-text-view__empty-text';
    text.textContent = 'Select an entity to view';
    empty.appendChild(text);

    const hint = document.createElement('div');
    hint.className = 'sd-text-view__empty-hint';
    hint.textContent = 'Use the sidebar or node map to select a Dream, Project, Manuscript, Figure, Experiment, or Protocol';
    empty.appendChild(hint);

    inner.appendChild(empty);
  }

  function render() {
    while (inner.firstChild) inner.removeChild(inner.firstChild);

    const entity = store.getSelected();

    if (!entity) {
      renderEmpty();
      return;
    }

    // Breadcrumb
    inner.appendChild(renderBreadcrumb(entity));

    // Tier-specific rendering
    switch (entity.tier) {
      case 'manuscript':
        renderManuscript(entity);
        break;
      case 'figure':
        renderFigure(entity);
        break;
      case 'protocol':
        renderProtocol(entity);
        break;
      default:
        renderGeneric(entity);
        break;
    }
  }

  // React to store
  store.on('select', () => render());

  // Initial render
  render();

  return {
    render,
    destroy() { wrapper.remove(); },
  };
}
