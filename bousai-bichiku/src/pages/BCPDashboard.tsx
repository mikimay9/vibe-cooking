import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMaster } from '../contexts/MasterContext';
import { calculateBCPStatus } from '../utils/bcpCalculations';
import { StockItem } from '../types';
// Temporarily import sample items if context items are empty (for dev preview robustness)
import { sampleStockItems } from '../data/sampleData';

// We need stock items from somewhere. 
// Ideally passed from App.tsx or a StockContext. 
// master-management is separate. 
// For now, I will assume we can get items from a prop or use sampleData if we don't have a global stock context yet.
// Wait, App.tsx holds 'items'. I should probably move 'items' to a Context or accept it here.
// But 'pages' usually don't accept props from Router directly easily without wrapper.
// Refactor: Let's assume for this Phase 7 demo, we might need a workaround to access 'items'.
// Option A: Pass items via Context (Best practice).
// Option B: Local state fallback (Good for independent page dev).
// Option C: Lift state up to a common Context.

// Since I cannot change the extensive App.tsx structure to add a full StockContext easily in one go without risk,
// I will access `localStorage` 'stock_items' if available (App.tsx might save it?), 
// OR simply Import 'items' if I refactor App.tsx to use context.
// Actually, App.tsx has `items` state. 
// I will make `BCPDashboard` accept `items` as a prop, and update `App.tsx` allows passing it.
// Route element={<BCPDashboard items={items} />} works fine.

interface BCPDashboardProps {
    items: StockItem[];
}

export function BCPDashboard({ items }: BCPDashboardProps) {
    const { orgUnits, products } = useMaster();

    // Use passed items or fallback to sample
    const stockItems = items && items.length > 0 ? items : sampleStockItems;

    const statuses = useMemo(() => {
        return calculateBCPStatus(orgUnits, stockItems, products);
    }, [orgUnits, stockItems, products]);

    return (
        <div className="app">
            <header className="app-header">
                <div className="header-content">
                    <Link to="/" style={{ textDecoration: 'none' }}>
                        <div className="header-title" />
                    </Link>
                    <div className="header-actions">
                        <Link to="/" className="btn btn-secondary">← トップに戻る</Link>
                    </div>
                </div>
            </header>

            <div className="app-body">
                <main className="app-main">
                    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

                        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                            <h2 style={{ fontSize: '1.8rem', color: '#111827', marginBottom: '0.5rem' }}>
                                🛡️ BCP Sufficiency Dashboard
                            </h2>
                            <p style={{ color: '#6b7280' }}>
                                災害時事業継続計画(BCP)に基づく備蓄充足状況
                            </p>
                        </div>

                        {statuses.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                                <p>対象となる拠点情報（人数設定）がありません。「マスタ管理」で拠点の人数を設定してください。</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: '2rem' }}>
                                {statuses.map(status => (
                                    <div key={status.orgUnitId} style={{
                                        backgroundColor: 'white',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            backgroundColor: '#f3f4f6',
                                            padding: '1rem 1.5rem',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            borderBottom: '1px solid #e5e7eb'
                                        }}>
                                            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1f2937' }}>
                                                🏢 {status.orgUnitName}
                                            </h3>
                                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: '#6b7280' }}>
                                                <span>👥 {status.headcount}名</span>
                                                <span>🗓️ {status.requiredDays}日分</span>
                                            </div>
                                        </div>

                                        <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                                            {/* Water Section */}
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                    <span style={{ fontWeight: 'bold', color: '#0369a1' }}>💧 飲料水</span>
                                                    <span style={{ fontSize: '0.9rem' }}>
                                                        {status.currentWaterLiters.toFixed(1)} / {status.targetWaterLiters} L
                                                    </span>
                                                </div>
                                                {/* Progress Bar */}
                                                <div style={{ height: '24px', backgroundColor: '#e0f2fe', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
                                                    <div style={{
                                                        width: `${Math.min(status.waterSufficiencyRate, 100)}%`,
                                                        height: '100%',
                                                        backgroundColor: getRateColor(status.waterSufficiencyRate, 'water'),
                                                        transition: 'width 0.5s ease-out'
                                                    }}></div>
                                                    <div style={{
                                                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '0.8rem', fontWeight: 'bold', color: status.waterSufficiencyRate > 50 ? 'white' : '#0369a1',
                                                        textShadow: status.waterSufficiencyRate > 50 ? '0 1px 2px rgba(0,0,0,0.2)' : 'none'
                                                    }}>
                                                        {status.waterSufficiencyRate}%
                                                    </div>
                                                </div>
                                                <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem' }}>
                                                    ※ 1人1日3L × {status.requiredDays}日 = {status.targetWaterLiters}L 必要
                                                </p>
                                            </div>

                                            {/* Food Section */}
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                    <span style={{ fontWeight: 'bold', color: '#b45309' }}>🍱 食料 (主食・缶詰)</span>
                                                    <span style={{ fontSize: '0.9rem' }}>
                                                        {status.currentFoodMeals} / {status.targetFoodMeals} 食
                                                    </span>
                                                </div>
                                                {/* Progress Bar */}
                                                <div style={{ height: '24px', backgroundColor: '#fef3c7', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
                                                    <div style={{
                                                        width: `${Math.min(status.foodSufficiencyRate, 100)}%`,
                                                        height: '100%',
                                                        backgroundColor: getRateColor(status.foodSufficiencyRate, 'food'),
                                                        transition: 'width 0.5s ease-out'
                                                    }}></div>
                                                    <div style={{
                                                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '0.8rem', fontWeight: 'bold', color: status.foodSufficiencyRate > 50 ? 'white' : '#b45309',
                                                        textShadow: status.foodSufficiencyRate > 50 ? '0 1px 2px rgba(0,0,0,0.2)' : 'none'
                                                    }}>
                                                        {status.foodSufficiencyRate}%
                                                    </div>
                                                </div>
                                                <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem' }}>
                                                    ※ 1人1日3食 × {status.requiredDays}日 = {status.targetFoodMeals}食 必要
                                                </p>
                                            </div>

                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                    </div>
                </main>
            </div>
        </div>
    );
}

function getRateColor(rate: number, _type: 'water' | 'food'): string {
    if (rate >= 100) return '#22c55e'; // Green 500
    if (rate >= 80) return '#84cc16';  // Lime 500
    if (rate >= 50) return '#eab308';  // Yellow 500
    if (rate >= 30) return '#f97316';  // Orange 500
    return '#ef4444';                  // Red 500
}
