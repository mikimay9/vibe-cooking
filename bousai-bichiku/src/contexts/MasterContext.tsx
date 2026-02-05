
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ProductMaster, BranchMaster, OrgUnit } from '../types/master';
import { defaultBranchConfig } from '../data/branchConfig';

// --- Types ---

interface MasterContextType {
    products: ProductMaster[];

    // Phase 6: Flattened list of all units (Branches, Depts, Locations)
    orgUnits: OrgUnit[];

    // Legacy support alias (returns only items with layer='Branch')
    branches: BranchMaster[];

    addProduct: (product: ProductMaster) => void;
    updateProduct: (product: ProductMaster) => void;
    deleteProduct: (id: string) => void;

    // Org Unit Management
    addOrgUnit: (unit: OrgUnit) => void;
    updateOrgUnit: (unit: OrgUnit) => void;
    deleteOrgUnit: (id: string) => void;

    // Helper to get children
    getChildren: (parentId?: string) => OrgUnit[];
}

// --- Default/Initial Data ---
const initialContext: MasterContextType = {
    products: [],
    orgUnits: [],
    branches: [],
    addProduct: () => { },
    updateProduct: () => { },
    deleteProduct: () => { },
    addOrgUnit: () => { },
    updateOrgUnit: () => { },
    deleteOrgUnit: () => { },
    getChildren: () => [],
};

// --- Context Definition ---
const MasterContext = createContext<MasterContextType>(initialContext);

// --- Provider Component ---

/**
 * MasterContext
 * 
 * アプリケーション全体のマスタデータを管理するコンテキストプロバイダーです。
 * 商品情報 (ProductMaster) と 組織構造 (OrgUnit) の状態管理を行います。
 * 
 * 主な機能:
 * 1. 商品マスタのCRUD操作 (追加・更新・削除)
 * 2. 組織・拠点マスタの階層構造管理
 * 3. データの永続化 (localStorage)
 */
export const MasterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // --- State: 商品マスタ ---
    // アプリケーション全体で利用可能な商品のリスト
    const [products, setProducts] = useState<ProductMaster[]>([]);

    // --- State: 組織・拠点マスタ ---
    // 支店・部門・拠点を含む階層データ
    // フラットな配列として保持し `parentId` で階層関係を定義しています
    const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);

    // 初期化：既存データからマスタを抽出してセットする
    useEffect(() => {
        // 1. Products Initialization
        // 初回ロード時にサンプルデータやマイグレーションを実行します
        if (products.length === 0) {
            const savedDetails = localStorage.getItem('product_master_v1');
            if (savedDetails) {
                setProducts(JSON.parse(savedDetails));
            } else {
                import('../data/sampleData').then(({ sampleStockItems }) => {
                    import('../utils/migration').then(({ migrateFromStockItems }) => {
                        const { products: initialProducts } = migrateFromStockItems(sampleStockItems);
                        setProducts(initialProducts);
                    });
                });
            }
        }

        // 2. OrgUnits Initialization (Migrate from defaultBranchConfig)
        if (orgUnits.length === 0) {
            const savedOrgs = localStorage.getItem('org_master_v1');
            if (savedOrgs) {
                setOrgUnits(JSON.parse(savedOrgs));
            } else {
                // 初回は既存の branchConfig からデータを生成
                const initialUnits: OrgUnit[] = [];

                Object.values(defaultBranchConfig).forEach(cfg => {
                    // Create Branch Unit
                    initialUnits.push({
                        id: cfg.id,
                        name: cfg.name,
                        layer: 'Branch',
                        headcount: cfg.headcount,
                    });

                    // Create Location Units
                    cfg.storageLocations.forEach((locName, idx) => {
                        initialUnits.push({
                            id: `${cfg.id}_loc_${idx}`,
                            name: locName,
                            layer: 'Location',
                            parentId: cfg.id,
                            address: '',
                        });
                    });
                });
                setOrgUnits(initialUnits);
            }
        }
    }, []);

    /**
     * データの変更があるたびに localStorage に自動保存します
     */
    useEffect(() => {
        if (products.length > 0) {
            localStorage.setItem('product_master_v1', JSON.stringify(products));
        }
    }, [products]);

    useEffect(() => {
        if (orgUnits.length > 0) {
            localStorage.setItem('org_master_v1', JSON.stringify(orgUnits));
        }
    }, [orgUnits]);

    // --- Actions: 商品関連 ---

    /**
     * 新しい商品をマスタに追加します
     * @param product 追加する商品データ
     */
    const addProduct = (product: ProductMaster) => {
        setProducts(prev => [...prev, product]);
    };

    /**
     * 既存の商品情報を更新します
     * @param product 更新内容を含む商品データ (IDの一致するものを更新)
     */
    const updateProduct = (product: ProductMaster) => {
        setProducts(prev => prev.map(p => p.id === product.id ? product : p));
    };

    /**
     * 商品を削除します
     * @param id 削除対象の商品ID
     */
    const deleteProduct = (id: string) => {
        setProducts(prev => prev.filter(p => p.id !== id));
    };

    // --- OrgUnit CRUD ---

    /**
     * 新しい組織・拠点を追加します
     * @param unit 追加する組織データ
     */
    const addOrgUnit = (unit: OrgUnit) => {
        setOrgUnits(prev => [...prev, unit]);
    };

    /**
     * 組織・拠点情報を更新します
     */
    const updateOrgUnit = (unit: OrgUnit) => {
        setOrgUnits(prev => prev.map(u => u.id === unit.id ? unit : u));
    };

    /**
     * 組織・拠点を削除します
     * 注意: 本来は子要素を持つ親を削除する場合の警告などが必要ですが、現在は単純削除です。
     */
    const deleteOrgUnit = (id: string) => {
        // Cascade delete implementation could go here, but strictly deleting simple node for now
        setOrgUnits(prev => prev.filter(u => u.id !== id && u.parentId !== id));
    };

    /**
     * 指定された親IDを持つ子要素のリストを取得します
     * ツリー構造をナビゲートするために使用されます
     * @param parentId 親組織のID (ルート要素を取得する場合はundefined)
     * @returns 指定された親に属する組織のリスト
     */
    const getChildren = (parentId?: string) => {
        return orgUnits.filter(u => u.parentId === parentId || (!parentId && !u.parentId));
    };

    // Derived state for legacy compatibility
    const branches = orgUnits.filter(u => u.layer === 'Branch');

    const value = {
        products,
        orgUnits,
        branches,
        addProduct,
        updateProduct,
        deleteProduct,
        addOrgUnit,
        updateOrgUnit,
        deleteOrgUnit,
        getChildren,
    };

    return (
        <MasterContext.Provider value={value}>
            {children}
        </MasterContext.Provider>
    );
};

// --- Custom Hook ---
export const useMaster = () => {
    const context = useContext(MasterContext);
    if (context === undefined) {
        throw new Error('useMaster must be used within a MasterProvider');
    }
    return context;
};
