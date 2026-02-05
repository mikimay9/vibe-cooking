import { StockItem } from '../types';
import { 
  getDaysUntilExpiration, 
  getAlertLevel, 
  getAlertColor,
  getAlertBgColor,
  getExpirationText,
  formatDate 
} from '../utils/expirationUtils';
import './StockCard.css';

interface StockCardProps {
  item: StockItem;
  onDonate: (id: string) => void;
}

// カテゴリごとのアイコン
const categoryIcons: Record<string, string> = {
  '水・飲料': '💧',
  '主食（米・パン）': '🍚',
  '缶詰・レトルト': '🥫',
  'お菓子・栄養補助': '🍪',
  '調味料': '🧂',
  'その他': '📦',
};

export function StockCard({ item, onDonate }: StockCardProps) {
  const daysUntilExpiration = getDaysUntilExpiration(item.expirationDate);
  const alertLevel = getAlertLevel(daysUntilExpiration);
  const alertColor = getAlertColor(alertLevel);
  const alertBgColor = getAlertBgColor(alertLevel);

  const isExpiringSoon = alertLevel !== 'safe';

  return (
    <div 
      className={`stock-card ${isExpiringSoon ? 'alert' : ''}`}
      style={isExpiringSoon ? { borderColor: alertColor } : undefined}
    >
      <div className="stock-card-header">
        <span className="stock-card-category-icon">
          {categoryIcons[item.category] || '📦'}
        </span>
        <span className="stock-card-category">
          {item.category}
        </span>
      </div>

      <h3 className="stock-card-name">
        {item.name}
      </h3>

      <div className="stock-card-quantity">
        <span className="quantity-value">{item.quantity}</span>
        <span className="quantity-unit">{item.unit}</span>
      </div>

      <div 
        className="stock-card-expiration"
        style={{ 
          backgroundColor: alertBgColor,
          color: alertColor 
        }}
      >
        <span className="expiration-label">消費期限</span>
        <span className="expiration-date">{formatDate(item.expirationDate)}</span>
        <span className="expiration-days">
          {getExpirationText(daysUntilExpiration)}
        </span>
      </div>

      {item.notes && (
        <div className="stock-card-notes">
          📝 {item.notes}
        </div>
      )}

      <button 
        className="donate-button"
        onClick={() => onDonate(item.id)}
      >
        🎁 寄贈する
      </button>
    </div>
  );
}
