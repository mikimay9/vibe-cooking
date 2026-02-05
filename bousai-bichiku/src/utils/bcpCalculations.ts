import { StockItem } from '../types';
import { ProductMaster, OrgUnit } from '../types/master';

export interface BCPStatus {
    orgUnitId: string;
    orgUnitName: string;

    headcount: number;
    requiredDays: number;

    // Requirements
    targetWaterLiters: number;
    targetFoodMeals: number;

    // Current Stock
    currentWaterLiters: number;
    currentFoodMeals: number;

    // Sufficiency Rates (%)
    waterSufficiencyRate: number;
    foodSufficiencyRate: number;
}

/**
 * BCP充足率を計算する
 * 
 * Target:
 * - Water: 3L / person / day
 * - Food: 3 meals / person / day
 */
export function calculateBCPStatus(
    orgUnits: OrgUnit[],
    items: StockItem[],
    products: ProductMaster[]
): BCPStatus[] {
    const statuses: BCPStatus[] = [];

    // Organize products by simple lookup
    const productMap = new Map(products.map(p => [p.name, p]));

    // We calculate per "Location" or "Branch" depending on where Headcount is defined.
    // Assuming Headcount is defined on Branch or Department, stock is in Location.
    // For simplicity in Phase 7, we aggregate everything up to the BRANCH level (or top level units).
    // Or we iterate all units that have a headcount > 0.

    // Strategy: Flatten hierarchy, find units with headcount > 0, aggregate relevant stock.
    // If headcount is on Branch, we sum stock from all its children.

    const targetUnits = orgUnits.filter(u => (u.headcount && u.headcount > 0) || (u.bcpTargetPeople && u.bcpTargetPeople > 0));

    for (const unit of targetUnits) {
        // 1. Determine Headcount & Days
        const headcount = unit.bcpTargetPeople || unit.headcount || 0;
        const days = unit.bcpTargetDays || 3;

        // 2. Calculate Targets
        const targetWaterLiters = headcount * 3 * days; // 3L/day
        const targetFoodMeals = headcount * 3 * days;   // 3 meals/day

        // 3. Find Stock (recursively for this unit and its children)
        // Find all descendant Location IDs
        const childUnits = findDescendants(unit.id, orgUnits);
        const relevantLocationIds = new Set([unit.id, ...childUnits.map(c => c.id)]);

        const unitStock = items.filter(i =>
            relevantLocationIds.has(i.storageLocation) ||
            (i.branch === unit.name) // Fallback for legacy data
        );

        // 4. Calculate Current Amounts
        let currentWaterLiters = 0;
        let currentFoodMeals = 0;

        for (const item of unitStock) {
            const product = productMap.get(item.name);
            if (!product) {
                // Try to guess from category if product master not found? No, skip for accuracy.
                continue;
            }

            const qty = item.quantity;

            // Check Category
            if (product.category === '水・飲料') {
                // Determine Volume
                let volumeL = 0;
                if (product.contentPerUnit && product.contentUnit) {
                    // Normalize unit (assume L if ml or similar)
                    const unitStr = product.contentUnit.toLowerCase();
                    if (unitStr === 'l' || unitStr === 'リットル') {
                        volumeL = product.contentPerUnit;
                    } else if (unitStr === 'ml' || unitStr === 'ミリリットル') {
                        volumeL = product.contentPerUnit / 1000;
                    }
                } else if (!product.contentPerUnit && product.name.includes('2L')) {
                    volumeL = 2.0; // Fallback heuristic
                } else if (!product.contentPerUnit && product.name.includes('500ml')) {
                    volumeL = 0.5; // Fallback
                }

                currentWaterLiters += volumeL * qty;
            }
            else if (product.category === '主食（米・パン）' || product.category === '缶詰・レトルト') {
                // Determine Meals
                let meals = 0;
                if (product.contentPerUnit && product.contentUnit) {
                    const unitStr = product.contentUnit.toLowerCase();
                    if (unitStr.includes('食')) {
                        meals = product.contentPerUnit;
                    }
                } else {
                    // Default assumption: 1 item = 1 meal? 
                    // Often Alpha-rice 1 pack = 1 meal on emergency standard
                    meals = 1;
                }
                currentFoodMeals += meals * qty;
            }
        }

        // 5. Calculate Rates
        const waterSufficiencyRate = targetWaterLiters > 0 ? (currentWaterLiters / targetWaterLiters) * 100 : 0;
        const foodSufficiencyRate = targetFoodMeals > 0 ? (currentFoodMeals / targetFoodMeals) * 100 : 0;

        statuses.push({
            orgUnitId: unit.id,
            orgUnitName: unit.name,
            headcount,
            requiredDays: days,
            targetWaterLiters,
            targetFoodMeals,
            currentWaterLiters,
            currentFoodMeals,
            waterSufficiencyRate: Math.round(waterSufficiencyRate * 10) / 10,
            foodSufficiencyRate: Math.round(foodSufficiencyRate * 10) / 10,
        });
    }

    return statuses;
}

function findDescendants(parentId: string, allUnits: OrgUnit[]): OrgUnit[] {
    const children = allUnits.filter(u => u.parentId === parentId);
    let descendants = [...children];
    for (const child of children) {
        descendants = [...descendants, ...findDescendants(child.id, allUnits)];
    }
    return descendants;
}
