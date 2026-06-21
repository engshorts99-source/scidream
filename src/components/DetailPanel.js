/**
 * Scidream v1.4 — Detail Panel (Slide-in)
 * Slides in from right showing full details of selected node.
 */

import { TIERS } from '../store/store.js';

function injectStyles() {
  if (document.getElementById('sd-detail-panel-styles')) return;
  const style = document.createElement('style');
  style.id = 'sd-detail-panel-styles';
  style.textContent = `
    .sd-detail-panel {
      position: fixed;
      top: 0;
      right: 0;
      width: 380px;
      height: 100vh;
      background: #0e1017;
      border-left: 1px solid rgba(102, 252, 241, 0.2);
      z-index: 1000;
      transform: translateX(100%);
      transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
      display: flex;
      flex-direction: column;
      box-shadow: -4px 0 30px rgba(0, 0, 0, 0.5);
      overflow: hidden;
    }

    .sd-detail-panel--open {
      transform: translateX(0);
    }

    .sd-detail-panel__header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 20px 16px;
      border-bottom: 1px solid rgba(102, 252, 241, 0.1);
      flex-shrink: 0;
    }

    .sd-detail-panel__tier-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: rgba(102, 252, 241, 0.1);
      border: 1px solid rgba(102, 252, 241, 0.3);
      font-size: 18px;
      clip-path: polygon(
        6px 0%, calc(100% - 6px) 0%,
        100% 6px, 100% calc(100% - 6px),
        calc(100% - 6px) 100%, 6px 100%,
        0% calc(100% - 6px), 0% 6px
      );
      flex-shrink: 0;
    }

    .sd-detail-panel__title-wrap {
      flex: 1;
      min-width: 0;
    }

    .sd-detail-panel__tier-label {
      font-family: 'Share Tech Mono', monospace;
      font-size: 10px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }

    .sd-detail-panel__title {
      font-family: 'Rajdhani', sans-serif;
      font-size: 18px;
      font-weight: 700;
      color: #e5e7eb;
      margin: 2px 0 0 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sd-detail-panel__close {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 32px;
      height: 32px;
      background: rgba(255, 0, 51, 0.1);
      border: 1px solid rgba(255, 0, 51, 0.3);
      color: #ff0033;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: bold;
      clip-path: polygon(
        4px 0%, calc(100% - 4px) 0%,
        100% 4px, 100% calc(100% - 4px),
        calc(100% - 4px) 100%, 4px 100%,
        0% calc(100% - 4px), 0% 4px
      );
      transition: background 0.2s;
    }

    .sd-detail-panel__close:hover {
      background: rgba(255, 0, 51, 0.25);
    }

    .sd-detail-panel__body {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }

    .sd-detail-panel__body::-webkit-scrollbar {
      width: 4px;
    }
    .sd-detail-panel__body::-webkit-scrollbar-track {
      background: #0e1017;
    }
    .sd-detail-panel__body::-webkit-scrollbar-thumb {
      background: rgba(102, 252, 241, 0.2);
      border-radius: 2px;
    }

    .sd-detail-panel__section {
      margin-bottom: 20px;
    }

    .sd-detail-panel__section-title {
      font-family: 'Rajdhani', sans-serif;
      font-size: 12px;
      font-weight: 600;
      color: #66fcf1;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin: 0 0 10px 0;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(102, 252, 241, 0.1);
    }

    .sd-detail-panel__prop {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 5px 0;
      font-family: 'Share Tech Mono', monospace;
      font-size: 12px;
    }

    .sd-detail-panel__prop-label {
      color: #6b7280;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
    }

    .sd-detail-panel__prop-value {
      color: #c5c6c7;
      text-align: right;
      max-width: 60%;
    }

    .sd-detail-panel__desc {
      font-family: 'Share Tech Mono', monospace;
      font-size: 12px;
      color: #9ca3af;
      line-height: 1.6;
      margin: 0;
    }

    .sd-detail-panel__child {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      margin: 4px 0;
      background: rgba(31, 40, 51, 0.4);
      border: 1px solid rgba(102, 252, 241, 0.08);
      cursor: pointer;
      transition: all 0.2s;
      clip-path: polygon(
        4px 0%, calc(100% - 4px) 0%,
        100% 4px, 100% calc(100% - 4px),
        calc(100% - 4px) 100%, 4px 100%,
        0% calc(100% - 4px), 0% 4px
      );
    }

    .sd-detail-panel__child:hover {
      background: rgba(102, 252, 241, 0.06);
      border-color: rgba(102, 252, 241, 0.25);
    }

    .sd-detail-panel__child-icon {
      font-size: 14px;
      flex-shrink: 0;
    }

    .sd-detail-panel__child-title {
      font-family: 'Rajdhani', sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: #c5c6c7;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }

    .sd-detail-panel__status {
      display: inline-block;
      padding: 2px 8px;
      font-family: 'Share Tech Mono', monospace;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-radius: 2px;
    }

    .sd-detail-panel__status--active,
    .sd-detail-panel__status--in-progress,
    .sd-detail-panel__status--validated {
      background: rgba(102, 252, 241, 0.12);
      color: #66fcf1;
      border: 1px solid rgba(102, 252, 241, 0.3);
    }
    .sd-detail-panel__status--complete {
      background: rgba(52, 211, 153, 0.12);
      color: #34d399;
      border: 1px solid rgba(52, 211, 153, 0.3);
    }
    .sd-detail-panel__status--draft,
    .sd-detail-panel__status--planned {
      background: rgba(156, 163, 175, 0.12);
      color: #9ca3af;
      border: 1px solid rgba(156, 163, 175, 0.3);
    }
    .sd-detail-panel__status--in-review {
      background: rgba(255, 176, 59, 0.12);
      color: #ffb03b;
      border: 1px solid rgba(255, 176, 59, 0.3);
    }
    .sd-detail-panel__status--pending {
      background: rgba(255, 176, 59, 0.08);
      color: #d4a04a;
      border: 1px solid rgba(255, 176, 59, 0.2);
    }
  `;
  document.head.appendChild(style);
}

function createStatusBadge(status) {
  const badge = document.createElement('span');
  badge.className = `sd-detail-panel__status sd-detail-panel__status--${status}`;
  badge.textContent = status.replace(/-/g, ' ');
  return badge;
}

function createPropRow(label, value) {
  const row = document.createElement('div');
  row.className = 'sd-detail-panel__prop';

  const lbl = document.createElement('span');
  lbl.className = 'sd-detail-panel__prop-label';
  lbl.textContent = label;

  const val = document.createElement('span');
  val.className = 'sd-detail-panel__prop-value';
  if (typeof value === 'string') {
    val.textContent = value;
  } else {
    val.appendChild(value);
  }

  row.appendChild(lbl);
  row.appendChild(val);
  return row;
}

/**
 * @param {HTMLElement} container
 * @param {import('../store/store.js').default} store
 */
export function createDetailPanel(container, store) {
  injectStyles();

  const panel = document.createElement('div');
  panel.className = 'sd-detail-panel';
  panel.id = 'sd-detail-panel';

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'sd-detail-panel__close';
  closeBtn.id = 'sd-detail-panel-close';
  closeBtn.textContent = '✕';
  closeBtn.title = 'Close panel';
  closeBtn.type = 'button';
  closeBtn.addEventListener('click', () => close());
  panel.appendChild(closeBtn);

  // Header
  const header = document.createElement('div');
  header.className = 'sd-detail-panel__header';
  panel.appendChild(header);

  // Body
  const body = document.createElement('div');
  body.className = 'sd-detail-panel__body';
  panel.appendChild(body);

  container.appendChild(panel);

  function open(entity) {
    if (!entity) return;

    const tierMeta = TIERS[entity.tier] || { icon: '?', label: entity.tier, color: '#c5c6c7' };

    // Clear
    while (header.firstChild) header.removeChild(header.firstChild);
    while (body.firstChild) body.removeChild(body.firstChild);

    // Tier badge
    const badge = document.createElement('div');
    badge.className = 'sd-detail-panel__tier-badge';
    badge.textContent = tierMeta.icon;
    badge.style.color = tierMeta.color;
    header.appendChild(badge);

    // Title wrap
    const titleWrap = document.createElement('div');
    titleWrap.className = 'sd-detail-panel__title-wrap';

    const tierLabel = document.createElement('div');
    tierLabel.className = 'sd-detail-panel__tier-label';
    tierLabel.textContent = tierMeta.label;
    titleWrap.appendChild(tierLabel);

    const title = document.createElement('div');
    title.className = 'sd-detail-panel__title';
    title.textContent = entity.title;
    title.title = entity.title;
    titleWrap.appendChild(title);

    header.appendChild(titleWrap);

    // ── Properties Section ──
    const propsSection = document.createElement('div');
    propsSection.className = 'sd-detail-panel__section';

    const propsTitle = document.createElement('div');
    propsTitle.className = 'sd-detail-panel__section-title';
    propsTitle.textContent = 'Properties';
    propsSection.appendChild(propsTitle);

    if (entity.status) {
      propsSection.appendChild(createPropRow('Status', createStatusBadge(entity.status)));
    }
    if (entity.created) {
      propsSection.appendChild(createPropRow('Created', entity.created));
    }
    if (entity.journal) {
      propsSection.appendChild(createPropRow('Journal', entity.journal));
    }
    if (entity.duration) {
      propsSection.appendChild(createPropRow('Duration', entity.duration));
    }

    body.appendChild(propsSection);

    // ── Description ──
    if (entity.description) {
      const descSection = document.createElement('div');
      descSection.className = 'sd-detail-panel__section';

      const descTitle = document.createElement('div');
      descTitle.className = 'sd-detail-panel__section-title';
      descTitle.textContent = 'Description';
      descSection.appendChild(descTitle);

      const desc = document.createElement('p');
      desc.className = 'sd-detail-panel__desc';
      desc.textContent = entity.description;
      descSection.appendChild(desc);

      body.appendChild(descSection);
    }

    // ── Children ──
    const children = store.getChildren(entity.id);
    if (children.length > 0) {
      const childSection = document.createElement('div');
      childSection.className = 'sd-detail-panel__section';

      const childTitle = document.createElement('div');
      childTitle.className = 'sd-detail-panel__section-title';
      childTitle.textContent = `Children (${children.length})`;
      childSection.appendChild(childTitle);

      children.forEach(child => {
        const childEl = document.createElement('div');
        childEl.className = 'sd-detail-panel__child';
        childEl.id = `sd-detail-child-${child.id}`;

        const childTierMeta = TIERS[child.tier] || { icon: '?', color: '#c5c6c7' };

        const icon = document.createElement('span');
        icon.className = 'sd-detail-panel__child-icon';
        icon.textContent = childTierMeta.icon;
        icon.style.color = childTierMeta.color;
        childEl.appendChild(icon);

        const childTitleEl = document.createElement('span');
        childTitleEl.className = 'sd-detail-panel__child-title';
        childTitleEl.textContent = child.title;
        childEl.appendChild(childTitleEl);

        if (child.status) {
          childEl.appendChild(createStatusBadge(child.status));
        }

        childEl.addEventListener('click', () => {
          store.select(child.id);
        });

        childSection.appendChild(childEl);
      });

      body.appendChild(childSection);
    }

    // ── Parent link ──
    const parent = store.getParent(entity.id);
    if (parent) {
      const parentSection = document.createElement('div');
      parentSection.className = 'sd-detail-panel__section';

      const parentTitle = document.createElement('div');
      parentTitle.className = 'sd-detail-panel__section-title';
      parentTitle.textContent = 'Parent';
      parentSection.appendChild(parentTitle);

      const parentEl = document.createElement('div');
      parentEl.className = 'sd-detail-panel__child';
      parentEl.id = `sd-detail-parent-${parent.id}`;

      const parentTierMeta = TIERS[parent.tier] || { icon: '?', color: '#c5c6c7' };

      const pIcon = document.createElement('span');
      pIcon.className = 'sd-detail-panel__child-icon';
      pIcon.textContent = parentTierMeta.icon;
      pIcon.style.color = parentTierMeta.color;
      parentEl.appendChild(pIcon);

      const pTitle = document.createElement('span');
      pTitle.className = 'sd-detail-panel__child-title';
      pTitle.textContent = parent.title;
      parentEl.appendChild(pTitle);

      parentEl.addEventListener('click', () => {
        store.select(parent.id);
      });

      parentSection.appendChild(parentEl);
      body.appendChild(parentSection);
    }

    panel.classList.add('sd-detail-panel--open');
  }

  function close() {
    panel.classList.remove('sd-detail-panel--open');
  }

  // React to store selection
  store.on('select', ({ entity }) => {
    if (entity) {
      open(entity);
    }
  });

  return { open, close };
}
