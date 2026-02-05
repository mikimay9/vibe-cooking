import { useState, useEffect } from 'react';
import { useMaster } from '../contexts/MasterContext';
import { Link, useLocation } from 'react-router-dom';
import { ProductMaster, OrgUnit, OrgLayer } from '../types/master';
import { ProductEditModal } from '../components/ProductEditModal';

// Styles
import '../App.css';
import '../components/StockTable.css';
import './MasterManagement.css';

/**
 * マスタ管理トップページ (Updated for Phase 6 Hierarchy)
 * 
 * 商品マスタと組織・拠点マスタの管理を行うメイン画面です。
 * 
 * 主な機能:
 * 1. 商品マスタ管理: 一覧表示、新規登録、編集、削除（モーダル）
 * 2. 組織階層管理: 
 *    - 支店(Branch) -> 部署(Department) -> 拠点(Location) のツリー構造をナビゲート
 *    - ブレッドクラムによる階層移動
 *    - 階層に応じた追加・編集・削除
 */
export function MasterManagement() {
    // タブ切り替え状態 ('products' または 'branches')
    const [activeTab, setActiveTab] = useState<'products' | 'branches'>('products');

    // Contextからマスタ操作関数を取得
    const { products, orgUnits, addProduct, updateProduct, deleteProduct, addOrgUnit, updateOrgUnit, deleteOrgUnit, getChildren } = useMaster();

    const location = useLocation();

    // --- State: 商品編集モーダル ---
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<ProductMaster | null>(null);

    // --- State: 組織・階層ナビゲーション ---

    // 現在表示している階層の親ID (undefinedの場合はルート=支店一覧を表示)
    // このIDを変更することでドリルダウンを行います
    const [currentParentId, setCurrentParentId] = useState<string | undefined>(undefined);

    // パンくずリストのスタック管理: { id, name } の履歴を保持
    const [breadcrumbs, setBreadcrumbs] = useState<{ id: string, name: string }[]>([]);

    // --- State: 組織編集モーダル ---
    const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
    // 編集中の組織データ (新規作成時はPartialで初期化)
    const [editingOrg, setEditingOrg] = useState<Partial<OrgUnit>>({});

    /**
     * 別画面(スキャナー等)から遷移してきた場合の初期化処理
     * 未登録バーコードが渡された場合、即座に商品登録モーダルを開きます
     */
    useEffect(() => {
        const state = location.state as { newBarcode?: string } | null;
        if (state?.newBarcode) {
            setEditingProduct({
                id: '',
                name: '',
                category: 'その他',
                unit: '個',
                defaultExpirationDays: 365,
                barcodes: [state.newBarcode],
                description: '',
            } as ProductMaster);
            setIsProductModalOpen(true);
            window.history.replaceState({}, '');
        }
    }, [location.state]);

    // --- Event Handlers: 商品関連 ---

    /**
     * 新規商品登録モーダルを開く
     */
    const handleCreateProduct = () => {
        setEditingProduct(null);
        setIsProductModalOpen(true);
    };

    /**
     * 既存商品の編集モーダルを開く
     */
    const handleEditProduct = (product: ProductMaster) => {
        setEditingProduct(product);
        setIsProductModalOpen(true);
    };

    const handleSaveProduct = (product: ProductMaster) => {
        if (editingProduct && editingProduct.id) {
            updateProduct(product);
        } else {
            addProduct(product);
        }
    };

    const handleDeleteProduct = (id: string, name: string) => {
        if (confirm(`商品「${name}」を削除してもよろしいですか？\n※すでに入庫履歴がある場合、集計に影響が出る可能性があります。`)) {
            deleteProduct(id);
        }
    };

    // --- Event Handlers: 組織・拠点関連 ---

    // 現在表示すべき子要素のリストを取得
    const currentUnits = getChildren(currentParentId);

    /**
     * 階層を下に移動（ドリルダウン）します
     * Location(最下層)の場合は何もしません
     */
    const handleDrillDown = (unit: OrgUnit) => {
        if (unit.layer === 'Location') return; // Leaf node
        setCurrentParentId(unit.id);
        setBreadcrumbs(prev => [...prev, { id: unit.id, name: unit.name }]);
    };

    /**
     * パンくずリストを使って階層を上に移動します
     * @param index 移動先の階層インデックス (-1 はルート/全社に戻る)
     */
    const handleNavigateUp = (index: number) => {
        if (index === -1) {
            // Go to Root
            setCurrentParentId(undefined);
            setBreadcrumbs([]);
        } else {
            // Go to specific ancestor
            const target = breadcrumbs[index];
            setCurrentParentId(target.id);
            setBreadcrumbs(prev => prev.slice(0, index + 1));
        }
    };

    /**
     * 組織追加モーダルを開く
     * 現在の階層に応じて追加可能なレイヤーを自動設定します
     */
    const handleCreateOrg = (layer: OrgLayer) => {
        setEditingOrg({
            layer: layer,
            parentId: currentParentId,
            name: '',
            headcount: 0,
            address: '',
        });
        setIsOrgModalOpen(true);
    };

    /**
     * 組織編集モーダルを開く
     */
    const handleEditOrg = (unit: OrgUnit) => {
        setEditingOrg({ ...unit });
        setIsOrgModalOpen(true);
    };

    /**
     * 組織情報を保存（追加または更新）します
     * バリデーションもここで実行します
     */
    const handleSaveOrg = () => {
        if (!editingOrg.name) return alert('名称は必須です');
        if (editingOrg.layer === 'Location' && !editingOrg.address) return alert('拠点は住所が必須です');

        const finalUnit: OrgUnit = {
            id: editingOrg.id || `org_${Date.now()}`,
            name: editingOrg.name,
            layer: editingOrg.layer!,
            parentId: editingOrg.parentId,
            address: editingOrg.address,
            headcount: Number(editingOrg.headcount) || 0,
            // Phase 7
            location: editingOrg.location,
            bcpTargetDays: editingOrg.bcpTargetDays,
            // Phase 8
            maxCapacity: editingOrg.maxCapacity,
            emergencyContact: editingOrg.emergencyContact,
            guidelineUrl: editingOrg.guidelineUrl,
            bcpTargetPeople: editingOrg.bcpTargetPeople,
            ordinanceRequirement: editingOrg.ordinanceRequirement,
        };

        if (editingOrg.id) {
            updateOrgUnit(finalUnit);
        } else {
            addOrgUnit(finalUnit);
        }
        setIsOrgModalOpen(false);
    };

    /**
     * 組織を削除します
     */
    const handleDeleteOrg = (id: string, name: string) => {
        if (confirm(`組織「${name}」を削除しますか？\n※配下の組織も表示されなくなります。`)) {
            // In a real app we would check for children or stock references
            deleteOrgUnit(id);
        }
    };



    /**
     * 現在の階層レベルに基づいて、追加可能な組織種別（ボタン）を決定します
     * 例: Branch階層下なら -> Department または Location が追加可能
     */
    const getAddOptions = () => {
        if (!currentParentId) return ['Branch'];
        const parent = orgUnits.find(u => u.id === currentParentId);
        if (parent?.layer === 'Branch') return ['Department', 'Location'];
        if (parent?.layer === 'Department') return ['Location'];
        return [];
    };

    return (
        <div className="app">
            {/* Common Header Structure */}
            <header className="app-header">
                <div className="header-content">
                    <Link to="/" style={{ textDecoration: 'none' }}>
                        <div className="header-title" /> {/* Reusing the logo background */}
                    </Link>
                    <div className="header-actions">
                        <Link to="/" className="btn btn-secondary">← トップに戻る</Link>
                    </div>
                </div>
            </header>

            <div className="app-body">
                <main className="app-main">

                    <div className="master-tabs">
                        <button
                            className={`master-tab ${activeTab === 'products' ? 'active' : ''}`}
                            onClick={() => setActiveTab('products')}
                        >
                            📦 商品マスタ
                        </button>
                        <button
                            className={`master-tab ${activeTab === 'branches' ? 'active' : ''}`}
                            onClick={() => setActiveTab('branches')}
                        >
                            🏢 組織・拠点マスタ
                        </button>
                    </div>

                    <div className="master-content">
                        {activeTab === 'products' ? (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#111827' }}>登録済み商品一覧 <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 'normal' }}>({products.length}件)</span></h2>
                                    <button className="btn btn-primary" onClick={handleCreateProduct}>+ 新規商品登録</button>
                                </div>

                                <div className="table-wrapper">
                                    <table className="stock-table">
                                        <thead>
                                            <tr>
                                                <th>商品名</th>
                                                <th>カテゴリ</th>
                                                <th>単位</th>
                                                <th>期限(日)</th>
                                                <th>バーコード</th>
                                                <th>操作</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {products.map(p => (
                                                <tr key={p.id}>
                                                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                                                    <td><span className="badge category" style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px' }}>{p.category}</span></td>
                                                    <td>{p.unit}</td>
                                                    <td>{p.defaultExpirationDays}</td>
                                                    <td>{p.barcodes?.length > 0 ? p.barcodes[0] : '-'}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button className="btn-small" onClick={() => handleEditProduct(p)}>編集</button>
                                                            <button className="btn-small danger" onClick={() => handleDeleteProduct(p.id, p.name)}>削除</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div>
                                {/* --- Org Management Breadcrumbs --- */}
                                <div className="breadcrumb-nav">
                                    <span
                                        className={`breadcrumb-item ${!currentParentId ? 'active' : ''}`}
                                        onClick={() => handleNavigateUp(-1)}
                                    >
                                        全社
                                    </span>
                                    {breadcrumbs.map((crumb, idx) => (
                                        <div key={crumb.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span className="breadcrumb-separator">›</span>
                                            <span
                                                className={`breadcrumb-item ${idx === breadcrumbs.length - 1 ? 'active' : ''}`}
                                                onClick={() => handleNavigateUp(idx)}
                                            >
                                                {crumb.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* --- Add Buttons --- */}
                                <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
                                    {getAddOptions().map(layer => (
                                        <button key={layer} className="btn btn-primary" onClick={() => handleCreateOrg(layer as OrgLayer)}>
                                            + {layer === 'Branch' ? '支店' : layer === 'Department' ? '営業所/部署' : '拠点/倉庫'}を追加
                                        </button>
                                    ))}
                                </div>

                                {/* --- List of Current Units --- */}
                                <div className="table-wrapper">
                                    <table className="stock-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '100px' }}>種別</th>
                                                <th>名称</th>
                                                <th>人数</th>
                                                <th>住所/詳細</th>
                                                <th style={{ width: '150px' }}>操作</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentUnits.length === 0 ? (
                                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>データがありません</td></tr>
                                            ) : currentUnits.map(unit => (
                                                <tr
                                                    key={unit.id}
                                                    className={unit.layer !== 'Location' ? 'drill-cursor' : ''}
                                                    onClick={() => handleDrillDown(unit)}
                                                >
                                                    <td>
                                                        <span className={`org-badge ${unit.layer.toLowerCase()}`}>
                                                            {unit.layer === 'Branch' ? '支店' : unit.layer === 'Department' ? '営業所' : '拠点'}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontWeight: '600', color: '#111827' }}>
                                                        {unit.name}
                                                        {unit.layer !== 'Location' && <span style={{ color: '#9ca3af', marginLeft: '6px', fontSize: '0.8rem' }}>▶</span>}
                                                    </td>
                                                    <td>{unit.headcount ? `${unit.headcount}名` : <span style={{ color: '#d1d5db' }}>-</span>}</td>
                                                    <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#4b5563' }}>
                                                        {unit.address || <span style={{ color: '#d1d5db' }}>-</span>}
                                                    </td>
                                                    <td onClick={(e) => e.stopPropagation()}>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button className="btn-small" onClick={() => handleEditOrg(unit)}>編集</button>
                                                            <button className="btn-small danger" onClick={() => handleDeleteOrg(unit.id, unit.name)}>削除</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div style={{ marginTop: '0.75rem', color: '#6b7280', fontSize: '0.875rem' }}>
                                    ※ 行をクリックすると詳細階層へ移動します（拠点を除く）
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* --- Org Edit Modal --- */}
            {isOrgModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '450px', maxWidth: '90%', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>
                            {editingOrg.layer === 'Branch' ? '支店' : editingOrg.layer === 'Department' ? '営業所' : '拠点'}
                            {editingOrg.id ? '情報を編集' : 'を新規登録'}
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', fontSize: '0.9rem' }}>名称</label>
                                <input
                                    type="text"
                                    value={editingOrg.name || ''}
                                    onChange={e => setEditingOrg({ ...editingOrg, name: e.target.value })}
                                    style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                                    placeholder={editingOrg.layer === 'Branch' ? '例: 東京支店' : '例: 第一営業所'}
                                />
                            </div>

                            {editingOrg.layer !== 'Location' && (
                                <div>
                                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', fontSize: '0.9rem' }}>人数 (BCP計算用)</label>
                                    <input
                                        type="number"
                                        value={editingOrg.headcount || ''}
                                        onChange={e => setEditingOrg({ ...editingOrg, headcount: Number(e.target.value) })}
                                        style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                                    />
                                </div>
                            )}

                            {editingOrg.layer === 'Location' && (
                                <div>
                                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', fontSize: '0.9rem' }}>住所 <span style={{ color: '#ef4444' }}>*</span></label>
                                    <textarea
                                        value={editingOrg.address || ''}
                                        onChange={e => setEditingOrg({ ...editingOrg, address: e.target.value })}
                                        style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '6px', minHeight: '80px', fontFamily: 'inherit' }}
                                        placeholder="例: 大阪府大阪市..."
                                    />
                                    <p style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '0.25rem' }}>緊急時の物資輸送・フードバンク連携に使用します</p>

                                    <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem' }}>緯度 (Lat)</label>
                                            <input
                                                type="number"
                                                step="0.000001"
                                                value={editingOrg.location?.lat || ''}
                                                onChange={e => setEditingOrg({
                                                    ...editingOrg,
                                                    location: { lat: Number(e.target.value), lng: editingOrg.location?.lng || 0 }
                                                })}
                                                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db' }}
                                                placeholder="35.6895"
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem' }}>経度 (Lng)</label>
                                            <input
                                                type="number"
                                                step="0.000001"
                                                value={editingOrg.location?.lng || ''}
                                                onChange={e => setEditingOrg({
                                                    ...editingOrg,
                                                    location: { lng: Number(e.target.value), lat: editingOrg.location?.lat || 0 }
                                                })}
                                                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db' }}
                                                placeholder="139.6917"
                                            />
                                        </div>
                                    </div>

                                    {/* Phase 8: Detailed BCP Fields */}
                                    <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px dashed #e5e7eb' }}>
                                        <h4 style={{ fontSize: '0.9rem', marginBottom: '0.8rem', color: '#1f2937' }}>🛡️ BCP・緊急時情報</h4>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '1rem' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem' }}>最大収容人数 (人)</label>
                                                <input
                                                    type="number"
                                                    value={editingOrg.maxCapacity || ''}
                                                    onChange={e => setEditingOrg({ ...editingOrg, maxCapacity: Number(e.target.value) })}
                                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                                                    placeholder="例: 100"
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem' }}>緊急連絡先</label>
                                                <input
                                                    type="text"
                                                    value={editingOrg.emergencyContact || ''}
                                                    onChange={e => setEditingOrg({ ...editingOrg, emergencyContact: e.target.value })}
                                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                                                    placeholder="090-xxxx-xxxx"
                                                />
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: '1rem' }}>
                                            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem' }}>自治体ガイドラインURL</label>
                                            <input
                                                type="text"
                                                value={editingOrg.guidelineUrl || ''}
                                                onChange={e => setEditingOrg({ ...editingOrg, guidelineUrl: e.target.value })}
                                                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                                                placeholder="https://www.city.xxx..."
                                            />
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem' }}>目標備蓄人数 (BCP)</label>
                                                <input
                                                    type="number"
                                                    value={editingOrg.bcpTargetPeople || ''}
                                                    onChange={e => setEditingOrg({ ...editingOrg, bcpTargetPeople: Number(e.target.value) })}
                                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: '#fff7ed' }}
                                                    placeholder="従業員+帰宅困難者"
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem' }}>条例必要数</label>
                                                <input
                                                    type="number"
                                                    value={editingOrg.ordinanceRequirement || ''}
                                                    onChange={e => setEditingOrg({ ...editingOrg, ordinanceRequirement: Number(e.target.value) })}
                                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: '#fff7ed' }}
                                                    placeholder="マニュアル入力"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {(editingOrg.layer === 'Branch' || editingOrg.layer === 'Department') && (
                                <div>
                                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', fontSize: '0.9rem' }}>BCP目標備蓄日数</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="30"
                                        value={editingOrg.bcpTargetDays || ''}
                                        onChange={e => setEditingOrg({ ...editingOrg, bcpTargetDays: Number(e.target.value) })}
                                        style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                                        placeholder="3"
                                    />
                                    <p style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '0.25rem' }}>未入力の場合はデフォルト(3日)が適用されます</p>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                <button className="btn btn-secondary" onClick={() => setIsOrgModalOpen(false)}>キャンセル</button>
                                <button className="btn btn-primary" onClick={handleSaveOrg}>保存</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ProductEditModal
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
                product={editingProduct}
                onSave={handleSaveProduct}
            />
        </div>
    );
}
