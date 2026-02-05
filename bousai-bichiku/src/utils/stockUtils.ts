import { StockItem, ShortageAlert } from '../types';
import { ProductMaster, OrgUnit } from '../types/master';

/**
 * 支店ごとの不足アラートを計算 (Hierarchical update)
 */
export function calculateShortageAlerts(
  items: StockItem[],
  orgUnits: OrgUnit[], // Flat list of all units
  products?: ProductMaster[]
): ShortageAlert[] {
  const alerts: ShortageAlert[] = [];

  // Find all Branch layer units
  const branches = orgUnits.filter(u => u.layer === 'Branch');

  // Helper to find stock for a branch (including child locations)
  const getBranchStock = (branchId: string, category: string, itemName?: string) => {
    // Find all location IDs belonging to this branch
    // (Direct children or recursively if we had deep nesting, but assuming 2-3 levels)
    const childDepts = orgUnits.filter(u => u.parentId === branchId);
    const childLocs = orgUnits.filter(u => u.parentId === branchId || childDepts.some(d => d.id === u.parentId));
    const relevantLocIds = new Set([branchId, ...childDepts.map(d => d.id), ...childLocs.map(l => l.id)]); // Assuming stock might be on branch itself? Usually 'Location'.

    // Filter items in these locations
    const relevantItems = items.filter(i =>
      relevantLocIds.has(i.storageLocation) || // If i.storageLocation matches a unit ID
      i.branch === branchId // Legacy support if item still has 'branch' name matching ID
    );

    let total = 0;
    relevantItems.forEach(i => {
      if (i.category === category && (!itemName || i.name === itemName)) {
        total += i.quantity;
      }
    });
    return total;
  };

  branches.forEach(branch => {
    const headcount = branch.headcount || 0;
    if (headcount === 0) return;

    // 1. Check Product-specific requirements
    if (products) {
      products.forEach(product => {
        if (product.dailyRequirementPerPerson && product.dailyRequirementPerPerson > 0) {
          const required = headcount * 3 * product.dailyRequirementPerPerson; // 3 days
          const current = getBranchStock(branch.id, product.category, product.name);

          if (current < required) {
            alerts.push({
              branch: branch.name,
              category: product.category,
              required: Math.ceil(required),
              current,
              shortage: Math.ceil(required - current),
              itemName: product.name
            });
          }
        }
      });
    }

    // 2. Check Category-level fallback (if we had category-level reqs, but currently relying on Product Master mainly)
    // If needed, we can re-implement category checks here.
  });

  return alerts.sort((a, b) => b.shortage - a.shortage);
}

/**
 * 支店の在庫サマリーを取得
 */
export function getBranchStockSummary(
  items: StockItem[],
  branchNameOrId: string
): Record<string, number> {
  // Simplification: just aggregation by category
  const summary: Record<string, number> = {};
  items
    .filter(item => item.branch === branchNameOrId && !item.donated) // Legacy 'branch' field match
    .forEach(item => {
      summary[item.category] = (summary[item.category] || 0) + item.quantity;
    });
  return summary;
}

/**
 * アイテムを期限順にソート
 */
export function sortByExpiration(items: StockItem[]): StockItem[] {
  return [...items].sort((a, b) => {
    const dateA = new Date(a.expirationDate).getTime();
    const dateB = new Date(b.expirationDate).getTime();
    return dateA - dateB;
  });
}

/**
 * アイテムを支店と保管場所でフィルタリング
 */
export function filterItems(
  items: StockItem[],
  selectedBranch: string | null,
  selectedStorageLocations: string[],
  showDonated: boolean
): StockItem[] {
  return items.filter(item => {
    if (!showDonated && item.donated) return false;
    if (selectedBranch && item.branch !== selectedBranch) return false;
    if (selectedStorageLocations.length > 0) {
      if (!selectedStorageLocations.includes(item.storageLocation)) return false;
    }
    return true;
  });
}

/**
 * 支店リストを抽出 (Legacy/Simple)
 */
export function extractBranches(items: StockItem[]): string[] {
  const branches = new Set<string>();
  items.forEach(item => branches.add(item.branch));
  return Array.from(branches).sort();
}

/**
 * 保管場所リストを抽出
 */
export function extractStorageLocations(
  items: StockItem[],
  branch: string
): string[] {
  const locations = new Set<string>();
  items
    .filter(item => item.branch === branch)
    .forEach(item => locations.add(item.storageLocation));
  return Array.from(locations).sort();
}
