/**
 * Scidream v1.4 — Central Data Store
 * Manages the 6-tier hierarchy + Inventory Objects
 * Provides pub/sub for reactive updates across views
 */

// ── Tier Metadata ──────────────────────────────────────────────
export const TIERS = {
  dream:      { label: 'Dream',      icon: '◆', color: '#66fcf1', order: 0 },
  project:    { label: 'Project',    icon: '◈', color: '#45a29e', order: 1 },
  manuscript: { label: 'Manuscript', icon: '▣', color: '#66fcf1', order: 2 },
  figure:     { label: 'Figure',     icon: '◉', color: '#c5c6c7', order: 3 },
  experiment: { label: 'Experiment', icon: '⚙', color: '#ffb03b', order: 4 },
  protocol:   { label: 'Protocol',   icon: '▶', color: '#66fcf1', order: 5 },
};

// ── Demo Data ──────────────────────────────────────────────────
function createDemoData() {
  const entities = new Map();
  const edges = [];

  const add = (id, tier, data) => {
    entities.set(id, { id, tier, ...data });
  };

  // Dream
  add('dream-1', 'dream', {
    title: 'Decode Neuroplasticity Mechanisms',
    status: 'active',
    description: 'Vision: Map the molecular pathways governing synaptic plasticity in cortical neurons.',
    created: '2026-01-15',
  });

  // Projects
  add('proj-1', 'project', {
    title: 'BDNF Signaling Cascade',
    status: 'active',
    description: 'Characterize BDNF/TrkB downstream signaling in hippocampal slice cultures.',
    created: '2026-02-01',
    parentId: 'dream-1',
  });
  add('proj-2', 'project', {
    title: 'Synaptic Vesicle Dynamics',
    status: 'planned',
    description: 'Live imaging of vesicle recycling at active zones.',
    created: '2026-03-10',
    parentId: 'dream-1',
  });

  // Manuscripts
  add('ms-1', 'manuscript', {
    title: 'TrkB Phosphorylation Kinetics in Hippocampal CA1',
    status: 'draft',
    description: 'Manuscript describing phospho-TrkB time-course following BDNF stimulation.',
    journal: 'Nature Neuroscience',
    created: '2026-04-01',
    parentId: 'proj-1',
  });
  add('ms-2', 'manuscript', {
    title: 'ERK1/2 Nuclear Translocation Dynamics',
    status: 'in-review',
    description: 'Quantitative imaging of ERK nuclear import after BDNF pulse.',
    journal: 'Cell Reports',
    created: '2026-04-15',
    parentId: 'proj-1',
  });

  // Figures
  add('fig-1', 'figure', {
    title: 'Fig 1 — Dose-Response Curve',
    status: 'complete',
    description: 'BDNF dose-response on TrkB phosphorylation (Western blot quantification).',
    parentId: 'ms-1',
  });
  add('fig-2', 'figure', {
    title: 'Fig 2 — Time-Course Immunofluorescence',
    status: 'in-progress',
    description: 'Confocal z-stacks of p-TrkB at 0, 5, 15, 30, 60 min post-BDNF.',
    parentId: 'ms-1',
  });
  add('fig-3', 'figure', {
    title: 'Fig 1 — ERK Nuclear/Cytoplasmic Ratio',
    status: 'in-progress',
    description: 'Ratiometric imaging of mScarlet-ERK2 in live neurons.',
    parentId: 'ms-2',
  });

  // Experiments
  add('exp-1', 'experiment', {
    title: 'Western Blot: p-TrkB Dose Response',
    status: 'complete',
    description: 'Batch experiment: BDNF concentrations 0–100 ng/mL, 15 min stimulation.',
    duration: '6 hours',
    parentId: 'fig-1',
  });
  add('exp-2', 'experiment', {
    title: 'Confocal Imaging: p-TrkB Time-Course',
    status: 'in-progress',
    description: 'Live confocal imaging with fixation at time points.',
    duration: '8 hours',
    parentId: 'fig-2',
  });
  add('exp-3', 'experiment', {
    title: 'Live-Cell ERK Translocation Assay',
    status: 'planned',
    description: 'Widefield time-lapse of mScarlet-ERK2 transfected neurons.',
    duration: '4 hours',
    parentId: 'fig-3',
  });

  // Protocols
  add('proto-1', 'protocol', {
    title: 'SDS-PAGE + Western Blot',
    status: 'validated',
    description: 'Standard SDS-PAGE followed by wet-transfer Western blotting.',
    duration: '5 hours',
    parentId: 'exp-1',
    actions: [
      {
        id: 'act-1-1',
        title: 'Sample Lysis',
        duration: '30 min',
        status: 'complete',
        inputs: ['Cell pellets'],
        outputs: ['Lysate in RIPA buffer'],
        variables: [
          { name: 'Lysis Buffer', options: ['RIPA', 'NP-40', 'Triton X-100'], value: 'RIPA' },
          { name: 'Protease Inhibitor', options: ['cOmplete Mini', 'PMSF', 'Aprotinin'], value: 'cOmplete Mini' },
        ],
        inventoryRefs: ['inv-1', 'inv-2'],
        enabled: true,
      },
      {
        id: 'act-1-2',
        title: 'BCA Protein Assay',
        duration: '45 min',
        status: 'complete',
        inputs: ['Lysate'],
        outputs: ['Protein concentration'],
        variables: [
          { name: 'Standard Curve', options: ['BSA', 'IgG'], value: 'BSA' },
        ],
        inventoryRefs: ['inv-3'],
        enabled: true,
      },
      {
        id: 'act-1-3',
        title: 'Gel Electrophoresis',
        duration: '90 min',
        status: 'in-progress',
        inputs: ['Normalized samples', 'Loading buffer'],
        outputs: ['Resolved protein gel'],
        variables: [
          { name: 'Gel %', options: ['8%', '10%', '12%', '4-20% gradient'], value: '10%' },
          { name: 'Voltage', options: ['80V stacking', '120V resolving'], value: '120V resolving' },
        ],
        inventoryRefs: ['inv-4'],
        enabled: true,
      },
      {
        id: 'act-1-4',
        title: 'Wet Transfer',
        duration: '90 min',
        status: 'pending',
        inputs: ['Resolved gel'],
        outputs: ['PVDF membrane with proteins'],
        variables: [
          { name: 'Membrane', options: ['PVDF', 'Nitrocellulose'], value: 'PVDF' },
          { name: 'Transfer Time', options: ['60 min', '90 min', 'Overnight'], value: '90 min' },
        ],
        inventoryRefs: ['inv-5'],
        enabled: false,
      },
      {
        id: 'act-1-5',
        title: 'Antibody Incubation & Imaging',
        duration: '4 hours',
        status: 'pending',
        inputs: ['Blocked membrane'],
        outputs: ['Chemiluminescent image'],
        variables: [
          { name: 'Primary Ab', options: ['anti-pTrkB (1:1000)', 'anti-TrkB (1:500)'], value: 'anti-pTrkB (1:1000)' },
          { name: 'Secondary Ab', options: ['HRP anti-rabbit (1:5000)', 'HRP anti-mouse (1:5000)'], value: 'HRP anti-rabbit (1:5000)' },
        ],
        inventoryRefs: ['inv-6', 'inv-7'],
        enabled: false,
      },
    ],
  });

  add('proto-2', 'protocol', {
    title: 'Immunofluorescence Staining',
    status: 'active',
    description: 'Fixation, permeabilization, and staining for confocal imaging.',
    duration: '3 hours',
    parentId: 'exp-2',
    actions: [
      {
        id: 'act-2-1',
        title: 'Fixation (4% PFA)',
        duration: '20 min',
        status: 'complete',
        inputs: ['Live cells on coverslips'],
        outputs: ['Fixed cells'],
        variables: [
          { name: 'Fixative', options: ['4% PFA', 'Methanol', 'Acetone'], value: '4% PFA' },
        ],
        inventoryRefs: ['inv-8'],
        enabled: true,
      },
      {
        id: 'act-2-2',
        title: 'Permeabilization & Blocking',
        duration: '60 min',
        status: 'in-progress',
        inputs: ['Fixed cells'],
        outputs: ['Blocked cells'],
        variables: [
          { name: 'Detergent', options: ['0.1% Triton X-100', '0.3% Triton X-100', 'Saponin'], value: '0.1% Triton X-100' },
          { name: 'Blocking Agent', options: ['5% BSA', '10% Goat Serum', '5% Donkey Serum'], value: '5% BSA' },
        ],
        inventoryRefs: ['inv-9'],
        enabled: true,
      },
      {
        id: 'act-2-3',
        title: 'Primary Antibody',
        duration: '60 min',
        status: 'pending',
        inputs: ['Blocked cells'],
        outputs: ['Labeled cells'],
        variables: [
          { name: 'Antibody', options: ['anti-pTrkB Rabbit (1:200)', 'anti-MAP2 Mouse (1:500)'], value: 'anti-pTrkB Rabbit (1:200)' },
        ],
        inventoryRefs: ['inv-6'],
        enabled: false,
      },
    ],
  });

  // Inventory Objects
  const inventory = new Map();
  const addInv = (id, data) => inventory.set(id, { id, ...data });

  addInv('inv-1', {
    name: 'RIPA Lysis Buffer',
    category: 'Reagent',
    supplier: 'Thermo Fisher',
    catalog: '89900',
    storage: '4°C',
    details: '10 mM Tris-HCl pH 8.0, 1 mM EDTA, 0.5 mM EGTA, 1% Triton X-100, 0.1% SDS, 0.1% Na-deoxycholate, 140 mM NaCl',
    quantity: '500 mL',
  });
  addInv('inv-2', {
    name: 'cOmplete Mini Protease Inhibitor',
    category: 'Reagent',
    supplier: 'Roche',
    catalog: '04693124001',
    storage: '4°C',
    details: 'EDTA-free protease inhibitor cocktail tablet. 1 tablet per 10 mL lysis buffer.',
    quantity: '20 tablets',
  });
  addInv('inv-3', {
    name: 'Pierce BCA Protein Assay Kit',
    category: 'Kit',
    supplier: 'Thermo Fisher',
    catalog: '23225',
    storage: 'RT',
    details: 'Colorimetric BCA assay. Working range 20–2000 µg/mL. Includes BSA standards.',
    quantity: '1 kit (250 assays)',
  });
  addInv('inv-4', {
    name: 'Mini-PROTEAN TGX Gel 10%',
    category: 'Consumable',
    supplier: 'Bio-Rad',
    catalog: '4561034',
    storage: '4°C',
    details: 'Precast 10% polyacrylamide gel, 10-well, 30 µL. Shelf life 12 months.',
    quantity: '10 gels',
  });
  addInv('inv-5', {
    name: 'Immobilon-P PVDF Membrane',
    category: 'Consumable',
    supplier: 'Millipore',
    catalog: 'IPVH00010',
    storage: 'RT',
    details: '0.45 µm pore size PVDF membrane. Methanol activation required.',
    quantity: '1 roll (26.5 cm × 3.75 m)',
  });
  addInv('inv-6', {
    name: 'Anti-Phospho-TrkB (Tyr816)',
    category: 'Antibody',
    supplier: 'Cell Signaling Technology',
    catalog: '#4168',
    storage: '-20°C',
    details: 'Rabbit polyclonal. WB: 1:1000, IF: 1:200. Reacts with Human, Mouse, Rat.',
    quantity: '100 µL',
  });
  addInv('inv-7', {
    name: 'HRP-conjugated Anti-Rabbit IgG',
    category: 'Antibody',
    supplier: 'Cell Signaling Technology',
    catalog: '#7074',
    storage: '-20°C',
    details: 'Goat anti-rabbit IgG, HRP-linked. WB: 1:2000–1:5000.',
    quantity: '1 mL',
  });
  addInv('inv-8', {
    name: 'Paraformaldehyde 16% (EM Grade)',
    category: 'Reagent',
    supplier: 'Electron Microscopy Sciences',
    catalog: '15710',
    storage: 'RT (sealed)',
    details: 'Methanol-free. Dilute to 4% in PBS for fixation. Single-use ampoules.',
    quantity: '10 × 10 mL ampoules',
  });
  addInv('inv-9', {
    name: 'Bovine Serum Albumin (BSA)',
    category: 'Reagent',
    supplier: 'Sigma-Aldrich',
    catalog: 'A7906',
    storage: '2–8°C',
    details: 'Fraction V, ≥98%. Blocking agent and protein standard.',
    quantity: '100 g',
  });

  // Build edges from parentId references
  for (const [id, entity] of entities) {
    if (entity.parentId) {
      edges.push({ source: entity.parentId, target: id });
    }
  }

  return { entities, edges, inventory };
}

// ── Store Class ────────────────────────────────────────────────
class Store {
  constructor() {
    const demo = createDemoData();
    this.entities = demo.entities;
    this.edges = demo.edges;
    this.inventory = demo.inventory;

    this.selectedId = null;
    this.currentView = 'node'; // 'node' | 'text' | 'action'
    this._listeners = new Map();
  }

  // ── Selection ─────────────────────────────────────
  select(id) {
    if (this.selectedId === id) return;
    this.selectedId = id;
    this._emit('select', { id, entity: this.getEntity(id) });
  }

  getSelected() {
    return this.selectedId ? this.getEntity(this.selectedId) : null;
  }

  // ── View ──────────────────────────────────────────
  setView(view) {
    if (this.currentView === view) return;
    this.currentView = view;
    this._emit('viewChange', { view });
  }

  // ── Accessors ─────────────────────────────────────
  getEntity(id) {
    return this.entities.get(id) || null;
  }

  getInventoryItem(id) {
    return this.inventory.get(id) || null;
  }

  getChildren(parentId) {
    const kids = [];
    for (const [id, e] of this.entities) {
      if (e.parentId === parentId) kids.push(e);
    }
    return kids;
  }

  getParent(id) {
    const e = this.getEntity(id);
    return e && e.parentId ? this.getEntity(e.parentId) : null;
  }

  getAncestors(id) {
    const chain = [];
    let current = this.getEntity(id);
    while (current && current.parentId) {
      current = this.getEntity(current.parentId);
      if (current) chain.unshift(current);
    }
    return chain;
  }

  getEdgesFor(id) {
    return this.edges.filter(e => e.source === id || e.target === id);
  }

  getAllByTier(tier) {
    const result = [];
    for (const [, e] of this.entities) {
      if (e.tier === tier) result.push(e);
    }
    return result;
  }

  getRootEntities() {
    const result = [];
    for (const [, e] of this.entities) {
      if (!e.parentId) result.push(e);
    }
    return result;
  }

  // ── Pub/Sub ───────────────────────────────────────
  on(event, callback) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(callback);
    return () => this._listeners.get(event)?.delete(callback);
  }

  _emit(event, data) {
    const set = this._listeners.get(event);
    if (set) set.forEach(fn => fn(data));
  }
}

// ── Singleton ──────────────────────────────────────────────────
let _instance = null;
export function getStore() {
  if (!_instance) _instance = new Store();
  return _instance;
}

export default Store;
