import { ProductMaster, DonationRecord } from '../types/master';

/**
 * サステナビリティ・インパクト計算ユーティリティ
 */

export interface ImpactMetrics {
    totalCo2ReductionKg: number;    // 正味のCO2削減量 (回避量 - 輸送排出量)
    totalCostSavingYen: number;     // 廃棄コスト削減額
    totalWeightKg: number;          // 総重量
    totalTransportCo2Kg: number;    // (参考) 輸送に伴う排出量
}

// トンキロ法 (改良トンキロ法) の排出係数
// 国交省等の基準: 中型トラック等を想定 (仮: 0.25 kg-CO2/t-km)
export const TRANSPORT_CO2_FACTOR = 0.25;

/**
 * 輸送に伴うCO2排出量を計算します (トンキロ法)
 * Weight(t) * Distance(km) * Factor
 */
export function calculateTransportEmission(weightKg: number, distanceKm: number): number {
    const weightTon = weightKg / 1000;
    return weightTon * distanceKm * TRANSPORT_CO2_FACTOR;
}

/**
 * 寄贈記録リストから、トータルのCO2削減量と廃棄コスト削減額を計算します
 * 
 * ロジック:
 * - 回避CO2 (Avoided) = 寄贈数 * (商品のCO2排出係数 || 0)
 * - 輸送CO2 (Transport) = トンキロ法 (重量 * 距離 * 0.25)
 * - 正味削減量 (Net) = Avoided - Transport
 */
export function calculateImpactMetrics(
    records: DonationRecord[],
    products: ProductMaster[]
): ImpactMetrics {
    let totalAvoidedCo2 = 0;
    let totalTransportCo2 = 0;
    let totalCost = 0;
    let totalWeight = 0;

    // 商品マスタ検索用 (今回は名前マッチ)
    // const productMap = new Map(products.map(p => [p.id, p]));

    for (const record of records) {
        let recordWeight = 0;

        for (const item of record.items) {
            const product = products.find(p => p.name === item.productName);

            if (product) {
                const qty = item.quantity;

                // Avoided CO2 (Disposal emission saved)
                const co2Unit = product.co2PerUnit ?? 0;
                totalAvoidedCo2 += co2Unit * qty;

                // Cost Saved
                const costUnit = product.disposalCost ?? 0;
                totalCost += costUnit * qty;

                // Weight
                const weightUnit = product.weightKg ?? 0;
                const itemWeight = weightUnit * qty;
                recordWeight += itemWeight;
                totalWeight += itemWeight;
            }
        }

        // Calculate Transport Emission for this record if distance is available
        if (record.distanceKm && recordWeight > 0) {
            totalTransportCo2 += calculateTransportEmission(recordWeight, record.distanceKm);
        }
    }

    // Net Reduction
    const netCo2Reduction = totalAvoidedCo2 - totalTransportCo2;

    return {
        totalCo2ReductionKg: Math.round(netCo2Reduction * 100) / 100,
        totalCostSavingYen: Math.round(totalCost),
        totalWeightKg: Math.round(totalWeight * 100) / 100,
        totalTransportCo2Kg: Math.round(totalTransportCo2 * 100) / 100
    };
}

/**
 * ダミー/デモ用の寄贈実績データを生成します
 */
export function generateMockDonationRecords(): DonationRecord[] {
    return [
        {
            id: 'don_1',
            date: '2025-01-15',
            recipientName: 'フードバンク大阪',
            distanceKm: 15.0, // 15km
            items: [
                { productName: 'ミネラルウォーター 2L', quantity: 120, weightKg: 240 },
                { productName: 'アルファ米（五目ご飯）', quantity: 50, weightKg: 5 }
            ],
            feedback: '子ども食堂のイベントで活用させていただきました！ありがとうございます。',
            co2ReductionKg: 15.2, // Mock value updated approximately
            costSavingYen: 5000
        },
        {
            id: 'don_2',
            date: '2025-02-01',
            recipientName: 'こども食堂「ひまわり」',
            distanceKm: 5.2, // 5.2km
            items: [
                { productName: '乾パン（缶入り）', quantity: 30, weightKg: 3 }
            ],
            feedback: 'おやつとして配布しました。子供たちも喜んでいました。',
            co2ReductionKg: 2.1,
            costSavingYen: 1200
        }
    ];
}
