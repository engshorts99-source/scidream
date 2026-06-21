/**
 * Scidream v1.4 — Data Store (Singleton)
 * Updated for Electron and Local Markdown Vault
 */

// ─── Prefix → Tier name mapping ────────────────────────────────────────────────
const PREFIX_TIER_MAP = {
  'dream': 'dream',
  'proj':  'project',
  'ms':    'manuscript',
  'fig':   'figure',
  'exp':   'experiment',
  'proto': 'protocol',
  'act':   'action',
  'inv':   'inventory',
};

const TIER_COLLECTION_MAP = {
  dream:      'dreams',
  project:    'projects',
  manuscript: 'manuscripts',
  figure:     'figures',
  experiment: 'experiments',
  protocol:   'protocols',
  action:     'actions',
  inventory:  'inventory',
};

const TIER_ORDER = ['dream', 'project', 'manuscript', 'figure', 'experiment', 'protocol', 'action'];

function resolveTier(id) {
  if (!id || typeof id !== 'string') return null;
  const prefixes = Object.keys(PREFIX_TIER_MAP).sort((a, b) => b.length - a.length);
  for (const prefix of prefixes) {
    if (id.startsWith(prefix + '-')) {
      return PREFIX_TIER_MAP[prefix];
    }
  }
  return null;
}

let lookupMap = new Map();
let childrenMap = new Map();
let rawData = {};

function indexEntity(entity) {
  if (!entity || !entity.id) return;
  lookupMap.set(entity.id, entity);

  if (entity.parentId) {
    if (!childrenMap.has(entity.parentId)) {
      childrenMap.set(entity.parentId, []);
    }
    childrenMap.get(entity.parentId).push(entity.id);
  }
}

function buildIndex(data) {
  lookupMap.clear();
  childrenMap.clear();
  rawData = data;

  ['dreams', 'projects', 'manuscripts', 'figures', 'experiments'].forEach((key) => {
    (data[key] || []).forEach(indexEntity);
  });

  (data.inventory || []).forEach(indexEntity);

  (data.protocols || []).forEach((protocol) => {
    indexEntity(protocol);
    (protocol.actions || []).forEach((action) => {
      const actionWithParent = { ...action, parentId: protocol.id };
      lookupMap.set(action.id, actionWithParent);
      if (!childrenMap.has(protocol.id)) {
        childrenMap.set(protocol.id, []);
      }
      childrenMap.get(protocol.id).push(action.id);
    });
  });
}

const store = {
  async init() {
    if (window.electronAPI) {
      const data = await window.electronAPI.getVaultData();
      buildIndex(data);
      
      // Listen for updates
      window.electronAPI.onDataUpdated((newData) => {
        buildIndex(newData);
        window.dispatchEvent(new CustomEvent('storeUpdated'));
      });
    } else {
      console.warn("Running in browser without Electron API. Vault data won't load.");
    }
  },

  get raw() { return rawData; },

  getById(id) { return lookupMap.get(id); },

  getChildren(parentId) {
    const parent = lookupMap.get(parentId);
    if (!parent) return [];

    if (Array.isArray(parent.children) && parent.children.length > 0) {
      return parent.children.map(cid => lookupMap.get(cid)).filter(Boolean);
    }
    const childIds = childrenMap.get(parentId) || [];
    return childIds.map(cid => lookupMap.get(cid)).filter(Boolean);
  },

  getParent(id) {
    const entity = lookupMap.get(id);
    if (!entity || !entity.parentId) return undefined;
    return lookupMap.get(entity.parentId);
  },

  getAncestors(id) {
    const ancestors = [];
    let current = lookupMap.get(id);
    if (!current) return ancestors;

    while (current && current.parentId) {
      const parent = lookupMap.get(current.parentId);
      if (!parent) break;
      ancestors.push(parent);
      current = parent;
    }
    return ancestors;
  },

  getTierName(id) { return resolveTier(id); },

  getTierLevel(id) {
    const tier = resolveTier(id);
    if (!tier) return 0;
    if (tier === 'inventory') return -1;
    const idx = TIER_ORDER.indexOf(tier);
    return idx >= 0 ? idx + 1 : 0;
  },

  getInventoryById(id) {
    const entity = lookupMap.get(id);
    if (entity && resolveTier(id) === 'inventory') return entity;
    return undefined;
  },

  getProtocolById(id) {
    const entity = lookupMap.get(id);
    if (entity && resolveTier(id) === 'protocol') {
      const original = rawData.protocols.find((p) => p.id === id);
      return original || entity;
    }
    return undefined;
  },

  getAllByTier(tierName) {
    const normalized = tierName.toLowerCase();
    if (normalized === 'action') {
      const actions = [];
      (rawData.protocols || []).forEach((proto) => {
        (proto.actions || []).forEach((act) => {
          actions.push(lookupMap.get(act.id) || act);
        });
      });
      return actions;
    }

    const collectionKey = TIER_COLLECTION_MAP[normalized];
    if (!collectionKey || !rawData[collectionKey]) return [];
    return [...rawData[collectionKey]];
  },

  search(query) {
    if (!query || typeof query !== 'string') return [];
    const q = query.toLowerCase();
    const results = [];

    lookupMap.forEach((entity, id) => {
      const searchable = [
        entity.id, entity.title, entity.description, entity.name,
        entity.catalog, entity.supplier, entity.journal,
      ].filter(Boolean).join(' ').toLowerCase();

      if (searchable.includes(q)) {
        results.push({ ...entity, _tier: resolveTier(id) });
      }
    });
    return results;
  },

  getTierOrder() { return [...TIER_ORDER]; },

  getInventoryByCategory() {
    const grouped = {};
    (rawData.inventory || []).forEach((item) => {
      const cat = item.category || 'Uncategorized';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });
    return grouped;
  },

  resolveInventoryRefs(refIds) {
    if (!Array.isArray(refIds)) return [];
    return refIds.map((rid) => lookupMap.get(rid)).filter(Boolean);
  },

  getStats() {
    const stats = {};
    Object.keys(TIER_COLLECTION_MAP).forEach((tier) => {
      stats[tier] = this.getAllByTier(tier).length;
    });
    return stats;
  },
};

export default store;
