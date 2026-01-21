import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const GestionPuntos = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/loyalty/config/loyalty-accounts/', { baseURL: '/api/luxe' });
            setCustomers(res.data.results || res.data);
        } catch (error) {
            console.error("Error loading accounts", error);
        } finally {
            setLoading(false);
        }
    };

    const handleReprocess = async () => {
        if (!window.confirm("¿Estás seguro de recalcular puntos para TODAS las órdenes pasadas? Esto puede sumar puntos masivamente a los usuarios.")) return;

        try {
            setProcessing(true);
            const res = await api.post('/api/loyalty/config/earning-rules/reprocess_past_orders/', {}, { baseURL: '/api/luxe' });
            // Note: The endpoint is on LoyaltyAdminViewSet. 
            // In urls.py, if we registered EarningRuleViewSet, maybe we should register a specific viewset for Config or use one of the existing ones.
            // Wait, LoyaltyAdminViewSet is a base class. 
            // EarningRuleViewSet inherits from it.
            // So '/api/loyalty/config/earning-rules/reprocess_past_orders/' should work if I added it to LoyaltyAdminViewSet!
            // Actually, LoyaltyAdminViewSet doesn't have a URL itself. 
            // I added it to LoyaltyAdminViewSet which EarningRuleViewSet inherits from. 
            // So it will appear under earning-rules, earning-rule-types, and reward-rules. 
            // That's a bit duplicate but works. I'll use earning-rules as the entry point.

            alert(`Proceso completado.\nProcesadas: ${res.data.processed}\nOmitidas (Ya tenían puntos): ${res.data.skipped_already_awarded}`);
            loadData();
        } catch (error) {
            console.error(error);
            alert("Error procesando órdenes pasadas");
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div className="p-4">Cargando cuentas...</div>;

    return (
        <div className="page-container" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>
                    Gestión de Puntos y Clientes
                </h1>
                <button
                    onClick={handleReprocess}
                    disabled={processing}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: processing ? '#94a3b8' : '#ea580c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: processing ? 'not-allowed' : 'pointer',
                        fontWeight: '600'
                    }}
                >
                    {processing ? 'Procesando...' : '⚡ Procesar Órdenes Pasadas'}
                </button>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f8fafc' }}>
                        <tr>
                            <th style={thStyle}>Cliente</th>
                            <th style={thStyle}>Cédula</th>
                            <th style={thStyle}>Total Ganado (Histórico)</th>
                            <th style={thStyle}>Balance Actual</th>
                            <th style={thStyle}>Última Actualización</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.map(acc => (
                            <tr key={acc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={tdStyle}>
                                    <div style={{ fontWeight: '600', color: '#334155' }}>
                                        {acc.customer_name || 'Cliente sin nombre'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>{acc.customer_email}</div>
                                </td>
                                <td style={tdStyle}>{acc.customer_identification || '-'}</td>
                                <td style={tdStyle}>{acc.total_points_earned} pts</td>
                                <td style={{ ...tdStyle, color: '#16a34a', fontWeight: 'bold' }}>{acc.points_balance} pts</td>
                                <td style={tdStyle}>{new Date(acc.updated_at).toLocaleDateString()}</td>
                            </tr>
                        ))}
                        {customers.length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                                    No hay cuentas de fidelidad registradas aún.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const thStyle = { padding: '15px', textAlign: 'left', fontSize: '14px', color: '#475569', fontWeight: '600' };
const tdStyle = { padding: '15px', fontSize: '14px', color: '#334155' };

export default GestionPuntos;
