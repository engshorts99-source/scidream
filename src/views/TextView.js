/**
 * Scidream v1.4 — Text View (Nature Journal Style)
 * Renders entities in a formal, academic paper format.
 */

import { TIERS } from '../store/store.js';
import { createInventoryTooltip } from '../components/InventoryTooltip.js';

export function createTextView(container, store) {
  const wrapper = document.createElement('div');
  wrapper.className = 'text-view';
  wrapper.id = 'sd-text-view';

  const paper = document.createElement('div');
  paper.className = 'text-view__paper';
  wrapper.appendChild(paper);

  container.appendChild(wrapper);

  const tooltip = createInventoryTooltip();

  function renderBreadcrumb(entity) {
    // We can omit breadcrumbs for the formal Nature style,
    // or keep a very minimal one at the top.
    const bc = document.createElement('div');
    bc.style.fontFamily = 'Inter, sans-serif';
    bc.style.fontSize = '0.85rem';
    bc.style.color = '#888';
    bc.style.textTransform = 'uppercase';
    bc.style.letterSpacing = '1px';
    bc.style.marginBottom = '40px';

    const ancestors = store.getAncestors(entity.id);
    const chain = [...ancestors, entity];
    bc.textContent = chain.map(c => c.title).join(' / ');
    return bc;
  }

  function renderManuscript(entity) {
    const title = document.createElement('h1');
    title.textContent = entity.title;
    paper.appendChild(title);

    const authors = document.createElement('div');
    authors.className = 'authors';
    authors.textContent = 'Scidream Auto-Generated Report • ' + (entity.journal || 'Target Journal: Nature');
    paper.appendChild(authors);

    if (entity.description) {
      const absTitle = document.createElement('div');
      absTitle.className = 'abstract-title';
      absTitle.textContent = 'Abstract';
      paper.appendChild(absTitle);

      const abstract = document.createElement('div');
      abstract.className = 'abstract-body';
      abstract.textContent = entity.description;
      paper.appendChild(abstract);
    }

    const mainText = document.createElement('div');
    mainText.className = 'main-text';

    const figures = store.getChildren(entity.id);
    if (figures.length > 0) {
      figures.forEach((fig, index) => {
        const figHeader = document.createElement('h2');
        figHeader.textContent = `Figure ${index + 1}: ${fig.title}`;
        mainText.appendChild(figHeader);

        if (fig.description) {
          const p = document.createElement('p');
          p.textContent = fig.description;
          mainText.appendChild(p);
        }

        const card = document.createElement('div');
        card.className = 'figure-card';

        const exps = store.getChildren(fig.id);
        if (exps.length > 0) {
          const cap = document.createElement('div');
          cap.className = 'figure-caption';
          cap.innerHTML = `<strong>Fig. ${index + 1} | ${fig.title}.</strong> Includes ${exps.length} experiments. `;
          
          const ul = document.createElement('ul');
          exps.forEach(exp => {
            const li = document.createElement('li');
            li.textContent = `${exp.title} (${exp.status || 'planned'})`;
            ul.appendChild(li);
          });
          card.appendChild(cap);
          card.appendChild(ul);
        } else {
          const cap = document.createElement('div');
          cap.className = 'figure-caption';
          cap.innerHTML = `<strong>Fig. ${index + 1} | ${fig.title}.</strong> Data pending.`;
          card.appendChild(cap);
        }

        mainText.appendChild(card);
      });
    }

    paper.appendChild(mainText);
  }

  function renderGeneric(entity) {
    const title = document.createElement('h1');
    title.textContent = entity.title;
    paper.appendChild(title);

    const authors = document.createElement('div');
    authors.className = 'authors';
    authors.textContent = `Type: ${entity.tier.toUpperCase()} • Status: ${entity.status || 'N/A'}`;
    paper.appendChild(authors);

    if (entity.description) {
      const abstract = document.createElement('div');
      abstract.className = 'abstract-body';
      abstract.textContent = entity.description;
      paper.appendChild(abstract);
    }

    const mainText = document.createElement('div');
    mainText.className = 'main-text';

    const children = store.getChildren(entity.id);
    if (children.length > 0) {
      children.forEach((child, index) => {
        const h2 = document.createElement('h2');
        h2.textContent = `${index + 1}. ${child.title}`;
        mainText.appendChild(h2);

        if (child.description) {
          const p = document.createElement('p');
          p.textContent = child.description;
          mainText.appendChild(p);
        }
      });
    }

    paper.appendChild(mainText);
  }

  function renderEmpty() {
    const title = document.createElement('h1');
    title.textContent = 'Document Viewer';
    title.style.color = '#ccc';
    paper.appendChild(title);

    const desc = document.createElement('p');
    desc.textContent = 'Select an entity from the sidebar or map to view it in formal document format.';
    desc.style.color = '#888';
    paper.appendChild(desc);
  }

  function render() {
    while (paper.firstChild) paper.removeChild(paper.firstChild);

    const entity = store.getSelected();

    if (!entity) {
      renderEmpty();
      return;
    }

    paper.appendChild(renderBreadcrumb(entity));

    if (entity.tier === 'manuscript') {
      renderManuscript(entity);
    } else {
      renderGeneric(entity);
    }
  }

  store.on('select', () => render());
  render();

  return {
    render,
    destroy() {
      wrapper.remove();
    },
  };
}
