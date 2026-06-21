/**
 * Scidream v1.4 — Node View
 * SVG-based 2D open-world map with force-directed layout, zoom/pan,
 * distinct tier node shapes, animated power-line connections, and hover/click interactions.
 */

import { TIERS } from '../store/store.js';

function injectStyles() {
  if (document.getElementById('sd-node-view-styles')) return;
  const style = document.createElement('style');
  style.id = 'sd-node-view-styles';
  style.textContent = `
    .sd-node-view {
      position: relative;
      width: 100%;
      height: 100%;
      background: #0b0c10;
      overflow: hidden;
      cursor: grab;
    }

    .sd-node-view:active {
      cursor: grabbing;
    }

    .sd-node-view svg {
      width: 100%;
      height: 100%;
    }

    /* Crosshair grid watermark */
    .sd-node-view::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image:
        radial-gradient(circle, rgba(102, 252, 241, 0.03) 1px, transparent 1px);
      background-size: 40px 40px;
      pointer-events: none;
      z-index: 0;
    }

    @keyframes sd-dash-flow {
      to { stroke-dashoffset: -30; }
    }

    @keyframes sd-node-glow-pulse {
      0%, 100% { filter: drop-shadow(0 0 4px var(--glow-color, rgba(102,252,241,0.3))); }
      50% { filter: drop-shadow(0 0 12px var(--glow-color, rgba(102,252,241,0.5))); }
    }
  `;
  document.head.appendChild(style);
}

const NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}

// ── Node Shape Generators ──────────────────────────────────

function hexPoints(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return pts.join(' ');
}

function chamferedRect(cx, cy, w, h, c) {
  const x = cx - w / 2, y = cy - h / 2;
  return `M${x + c},${y} L${x + w - c},${y} L${x + w},${y + c} L${x + w},${y + h - c} L${x + w - c},${y + h} L${x + c},${y + h} L${x},${y + h - c} L${x},${y + c} Z`;
}

function pillPath(cx, cy, w, h) {
  const r = h / 2;
  const x = cx - w / 2;
  const y = cy - h / 2;
  return `M${x + r},${y} L${x + w - r},${y} A${r},${r} 0 0 1 ${x + w - r},${y + h} L${x + r},${y + h} A${r},${r} 0 0 1 ${x + r},${y} Z`;
}

function createNodeShape(tier, cx, cy) {
  let shape;
  const fill = 'rgba(11,12,16,0.85)';

  switch (tier) {
    case 'dream': {
      shape = svgEl('polygon', {
        points: hexPoints(cx, cy, 38),
        fill,
        stroke: TIERS.dream.color,
        'stroke-width': '2',
      });
      break;
    }
    case 'project': {
      shape = svgEl('polygon', {
        points: hexPoints(cx, cy, 30),
        fill,
        stroke: TIERS.project.color,
        'stroke-width': '1.5',
      });
      break;
    }
    case 'manuscript': {
      shape = svgEl('path', {
        d: chamferedRect(cx, cy, 56, 36, 8),
        fill,
        stroke: TIERS.manuscript.color,
        'stroke-width': '1.5',
      });
      break;
    }
    case 'figure': {
      shape = svgEl('circle', {
        cx, cy, r: 18,
        fill,
        stroke: TIERS.figure.color,
        'stroke-width': '1.5',
      });
      break;
    }
    case 'experiment': {
      shape = svgEl('path', {
        d: chamferedRect(cx, cy, 50, 50, 10),
        fill,
        stroke: TIERS.experiment.color,
        'stroke-width': '2',
      });
      break;
    }
    case 'protocol': {
      shape = svgEl('path', {
        d: pillPath(cx, cy, 48, 22),
        fill,
        stroke: TIERS.protocol.color,
        'stroke-width': '1.5',
      });
      break;
    }
    default: {
      shape = svgEl('circle', {
        cx, cy, r: 16,
        fill,
        stroke: '#c5c6c7',
        'stroke-width': '1',
      });
    }
  }

  return shape;
}

// ── Force Layout ───────────────────────────────────────────

function forceLayout(nodes, edges, width, height, iterations = 120) {
  // Initialize positions
  const tierYOffsets = { dream: 0.12, project: 0.28, manuscript: 0.44, figure: 0.58, experiment: 0.72, protocol: 0.86 };
  const nodeMap = new Map();

  nodes.forEach((n, i) => {
    const yFrac = tierYOffsets[n.tier] || 0.5;
    n.x = width * 0.2 + (Math.random() * 0.6 * width);
    n.y = height * yFrac + (Math.random() - 0.5) * 80;
    n.vx = 0;
    n.vy = 0;
    nodeMap.set(n.id, n);
  });

  for (let iter = 0; iter < iterations; iter++) {
    const alpha = 1 - iter / iterations;
    const repK = 8000 * alpha;
    const attrK = 0.004 * alpha;

    // Repulsion between all node pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repK / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx -= fx; a.vy -= fy;
        b.vx += fx; b.vy += fy;
      }
    }

    // Attraction along edges
    edges.forEach(e => {
      const a = nodeMap.get(e.source);
      const b = nodeMap.get(e.target);
      if (!a || !b) return;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = dist * attrK;
      a.vx += dx * force;
      a.vy += dy * force;
      b.vx -= dx * force;
      b.vy -= dy * force;
    });

    // Vertical tier gravity
    nodes.forEach(n => {
      const targetY = height * (tierYOffsets[n.tier] || 0.5);
      n.vy += (targetY - n.y) * 0.02 * alpha;
    });

    // Center gravity
    nodes.forEach(n => {
      n.vx += (width / 2 - n.x) * 0.001 * alpha;
    });

    // Apply velocities with damping
    nodes.forEach(n => {
      n.vx *= 0.85;
      n.vy *= 0.85;
      n.x += n.vx;
      n.y += n.vy;
      // Clamp
      n.x = Math.max(60, Math.min(width - 60, n.x));
      n.y = Math.max(60, Math.min(height - 60, n.y));
    });
  }
}

// ── Main View ──────────────────────────────────────────────

/**
 * @param {HTMLElement} container
 * @param {import('../store/store.js').default} store
 */
export function createNodeView(container, store) {
  injectStyles();

  const wrapper = document.createElement('div');
  wrapper.className = 'sd-node-view';
  wrapper.id = 'sd-node-view';

  const svg = svgEl('svg', { id: 'sd-node-svg' });
  const defs = svgEl('defs');

  // Glow filter
  const glowFilter = svgEl('filter', { id: 'sd-glow', x: '-50%', y: '-50%', width: '200%', height: '200%' });
  const blur = svgEl('feGaussianBlur', { stdDeviation: '3', result: 'glow' });
  const merge = svgEl('feMerge');
  const mn1 = svgEl('feMergeNode', { in: 'glow' });
  const mn2 = svgEl('feMergeNode', { in: 'SourceGraphic' });
  merge.appendChild(mn1);
  merge.appendChild(mn2);
  glowFilter.appendChild(blur);
  glowFilter.appendChild(merge);
  defs.appendChild(glowFilter);

  // Arrow marker
  const marker = svgEl('marker', {
    id: 'sd-arrow',
    markerWidth: '8',
    markerHeight: '8',
    refX: '8',
    refY: '4',
    orient: 'auto',
  });
  const arrowPath = svgEl('path', {
    d: 'M0,1 L8,4 L0,7',
    fill: 'none',
    stroke: 'rgba(102,252,241,0.3)',
    'stroke-width': '1',
  });
  marker.appendChild(arrowPath);
  defs.appendChild(marker);

  svg.appendChild(defs);

  const edgeGroup = svgEl('g', { id: 'sd-edges' });
  const nodeGroup = svgEl('g', { id: 'sd-nodes' });
  svg.appendChild(edgeGroup);
  svg.appendChild(nodeGroup);

  wrapper.appendChild(svg);
  container.appendChild(wrapper);

  // ── State ─────────────────────────────────────
  let viewBox = { x: 0, y: 0, w: 1200, h: 800 };
  let isPanning = false;
  let panStart = { x: 0, y: 0 };
  let highlightedId = null;

  function updateViewBox() {
    svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
  }
  updateViewBox();

  // ── Zoom ──────────────────────────────────────
  wrapper.addEventListener('wheel', (e) => {
    e.preventDefault();
    const scaleFactor = e.deltaY > 0 ? 1.08 : 0.93;
    const rect = wrapper.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * viewBox.w + viewBox.x;
    const my = ((e.clientY - rect.top) / rect.height) * viewBox.h + viewBox.y;

    const newW = viewBox.w * scaleFactor;
    const newH = viewBox.h * scaleFactor;

    // Clamp zoom
    if (newW < 200 || newW > 5000) return;

    viewBox.x = mx - (mx - viewBox.x) * scaleFactor;
    viewBox.y = my - (my - viewBox.y) * scaleFactor;
    viewBox.w = newW;
    viewBox.h = newH;
    updateViewBox();
  }, { passive: false });

  // ── Pan ───────────────────────────────────────
  wrapper.addEventListener('mousedown', (e) => {
    if (e.target !== wrapper && e.target !== svg && e.target.tagName === 'text') return;
    isPanning = true;
    panStart = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    const rect = wrapper.getBoundingClientRect();
    const dx = (e.clientX - panStart.x) * (viewBox.w / rect.width);
    const dy = (e.clientY - panStart.y) * (viewBox.h / rect.height);
    viewBox.x -= dx;
    viewBox.y -= dy;
    panStart = { x: e.clientX, y: e.clientY };
    updateViewBox();
  });

  window.addEventListener('mouseup', () => { isPanning = false; });

  // ── Render ────────────────────────────────────

  function render() {
    // Clear
    while (edgeGroup.firstChild) edgeGroup.removeChild(edgeGroup.firstChild);
    while (nodeGroup.firstChild) nodeGroup.removeChild(nodeGroup.firstChild);

    const rect = wrapper.getBoundingClientRect();
    const W = Math.max(rect.width || 1200, 900);
    const H = Math.max(rect.height || 800, 600);

    // Collect all entities as layout nodes
    const layoutNodes = [];
    for (const [id, entity] of store.entities) {
      layoutNodes.push({ id, tier: entity.tier, title: entity.title, status: entity.status, x: 0, y: 0, vx: 0, vy: 0 });
    }

    const layoutEdges = store.edges.slice();

    // Run layout
    forceLayout(layoutNodes, layoutEdges, W, H);

    const nodePositions = new Map();
    layoutNodes.forEach(n => nodePositions.set(n.id, { x: n.x, y: n.y }));

    // Draw edges
    layoutEdges.forEach(edge => {
      const sPos = nodePositions.get(edge.source);
      const tPos = nodePositions.get(edge.target);
      if (!sPos || !tPos) return;

      const highlighted = highlightedId && (edge.source === highlightedId || edge.target === highlightedId);

      // Curved path
      const midX = (sPos.x + tPos.x) / 2;
      const midY = (sPos.y + tPos.y) / 2 - 15;
      const pathD = `M${sPos.x},${sPos.y} Q${midX},${midY} ${tPos.x},${tPos.y}`;

      const path = svgEl('path', {
        d: pathD,
        fill: 'none',
        stroke: highlighted ? 'rgba(102,252,241,0.6)' : 'rgba(102,252,241,0.12)',
        'stroke-width': highlighted ? '2' : '1',
        'stroke-dasharray': '8 6',
        'marker-end': 'url(#sd-arrow)',
      });

      if (highlighted) {
        path.style.animation = 'sd-dash-flow 1s linear infinite';
        path.style.filter = 'url(#sd-glow)';
      } else {
        path.style.animation = 'sd-dash-flow 3s linear infinite';
      }

      edgeGroup.appendChild(path);
    });

    // Draw nodes
    layoutNodes.forEach(n => {
      const pos = nodePositions.get(n.id);
      const tierMeta = TIERS[n.tier] || { icon: '?', color: '#c5c6c7' };
      const isSelected = store.selectedId === n.id;
      const isHighlighted = highlightedId === n.id;

      const g = svgEl('g', {
        id: `sd-node-${n.id}`,
        'data-id': n.id,
        style: `cursor: pointer; transition: transform 0.2s;`,
      });

      // Node shape
      const shape = createNodeShape(n.tier, pos.x, pos.y);
      if (isSelected || isHighlighted) {
        shape.setAttribute('stroke-width', '3');
        shape.style.filter = 'url(#sd-glow)';
      }
      g.appendChild(shape);

      // Icon text
      const iconText = svgEl('text', {
        x: pos.x,
        y: pos.y - 4,
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        fill: tierMeta.color,
        'font-size': n.tier === 'dream' ? '16' : '12',
        'font-family': 'system-ui, sans-serif',
        style: 'pointer-events: none;',
      });
      iconText.textContent = tierMeta.icon;
      g.appendChild(iconText);

      // Title (truncated)
      const titleText = svgEl('text', {
        x: pos.x,
        y: pos.y + (n.tier === 'experiment' ? 20 : n.tier === 'dream' ? 28 : 18),
        'text-anchor': 'middle',
        'dominant-baseline': 'hanging',
        fill: isSelected ? '#66fcf1' : '#c5c6c7',
        'font-size': '9',
        'font-family': "'Rajdhani', sans-serif",
        'font-weight': '600',
        style: 'pointer-events: none;',
      });
      const maxLen = 18;
      titleText.textContent = n.title.length > maxLen ? n.title.substring(0, maxLen) + '…' : n.title;
      g.appendChild(titleText);

      // Status badge dot
      if (n.status) {
        const statusColors = {
          'active': '#66fcf1', 'in-progress': '#66fcf1', 'validated': '#66fcf1',
          'complete': '#34d399',
          'draft': '#4b5563', 'planned': '#4b5563', 'pending': '#4b5563',
          'in-review': '#ffb03b',
        };
        const sc = statusColors[n.status] || '#4b5563';
        const statusDot = svgEl('circle', {
          cx: pos.x + (n.tier === 'dream' ? 30 : n.tier === 'experiment' ? 22 : 18),
          cy: pos.y - (n.tier === 'dream' ? 28 : n.tier === 'experiment' ? 20 : 12),
          r: '4',
          fill: sc,
        });
        if (['active', 'in-progress', 'in-review'].includes(n.status)) {
          statusDot.style.animation = 'sd-node-glow-pulse 2s ease-in-out infinite';
          statusDot.style.setProperty('--glow-color', sc);
        }
        g.appendChild(statusDot);
      }

      // Hover effect
      g.addEventListener('mouseenter', () => {
        g.style.transform = `translate(0, -2px)`;
        shape.style.filter = 'url(#sd-glow)';
      });
      g.addEventListener('mouseleave', () => {
        g.style.transform = '';
        if (!isSelected && !isHighlighted) {
          shape.style.filter = '';
        }
      });

      // Click
      g.addEventListener('click', (e) => {
        e.stopPropagation();
        highlightedId = n.id;
        store.select(n.id);
        render();
      });

      nodeGroup.appendChild(g);
    });
  }

  // Initial render
  requestAnimationFrame(render);

  // Re-render on selection change
  store.on('select', () => {
    if (store.selectedId) highlightedId = store.selectedId;
    render();
  });

  // Re-render on resize
  const ro = new ResizeObserver(() => render());
  ro.observe(wrapper);

  return {
    render,
    destroy() {
      ro.disconnect();
      wrapper.remove();
    },
  };
}
