import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMaster } from '../contexts/MasterContext';
import { calculateImpactMetrics, generateMockDonationRecords } from '../utils/sustainability';

export function ImpactDashboard() {
    const { products } = useMaster();

    // デモ用データの生成
    const donationRecords = useMemo(() => generateMockDonationRecords(), []);

    // メトリクスの計算
    const metrics = useMemo(() => {
        return calculateImpactMetrics(donationRecords, products);
    }, [donationRecords, products]);

    return (
        <div className="app">
            {/* Header - Reusing common app header style */}
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

                        {/* Title Section */}
                        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                            <h2 style={{ fontSize: '1.8rem', color: '#111827', marginBottom: '0.5rem' }}>
                                🌱 Sustainability Impact
                            </h2>
                            <p style={{ color: '#6b7280' }}>
                                防災備蓄の寄贈による社会的インパクトと、NPOからのフィードバック
                            </p>
                        </div>

                        {/* Metrics Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>

                            {/* CO2 Card */}
                            <div style={{
                                background: 'linear-gradient(135deg, #dcfce7 0%, #ffffff 100%)',
                                border: '1px solid #bbf7d0',
                                borderRadius: '16px',
                                padding: '1.5rem',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}>
                                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🌍</div>
                                <div style={{ fontSize: '0.9rem', color: '#166534', fontWeight: 'bold', textTransform: 'uppercase' }}>Net CO2 Reduction</div>
                                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#15803d' }}>
                                    {metrics.totalCo2ReductionKg}
                                    <span style={{ fontSize: '1rem', marginLeft: '4px', fontWeight: 'normal' }}>kg</span>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#166534', marginTop: '0.5rem' }}>
                                    <strong>廃棄削減:</strong> {(metrics.totalCo2ReductionKg + metrics.totalTransportCo2Kg).toFixed(2)}kg<br />
                                    <span style={{ color: '#b91c1c' }}><strong>▲ 輸送排出:</strong> {metrics.totalTransportCo2Kg}kg</span>
                                </div>
                            </div>

                            {/* Cost Saving Card */}
                            <div style={{
                                background: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 100%)',
                                border: '1px solid #fed7aa',
                                borderRadius: '16px',
                                padding: '1.5rem',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}>
                                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💰</div>
                                <div style={{ fontSize: '0.9rem', color: '#9a3412', fontWeight: 'bold', textTransform: 'uppercase' }}>Cost Saved</div>
                                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#c2410c' }}>
                                    ¥{metrics.totalCostSavingYen.toLocaleString()}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#9a3412', marginTop: '0.5rem' }}>
                                    廃棄処分委託費用の削減総額
                                </div>
                            </div>

                            {/* Weight Card */}
                            <div style={{
                                background: 'linear-gradient(135deg, #f3f4f6 0%, #ffffff 100%)',
                                border: '1px solid #e5e7eb',
                                borderRadius: '16px',
                                padding: '1.5rem',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}>
                                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚖️</div>
                                <div style={{ fontSize: '0.9rem', color: '#374151', fontWeight: 'bold', textTransform: 'uppercase' }}>Food Loss Reduced</div>
                                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#4b5563' }}>
                                    {metrics.totalWeightKg}
                                    <span style={{ fontSize: '1rem', marginLeft: '4px', fontWeight: 'normal' }}>kg</span>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#374151', marginTop: '0.5rem' }}>
                                    救済された食品の総重量
                                </div>
                            </div>
                        </div>

                        {/* Recent Feedback Section */}
                        <div style={{ marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.25rem', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                💌 Recent Feedback <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 'normal' }}>寄贈先からのメッセージ</span>
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {donationRecords.map(record => (
                                    <div key={record.id} style={{
                                        backgroundColor: 'white',
                                        borderRadius: '12px',
                                        padding: '1.5rem',
                                        border: '1px solid #f3f4f6',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                        display: 'flex',
                                        gap: '1.5rem'
                                    }}>
                                        {/* Left: Date & Recipient */}
                                        <div style={{ minWidth: '180px', borderRight: '1px solid #f3f4f6', paddingRight: '1rem' }}>
                                            <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '4px' }}>{record.date}</div>
                                            <div style={{ fontWeight: 'bold', color: '#4b5563' }}>{record.recipientName}</div>
                                            <div style={{ marginTop: '0.8rem' }}>
                                                {record.items.map((item, idx) => (
                                                    <div key={idx} style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '2px' }}>
                                                        ・{item.productName} × {item.quantity}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Right: Message & Impact Badge */}
                                        <div style={{ flex: 1 }}>
                                            <div style={{
                                                backgroundColor: '#f9fafb',
                                                padding: '1rem',
                                                borderRadius: '8px',
                                                position: 'relative',
                                                marginBottom: '1rem'
                                            }}>
                                                <div style={{ position: 'absolute', top: '-8px', left: '20px', width: '16px', height: '16px', backgroundColor: '#f9fafb', transform: 'rotate(45deg)' }}></div>
                                                <p style={{ margin: 0, color: '#374151', fontStyle: 'italic', lineHeight: '1.6' }}>
                                                    "{record.feedback}"
                                                </p>
                                            </div>

                                            <div style={{ display: 'flex', gap: '1rem' }}>
                                                {record.co2ReductionKg && (
                                                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#166534' }}>
                                                        🌱 CO2削減: {record.co2ReductionKg}kg
                                                    </span>
                                                )}
                                                {record.costSavingYen && (
                                                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#fff7ed', color: '#9a3412' }}>
                                                        💰 コスト削減: ¥{record.costSavingYen.toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
}
