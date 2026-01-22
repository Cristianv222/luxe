import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './Loyalty.css';

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
        if (!window.confirm("¡ATENCIÓN! Esto ELIMINARÁ todos los puntos actuales y los RECALCULARÁ. ¿Deseas continuar?")) return;
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

    if (loading) return (
        <div className="loyalty-container">
            <div className="boutique-spinner-container">
                <div className="boutique-spinner"></div>
                <p>Cargando balances...</p>
            </div>
        </div>
    );

    return (
        <div className="loyalty-container">
            <div className="compact-header-row">
                <div className="title-group">
                    <i className="bi bi-people-fill"></i>
                    <div>
                        <h1>Gestión de Puntos</h1>
                        <p className="subtitle">Saldos, canjes e historial de clientes</p>
                    </div>
                </div>
                <div className="header-actions" style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-boutique outline" onClick={handleReprocess}>⚡ Sincronizar</button>
                    <button className="btn-boutique primary" onClick={loadData}><i className="bi bi-arrow-clockwise"></i></button>
                </div>
            </div>

            <div className="boutique-card">
                <div className="boutique-table-wrapper">
                    <table className="boutique-table">
                        <thead>
                            <tr>
                                <th>Cliente / Identificación</th>
                                <th>Saldo Actual</th>
                                <th>Total Acumulado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loyaltyAccounts.map(acc => (
                                <tr key={acc.id}>
                                    <td>
                                        <strong>{acc.customer_name}</strong>
                                        <div style={{ fontSize: '11px', color: '#A09086' }}>C.I: {acc.customer_cedula || 'N/A'}</div>
                                    </td>
                                    <td><span className="points-badge positive" style={{ fontSize: '1.1rem' }}>{acc.points_balance} <small>pts</small></span></td>
                                    <td><span style={{ opacity: 0.7 }}>{acc.total_points_earned} pts acumulados</span></td>
                                    <td>
                                        <button className="btn-boutique primary" onClick={() => handleViewDetail(acc.id)}>
                                            <i className="bi bi-eye"></i> Gestionar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {loyaltyAccounts.length === 0 && (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>No hay cuentas de puntos registradas aún.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* DETAIL MODAL */}
            {selectedAccount && (
                <div className="boutique-modal-overlay">
                    <div className="boutique-modal" style={{ maxWidth: '900px' }}>
                        <div className="modal-header-boutique">
                            <div>
                                <h3>{selectedAccount.customer_name}</h3>
                                <p style={{ margin: 0, opacity: 0.6, fontSize: '0.9rem' }}>Saldo actual: <strong>{selectedAccount.points_balance} pts</strong></p>
                            </div>
                            <button className="close-btn" onClick={() => setSelectedAccount(null)}>&times;</button>
                        </div>

                        <div className="gestion-detail-grid">
                            <div className="detail-left">
                                <h4 className="detail-section-title"><i className="bi bi-gift"></i> Canjes Disponibles</h4>
                                <div className="rewards-grid-boutique">
                                    {rewardRules.filter(r => r.is_active && selectedAccount.points_balance >= r.points_cost).map(reward => (
                                        <div key={reward.id} className="reward-card-boutique">
                                            <div>
                                                <div className="reward-title">{reward.name}</div>
                                                <div className="reward-cost">{reward.points_cost} pts</div>
                                            </div>
                                            <button
                                                className="btn-boutique primary"
                                                style={{ marginTop: '10px', padding: '4px 8px', fontSize: '0.8rem' }}
                                                disabled={isRedeeming}
                                                onClick={() => handleRedeem(reward.id)}
                                            >
                                                {isRedeeming ? '...' : 'Canjear'}
                                            </button>
                                        </div>
                                    ))}
                                    {rewardRules.filter(r => r.is_active && selectedAccount.points_balance >= r.points_cost).length === 0 && (
                                        <div style={{ gridColumn: 'span 2', padding: '2rem', textAlign: 'center', border: '1px dashed #ddd', borderRadius: '10px', opacity: 0.6 }}>
                                            No hay recompensas suficientes para el saldo actual.
                                        </div>
                                    )}
                                </div>

                                <h4 className="detail-section-title"><i className="bi bi-ticket-perforated"></i> Cupones de Cliente</h4>
                                <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '5px' }}>
                                    {selectedAccount.coupons && selectedAccount.coupons.map(coupon => (
                                        <div key={coupon.id} className={`coupon-item-boutique ${coupon.is_used ? 'used' : ''}`}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <strong>{coupon.reward_name}</strong>
                                                {coupon.is_used && <span className="status-tag failed">USADO</span>}
                                            </div>
                                            <div className="coupon-code-boutique">{coupon.code}</div>
                                            <div style={{ fontSize: '0.8rem', opacity: 0.6, display: 'flex', justifyContent: 'space-between' }}>
                                                <span>{coupon.reward_type === 'PERCENTAGE' ? `${coupon.discount_value}%` : `$${coupon.discount_value}`} dto.</span>
                                                <span>{new Date(coupon.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {(!selectedAccount.coupons || selectedAccount.coupons.length === 0) && (
                                        <p style={{ textAlign: 'center', padding: '1rem', opacity: 0.5 }}>No hay cupones generados.</p>
                                    )}
                                </div>
                            </div>

                            <div className="detail-right">
                                <h4 className="detail-section-title"><i className="bi bi-clock-history"></i> Movimientos</h4>
                                <div style={{ maxHeight: '550px', overflowY: 'auto' }}>
                                    <table className="boutique-table mini" style={{ fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr><th>Fecha</th><th>Concepto</th><th>Pts</th></tr>
                                        </thead>
                                        <tbody>
                                            {selectedAccount.transactions && selectedAccount.transactions.map(tx => (
                                                <tr key={tx.id}>
                                                    <td>{new Date(tx.created_at).toLocaleDateString()}</td>
                                                    <td>
                                                        <strong>{tx.description}</strong>
                                                        <div style={{ fontSize: '10px', opacity: 0.5 }}>{tx.transaction_type}</div>
                                                    </td>
                                                    <td className={tx.points > 0 ? 'text-success' : 'text-danger'} style={{ fontWeight: 700 }}>
                                                        {tx.points > 0 ? `+${tx.points}` : tx.points}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '2rem', textAlign: 'right', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                            <button className="btn-boutique dark" onClick={() => setSelectedAccount(null)}>Cerrar Panel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionPuntos;
