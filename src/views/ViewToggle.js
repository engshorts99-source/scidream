/**
 * Scidream v1.4 — View Toggle Controller
 * Three-button toggle bar: [⬡ Map] [📄 Text] [⚡ Action]
 */

const VIEWS = [
  { key: 'node',   label: '⬡ Map',    title: 'Node View — 2D Map' },
  { key: 'text',   label: '📄 Text',   title: 'Text View — Document Mode' },
  { key: 'action', label: '⚡ Action', title: 'Action View — Protocol Bench' },
];

function injectStyles() {
  if (document.getElementById('sd-view-toggle-styles')) return;
  const style = document.createElement('style');
  style.id = 'sd-view-toggle-styles';
  style.textContent = `
    .sd-view-toggle {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 2px;
      padding: 6px 8px;
      background: rgba(31, 40, 51, 0.85);
      border: 1px solid rgba(102, 252, 241, 0.15);
      clip-path: polygon(
        10px 0%, calc(100% - 10px) 0%,
        100% 10px, 100% calc(100% - 10px),
        calc(100% - 10px) 100%, 10px 100%,
        0% calc(100% - 10px), 0% 10px
      );
      backdrop-filter: blur(8px);
      user-select: none;
    }

    .sd-view-toggle__btn {
      position: relative;
      padding: 8px 20px;
      background: transparent;
      color: #c5c6c7;
      border: 1px solid rgba(102, 252, 241, 0.25);
      font-family: 'Rajdhani', sans-serif;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.25s ease;
      clip-path: polygon(
        6px 0%, calc(100% - 6px) 0%,
        100% 6px, 100% calc(100% - 6px),
        calc(100% - 6px) 100%, 6px 100%,
        0% calc(100% - 6px), 0% 6px
      );
      outline: none;
    }

    .sd-view-toggle__btn:hover {
      background: rgba(102, 252, 241, 0.08);
      color: #66fcf1;
      border-color: rgba(102, 252, 241, 0.45);
    }

    .sd-view-toggle__btn:focus-visible {
      box-shadow: 0 0 0 2px rgba(102, 252, 241, 0.5);
    }

    .sd-view-toggle__btn--active {
      background: rgba(102, 252, 241, 0.18);
      color: #66fcf1;
      border-color: #66fcf1;
      box-shadow:
        0 0 12px rgba(102, 252, 241, 0.3),
        inset 0 0 8px rgba(102, 252, 241, 0.08);
    }

    .sd-view-toggle__btn--active::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 20%;
      width: 60%;
      height: 2px;
      background: #66fcf1;
      box-shadow: 0 0 8px #66fcf1;
      animation: sd-toggle-glow 2s ease-in-out infinite;
    }

    @keyframes sd-toggle-glow {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Creates the view toggle bar inside the given container.
 * @param {HTMLElement} container
 * @returns {{ setActive(view: string): void, destroy(): void }}
 */
export function createViewToggle(container) {
  injectStyles();

  const bar = document.createElement('div');
  bar.className = 'sd-view-toggle';
  bar.id = 'sd-view-toggle';

  let activeKey = 'node';
  const buttons = new Map();

  VIEWS.forEach(({ key, label, title }) => {
    const btn = document.createElement('button');
    btn.className = 'sd-view-toggle__btn';
    btn.id = `sd-toggle-${key}`;
    btn.textContent = label;
    btn.title = title;
    btn.type = 'button';
    btn.setAttribute('data-view', key);

    if (key === activeKey) {
      btn.classList.add('sd-view-toggle__btn--active');
    }

    btn.addEventListener('click', () => {
      if (key === activeKey) return;
      // Update visual state
      buttons.forEach((b, k) => {
        b.classList.toggle('sd-view-toggle__btn--active', k === key);
      });
      activeKey = key;

      // Dispatch custom event
      container.dispatchEvent(new CustomEvent('viewChange', {
        bubbles: true,
        detail: { view: key },
      }));
    });

    buttons.set(key, btn);
    bar.appendChild(btn);
  });

  container.appendChild(bar);

  return {
    setActive(view) {
      if (!buttons.has(view)) return;
      activeKey = view;
      buttons.forEach((b, k) => {
        b.classList.toggle('sd-view-toggle__btn--active', k === view);
      });
    },
    destroy() {
      bar.remove();
    },
  };
}
