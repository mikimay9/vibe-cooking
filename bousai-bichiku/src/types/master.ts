import { FoodCategory } from './index';

/**
 * 商品マスタ
 * "在庫"ではなく"品目"そのものの定義
 */
export interface ProductMaster {
    id: string;
    name: string;
    category: FoodCategory;
    unit: string;           // 数える単位 (箱, 個, 本)
    defaultExpirationDays: number; // 標準の賞味期限（日数）
    barcodes: string[];     // JANコードなど
    description?: string;

    // マスタレベルでの必要量定義（オプション）
    // 未設定の場合はカテゴリのデフォルト値を使用
    dailyRequirementPerPerson?: number;

    // --- Phase 7: Sustainability & BCP Data ---
    // 1単位あたりの重量(kg) - 輸送コスト・CO2計算用
    weightKg?: number;
    // 1単位あたりのCO2排出量(kg-CO2) - 削減目安
    co2PerUnit?: number;
    // 1単位あたりの廃棄コスト(円) - 節約額目安
    disposalCost?: number;

    // --- Phase 7 Refinement: BCP Sufficiency Logic ---
    // 1単位あたりの内容量 (例: 2.0, 500)
    contentPerUnit?: number;
    // 内容量の単位 (例: 'L', 'ml', '食', 'g')
    // これを使って「水: 3L/人/日」などの計算を行う
    contentUnit?: string;
}

/**
 * 寄贈・廃棄などの実績記録 (Feedback用)
 */
export interface DonationRecord {
    id: string;
    date: string;
    recipientName: string; // 寄贈先（フードバンク団体名など）

    // 輸送距離 (km) - トンキロ法でのCO2計算用
    distanceKm?: number;

    // 内訳
    items: {
        productName: string;
        quantity: number;
        weightKg?: number; // 記録時点での重量
    }[];

    // フィードバック
    feedback?: string; // 感謝の言葉や用途など

    // サステナビリティ指標 (計算結果を保存)
    co2ReductionKg?: number;
    costSavingYen?: number;
}

/**
 * 在庫トランザクション
 * 具体的な「モノ」の実体
 */
export interface StockInventory {
    id: string;
    productId: string;      // 商品マスタへの参照
    branchId: string;       // 支店ID
    storageLocation: string; // 保管場所

    quantity: number;
    expirationDate: string; // 賞味期限

    createdAt: string;
    updatedAt: string;

    // 備考や個別の特性
    notes?: string;

    // --- Phase 9: Future Proofing (RFID/IoT) ---
    // 個体識別用シリアルナンバー (RFIDタグIDなど)
    // これを使用する場合、原則として quantity=1 で管理することを想定
    serialNumber?: string;
}

/**
 * 組織階層の定義 (Phase 6)
 * Branch (支店) -> Department (営業所/部) -> Location (拠点/倉庫)
 */
export type OrgLayer = 'Branch' | 'Department' | 'Location';

export interface OrgUnit {
    id: string;
    name: string;
    layer: OrgLayer;
    parentId?: string; // Root (Branch) has no parent (undefined)

    // 住所 (Location層で必須、他は任意)
    address?: string;

    // 人数 (備蓄必要数計算用。Branch/Deptに設定可)
    headcount?: number;

    // --- Phase 7 & 8: BCP & Dashboard Props ---
    // 緯度経度 (地図表示用)
    location?: {
        lat: number;
        lng: number;
    };
    // BCP目標備蓄日数 (デフォルト3日、支店ごとに変更可能)
    bcpTargetDays?: number;

    // --- Phase 8: Detailed BCP Fields (Request from User) ---
    // 最大収容人数 (避難者含む) - 拠点(Location)用
    maxCapacity?: number;
    // 緊急時連絡先 - Location用
    emergencyContact?: string;
    // 自治体ガイドラインURL - Location用
    guidelineUrl?: string;

    // 目標備蓄人数 (従業員+帰宅困難者など) - Location用
    // headcountは「従業員数」として使い分け可能
    bcpTargetPeople?: number;

    // 条例に基づく必要数 (マニュアル入力値) - Location用
    ordinanceRequirement?: number;

    // UI表示用ヘルパー (Context内でツリー構築時に使用)
    children?: OrgUnit[];
}

/**
 * 支店マスタ (互換性のため残すが、実態はOrgUnitのルート要素)
 */
export type BranchMaster = OrgUnit;
