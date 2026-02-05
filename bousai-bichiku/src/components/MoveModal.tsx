import { useState, useEffect } from 'react';
import { StockItem } from '../types';
import { useMaster } from '../contexts/MasterContext';
import './MoveModal.css';

interface MoveModalProps {
  item: StockItem | null;
  branches: string[];
  branchConfig?: any; // Compat, unused now
  onClose: () => void;
  onConfirm: (itemId: string, quantity: number, toBranch: string, toStorage: string) => void;
}

export function MoveModal({ item, branches, onClose, onConfirm }: MoveModalProps) {
  const { orgUnits } = useMaster();
  const [quantity, setQuantity] = useState(1);
  const [toBranch, setToBranch] = useState('');
  const [toStorage, setToStorage] = useState('');

  // Reset when item opens
  useEffect(() => {
    if (item) {
      setQuantity(1);
      setToBranch(item.branch === 'MainBranch' ? '' : item.branch); // Reset or Keep?
      // Actually standard logic: Keep current branch if valid, or empty?
      // Usually users move TO another branch.
      // But let's set it to item.branch initially for convenience if moving within branch.
      setToBranch(item.branch);
      setToStorage(''); // Reset storage selection
    }
  }, [item]);

  if (!item) return null;

  // Derive available storage locations based on selected ToBranch
  const getLocationsForBranch = (branchName: string) => {
    // 1. Find Branch Unit ID
    // Assuming branchName maps to OrgUnit.name
    const branchUnit = orgUnits.find(u => u.name === branchName && u.layer === 'Branch');
    if (!branchUnit) return [];

    // 2. Find Children (Depts -> Locs, or direct Locs)
    const directLocs = orgUnits.filter(u => u.parentId === branchUnit.id && u.layer === 'Location');
    const deptUnits = orgUnits.filter(u => u.parentId === branchUnit.id && u.layer === 'Department');
    const deptLocs = orgUnits.filter(u => u.layer === 'Location' && deptUnits.some(d => d.id === u.parentId));

    const allLocs = [...directLocs, ...deptLocs].map(u => u.name).sort();
    return allLocs;
  };

  const availableLocations = toBranch ? getLocationsForBranch(toBranch) : [];

  const handleConfirm = () => {
    if (quantity <= 0) return alert('数量は1以上を指定してください');
    if (quantity > item.quantity) return alert('現在庫数を超えています');
    if (!toBranch) return alert('移動先支店を選択してください');
    if (!toStorage) return alert('移動先保管場所を選択してください');

    onConfirm(item.id, quantity, toBranch, toStorage);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content move-modal" onClick={e => e.stopPropagation()}>
        <h3>在庫移動</h3>
        <p className="item-info">
          <strong>{item.name}</strong> ({item.quantity}{item.unit}) <br />
          現在: {item.branch} / {item.storageLocation}
        </p>

        <div className="form-group">
          <label>移動数量</label>
          <input
            type="number"
            min="1"
            max={item.quantity}
            value={quantity}
            onChange={e => setQuantity(parseInt(e.target.value) || 0)}
          />
        </div>

        <div className="form-group">
          <label>移動先支店</label>
          <select value={toBranch} onChange={e => {
            setToBranch(e.target.value);
            setToStorage('');
          }}>
            <option value="">選択してください</option>
            {branches.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>移動先保管場所</label>
          <select
            value={toStorage}
            onChange={e => setToStorage(e.target.value)}
            disabled={!toBranch}
          >
            <option value="">選択してください</option>
            {availableLocations.length > 0 ? (
              availableLocations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))
            ) : (
              <option value="" disabled>保管場所がありません</option>
            )}
          </select>
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>キャンセル</button>
          <button className="btn-primary" onClick={handleConfirm}>移動確定</button>
        </div>
      </div>
    </div>
  );
}
