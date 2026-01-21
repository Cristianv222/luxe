import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';

const LoyaltyConfig = () => {
    const [loading, setLoading] = useState(true);
    const [programConfig, setProgramConfig] = useState(null);
    const [earningRules, setEarningRules] = useState([]);
    const [earningRuleTypes, setEarningRuleTypes] = useState([]); // New State
    const [rewardRules, setRewardRules] = useState([]);

    // Modal States
    const [showEarningModal, setShowEarningModal] = useState(false);
    const [showRewardModal, setShowRewardModal] = useState(false);
    const [showTypeModal, setShowTypeModal] = useState(false); // New Modal for Types
    const [editingEarning, setEditingEarning] = useState(null);
    const [editingReward, setEditingReward] = useState(null);

    // Form Data
    const [earningForm, setEarningForm] = useState({
        name: '',
        rule_type: null, // Should be ID
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
        is_active: true
    });

    // Type Form
    const [typeForm, setTypeForm] = useState({ name: '', code: '', description: '', is_active: true });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

            const typesRes = await api.get('/api/loyalty/config/earning-rule-types/', { baseURL: '/api/luxe' });
            setEarningRuleTypes(typesRes.data.results || typesRes.data);

            const earningRes = await api.get('/api/loyalty/config/earning-rules/', { baseURL: '/api/luxe' });
            setEarningRules(earningRes.data.results || earningRes.data);

            const rewardRes = await api.get('/api/loyalty/config/reward-rules/', { baseURL: '/api/luxe' });
            setRewardRules(rewardRes.data.results || rewardRes.data);

        } catch (error) {
            console.error("Error loading loyalty config", error);
            // alert("Error cargando configuración");
        } finally {
            setLoading(false);
        }
    };

    // --- RULE TYPES HANDLERS ---
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

    // --- EARNING RULES HANDLERS ---
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
        // Map rule_type ID correctly. 
        // rule.rule_type in GET is the ID because of serializer default or we need to check serializer.
        // Serializer currently shows rule_type as ID (ForeignKey default) and rule_type_name extra field.
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

    // --- REWARD RULES HANDLERS ---
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
            is_active: true
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

    if (loading) return <div className="p-4">Cargando configuración...</div>;

    return (
        <div className="page-container" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#1e293b' }}>
                Configuración del Sistema de Puntos
            </h1>

            {/* EARNING RULES SECTION */}
            <section style={{ marginBottom: '40px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#334155' }}>Reglas de Obtención (Ganar Puntos)</h2>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => setShowTypeModal(true)}
                            style={{ padding: '8px 16px', backgroundColor: '#64748b', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                        >
                            Gestionar Tipos
                        </button>
                        <button
                            onClick={openNewEarning}
                            style={{ padding: '8px 16px', backgroundColor: '#0f172a', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                        >
                            + Nueva Regla
                        </button>
                    </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                            <th style={{ padding: '10px' }}>Nombre</th>
                            <th style={{ padding: '10px' }}>Tipo</th>
                            <th style={{ padding: '10px' }}>Detalle</th>
                            <th style={{ padding: '10px' }}>Puntos a Dar</th>
                            <th style={{ padding: '10px' }}>Estado</th>
                            <th style={{ padding: '10px' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {earningRules.map(rule => (
                            <tr key={rule.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '10px', fontWeight: '500' }}>{rule.name}</td>
                                <td style={{ padding: '10px' }}>{rule.rule_type_name || 'Sin Asignar'}</td>
                                <td style={{ padding: '10px' }}>
                                    {/* Show detail based on values present */}
                                    {rule.amount_step > 0 && rule.amount_step != null
                                        ? `Cada $${rule.amount_step} gastado`
                                        : `Mínimo $${rule.min_order_value}`}
                                </td>
                                <td style={{ padding: '10px', color: '#16a34a', fontWeight: 'bold' }}>+{rule.points_to_award} pts</td>
                                <td style={{ padding: '10px' }}>
                                    <span style={{
                                        padding: '4px 8px', borderRadius: '12px', fontSize: '12px',
                                        backgroundColor: rule.is_active ? '#dcfce7' : '#f1f5f9',
                                        color: rule.is_active ? '#166534' : '#64748b'
                                    }}>
                                        {rule.is_active ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td style={{ padding: '10px' }}>
                                    <button onClick={() => openEditEarning(rule)} style={{ marginRight: '10px', background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer' }}>Editar</button>
                                    <button onClick={() => handleDeleteEarning(rule.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>Eliminar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            {/* REWARD RULES SECTION */}
            <section style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#334155' }}>Recompensas (Cupones Canjeables)</h2>
                    <button
                        onClick={openNewReward}
                        style={{ padding: '8px 16px', backgroundColor: '#0f172a', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                    >
                        + Nueva Recompensa
                    </button>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                            <th style={{ padding: '10px' }}>Nombre</th>
                            <th style={{ padding: '10px' }}>Costo (Pts)</th>
                            <th style={{ padding: '10px' }}>Valor dscto.</th>
                            <th style={{ padding: '10px' }}>Estado</th>
                            <th style={{ padding: '10px' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rewardRules.map(rule => (
                            <tr key={rule.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '10px', fontWeight: '500' }}>{rule.name}
                                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{rule.description}</div>
                                </td>
                                <td style={{ padding: '10px', color: '#ea580c', fontWeight: 'bold' }}>{rule.points_cost} pts</td>
                                <td style={{ padding: '10px' }}>${rule.discount_value}</td>
                                <td style={{ padding: '10px' }}>
                                    <span style={{
                                        padding: '4px 8px', borderRadius: '12px', fontSize: '12px',
                                        backgroundColor: rule.is_active ? '#dcfce7' : '#f1f5f9',
                                        color: rule.is_active ? '#166534' : '#64748b'
                                    }}>
                                        {rule.is_active ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td style={{ padding: '10px' }}>
                                    <button onClick={() => openEditReward(rule)} style={{ marginRight: '10px', background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer' }}>Editar</button>
                                    <button onClick={() => handleDeleteReward(rule.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>Eliminar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            {/* MODAL EARNING */}
            {showEarningModal && (
                <div style={modalOverlayStyle}>
                    <div style={modalStyle}>
                        <h3>{editingEarning ? 'Editar Regla' : 'Nueva Regla de Obtención'}</h3>
                        <form onSubmit={handleSaveEarning} style={formStyle}>
                            <label>Nombre de la Regla</label>
                            <input className="ff-input" value={earningForm.name} onChange={e => setEarningForm({ ...earningForm, name: e.target.value })} required placeholder="Ej. Puntos por Compra" />

                            <label>Tipo de Regla</label>
                            <select className="ff-input" value={earningForm.rule_type} onChange={e => setEarningForm({ ...earningForm, rule_type: e.target.value })}>
                                {earningRuleTypes.map(type => (
                                    <option key={type.id} value={type.id}>{type.name}</option>
                                ))}
                            </select>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label>
                                        {/* Dynamic Label based on selected type heuristics */}
                                        {earningForm.rule_type
                                            ? (earningRuleTypes.find(t => t.id == earningForm.rule_type)?.code === 'PER_AMOUNT'
                                                ? 'Monto Paso (Cada $X)'
                                                : 'Monto Mínimo de Factura ($)')
                                            : 'Monto ($)'}
                                    </label>
                                    <input type="number" className="ff-input" value={earningForm.amount_step || earningForm.min_order_value}
                                        onChange={e => {
                                            // Update both fields for simplicity in heuristic mapping
                                            setEarningForm({ ...earningForm, amount_step: e.target.value, min_order_value: e.target.value })
                                        }} />
                                </div>
                                <div>
                                    <label>Puntos a Otorgar</label>
                                    <input type="number" className="ff-input" value={earningForm.points_to_award} onChange={e => setEarningForm({ ...earningForm, points_to_award: e.target.value })} required />
                                </div>
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                                <input type="checkbox" checked={earningForm.is_active} onChange={e => setEarningForm({ ...earningForm, is_active: e.target.checked })} />
                                Regla Activa
                            </label>

                            <div style={{ marginTop: '20px', textAlign: 'right' }}>
                                <button type="button" onClick={() => setShowEarningModal(false)} style={cancelBtnStyle}>Cancelar</button>
                                <button type="submit" style={saveBtnStyle}>Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL RULE TYPES */}
            {showTypeModal && (
                <div style={modalOverlayStyle}>
                    <div style={modalStyle}>
                        <h3>Gestionar Tipos de Reglas</h3>
                        <div style={{ marginBottom: '20px', maxHeight: '200px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', fontSize: '14px' }}>
                                <tbody>
                                    {earningRuleTypes.map(type => (
                                        <tr key={type.id} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '8px' }}>{type.name} <br /> <small style={{ color: '#888' }}>{type.code}</small></td>
                                            <td style={{ padding: '8px', textAlign: 'right' }}>
                                                <button onClick={() => handleDeleteType(type.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>X</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <h4>Agregar Nuevo Tipo</h4>
                        <form onSubmit={handleSaveType} style={formStyle}>
                            <label>Nombre</label>
                            <input className="ff-input" value={typeForm.name} onChange={e => setTypeForm({ ...typeForm, name: e.target.value })} required placeholder="Ej. Por Cumpleaños" />

                            <label>Código Interno (ÚNICO)</label>
                            <input className="ff-input" value={typeForm.code} onChange={e => setTypeForm({ ...typeForm, code: e.target.value.toUpperCase().replace(/\s/g, '_') })} required placeholder="Ej. BIRTHDAY_POINTS" />

                            <label>Descripción</label>
                            <input className="ff-input" value={typeForm.description} onChange={e => setTypeForm({ ...typeForm, description: e.target.value })} />

                            <div style={{ marginTop: '20px', textAlign: 'right' }}>
                                <button type="button" onClick={() => setShowTypeModal(false)} style={cancelBtnStyle}>Cerrar</button>
                                <button type="submit" style={saveBtnStyle}>Agregar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL REWARD */}
            {showRewardModal && (
                <div style={modalOverlayStyle}>
                    <div style={modalStyle}>
                        <h3>{editingReward ? 'Editar Recompensa' : 'Nueva Recompensa'}</h3>
                        <form onSubmit={handleSaveReward} style={formStyle}>
                            <label>Nombre del Cupón</label>
                            <input className="ff-input" value={rewardForm.name} onChange={e => setRewardForm({ ...rewardForm, name: e.target.value })} required placeholder="Ej. $5 Descuento" />

                            <label>Descripción</label>
                            <input className="ff-input" value={rewardForm.description} onChange={e => setRewardForm({ ...rewardForm, description: e.target.value })} placeholder="Válido en compras superiores a..." />

                            <label>Tipo de Recompensa</label>
                            <select className="ff-input" value={rewardForm.reward_type} onChange={e => setRewardForm({ ...rewardForm, reward_type: e.target.value })}>
                                <option value="FIXED_AMOUNT">Descuento Fijo ($)</option>
                                <option value="PERCENTAGE">Descuento Porcentaje (%)</option>
                            </select>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label>Costo en Puntos</label>
                                    <input type="number" className="ff-input" value={rewardForm.points_cost} onChange={e => setRewardForm({ ...rewardForm, points_cost: e.target.value })} required />
                                </div>
                                <div>
                                    <label>{rewardForm.reward_type === 'PERCENTAGE' ? 'Porcentaje (%)' : 'Valor Descuento ($)'}</label>
                                    <input type="number" className="ff-input" value={rewardForm.discount_value} onChange={e => setRewardForm({ ...rewardForm, discount_value: e.target.value })} required />
                                </div>
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                                <input type="checkbox" checked={rewardForm.is_active} onChange={e => setRewardForm({ ...rewardForm, is_active: e.target.checked })} />
                                Recompensa Activa
                            </label>

                            <div style={{ marginTop: '20px', textAlign: 'right' }}>
                                <button type="button" onClick={() => setShowRewardModal(false)} style={cancelBtnStyle}>Cancelar</button>
                                <button type="submit" style={saveBtnStyle}>Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// Styles helpers
const modalOverlayStyle = {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
};

const modalStyle = {
    backgroundColor: 'white', padding: '25px', borderRadius: '8px',
    width: '500px', maxWidth: '90%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
};

const formStyle = { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' };

const cancelBtnStyle = {
    padding: '8px 16px', marginRight: '10px', border: '1px solid #cbd5e1',
    backgroundColor: 'white', borderRadius: '4px', cursor: 'pointer'
};

const saveBtnStyle = {
    padding: '8px 16px', border: 'none', backgroundColor: '#0f172a',
    color: 'white', borderRadius: '4px', cursor: 'pointer'
};

export default LoyaltyConfig;
