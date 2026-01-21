import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const GestionPuntos = () => {
    const [loyaltyAccounts, setLoyaltyAccounts] = useState([]);
    const [rewardRules, setRewardRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [isRedeeming, setIsRedeeming] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [accountsRes, rewardsRes] = await Promise.all([
                api.get('/api/loyalty/accounts/', { baseURL: '/api/luxe' }),
                api.get('/api/loyalty/config/reward-rules/', { baseURL: '/api/luxe' })
            ]);
            setLoyaltyAccounts(accountsRes.data.results || accountsRes.data);
            setRewardRules(rewardsRes.data.results || rewardsRes.data);
        } catch (error) {
            console.error("Error loading loyalty data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = async (id) => {
        try {
            const res = await api.get(`/api/loyalty/accounts/${id}/`, { baseURL: '/api/luxe' });
            setSelectedAccount(res.data);
        } catch (error) {
            alert("Error cargando detalles del cliente");
        }
    };

    const handleRedeem = async (rewardId) => {
        if (!selectedAccount) return;
        const reward = rewardRules.find(r => r.id === rewardId);
        if (!reward) return;

        if (!window.confirm(`¿Seguro que deseas canjear ${reward.points_cost} puntos por "${reward.name}"?`)) return;

        try {
            setIsRedeeming(true);
            await api.post('/api/loyalty/accounts/redeem_reward/', {
                reward_rule_id: rewardId,
                customer_id: selectedAccount.customer
            }, { baseURL: '/api/luxe' });

            alert("¡Recompensa canjeada con éxito!");

            // Recargar detalles de la cuenta y la lista general
            const res = await api.get(`/api/loyalty/accounts/${selectedAccount.id}/`, { baseURL: '/api/luxe' });
            setSelectedAccount(res.data);
            loadData();
        } catch (error) {
            console.error("Error al canjear:", error);
            const errorMsg = error.response?.data?.error || "Error al procesar el canje";
            alert(errorMsg);
        } finally {
            setIsRedeeming(false);
        }
    };

    const handleReprocess = async () => {
        if (!window.confirm("¡ATENCIÓN! Esto ELIMINARÁ todos los puntos actuales por compras y los RECALCULARÁ desde cero basados en el historial de facturas. ¿Deseas continuar?")) return;
        try {
            setLoading(true);
            const res = await api.post('/api/loyalty/config/earning-rules/reprocess_past_orders/', {}, { baseURL: '/api/luxe' });
            alert(`Sincronización Exitosa:\n- Órdenes procesadas: ${res.data.orders_processed}\n- Cuentas actualizadas: ${res.data.accounts_updated}`);
            loadData();
        } catch (error) {
            console.error("Error al reprocesar:", error);
            alert("Error al sincronizar puntos.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-4">Cargando saldos de clientes...</div>;

    return (
        <div className="page-container" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#1e293b' }}>
                Gestión de Puntos de Clientes
            </h1>

            <section style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#334155' }}>Saldos y Recompensas</h2>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handleReprocess} style={{ padding: '8px 16px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>⚡ Sincronizar Puntos</button>
                        <button onClick={loadData} style={{ padding: '8px 16px', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Actualizar</button>
                    </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9', color: '#64748b' }}>
                            <th style={{ padding: '12px 10px' }}>Cliente / Cédula</th>
                            <th style={{ padding: '12px 10px' }}>Puntos Actuales</th>
                            <th style={{ padding: '12px 10px' }}>Total Histórico</th>
                            <th style={{ padding: '12px 10px' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loyaltyAccounts.map(acc => (
                            <tr key={acc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '15px 10px' }}>
                                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{acc.customer_name}</div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>ID: {acc.customer_cedula || 'N/A'}</div>
                                </td>
                                <td style={{ padding: '15px 10px' }}>
                                    <span style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '16px' }}>{acc.points_balance}</span>
                                    <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '4px' }}>pts</span>
                                </td>
                                <td style={{ padding: '15px 10px', color: '#475569' }}>{acc.total_points_earned} pts</td>
                                <td style={{ padding: '15px 10px' }}>
                                    <button
                                        onClick={() => handleViewDetail(acc.id)}
                                        style={{
                                            backgroundColor: '#10b981',
                                            color: 'white',
                                            border: 'none',
                                            padding: '8px 16px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            fontSize: '13px',
                                            transition: 'background-color 0.2s'
                                        }}
                                        onMouseOver={(e) => e.target.style.backgroundColor = '#059669'}
                                        onMouseOut={(e) => e.target.style.backgroundColor = '#10b981'}
                                    >
                                        Ver Historial y Cupones
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {loyaltyAccounts.length === 0 && (
                            <tr>
                                <td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                                    No se encontraron cuentas de puntos activas.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </section>

            {/* DETAIL MODAL */}
            {selectedAccount && (
                <div style={modalOverlayStyle}>
                    <div style={{ ...modalStyle, width: '850px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '15px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '20px' }}>{selectedAccount.customer_name}</h3>
                                <div style={{ fontSize: '14px', color: '#64748b' }}>Cédula: {selectedAccount.customer_cedula || 'N/A'}</div>
                            </div>
                            <button onClick={() => setSelectedAccount(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>×</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '30px' }}>
                            {/* Left Side: Redeeming and Coupons */}
                            <div>
                                {/* AVAILABLE TO REDEEM */}
                                <div style={{ marginBottom: '25px' }}>
                                    <h4 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                                        <span style={{ fontSize: '18px' }}>🎁</span> Recompensas Disponibles para Canjear
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        {rewardRules.filter(r => r.is_active && selectedAccount.points_balance >= r.points_cost).map(reward => (
                                            <div key={reward.id} style={{
                                                padding: '12px',
                                                border: '2px solid #3b82f6',
                                                backgroundColor: '#eff6ff',
                                                borderRadius: '10px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between'
                                            }}>
                                                <div>
                                                    <div style={{ fontWeight: 'bold', color: '#1e40af', fontSize: '14px' }}>{reward.name}</div>
                                                    <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 'bold' }}>Costo: {reward.points_cost} pts</div>
                                                </div>
                                                <button
                                                    disabled={isRedeeming}
                                                    onClick={() => handleRedeem(reward.id)}
                                                    style={{
                                                        marginTop: '8px',
                                                        backgroundColor: '#3b82f6',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        cursor: isRedeeming ? 'not-allowed' : 'pointer',
                                                        fontSize: '12px',
                                                        fontWeight: 'bold'
                                                    }}
                                                >
                                                    {isRedeeming ? 'Procesando...' : 'Canjear Ahora'}
                                                </button>
                                            </div>
                                        ))}
                                        {rewardRules.filter(r => r.is_active && selectedAccount.points_balance >= r.points_cost).length === 0 && (
                                            <div style={{ gridColumn: 'span 2', padding: '15px', textAlign: 'center', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '1px dashed #cbd5e1', fontSize: '13px', color: '#64748b' }}>
                                                Puntos insuficientes para canjear nuevas recompensas.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* GENERATED COUPONS */}
                                <h4 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                                    <span style={{ fontSize: '18px' }}>🎟️</span> Mis Cupones Generados
                                </h4>
                                {selectedAccount.coupons && selectedAccount.coupons.length > 0 ? (
                                    <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '10px' }}>
                                        {selectedAccount.coupons.map(coupon => (
                                            <div key={coupon.id} style={{
                                                padding: '15px',
                                                border: coupon.is_used ? '1px solid #e2e8f0' : '1px solid #dcfce7',
                                                backgroundColor: coupon.is_used ? '#f8fafc' : '#f0fdf4',
                                                borderRadius: '8px',
                                                marginBottom: '12px',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}>
                                                {!coupon.is_used && <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: '#10b981' }}></div>}
                                                <div style={{ fontWeight: 'bold', color: coupon.is_used ? '#64748b' : '#166534', fontSize: '15px' }}>
                                                    {coupon.reward_name}
                                                    {coupon.is_used && <span style={{ marginLeft: '10px', fontSize: '10px', backgroundColor: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '10px', verticalAlign: 'middle' }}>USADO</span>}
                                                </div>
                                                <div style={{
                                                    fontSize: '20px',
                                                    fontFamily: 'monospace',
                                                    margin: '10px 0',
                                                    letterSpacing: '2px',
                                                    color: coupon.is_used ? '#94a3b8' : '#0f172a',
                                                    textDecoration: coupon.is_used ? 'line-through' : 'none',
                                                    backgroundColor: coupon.is_used ? 'transparent' : '#fff',
                                                    padding: '5px',
                                                    textAlign: 'center',
                                                    borderRadius: '4px',
                                                    border: coupon.is_used ? 'none' : '1px dashed #10b981'
                                                }}>
                                                    {coupon.code}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>{coupon.reward_type === 'PERCENTAGE' ? `${coupon.discount_value}% de descuento` : `$${coupon.discount_value} de descuento`}</span>
                                                    <span>{new Date(coupon.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #e2e8f0' }}>
                                        <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>Aún no has canjeado tus puntos.</p>
                                    </div>
                                )}
                            </div>

                            {/* Transactions Section */}
                            <div>
                                <h4 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ width: '8px', height: '8px', backgroundColor: '#3b82f6', borderRadius: '50%' }}></span>
                                    Historial de Puntos
                                </h4>
                                <div style={{ maxHeight: '450px', overflowY: 'auto' }}>
                                    <table style={{ width: '100%', fontSize: '13px' }}>
                                        <thead>
                                            <tr style={{ textAlign: 'left', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>
                                                <th style={{ paddingBottom: '10px' }}>Fecha</th>
                                                <th style={{ paddingBottom: '10px' }}>Concepto</th>
                                                <th style={{ paddingBottom: '10px', textAlign: 'right' }}>Puntos</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedAccount.transactions && selectedAccount.transactions.map(tx => (
                                                <tr key={tx.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                                    <td style={{ padding: '12px 0', color: '#64748b' }}>{new Date(tx.created_at).toLocaleDateString()}</td>
                                                    <td style={{ padding: '12px 0' }}>
                                                        <div style={{ fontWeight: '500' }}>{tx.description}</div>
                                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{tx.transaction_type}</div>
                                                    </td>
                                                    <td style={{
                                                        padding: '12px 0',
                                                        textAlign: 'right',
                                                        color: tx.points > 0 ? '#059669' : '#dc2626',
                                                        fontWeight: 'bold',
                                                        fontSize: '15px'
                                                    }}>
                                                        {tx.points > 0 ? `+${tx.points}` : tx.points}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '30px', textAlign: 'right', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                            <button
                                onClick={() => setSelectedAccount(null)}
                                style={{
                                    padding: '10px 24px',
                                    backgroundColor: '#0f172a',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                Cerrar Detalle
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Styles helpers
const modalOverlayStyle = {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
    backdropFilter: 'blur(2px)'
};

const modalStyle = {
    backgroundColor: 'white', padding: '30px', borderRadius: '12px',
    maxWidth: '95%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
};

export default GestionPuntos;
