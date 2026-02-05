import { StockItem } from '../types';
import { ProductMaster, StockInventory } from '../types/master';

/**
 * 既存の在庫データ(StockItem[])から
 * 商品マスタ(ProductMaster[])と在庫トランザクション(StockInventory[])を抽出・生成する
 */
export function migrateFromStockItems(items: StockItem[]): {
    products: ProductMaster[];
    stocks: StockInventory[];
} {
    const productsMap = new Map<string, ProductMaster>();
    const stocks: StockInventory[] = [];

    items.forEach(item => {
        // 1. 商品マスタの特定・生成
        // 名前と単位が同じなら同一商品とみなす簡易ロジック
        // (実運用ではJANコードなどをキーにするが、現状データにはないので名前で寄せ集める)
        const productKey = `${item.name}-${item.unit}`;

        let productId = '';

        if (productsMap.has(productKey)) {
            productId = productsMap.get(productKey)!.id;
        } else {
            // 新規商品の登録
            productId = `prod_${Math.random().toString(36).substr(2, 9)}`;
            const newProduct: ProductMaster = {
                id: productId,
                name: item.name,
                category: item.category,
                unit: item.unit,
                defaultExpirationDays: 365, // 仮のデフォルト値
                barcodes: [], // 将来的にJANが入る
                description: item.notes,
            };
            productsMap.set(productKey, newProduct);
        }

        // 2. 在庫データの生成
        const stock: StockInventory = {
            id: item.id, // IDは引き継ぐ
            productId: productId,
            branchId: item.branch, // 支店名がそのままID的に使われている現状に合わせる
            storageLocation: item.storageLocation,
            quantity: item.quantity,
            expirationDate: item.expirationDate,
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || new Date().toISOString(),
            notes: item.notes
        };

        stocks.push(stock);
    });

    return {
        products: Array.from(productsMap.values()),
        stocks
    };
}
