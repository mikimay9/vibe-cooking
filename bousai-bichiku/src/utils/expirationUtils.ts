import { StockItem, ExpirationAlert, AlertLevel } from '../types';

/**
 * 日付から残り日数を計算
 */
export function getDaysUntilExpiration(expirationDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const expDate = new Date(expirationDate);
  expDate.setHours(0, 0, 0, 0);
  
  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * アラートレベルを判定
 */
export function getAlertLevel(daysUntilExpiration: number): AlertLevel {
  if (daysUntilExpiration < 0) return 'expired';
  if (daysUntilExpiration <= 7) return 'urgent';
  if (daysUntilExpiration <= 30) return 'warning';
  return 'safe';
}

/**
 * アイテムのアラート情報を取得
 */
export function getExpirationAlert(item: StockItem): ExpirationAlert {
  const daysUntilExpiration = getDaysUntilExpiration(item.expirationDate);
  const level = getAlertLevel(daysUntilExpiration);
  
  return {
    item,
    level,
    daysUntilExpiration,
  };
}

/**
 * アラートが必要なアイテムを抽出（30日以内）
 */
export function getItemsWithAlerts(items: StockItem[]): ExpirationAlert[] {
  return items
    .filter(item => !item.donated)
    .map(getExpirationAlert)
    .filter(alert => alert.level !== 'safe')
    .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);
}

/**
 * アラートレベルに応じた色を取得
 */
export function getAlertColor(level: AlertLevel): string {
  switch (level) {
    case 'expired': return '#dc2626'; // red-600
    case 'urgent': return '#ea580c'; // orange-600
    case 'warning': return '#ca8a04'; // yellow-600
    case 'safe': return '#16a34a'; // green-600
    default: return '#6b7280'; // gray-500
  }
}

/**
 * アラートレベルに応じた背景色を取得
 */
export function getAlertBgColor(level: AlertLevel): string {
  switch (level) {
    case 'expired': return '#fef2f2'; // red-50
    case 'urgent': return '#fff7ed'; // orange-50
    case 'warning': return '#fefce8'; // yellow-50
    case 'safe': return '#f0fdf4'; // green-50
    default: return '#f9fafb'; // gray-50
  }
}

/**
 * 期限表示用のテキストを生成
 */
export function getExpirationText(daysUntilExpiration: number): string {
  if (daysUntilExpiration < 0) {
    return `${Math.abs(daysUntilExpiration)}日前に期限切れ`;
  }
  if (daysUntilExpiration === 0) {
    return '本日期限';
  }
  if (daysUntilExpiration === 1) {
    return '明日期限';
  }
  return `あと${daysUntilExpiration}日`;
}

/**
 * 日付をフォーマット
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
