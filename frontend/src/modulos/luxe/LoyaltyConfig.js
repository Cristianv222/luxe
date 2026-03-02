import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './Loyalty.css';

const LoyaltyConfig = () => {
    const [loading, setLoading] = useState(true);
    const [earningRules, setEarningRules] = useState([]);
    const [earningRuleTypes, setEarningRuleTypes] = useState([]);
    const [rewardRules, setRewardRules] = useState([]);

    // Modal States
    const [showEarningModal, setShowEarningModal] = useState(false);
    const [showRewardModal, setShowRewardModal] = useState(false);
    const [showTypeModal, setShowTypeModal] = useState(false);
    const [editingEarning, setEditingEarning] = useState(null);
    const [editingReward, setEditingReward] = useState(null);

    // Form Data
    const [earningForm, setEarningForm] = useState({
        name: '',
        rule_type: '',
        min_order_value: 0,
        amount_step: 10,
        points_to_award: 1,
        is_active: true
    });

    const [rewardForm, setRewardForm] = useState({
        name: '',
        description: '',
        points_cost: 100,
        reward_type: 'FIXED_AMOUNT',
        discount_value: 5.00,
        is_active: true,
        is_birthday_reward: false
    });

    const [typeForm, setTypeForm] = useState({ name: '', code: '', description: '', is_active: true });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [typesRes, earningRes, rewardRes] = await Promise.all([
                api.get('/api/loyalty/config/earning-rule-types/', { baseURL: '/api/luxe' }),
                api.get('/api/loyalty/config/earning-rules/', { baseURL: '/api/luxe' }),
                api.get('/api/loyalty/config/reward-rules/', { baseURL: '/api/luxe' })
            ]);

            setEarningRuleTypes(typesRes.data.results || typesRes.data);
            setEarningRules(earningRes.data.results || earningRes.data);
            setRewardRules(rewardRes.data.results || rewardRes.data);
        } catch (error) {
            console.error("Error loading loyalty config", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveType = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/loyalty/config/earning-rule-types/', typeForm, { baseURL: '/api/luxe' });
            setShowTypeModal(false);
            setTypeForm({ name: '', code: '', description: '', is_active: true });
            loadData();
        } catch (error) {
            alert("Error guardando tipo de regla");
        }
    };

    const handleDeleteType = async (id) => {
        if (!window.confirm("¿Seguro de eliminar este tipo?")) return;
        try {
            await api.delete(`/api/loyalty/config/earning-rule-types/${id}/`, { baseURL: '/api/luxe' });
            loadData();
        } catch (error) {
            alert("Error eliminando tipo");
        }
    };

    const handleSaveEarning = async (e) => {
        e.preventDefault();
        try {
            if (editingEarning) {
                await api.put(`/api/loyalty/config/earning-rules/${editingEarning.id}/`, earningForm, { baseURL: '/api/luxe' });
            } else {
                await api.post('/api/loyalty/config/earning-rules/', earningForm, { baseURL: '/api/luxe' });
            }
            setShowEarningModal(false);
            setEditingEarning(null);
            loadData();
        } catch (error) {
            alert("Error guardando regla");
        }
    };

    const openEditEarning = (rule) => {
        setEditingEarning(rule);
        setEarningForm(rule);
        setShowEarningModal(true);
    };

    const openNewEarning = () => {
        setEditingEarning(null);
        setEarningForm({
            name: '',
            rule_type: earningRuleTypes.length > 0 ? earningRuleTypes[0].id : '',
            min_order_value: 0,
            amount_step: 10,
            points_to_award: 1,
            is_active: true
        });
        setShowEarningModal(true);
    };

    const handleDeleteEarning = async (id) => {
        if (!window.confirm("¿Seguro de eliminar esta regla?")) return;
        try {
            await api.delete(`/api/loyalty/config/earning-rules/${id}/`, { baseURL: '/api/luxe' });
            loadData();
        } catch (error) {
            alert("Error eliminando");
        }
    };

    const handleSaveReward = async (e) => {
        e.preventDefault();
        try {
            if (editingReward) {
                await api.put(`/api/loyalty/config/reward-rules/${editingReward.id}/`, rewardForm, { baseURL: '/api/luxe' });
            } else {
                await api.post('/api/loyalty/config/reward-rules/', rewardForm, { baseURL: '/api/luxe' });
            }
            setShowRewardModal(false);
            setEditingReward(null);
            loadData();
        } catch (error) {
            alert("Error guardando recompensa");
        }
    };

    const openEditReward = (rule) => {
        setEditingReward(rule);
        setRewardForm(rule);
        setShowRewardModal(true);
    };

    const openNewReward = () => {
        setEditingReward(null);
        setRewardForm({
            name: '',
            description: '',
            points_cost: 100,
            reward_type: 'FIXED_AMOUNT',
            discount_value: 5.00,
            is_active: true,
            is_birthday_reward: false
        });
        setShowRewardModal(true);
    };

    const handleDeleteReward = async (id) => {
        if (!window.confirm("¿Seguro de eliminar esta recompensa?")) return;
        try {
            await api.delete(`/api/loyalty/config/reward-rules/${id}/`, { baseURL: '/api/luxe' });
            loadData();
        } catch (error) {
            alert("Error eliminando");
        }
    };

    const handleReprocess = async () => {
        if (!window.confirm("¡ATENCIÓN! Esto ELIMINARÁ todos los puntos actuales y los RECALCULARÁ desde cero. ¿Deseas continuar?")) return;
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
                <p>Cargando configuración...</p>
            </div>
        </div>
    );

    return (
        <div className="loyalty-container">
            <div className="compact-header-row">
                <div className="title-group">
                    <i className="bi bi-gear-fill"></i>
                    <div>
                        <h1>Configuración de Puntos</h1>
                        <p className="subtitle">Reglas, condiciones y premios del sistema</p>
                    </div>
                </div>
            </div>

            <div className="boutique-card">
                <div className="card-header-row">
                    <h2><i className="bi bi-star-fill" style={{ color: '#EAB308' }}></i> Reglas de Obtención</h2>
                    <div className="header-actions" style={{ display: 'flex', gap: '10px' }}>
                        <button className="btn-boutique secondary" onClick={handleReprocess} title="Reprocesar historial">
                            <i className="bi bi-arrow-repeat"></i> Reprocesar
                        </button>
                        <button className="btn-boutique outline" onClick={() => setShowTypeModal(true)}>
                            Gestionar Tipos
                        </button>
                        <button className="btn-boutique primary" onClick={openNewEarning}>
                            <i className="bi bi-plus-lg"></i> Nueva Regla
                        </button>
                    </div>
                </div>

                <div className="boutique-table-wrapper">
                    <table className="boutique-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Tipo</th>
                                <th>Detalle</th>
                                <th>Puntos</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {earningRules.map(rule => (
                                <tr key={rule.id}>
                                    <td><strong>{rule.name}</strong></td>
                                    <td><span className="mini-badge neutral">{rule.rule_type_name || 'General'}</span></td>
                                    <td>
                                        {rule.amount_step > 0
                                            ? `Cada $${rule.amount_step} gastado`
                                            : `Compra mínima de $${rule.min_order_value}`}
                                    </td>
                                    <td><span className="points-badge positive">+{rule.points_to_award} pts</span></td>
                                    <td>
                                        <span className={`status-tag ${rule.is_active ? 'sent' : 'failed'}`}>
                                            {rule.is_active ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="table-actions" style={{ display: 'flex', gap: '10px' }}>
                                            <button className="btn-text primary" onClick={() => openEditEarning(rule)} title="Editar"><i className="bi bi-pencil-square"></i></button>
                                            <button className="btn-text danger" onClick={() => handleDeleteEarning(rule.id)} title="Eliminar"><i className="bi bi-trash"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="boutique-card">
                <div className="card-header-row">
                    <h2><i className="bi bi-gift-fill" style={{ color: '#CFB3A9' }}></i> Recompensas Disponibles</h2>
                    <button className="btn-boutique primary" onClick={openNewReward}>
                        <i className="bi bi-plus-lg"></i> Nueva Recompensa
                    </button>
                </div>

                <div className="boutique-table-wrapper">
                    <table className="boutique-table">
                        <thead>
                            <tr>
                                <th>Nombre / Descripción</th>
                                <th>Costo (Pts)</th>
                                <th>Valor Descuento</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rewardRules.map(rule => (
                                <tr key={rule.id}>
                                    <td>
                                        <strong>{rule.name}</strong>
                                        {rule.is_birthday_reward && (
                                            <span className="mini-badge" style={{ backgroundColor: '#ff69b4', color: 'white', marginLeft: '5px' }}>
                                                <i className="bi bi-gift-fill"></i> Cumpleaños
                                            </span>
                                        )}
                                        <div style={{ fontSize: '11px', opacity: 0.6 }}>{rule.description}</div>
                                    </td>
                                    <td>
                                        {rule.is_birthday_reward || rule.points_cost === 0
                                            ? <span className="points-badge positive">GRATIS</span>
                                            : <span className="points-badge negative">{rule.points_cost} pts</span>
                                        }
                                    </td>
                                    <td>{rule.reward_type === 'PERCENTAGE' ? `${rule.discount_value}%` : `$${rule.discount_value}`}</td>
                                    <td>
                                        <span className={`status-tag ${rule.is_active ? 'sent' : 'failed'}`}>
                                            {rule.is_active ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="table-actions" style={{ display: 'flex', gap: '10px' }}>
                                            <button className="btn-text primary" onClick={() => openEditReward(rule)} title="Editar"><i className="bi bi-pencil-square"></i></button>
                                            <button className="btn-text danger" onClick={() => handleDeleteReward(rule.id)} title="Eliminar"><i className="bi bi-trash"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODALS */}
            {showEarningModal && (
                <div className="boutique-modal-overlay">
                    <div className="boutique-modal">
                        <div className="modal-header-boutique">
                            <h3>{editingEarning ? 'Editar Regla' : 'Nueva Regla'}</h3>
                            <button className="close-btn" onClick={() => setShowEarningModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleSaveEarning} className="boutique-form">
                            <div className="form-group-boutique">
                                <label>Nombre de la Regla</label>
                                <input value={earningForm.name} onChange={e => setEarningForm({ ...earningForm, name: e.target.value })} required />
                            </div>
                            <div className="form-group-boutique">
                                <label>Tipo bi Regla</label>
                                <select value={earningForm.rule_type} onChange={e => setEarningForm({ ...earningForm, rule_type: e.target.value })}>
                                    {earningRuleTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="form-grid-2">
                                <div className="form-group-boutique">
                                    <label>Monto Paso / Mínimo</label>
                                    <input type="number" value={earningForm.amount_step || earningForm.min_order_value}
                                        onChange={e => setEarningForm({ ...earningForm, amount_step: e.target.value, min_order_value: e.target.value })} />
                                </div>
                                <div className="form-group-boutique">
                                    <label>Puntos a Otorgar</label>
                                    <input type="number" value={earningForm.points_to_award} onChange={e => setEarningForm({ ...earningForm, points_to_award: e.target.value })} />
                                </div>
                            </div>
                            <div className="checkbox-group" style={{ marginTop: '10px' }}>
                                <input type="checkbox" id="earn_active" checked={earningForm.is_active} onChange={e => setEarningForm({ ...earningForm, is_active: e.target.checked })} />
                                <label htmlFor="earn_active">Regla Activa</label>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                <button type="button" className="btn-boutique secondary" onClick={() => setShowEarningModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-boutique primary">Guardar Regla</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showRewardModal && (
                <div className="boutique-modal-overlay">
                    <div className="boutique-modal">
                        <div className="modal-header-boutique">
                            <h3>{editingReward ? 'Editar Recompensa' : 'Nueva Recompensa'}</h3>
                            <button className="close-btn" onClick={() => setShowRewardModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleSaveReward} className="boutique-form">
                            <div className="form-group-boutique">
                                <label>Nombre del Cupón</label>
                                <input value={rewardForm.name} onChange={e => setRewardForm({ ...rewardForm, name: e.target.value })} required />
                            </div>
                            <div className="form-group-boutique">
                                <label>Descripción</label>
                                <textarea rows={2} value={rewardForm.description} onChange={e => setRewardForm({ ...rewardForm, description: e.target.value })} />
                            </div>
                            <div className="form-grid-2">
                                {!rewardForm.is_birthday_reward && (
                                    <div className="form-group-boutique">
                                        <label>Costo en Puntos</label>
                                        <input type="number" value={rewardForm.points_cost} onChange={e => setRewardForm({ ...rewardForm, points_cost: e.target.value })} />
                                    </div>
                                )}
                                <div className="form-group-boutique">
                                    <label>Tipo Descuento</label>
                                    <select value={rewardForm.reward_type} onChange={e => setRewardForm({ ...rewardForm, reward_type: e.target.value })}>
                                        <option value="FIXED_AMOUNT">Monto Fijo ($)</option>
                                        <option value="PERCENTAGE">Porcentaje (%)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group-boutique">
                                <label>Valor del Descuento</label>
                                <input type="number" value={rewardForm.discount_value} onChange={e => setRewardForm({ ...rewardForm, discount_value: e.target.value })} />
                            </div>
                            <div className="checkbox-group">
                                <input type="checkbox" id="rw_birthday" checked={rewardForm.is_birthday_reward}
                                    onChange={e => {
                                        const isBirthday = e.target.checked;
                                        setRewardForm({
                                            ...rewardForm,
                                            is_birthday_reward: isBirthday,
                                            points_cost: isBirthday ? 0 : rewardForm.points_cost
                                        });
                                    }}
                                />
                                <label htmlFor="rw_birthday">🎁 ¿Es regalo de cumpleaños?</label>
                            </div>
                            <div className="checkbox-group">
                                <input type="checkbox" id="rw_active" checked={rewardForm.is_active} onChange={e => setRewardForm({ ...rewardForm, is_active: e.target.checked })} />
                                <label htmlFor="rw_active">Recompensa Activa</label>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                <button type="button" className="btn-boutique secondary" onClick={() => setShowRewardModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-boutique primary">Guardar Recompensa</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showTypeModal && (
                <div className="boutique-modal-overlay">
                    <div className="boutique-modal" style={{ maxWidth: '500px' }}>
                        <div className="modal-header-boutique">
                            <h3>Tipos de Reglas</h3>
                            <button className="close-btn" onClick={() => setShowTypeModal(false)}>&times;</button>
                        </div>
                        <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '20px' }}>
                            <table className="boutique-table mini">
                                <thead>
                                    <tr><th>Nombre / Código</th><th></th></tr>
                                </thead>
                                <tbody>
                                    {earningRuleTypes.map(t => (
                                        <tr key={t.id}>
                                            <td>{t.name} <br /><small>{t.code}</small></td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button className="btn-text danger" onClick={() => handleDeleteType(t.id)}><i className="bi bi-x-circle"></i></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <h4 style={{ marginBottom: '10px', fontWeight: 700 }}>Agregar Nuevo</h4>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                            <button type="button" className="btn-boutique outline" onClick={() => setTypeForm({ ...typeForm, name: 'Por Monto', code: 'POR_MONTO' })} style={{ fontSize: '12px', padding: '5px 10px', flex: 1 }}>
                                + Regla Por Monto
                            </button>
                            <button type="button" className="btn-boutique outline" onClick={() => setTypeForm({ ...typeForm, name: 'Por Factura Total', code: 'POR_FACTURA_TOTAL' })} style={{ fontSize: '12px', padding: '5px 10px', flex: 1 }}>
                                + Regla Por Factura Total
                            </button>
                        </div>
                        <form onSubmit={handleSaveType} className="boutique-form">
                            <input value={typeForm.name} onChange={e => setTypeForm({ ...typeForm, name: e.target.value })} placeholder="Nombre" required style={{ marginBottom: '10px', width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
                            <input value={typeForm.code} onChange={e => setTypeForm({ ...typeForm, code: e.target.value.toUpperCase().replace(/\s/g, '_') })} placeholder="CÓDIGO_ÚNICO" required style={{ marginBottom: '10px', width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
                            <button type="submit" className="btn-boutique dark" style={{ width: '100%' }}>Agregar Tipo</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoyaltyConfig;


