/**
 * Scidream v1.4 — Data Store (Singleton)
 *
 * Provides O(1) lookup for every entity in the 6-tier hierarchy plus
 * inventory objects. Tier is inferred from the ID prefix.
 *
 * Tier Map:
 *   dream-  → Dream        (Tier 1)
 *   proj-   → Project      (Tier 2)
 *   ms-     → Manuscript   (Tier 3)
 *   fig-    → Figure       (Tier 4)
 *   exp-    → Experiment   (Tier 5)
 *   proto-  → Protocol     (Tier 6)
 *   act-    → Action       (Fragment)
 *   inv-    → Inventory    (Parallel)
 */

import data from './sample-data.js';

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

// ─── Tier name → collection key in sample-data ─────────────────────────────────
const TIER_COLLECTION_MAP = {
  dream:      'dreams',
  project:    'projects',
  manuscript: 'manuscripts',
  figure:     'figures',
  experiment: 'experiments',
  protocol:   'protocols',
  action:     'actions',   // virtual — actions live inside protocols
  inventory:  'inventory',
};

// ─── Ordered tier names for hierarchy traversal ────────────────────────────────
const TIER_ORDER = ['dream', 'project', 'manuscript', 'figure', 'experiment', 'protocol', 'action'];

/**
 * Resolve the tier name from an entity ID by matching its prefix.
 * @param {string} id - Entity ID (e.g. "proto-001", "fig-002")
 * @returns {string|null} Tier name or null if unrecognised
 */
function resolveTier(id) {
  if (!id || typeof id !== 'string') return null;
  // Match the longest prefix first (e.g. "proto" before "proj")
  const prefixes = Object.keys(PREFIX_TIER_MAP).sort((a, b) => b.length - a.length);
  for (const prefix of prefixes) {
    if (id.startsWith(prefix + '-')) {
      return PREFIX_TIER_MAP[prefix];
    }
  }
  return null;
}

// ─── Build the lookup map ──────────────────────────────────────────────────────

/** @type {Map<string, object>} Global ID → entity map */
const lookupMap = new Map();

/** @type {Map<string, string[]>} parentId → child IDs (for reverse lookup) */
const childrenMap = new Map();

/**
 * Index a single entity into lookupMap and childrenMap.
 * @param {object} entity
 */
function indexEntity(entity) {
  if (!entity || !entity.id) return;
  lookupMap.set(entity.id, entity);

  // Register in childrenMap under its parentId
  if (entity.parentId) {
    if (!childrenMap.has(entity.parentId)) {
      childrenMap.set(entity.parentId, []);
    }
    childrenMap.get(entity.parentId).push(entity.id);
  }
}

// Index top-level collections
['dreams', 'projects', 'manuscripts', 'figures', 'experiments'].forEach((key) => {
  (data[key] || []).forEach(indexEntity);
});

// Index inventory
(data.inventory || []).forEach(indexEntity);

// Index protocols and their nested action fragments
(data.protocols || []).forEach((protocol) => {
  indexEntity(protocol);
  (protocol.actions || []).forEach((action) => {
    // Synthesise parentId for actions → owning protocol
    const actionWithParent = { ...action, parentId: protocol.id };
    lookupMap.set(action.id, actionWithParent);
    // Register action as child of protocol
    if (!childrenMap.has(protocol.id)) {
      childrenMap.set(protocol.id, []);
    }
    childrenMap.get(protocol.id).push(action.id);
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
//  PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

const store = {
  // ── Raw data reference ────────────────────────────────────────────────────
  /** Direct access to the raw sample data object. */
  raw: data,

  // ── Core lookups ──────────────────────────────────────────────────────────

  /**
   * Retrieve any entity by its unique ID. O(1).
   * @param {string} id - Entity ID (e.g. "ms-010", "inv-ripa")
   * @returns {object|undefined} The entity object, or undefined if not found.
   */
  getById(id) {
    return lookupMap.get(id);
  },

  /**
   * Get direct children of a given entity.
   * For hierarchical entities (dream→project, etc.) this uses the `children`
   * array on the entity. For protocols it returns action fragments.
   * @param {string} parentId - Parent entity ID
   * @returns {object[]} Array of child entity objects (may be empty).
   */
  getChildren(parentId) {
    const parent = lookupMap.get(parentId);
    if (!parent) return [];

    // Use the explicit `children` array if present
    if (Array.isArray(parent.children) && parent.children.length > 0) {
      return parent.children
        .map((childId) => lookupMap.get(childId))
        .filter(Boolean);
    }

    // Fallback: use childrenMap (covers protocols → actions)
    const childIds = childrenMap.get(parentId) || [];
    return childIds.map((cid) => lookupMap.get(cid)).filter(Boolean);
  },

  /**
   * Get the parent entity of a given entity.
   * @param {string} id - Entity ID
   * @returns {object|undefined} Parent entity, or undefined for root / not found.
   */
  getParent(id) {
    const entity = lookupMap.get(id);
    if (!entity || !entity.parentId) return undefined;
    return lookupMap.get(entity.parentId);
  },

  /**
   * Get the full ancestor chain from an entity up to the root Dream.
   * Returned in order: [immediate parent, grandparent, ..., root].
   * @param {string} id - Entity ID
   * @returns {object[]} Array of ancestor entity objects (may be empty for roots).
   */
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

  /**
   * Determine the tier name for a given entity ID.
   * @param {string} id - Entity ID
   * @returns {string|null} Tier name (e.g. "protocol", "figure") or null.
   */
  getTierName(id) {
    return resolveTier(id);
  },

  /**
   * Get the numeric tier level (1-based). Returns -1 for inventory, 0 for unknown.
   * @param {string} id - Entity ID
   * @returns {number} Tier level (1=Dream … 7=Action, -1=Inventory, 0=unknown)
   */
  getTierLevel(id) {
    const tier = resolveTier(id);
    if (!tier) return 0;
    if (tier === 'inventory') return -1;
    const idx = TIER_ORDER.indexOf(tier);
    return idx >= 0 ? idx + 1 : 0;
  },

  /**
   * Retrieve an inventory item by its ID.
   * Convenience alias — equivalent to getById() for inv- prefixed IDs.
   * @param {string} id - Inventory ID (e.g. "inv-ripa")
   * @returns {object|undefined} Inventory object.
   */
  getInventoryById(id) {
    const entity = lookupMap.get(id);
    if (entity && resolveTier(id) === 'inventory') return entity;
    return undefined;
  },

  /**
   * Retrieve a protocol by its ID, including its nested actions.
   * @param {string} id - Protocol ID (e.g. "proto-002")
   * @returns {object|undefined} Protocol object with its actions array intact.
   */
  getProtocolById(id) {
    const entity = lookupMap.get(id);
    if (entity && resolveTier(id) === 'protocol') {
      // Return the original protocol from raw data (with nested actions array)
      const original = data.protocols.find((p) => p.id === id);
      return original || entity;
    }
    return undefined;
  },

  /**
   * Get all entities belonging to a specific tier.
   * @param {string} tierName - Tier name (e.g. "manuscript", "protocol", "inventory")
   * @returns {object[]} Array of entities in that tier.
   */
  getAllByTier(tierName) {
    const normalized = tierName.toLowerCase();

    // Handle "action" tier specially — collect from all protocols
    if (normalized === 'action') {
      const actions = [];
      (data.protocols || []).forEach((proto) => {
        (proto.actions || []).forEach((act) => {
          actions.push(lookupMap.get(act.id) || act);
        });
      });
      return actions;
    }

    const collectionKey = TIER_COLLECTION_MAP[normalized];
    if (!collectionKey || !data[collectionKey]) return [];
    return [...data[collectionKey]];
  },

  /**
   * Full-text search across all entities.
   * Matches against `id`, `title`, `description`, `name`, `catalog`, and `supplier`.
   * Case-insensitive.
   * @param {string} query - Search query string
   * @returns {object[]} Array of matching entities, each decorated with a `_tier` property.
   */
  search(query) {
    if (!query || typeof query !== 'string') return [];
    const q = query.toLowerCase();
    const results = [];

    lookupMap.forEach((entity, id) => {
      const searchable = [
        entity.id,
        entity.title,
        entity.description,
        entity.name,       // inventory items use `name` instead of `title`
        entity.catalog,
        entity.supplier,
        entity.journal,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (searchable.includes(q)) {
        results.push({
          ...entity,
          _tier: resolveTier(id),
        });
      }
    });

    return results;
  },

  // ── Utility helpers ───────────────────────────────────────────────────────

  /**
   * Get the ordered list of tier names in the hierarchy.
   * @returns {string[]} e.g. ["dream", "project", "manuscript", ...]
   */
  getTierOrder() {
    return [...TIER_ORDER];
  },

  /**
   * Get all inventory items grouped by category.
   * @returns {Object<string, object[]>} Map of category → inventory items.
   */
  getInventoryByCategory() {
    const grouped = {};
    (data.inventory || []).forEach((item) => {
      const cat = item.category || 'Uncategorized';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });
    return grouped;
  },

  /**
   * Resolve an array of inventory ref IDs into full inventory objects.
   * Useful for rendering Action Fragment resource panels.
   * @param {string[]} refIds - Array of inventory IDs
   * @returns {object[]} Array of resolved inventory objects (skips missing).
   */
  resolveInventoryRefs(refIds) {
    if (!Array.isArray(refIds)) return [];
    return refIds.map((rid) => lookupMap.get(rid)).filter(Boolean);
  },

  /**
   * Get the total count of entities per tier.
   * @returns {Object<string, number>} e.g. { dream: 1, project: 2, ... }
   */
  getStats() {
    const stats = {};
    Object.keys(TIER_COLLECTION_MAP).forEach((tier) => {
      stats[tier] = this.getAllByTier(tier).length;
    });
    return stats;
  },
};

export default store;
