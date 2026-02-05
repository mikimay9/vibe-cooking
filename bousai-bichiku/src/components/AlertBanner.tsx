import { ExpirationAlert } from '../types';
import { getAlertColor, getExpirationText } from '../utils/expirationUtils';
import './AlertBanner.css';

interface AlertBannerProps {
  alerts: ExpirationAlert[];
  onClose: () => void;
}

export function AlertBanner({ alerts, onClose }: AlertBannerProps) {
  if (alerts.length === 0) return null;

  const expiredCount = alerts.filter(a => a.level === 'expired').length;
  const urgentCount = alerts.filter(a => a.level === 'urgent').length;
  const warningCount = alerts.filter(a => a.level === 'warning').length;

  // 最も緊急度の高いアラートを表示
  const mostUrgent = alerts[0];
  const bannerColor = getAlertColor(mostUrgent.level);

  return (
    <div 
      className="alert-banner"
      style={{ borderLeftColor: bannerColor }}
    >
      <div className="alert-banner-icon">
        ⚠️
      </div>
      <div className="alert-banner-content">
        <div className="alert-banner-title">
          消費期限アラート
        </div>
        <div className="alert-banner-summary">
          {expiredCount > 0 && (
            <span className="alert-count expired">
              期限切れ {expiredCount}件
            </span>
          )}
          {urgentCount > 0 && (
            <span className="alert-count urgent">
              7日以内 {urgentCount}件
            </span>
          )}
          {warningCount > 0 && (
            <span className="alert-count warning">
              30日以内 {warningCount}件
            </span>
          )}
        </div>
        <div className="alert-banner-items">
          {alerts.slice(0, 3).map(alert => (
            <div key={alert.item.id} className="alert-item">
              <span className="alert-item-name">{alert.item.name}</span>
              <span 
                className="alert-item-days"
                style={{ color: getAlertColor(alert.level) }}
              >
                {getExpirationText(alert.daysUntilExpiration)}
              </span>
            </div>
          ))}
          {alerts.length > 3 && (
            <div className="alert-item-more">
              他 {alerts.length - 3}件
            </div>
          )}
        </div>
      </div>
      <button 
        className="alert-banner-close"
        onClick={onClose}
        aria-label="閉じる"
      >
        ✕
      </button>
    </div>
  );
}
