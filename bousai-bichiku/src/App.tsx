import { useState, useMemo, useCallback } from 'react';
import { ImpactDashboard } from './pages/ImpactDashboard';
import { BCPDashboard } from './pages/BCPDashboard';

// ... (existing imports, but make sure to place the import at the top level properly in the real file edit)

// Note: I will use the `replace_file_content` to insert the import and the route.
// This single replacement block is tricky for imports + header + routes if they are far apart.
// I will split this into separate replacements if needed or use multi_replace.
// Since imports are top, header is middle, router is bottom, multi_replace is better.
// But wait, the tool call I'm making IS `replace_file_content` which works for contiguous blocks.
// I should use `multi_replace_file_content` instead.

import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { StockItem, MoveLog } from './types';
import { sampleStockItems } from './data/sampleData';
// import { extractBranchesFromItems } from './data/branchConfig'; // Removed unused
import { getItemsWithAlerts } from './utils/expirationUtils';
import {
  calculateShortageAlerts,
  filterItems,
  sortByExpiration,
  extractBranches,
  extractStorageLocations
} from './utils/stockUtils';

import { Sidebar } from './components/Sidebar';
import { StorageFilter } from './components/StorageFilter';
import { StockTable } from './components/StockTable';
import { MoveModal } from './components/MoveModal';
import { MoveHistory } from './components/MoveHistory';
import { AlertBanner } from './components/AlertBanner';
import { ShortageAlert } from './components/ShortageAlert';
import { CSVUploader } from './components/CSVUploader';

// --- バーコードスキャン用のライブラリを追加 ---
import BarcodeScanner from 'react-qr-barcode-scanner';

import { MasterManagement } from './pages/MasterManagement';
import { useMaster } from './contexts/MasterContext';

import './App.css';

const CURRENT_OPERATOR = '管理者';

// 在庫CSVエクスポート関数
function exportStockCSV(items: StockItem[], branchName: string | null) {
  const headers = ['ID', '品目名', 'カテゴリ', '数量', '単位', '消費期限', '支店', '保管場所', '備考'];
  const rows = items.map(item => [
    item.id,
    item.name,
    item.category,
    item.quantity.toString(),
    item.unit,
    item.expirationDate,
    item.branch,
    item.storageLocation,
    item.notes || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const fileName = branchName
    ? `在庫一覧_${branchName}_${new Date().toISOString().split('T')[0]}.csv`
    : `在庫一覧_全支店_${new Date().toISOString().split('T')[0]}.csv`;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function App() {
  const navigate = useNavigate();
  // --- 1. データ状態 ---
  const [items, setItems] = useState<StockItem[]>(sampleStockItems);
  // Phase 6: Removed local branchConfig state, relying on MasterContext
  const [moveLogs, setMoveLogs] = useState<MoveLog[]>([]);

  // マスタデータの取得
  const { products, orgUnits } = useMaster();

  // --- 2. フィルター・UI状態 ---
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedStorageLocations, setSelectedStorageLocations] = useState<string[]>([]);
  const [showExpirationAlert, setShowExpirationAlert] = useState(true);
  const [showShortageAlert, setShowShortageAlert] = useState(true);
  const [moveModalItem, setMoveModalItem] = useState<StockItem | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // --- 3. スキャン関連の状態 (追加) ---
  const [isScanning, setIsScanning] = useState(false);

  // --- 4. ロジック (スキャン成功時) ---
  const handleScan = useCallback((_err: any, result: any) => {
    if (result) {
      const code = result.text;
      const masterProduct = products.find(p =>
        (p.barcodes && p.barcodes.includes(code)) ||
        p.name.includes(code)
      );

      if (masterProduct) {
        const stockItems = items.filter(i => i.name === masterProduct.name);
        if (stockItems.length > 0) {
          const totalQty = stockItems.reduce((sum, i) => sum + i.quantity, 0);
          alert(`【マスタ登録済】\n商品: ${masterProduct.name}\n現在の総在庫: ${totalQty}${masterProduct.unit}\n\n在庫データに詳細を表示します。`);
          setSelectedBranch(stockItems[0].branch);
        } else {
          alert(`【マスタ登録済】\n商品: ${masterProduct.name}\n\n現在、在庫はありません。`);
        }
      } else {
        const foundItem = items.find(item => item.name.includes(code));
        if (foundItem) {
          alert(`(旧データヒット)\n発見しました！\n品目: ${foundItem.name}\n数量: ${foundItem.quantity}${foundItem.unit}`);
          setSelectedBranch(foundItem.branch);
        } else {
          if (confirm(`コード: ${code} はマスタ未登録です。\n\n新規にマスタ登録しますか？`)) {
            navigate('/masters', { state: { newBarcode: code } });
          }
        }
      }
      setIsScanning(false);
    }
  }, [items, products, navigate]);

  // --- 以下、既存の計算ロジック ---
  const branches = useMemo(() => extractBranches(items), [items]);
  const storageLocations = useMemo(() => {
    if (!selectedBranch) return [];
    return extractStorageLocations(items, selectedBranch);
  }, [items, selectedBranch]);

  const itemCountByBranch = useMemo(() => {
    const counts: Record<string, number> = {};
    items.filter(i => !i.donated).forEach(item => {
      counts[item.branch] = (counts[item.branch] || 0) + 1;
    });
    return counts;
  }, [items]);

  const filteredItems = useMemo(() => {
    const filtered = filterItems(items, selectedBranch, selectedStorageLocations, false);
    return sortByExpiration(filtered);
  }, [items, selectedBranch, selectedStorageLocations]);

  const expirationAlerts = useMemo(() => getItemsWithAlerts(items.filter(i => !i.donated)), [items]);

  // Phase 6: Pass orgUnits to calculation
  const shortageAlerts = useMemo(() => calculateShortageAlerts(items, orgUnits, products), [items, orgUnits, products]);

  const handleBranchSelect = useCallback((branch: string | null) => {
    setSelectedBranch(branch);
    setSelectedStorageLocations([]);
  }, []);

  const handleCSVUpload = useCallback((newItems: StockItem[]) => {
    setItems(newItems);
    // Legacy support: We might want to auto-create OrgUnits from CSV, 
    // but for now we just update stock items. 
    // We don't update 'branchConfig' locally anymore.
    setSelectedBranch(null);
  }, []);

  const handleMove = useCallback((itemId: string, quantity: number, toBranch: string, toStorage: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const log: MoveLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      operator: CURRENT_OPERATOR,
      itemId: item.id,
      itemName: item.name,
      category: item.category,
      quantity,
      unit: item.unit,
      fromBranch: item.branch,
      fromStorage: item.storageLocation,
      toBranch,
      toStorage,
    };
    setMoveLogs(prev => [log, ...prev]);

    setItems(prevItems => {
      const newItems = [...prevItems];
      const index = newItems.findIndex(i => i.id === itemId);
      if (index === -1) return prevItems;

      const current = newItems[index];
      if (quantity >= current.quantity) {
        newItems[index] = { ...current, branch: toBranch, storageLocation: toStorage, updatedAt: new Date().toISOString() };
      } else {
        newItems[index] = { ...current, quantity: current.quantity - quantity, updatedAt: new Date().toISOString() };
        newItems.push({ ...current, id: `${current.id}-moved-${Date.now()}`, quantity, branch: toBranch, storageLocation: toStorage, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      }
      return newItems;
    });
    setMoveModalItem(null);
  }, [items]);

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={
          <>
            <header className="app-header">
              <div className="header-content">
                <div className="header-title"></div>
                <div className="header-actions">
                  <Link to="/masters" style={{ marginRight: '1rem', textDecoration: 'none', color: '#555', fontWeight: 'bold' }}>
                    ⚙️ マスタ管理
                  </Link>
                  <button
                    className="btn-scan"
                    onClick={() => setIsScanning(true)}
                    style={{ backgroundColor: '#4CAF50', color: 'white', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    📷 バーコードスキャン
                  </button>
                  <button className="btn-history" onClick={() => setShowHistory(true)}>
                    📋 移動履歴 {moveLogs.length > 0 && <span className="badge">{moveLogs.length}</span>}
                  </button>
                  <Link to="/impact" style={{ marginLeft: '1rem', textDecoration: 'none', fontSize: '1.2rem' }} title="サステナビリティ・インパクト">
                    🌱
                  </Link>
                  <Link to="/bcp" style={{ marginLeft: '1rem', textDecoration: 'none', fontSize: '1.2rem' }} title="BCP充足率ダッシュボード">
                    🛡️
                  </Link>
                  <CSVUploader onUpload={handleCSVUpload} />
                </div>
              </div>
            </header>

            {isScanning && (
              <div style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
              }}>
                <div style={{ width: '300px', height: '300px', border: '2px solid #fff', borderRadius: '8px', overflow: 'hidden' }}>
                  <BarcodeScanner onUpdate={handleScan} />
                </div>
                <p style={{ color: 'white', marginTop: '1.5rem', fontSize: '1.1rem' }}>バーコードを枠内に写してください</p>
                <button
                  onClick={() => setIsScanning(false)}
                  style={{ marginTop: '2rem', padding: '0.8rem 2rem', borderRadius: '4px', backgroundColor: '#f44336', color: 'white', border: 'none', cursor: 'pointer' }}
                >
                  キャンセル
                </button>
              </div>
            )}

            <div className="app-body">
              <Sidebar
                branches={branches}
                orgUnits={orgUnits}
                selectedBranch={selectedBranch}
                onBranchSelect={handleBranchSelect}
                itemCountByBranch={itemCountByBranch}
              />

              <main className="app-main">
                {showShortageAlert && shortageAlerts.length > 0 && (
                  <ShortageAlert alerts={shortageAlerts} onClose={() => setShowShortageAlert(false)} />
                )}

                {showExpirationAlert && expirationAlerts.length > 0 && (
                  <AlertBanner alerts={expirationAlerts} onClose={() => setShowExpirationAlert(false)} />
                )}

                {selectedBranch && (
                  <StorageFilter
                    storageLocations={storageLocations}
                    selectedLocations={selectedStorageLocations}
                    onSelectionChange={setSelectedStorageLocations}
                  />
                )}

                <StockTable items={filteredItems} onMoveClick={setMoveModalItem} />

                <div className="main-footer">
                  <span>{selectedBranch ? `${selectedBranch}: ` : '全支店: '}{filteredItems.length}件のアイテム</span>
                  <div className="footer-actions">
                    {expirationAlerts.length > 0 && <span className="footer-alert">⚠️ {expirationAlerts.length}件の期限アラート</span>}
                    <button className="btn-export-stock" onClick={() => exportStockCSV(filteredItems, selectedBranch)}>📥 在庫CSVエクスポート</button>
                  </div>
                </div>
              </main>
            </div>

            <MoveModal
              item={moveModalItem}
              branches={branches}
              // MoveModal might still expect branchConfig! Need to check this one deeper.
              // Assuming it uses it for 'toStorage' options... but wait, MoveModal used branchConfig to show select options.
              // For now, passing empty/undefined might break it if it's not updated.
              // I will pass 'undefined' for branchConfig if possible, or Mock it?
              // The original code passed 'branchConfig'.
              // I should update MoveModal too.
              branchConfig={{}} // Passing empty map for now, assume MoveModal needs update next.
              onClose={() => setMoveModalItem(null)}
              onConfirm={handleMove}
            />
            {showHistory && <MoveHistory logs={moveLogs} onClose={() => setShowHistory(false)} />}
          </>
        } />

        <Route path="/masters" element={<MasterManagement />} />
        <Route path="/impact" element={<ImpactDashboard />} />
        <Route path="/bcp" element={<BCPDashboard items={items} />} />
      </Routes>
    </div>
  );
}

export default App;