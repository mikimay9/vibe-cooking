import { ShortageAlert as ShortageAlertType } from '../types';
import './ShortageAlert.css';

interface ShortageAlertProps {
  alerts: ShortageAlertType[];
  onClose: () => void;
}

export function ShortageAlert({ alerts, onClose }: ShortageAlertProps) {
  if (alerts.length === 0) return null;

  // 支店ごとにグループ化
  const groupedByBranch = alerts.reduce((acc, alert) => {
    if (!acc[alert.branch]) {
      acc[alert.branch] = [];
    }
    acc[alert.branch].push(alert);
    return acc;
  }, {} as Record<string, ShortageAlertType[]>);

  return (
    <div className="shortage-alert">
      <div className="shortage-alert-icon">🚨</div>
      <div className="shortage-alert-content">
        <div className="shortage-alert-title">
          備蓄不足アラート
        </div>
        <div className="shortage-alert-summary">
          {Object.keys(groupedByBranch).length}拠点で備蓄が不足しています
        </div>
        <div className="shortage-alert-details">
          {Object.entries(groupedByBranch).slice(0, 3).map(([branch, branchAlerts]) => (
            <div key={branch} className="shortage-branch">
              <span className="shortage-branch-name">{branch}</span>
              <span className="shortage-items">
                {branchAlerts.slice(0, 2).map(a => a.itemName || a.category).join('、')}
                {branchAlerts.length > 2 && ` 他${branchAlerts.length - 2}件`}
              </span>
            </div>
          ))}
          {Object.keys(groupedByBranch).length > 3 && (
            <div className="shortage-more">
              他 {Object.keys(groupedByBranch).length - 3}拠点
            </div>
          )}
        </div>
      </div>
      <button
        className="shortage-alert-close"
        onClick={onClose}
        aria-label="閉じる"
      >
        ✕
      </button>
    </div>
  );
}
