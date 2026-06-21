/**
 * Scidream v1.4 — Inventory Tooltip
 * Floating card showing full inventory item details on hover.
 */

function injectStyles() {
  if (document.getElementById('sd-inv-tooltip-styles')) return;
  const style = document.createElement('style');
  style.id = 'sd-inv-tooltip-styles';
  style.textContent = `
    .sd-inv-tooltip {
      position: fixed;
      z-index: 9999;
      pointer-events: none;
      opacity: 0;
      transform: translateY(6px);
      transition: opacity 0.2s ease, transform 0.2s ease;
      max-width: 340px;
      min-width: 260px;
    }

    .sd-inv-tooltip--visible {
      opacity: 1;
      transform: translateY(0);
    }

    .sd-inv-tooltip__card {
      background: #12141a;
      border: 1px solid rgba(255, 176, 59, 0.3);
      border-left: 3px solid #ffb03b;
      padding: 14px 16px;
      clip-path: polygon(
        0% 0%, calc(100% - 8px) 0%,
        100% 8px, 100% 100%,
        8px 100%, 0% calc(100% - 8px)
      );
      box-shadow:
        0 4px 20px rgba(0, 0, 0, 0.6),
        0 0 15px rgba(255, 176, 59, 0.08);
    }

    .sd-inv-tooltip__name {
      font-family: 'Rajdhani', sans-serif;
      font-size: 15px;
      font-weight: 700;
      color: #ffb03b;
      margin: 0 0 6px 0;
      letter-spacing: 0.5px;
    }

    .sd-inv-tooltip__badge {
      display: inline-block;
      padding: 1px 8px;
      background: rgba(255, 176, 59, 0.15);
      border: 1px solid rgba(255, 176, 59, 0.3);
      color: #ffb03b;
      font-family: 'Share Tech Mono', monospace;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
      clip-path: polygon(4px 0%, calc(100% - 4px) 0%, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0% calc(100% - 4px), 0% 4px);
    }

    .sd-inv-tooltip__row {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin: 4px 0;
      font-family: 'Share Tech Mono', monospace;
      font-size: 12px;
      color: #c5c6c7;
    }

    .sd-inv-tooltip__label {
      color: #6b7280;
      min-width: 70px;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
    }

    .sd-inv-tooltip__value {
      color: #c5c6c7;
    }

    .sd-inv-tooltip__details {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 176, 59, 0.15);
      font-family: 'Share Tech Mono', monospace;
      font-size: 11px;
      color: #9ca3af;
      line-height: 1.5;
    }
  `;
  document.head.appendChild(style);
}

function createRow(label, value) {
  const row = document.createElement('div');
  row.className = 'sd-inv-tooltip__row';

  const lbl = document.createElement('span');
  lbl.className = 'sd-inv-tooltip__label';
  lbl.textContent = label;

  const val = document.createElement('span');
  val.className = 'sd-inv-tooltip__value';
  val.textContent = value;

  row.appendChild(lbl);
  row.appendChild(val);
  return row;
}

/**
 * Creates a floating inventory tooltip.
 * @returns {{ show(item: object, target: HTMLElement): void, hide(): void }}
 */
export function createInventoryTooltip() {
  injectStyles();

  const el = document.createElement('div');
  el.className = 'sd-inv-tooltip';
  el.id = 'sd-inv-tooltip';
  document.body.appendChild(el);

  let hideTimer = null;

  function show(item, targetElement) {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }

    // Clear previous content
    while (el.firstChild) el.removeChild(el.firstChild);

    const card = document.createElement('div');
    card.className = 'sd-inv-tooltip__card';

    // Name
    const name = document.createElement('div');
    name.className = 'sd-inv-tooltip__name';
    name.textContent = item.name || 'Unknown Item';
    card.appendChild(name);

    // Category badge
    if (item.category) {
      const badge = document.createElement('div');
      badge.className = 'sd-inv-tooltip__badge';
      badge.textContent = item.category;
      card.appendChild(badge);
    }

    // Rows
    if (item.supplier) card.appendChild(createRow('Supplier', item.supplier));
    if (item.catalog) card.appendChild(createRow('Catalog #', item.catalog));
    if (item.storage) card.appendChild(createRow('Storage', item.storage));
    if (item.quantity) card.appendChild(createRow('Quantity', item.quantity));

    // Details
    if (item.details) {
      const details = document.createElement('div');
      details.className = 'sd-inv-tooltip__details';
      details.textContent = item.details;
      card.appendChild(details);
    }

    el.appendChild(card);

    // Position near target
    const rect = targetElement.getBoundingClientRect();
    let top = rect.bottom + 8;
    let left = rect.left;

    // Keep within viewport
    const elWidth = 320;
    if (left + elWidth > window.innerWidth - 16) {
      left = window.innerWidth - elWidth - 16;
    }
    if (left < 16) left = 16;

    if (top + 250 > window.innerHeight) {
      top = rect.top - 250 - 8;
      if (top < 16) top = 16;
    }

    el.style.top = top + 'px';
    el.style.left = left + 'px';

    // Trigger animation
    requestAnimationFrame(() => {
      el.classList.add('sd-inv-tooltip--visible');
    });
  }

  function hide() {
    hideTimer = setTimeout(() => {
      el.classList.remove('sd-inv-tooltip--visible');
    }, 120);
  }

  return { show, hide };
}
