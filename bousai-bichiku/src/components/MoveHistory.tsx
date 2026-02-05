import { MoveLog } from '../types';
import './MoveHistory.css';

interface MoveHistoryProps {
  logs: MoveLog[];
  onClose: () => void;
}

export function MoveHistory({ logs, onClose }: MoveHistoryProps) {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="history-modal" onClick={e => e.stopPropagation()}>
        <div className="history-header">
          <h3>📋 移動履歴</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="history-content">
          {logs.length === 0 ? (
            <div className="history-empty">
              <span className="empty-icon">📝</span>
              <p>移動履歴はまだありません</p>
            </div>
          ) : (
            <table className="history-table">
              <thead>
                <tr>
                  <th>日時</th>
                  <th>操作者</th>
                  <th>品目</th>
                  <th>数量</th>
                  <th>移動元</th>
                  <th>移動先</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td className="col-timestamp">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="col-operator">
                      <span className="operator-badge">{log.operator}</span>
                    </td>
                    <td className="col-item">
                      <div className="item-info">
                        <span className="item-name">{log.itemName}</span>
                        <span className="item-category">{log.category}</span>
                      </div>
                    </td>
                    <td className="col-quantity">
                      {log.quantity}{log.unit}
                    </td>
                    <td className="col-location">
                      <div className="location-info">
                        <span className="branch">{log.fromBranch}</span>
                        <span className="storage">{log.fromStorage}</span>
                      </div>
                    </td>
                    <td className="col-location">
                      <div className="location-info">
                        <span className="branch">{log.toBranch}</span>
                        <span className="storage">{log.toStorage}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="history-footer">
          <span className="history-count">全 {logs.length} 件</span>
          <button className="btn-export" onClick={() => exportCSV(logs)}>
            📥 CSVエクスポート
          </button>
        </div>
      </div>
    </div>
  );
}

function exportCSV(logs: MoveLog[]) {
  const headers = ['日時', '操作者', '品目名', 'カテゴリ', '数量', '単位', '移動元支店', '移動元保管場所', '移動先支店', '移動先保管場所'];
  const rows = logs.map(log => [
    log.timestamp,
    log.operator,
    log.itemName,
    log.category,
    log.quantity.toString(),
    log.unit,
    log.fromBranch,
    log.fromStorage,
    log.toBranch,
    log.toStorage,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `移動履歴_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
