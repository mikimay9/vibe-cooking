/**
 * 防災備蓄食品管理システム - 型定義
 * 業務向け：支店・保管場所の2階層管理対応
 */

// ============================================
// 拠点・保管場所の設定
// ============================================

/** 支店（拠点）の設定 */
export interface BranchConfig {
  id: string;
  name: string;
  headcount: number;           // 所属人数
  requiredDays: number;        // 必要備蓄日数（条例等）
  storageLocations: string[];  // 保管場所リスト
}

/** 支店設定のマップ */
export type BranchConfigMap = Record<string, BranchConfig>;

// ============================================
// 備蓄アイテム
// ============================================

/** 食品カテゴリ */
export type FoodCategory =
  | '水・飲料'
  | '主食（米・パン）'
  | '缶詰・レトルト'
  | 'お菓子・栄養補助'
  | '調味料'
  | 'その他';

/** 備蓄アイテム */
export interface StockItem {
  id: string;
  name: string;
  category: FoodCategory;
  quantity: number;
  unit: string;
  expirationDate: string;      // ISO 8601形式 (YYYY-MM-DD)
  branch: string;              // 支店（拠点）
  storageLocation: string;     // 保管場所（営業所）
  donated: boolean;
  notes?: string;
  // RFID/Individual Tracking
  serialNumber?: string;
  // メタデータ
  createdAt?: string;
  updatedAt?: string;
  rowIndex?: number;
}

// ============================================
// 移動機能
// ============================================

/** 在庫移動リクエスト */
export interface MoveRequest {
  itemId: string;
  quantity: number;
  fromBranch: string;
  fromStorage: string;
  toBranch: string;
  toStorage: string;
}

/** 移動モーダルの状態 */
export interface MoveModalState {
  isOpen: boolean;
  item: StockItem | null;
}

// ============================================
// 移動履歴（監査ログ）
// ============================================

/** 移動履歴エントリ */
export interface MoveLog {
  id: string;
  timestamp: string;        // ISO 8601形式
  operator: string;         // 操作者名
  itemId: string;
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
  fromBranch: string;
  fromStorage: string;
  toBranch: string;
  toStorage: string;
  notes?: string;
}

// ============================================
// アラート・不足判定
// ============================================

/** 期限アラートレベル */
export type AlertLevel = 'expired' | 'urgent' | 'warning' | 'safe';

/** 期限アラート */
export interface ExpirationAlert {
  item: StockItem;
  level: AlertLevel;
  daysUntilExpiration: number;
}

/** 不足アラート */
export interface ShortageAlert {
  branch: string;
  category: string;
  required: number;       // 必要数量
  current: number;        // 現在数量
  shortage: number;       // 不足数量
  itemName?: string;      // 具体的な商品名（マスタ不足判定用）
}

// ============================================
// CSV読み込み
// ============================================

/** CSVから読み込む際の生データ */
export interface RawCSVRow {
  id?: string;
  name: string;
  category: string;
  quantity: string;
  unit: string;
  expirationDate: string;
  branch: string;              // 支店
  storageLocation: string;     // 保管場所
  donated?: string;
  notes?: string;
  // 後方互換性のため
  location?: string;
}

// ============================================
// アプリ状態
// ============================================

/** フィルター設定 */
export interface FilterState {
  selectedBranch: string | null;
  selectedStorageLocations: string[];  // 複数選択可
  showDonated: boolean;
  alertOnly: boolean;
}

/** アプリ全体の状態 */
export interface AppState {
  items: StockItem[];
  branches: BranchConfigMap;
  filter: FilterState;
  loading: boolean;
  error: string | null;
}
