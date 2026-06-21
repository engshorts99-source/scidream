export function showAddModal(defaultParentId = null, onSubmit) {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '9999';

  const modal = document.createElement('div');
  modal.style.background = '#12131a';
  modal.style.border = '1px solid #45a29e';
  modal.style.borderRadius = '8px';
  modal.style.padding = '24px';
  modal.style.width = '400px';
  modal.style.color = '#c5c6c7';
  modal.style.fontFamily = "'Share Tech Mono', monospace";
  modal.style.boxShadow = '0 10px 40px rgba(0,0,0,0.8)';

  const title = document.createElement('h3');
  title.textContent = defaultParentId ? 'Add Child Entity' : 'Add Root Entity';
  title.style.margin = '0 0 20px 0';
  title.style.color = '#66fcf1';
  modal.appendChild(title);

  // Title input
  const titleLabel = document.createElement('label');
  titleLabel.textContent = 'Entity Title:';
  titleLabel.style.display = 'block';
  titleLabel.style.marginBottom = '8px';
  modal.appendChild(titleLabel);

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.style.width = '100%';
  titleInput.style.padding = '8px';
  titleInput.style.marginBottom = '20px';
  titleInput.style.background = 'rgba(255,255,255,0.05)';
  titleInput.style.border = '1px solid #45a29e';
  titleInput.style.color = '#fff';
  titleInput.style.boxSizing = 'border-box';
  modal.appendChild(titleInput);

  // Tier select
  const tierLabel = document.createElement('label');
  tierLabel.textContent = 'Entity Tier:';
  tierLabel.style.display = 'block';
  tierLabel.style.marginBottom = '8px';
  modal.appendChild(tierLabel);

  const tierSelect = document.createElement('select');
  tierSelect.style.width = '100%';
  tierSelect.style.padding = '8px';
  tierSelect.style.marginBottom = '30px';
  tierSelect.style.background = 'rgba(255,255,255,0.05)';
  tierSelect.style.border = '1px solid #45a29e';
  tierSelect.style.color = '#fff';
  tierSelect.style.boxSizing = 'border-box';
  
  const tiers = ['dream', 'project', 'manuscript', 'figure', 'experiment', 'protocol', 'inventory'];
  tiers.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t.toUpperCase();
    opt.style.color = '#000';
    if (t === 'inventory') opt.selected = true;
    tierSelect.appendChild(opt);
  });
  modal.appendChild(tierSelect);

  // Buttons
  const btnRow = document.createElement('div');
  btnRow.style.display = 'flex';
  btnRow.style.justifyContent = 'flex-end';
  btnRow.style.gap = '12px';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className = 'btn-tactical chamfered-sm';
  cancelBtn.style.padding = '8px 16px';
  cancelBtn.style.background = 'transparent';
  cancelBtn.style.border = '1px solid #ff0033';
  cancelBtn.style.color = '#ff0033';
  cancelBtn.style.cursor = 'pointer';
  cancelBtn.onclick = () => overlay.remove();

  const submitBtn = document.createElement('button');
  submitBtn.textContent = 'Create';
  submitBtn.className = 'btn-tactical btn-cyan chamfered-sm';
  submitBtn.style.padding = '8px 16px';
  submitBtn.style.background = 'rgba(102, 252, 241, 0.1)';
  submitBtn.style.border = '1px solid #66fcf1';
  submitBtn.style.color = '#66fcf1';
  submitBtn.style.cursor = 'pointer';

  submitBtn.onclick = () => {
    if (!titleInput.value.trim()) return alert('Title is required');
    onSubmit({
      title: titleInput.value.trim(),
      tier: tierSelect.value,
      parentId: defaultParentId
    });
    overlay.remove();
  };

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(submitBtn);
  modal.appendChild(btnRow);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  titleInput.focus();
}
