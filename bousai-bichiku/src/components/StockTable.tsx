import { StockItem } from '../types';
import {
  getDaysUntilExpiration,
  getAlertLevel,
  formatDate,
  getExpirationText
} from '../utils/expirationUtils';
import './StockTable.css';

interface StockTableProps {
  items: StockItem[];
  onMoveClick: (item: StockItem) => void;
}

export function StockTable({ items, onMoveClick }: StockTableProps) {
  if (items.length === 0) {
    return (
      <div className="table-empty">
        <span className="empty-icon">📦</span>
        <p>該当するアイテムがありません</p>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="stock-table">
        <thead>
          <tr>
            <th>拠点</th>
            <th>保管場所</th>
            <th>品目名</th>
            <th className="text-right">数量</th>
            <th>消費期限</th>
            <th className="text-center">アクション</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => {
            const days = getDaysUntilExpiration(item.expirationDate);
            const level = getAlertLevel(days);
            const isAlert = level !== 'safe';

            return (
              <tr
                key={item.id}
                className={isAlert ? `alert-row alert-${level}` : ''}
              >
                <td>
                  <span className="branch-badge">{item.branch}</span>
                </td>
                <td>
                  <span className="storage-text">{item.storageLocation}</span>
                </td>
                <td>
                  <div className="item-name">
                    <span className="category-icon">
                      {getCategoryIcon(item.category)}
                    </span>
                    <span>
                      {item.name}
                      {item.serialNumber && (
                        <span style={{ fontSize: '0.75rem', color: '#6366f1', marginLeft: '6px', background: '#e0e7ff', padding: '1px 4px', borderRadius: '4px' }}>
                          🏷️ {item.serialNumber}
                        </span>
                      )}
                    </span>
                  </div>
                </td>
                <td className="text-right">
                  <span className="quantity">
                    {item.quantity}
                    <span className="unit">{item.unit}</span>
                  </span>
                </td>
                <td>
                  <div className={`expiration ${isAlert ? 'alert' : ''}`}>
                    <span className="expiration-date">
                      {formatDate(item.expirationDate)}
                    </span>
                    <span className={`expiration-days level-${level}`}>
                      {getExpirationText(days)}
                    </span>
                  </div>
                </td>
                <td className="text-center">
                  <button
                    className="move-button"
                    onClick={() => onMoveClick(item)}
                  >
                    📦 移動
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    '水・飲料': '💧',
    '主食（米・パン）': '🍚',
    '缶詰・レトルト': '🥫',
    'お菓子・栄養補助': '🍪',
    '調味料': '🧂',
    'その他': '📦',
  };
  return icons[category] || '📦';
}
