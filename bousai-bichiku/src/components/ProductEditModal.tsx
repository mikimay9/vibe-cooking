import { useState, useEffect } from 'react';
import { ProductMaster } from '../types/master';
import { FoodCategory } from '../types';
import { predictProductFromBarcode } from '../utils/gemini';

interface ProductEditModalProps {
    product?: ProductMaster | null; // null means "Create New" mode if isOpen is true
    isOpen: boolean;
    onClose: () => void;
    onSave: (product: ProductMaster) => void;
}

const CATEGORIES: FoodCategory[] = [
    '水・飲料',
    '主食（米・パン）',
    '缶詰・レトルト',
    'お菓子・栄養補助',
    '調味料',
    'その他',
];

/**
 * 商品編集・新規登録モーダル
 * 
 * 商品マスタの作成および編集を行うためのモーダルコンポーネントです。
 * 
 * 主な機能:
 * 1. 基本情報の入力 (商品名, カテゴリ, JANコード等)
 * 2. サステナビリティ指標の入力 (重量, CO2, 廃棄コスト)
 * 3. AIによるバーコード商品名推論 (Gemini)
 */
export function ProductEditModal({ product, isOpen, onClose, onSave }: ProductEditModalProps) {
    // フォームの状態管理
    // 編集中はここに入力値が保持され、保存時にProductMaster型として親に渡されます
    const [formData, setFormData] = useState<Partial<ProductMaster>>({
        name: '',
        category: 'その他',
        unit: '個',
        defaultExpirationDays: 365,
        barcodes: [],
        description: '',
        dailyRequirementPerPerson: undefined,
        weightKg: undefined,
        co2PerUnit: undefined,
        disposalCost: undefined,
        contentPerUnit: undefined,
        contentUnit: undefined,
    });

    // バーコード入力用の一次状態 (Enterキーで確定するため)
    const [barcodeInput, setBarcodeInput] = useState('');

    // AI推論中のローディング状態
    const [isPredicting, setIsPredicting] = useState(false);

    /**
     * モーダルが開かれたとき、または編集対象の商品が変わったときにフォームを初期化します
     * productがnullの場合は新規作成モードとして空の状態にします
     */
    useEffect(() => {
        if (isOpen) {
            if (product) {
                setFormData({ ...product });
            } else {
                setFormData({
                    name: '',
                    category: 'その他',
                    unit: '個',
                    defaultExpirationDays: 365,
                    barcodes: [],
                    description: '',
                    dailyRequirementPerPerson: undefined,
                    weightKg: undefined,
                    co2PerUnit: undefined,
                    disposalCost: undefined,
                    contentPerUnit: undefined,
                    contentUnit: undefined,
                });
            }
            setBarcodeInput('');
        }
    }, [isOpen, product]);

    if (!isOpen) return null;

    /**
     * Gemini AIを使用してバーコードから商品情報を推論します
     */
    const handleAiPredict = async () => {
        const barcode = formData.barcodes?.[0];
        if (!barcode) {
            alert('バーコードが入力されていません。');
            return;
        }

        setIsPredicting(true);
        try {
            const prediction = await predictProductFromBarcode(barcode);
            if (prediction) {
                setFormData(prev => ({
                    ...prev,
                    name: prediction.name,
                    category: prediction.category,
                    unit: prediction.unit || prev.unit,
                }));
            } else {
                alert('商品情報を推論できませんでした。');
            }
        } finally {
            setIsPredicting(false);
        }
    };

    /**
     * バーコードを追加します
     * 重複チェックを行い、Enterキーまたは追加ボタンでリストに追加します
     */
    const handleAddBarcode = () => {
        if (barcodeInput && !formData.barcodes?.includes(barcodeInput)) {
            setFormData({
                ...formData,
                barcodes: [...(formData.barcodes || []), barcodeInput]
            });
            setBarcodeInput('');
        }
    };

    /**
     * 登録済みバーコードを削除します
     */
    const handleRemoveBarcode = (code: string) => {
        setFormData({
            ...formData,
            barcodes: formData.barcodes?.filter(c => c !== code)
        });
    };

    /**
     * 保存ボタン押下時の処理
     * 必須チェックを行い、onSaveコールバックを実行します
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Validate required fields
        if (!formData.name || !formData.category || !formData.unit) {
            alert('必須項目を入力してください');
            return;
        }

        const finalProduct: ProductMaster = {
            id: product?.id || `prod_${Date.now()}`, // IDがない場合は新規生成
            name: formData.name,
            category: formData.category as FoodCategory,
            unit: formData.unit,
            defaultExpirationDays: Number(formData.defaultExpirationDays) || 365,
            barcodes: formData.barcodes || [],
            description: formData.description || '',
            dailyRequirementPerPerson: formData.dailyRequirementPerPerson,
            // Phase 7: Sustainability fields
            weightKg: formData.weightKg,
            co2PerUnit: formData.co2PerUnit,
            disposalCost: formData.disposalCost,
            // Phase 7: BCP fields
            contentPerUnit: formData.contentPerUnit,
            contentUnit: formData.contentUnit,
        };

        onSave(finalProduct);
        onClose();
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '600px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#111827' }}>
                    {product ? '商品マスタ編集' : '新規商品登録'}
                </h2>

                {/* AI推論ボタン (バーコードがある場合のみ表示) */}
                {formData.barcodes && formData.barcodes.length > 0 && (
                    <div style={{ marginBottom: '1rem', padding: '0.8rem', backgroundColor: '#eef6fc', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <strong>🤖 Gemini AI アシスタント</strong>
                            <div style={{ fontSize: '0.85rem', color: '#555' }}>入力されたバーコード ({formData.barcodes[0]}) から商品情報を自動推測します</div>
                        </div>
                        <button
                            type="button"
                            onClick={handleAiPredict}
                            disabled={isPredicting}
                            style={{
                                backgroundColor: '#673ab7', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: isPredicting ? 'wait' : 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem'
                            }}
                        >
                            {isPredicting ? '推論中...' : '✨ 自動入力'}
                        </button>
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>商品名 <span style={{ color: 'red' }}>*</span></label>
                        <input
                            type="text"
                            value={formData.name || ''}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                            placeholder="例: ミネラルウォーター 2L"
                            required
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>カテゴリ <span style={{ color: 'red' }}>*</span></label>
                            <select
                                value={formData.category || 'その他'}
                                onChange={e => setFormData({ ...formData, category: e.target.value as FoodCategory })}
                                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                            >
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>単位 <span style={{ color: 'red' }}>*</span></label>
                            <input
                                type="text"
                                value={formData.unit || ''}
                                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                                placeholder="例: 本, 箱, 袋"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>標準賞味期限 (日)</label>
                        <input
                            type="number"
                            value={formData.defaultExpirationDays || ''}
                            onChange={e => setFormData({ ...formData, defaultExpirationDays: Number(e.target.value) })}
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                        />
                        <small style={{ color: '#666' }}>※在庫追加時のデフォルト値になります</small>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>バーコード (Janコード)</label>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <input
                                type="text"
                                value={barcodeInput}
                                onChange={e => setBarcodeInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddBarcode();
                                    }
                                }}
                                style={{ flex: 1, padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                                placeholder="スキャンまたは入力してEnter"
                            />
                            <button type="button" onClick={handleAddBarcode} className="btn-secondary">追加</button>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {formData.barcodes?.map(code => (
                                <span key={code} style={{
                                    backgroundColor: '#e5e7eb', padding: '2px 8px', borderRadius: '12px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px'
                                }}>
                                    {code}
                                    <button type="button" onClick={() => handleRemoveBarcode(code)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#666' }}>×</button>
                                </span>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>説明・備考</label>
                        <textarea
                            value={formData.description || ''}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', minHeight: '80px' }}
                        />
                    </div>

                    {/* Phase 7: Sustainability & BCP Section */}
                    <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.95rem', color: '#374151' }}>🌱 サステナビリティ・BCP指標 (任意)</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>重量 (kg/単位)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.weightKg || ''}
                                    onChange={e => setFormData({ ...formData, weightKg: Number(e.target.value) })}
                                    style={{ width: '100%', padding: '0.4rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                                    placeholder="0.5"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>CO2排出 (kg)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.co2PerUnit || ''}
                                    onChange={e => setFormData({ ...formData, co2PerUnit: Number(e.target.value) })}
                                    style={{ width: '100%', padding: '0.4rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                                    placeholder="0.1"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>廃棄コスト(円)</label>
                                <input
                                    type="number"
                                    value={formData.disposalCost || ''}
                                    onChange={e => setFormData({ ...formData, disposalCost: Number(e.target.value) })}
                                    style={{ width: '100%', padding: '0.4rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                                    placeholder="100"
                                />
                            </div>
                        </div>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                            ※ 寄贈時のCO2削減量や、廃棄削減額の計算に使用されます。
                        </div>
                    </div>

                    {/* Phase 7: BCP Spec Section */}
                    <div style={{ backgroundColor: '#fff7ed', padding: '1rem', borderRadius: '8px', border: '1px solid #ffedd5', marginTop: '0.5rem' }}>
                        <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.95rem', color: '#9a3412' }}>📊 BCP 充足率計算用 (任意)</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>内容量 (数値)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formData.contentPerUnit || ''}
                                    onChange={e => setFormData({ ...formData, contentPerUnit: Number(e.target.value) })}
                                    style={{ width: '100%', padding: '0.4rem', border: '1px solid #fed7aa', borderRadius: '4px' }}
                                    placeholder="2.0"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>単位</label>
                                <input
                                    type="text"
                                    value={formData.contentUnit || ''}
                                    onChange={e => setFormData({ ...formData, contentUnit: e.target.value })}
                                    style={{ width: '100%', padding: '0.4rem', border: '1px solid #fed7aa', borderRadius: '4px' }}
                                    placeholder="L, 食, g..."
                                />
                            </div>
                        </div>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#9a3412' }}>
                            ※ 「水: 3L/日」「食料: 3食/日」などの必要量計算に使用されます。未入力の場合は個数ベースで計算されます。
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '0.8rem 1.5rem',
                                border: '1px solid #ccc',
                                background: 'white',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            style={{
                                padding: '0.8rem 1.5rem',
                                border: 'none',
                                background: '#007bff',
                                color: 'white',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            保存する
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
