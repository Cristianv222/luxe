import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import './WhatsAppConfig.css';

const WhatsAppConfig = () => {
    const [settings, setSettings] = useState({
        is_active: true,
        schedule_time: '09:00',
        session_name: 'luxe_session',
        phone_number_sender: '',
        birthday_message_template: ''
    });
    const [connectionStatus, setConnectionStatus] = useState('checking');
    const [qrCode, setQrCode] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [testPhone, setTestPhone] = useState('');
    const [savedConfigs, setSavedConfigs] = useState([]);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [messageHistory, setMessageHistory] = useState([]);
    const [message, setMessage] = useState({ type: '', text: '' });

    const fetchSettings = useCallback(async () => {
        try {
            const response = await api.get('/api/integrations/whatsapp/settings/', {
                baseURL: process.env.REACT_APP_LUXE_SERVICE
            });
            const data = response.data.results ? response.data.results : (Array.isArray(response.data) ? response.data : []);
            setSavedConfigs(data);
            if (data.length > 0) {
                if (!editingId) {
                    setSettings(data[0]);
                    setEditingId(data[0].id);
                }
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    }, [editingId]);

    const fetchHistory = useCallback(async () => {
        try {
            const response = await api.get('/api/automation/history/', {
                baseURL: process.env.REACT_APP_API_BASE_URL
            });
            // Handle pagination if API is paginated
            const data = response.data.results ? response.data.results : (Array.isArray(response.data) ? response.data : []);
            setMessageHistory(data);
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    }, []);

    const checkStatus = useCallback(async () => {
        try {
            const response = await api.get('/api/integrations/whatsapp/status/', {
                baseURL: process.env.REACT_APP_LUXE_SERVICE
            });
            setConnectionStatus(response.data.status);
            if (response.data.status === 'connected') {
                setShowModal(false);
                setQrCode(null);
            }
        } catch (error) {
            setConnectionStatus('offline');
        }
    }, []);

    useEffect(() => {
        fetchSettings();
        checkStatus();
        fetchHistory();

        const timer = setInterval(checkStatus, 10000);
        return () => clearInterval(timer);
    }, [fetchSettings, checkStatus, fetchHistory]);

    const handleSaveSettings = async () => {
        setLoading(true);
        try {
            if (editingId) {
                await api.put(`/api/integrations/whatsapp/settings/${editingId}/`, settings, {
                    baseURL: process.env.REACT_APP_LUXE_SERVICE
                });
            } else {
                await api.post('/api/integrations/whatsapp/settings/', settings, {
                    baseURL: process.env.REACT_APP_LUXE_SERVICE
                });
            }
            setShowSuccessModal(true);
            fetchSettings();
        } catch (error) {
            setMessage({ type: 'error', text: '❌ Error al guardar la configuración' });
        }
        setLoading(false);
    };

    const handleEditConfig = (config) => {
        setSettings(config);
        setEditingId(config.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteConfig = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar esta configuración?')) return;
        setLoading(true);
        try {
            await api.delete(`/api/integrations/whatsapp/settings/${id}/`, {
                baseURL: process.env.REACT_APP_LUXE_SERVICE
            });
            setMessage({ type: 'success', text: '✅ Configuración eliminada' });
            fetchSettings();
            if (editingId === id) {
                setEditingId(null);
                setSettings({
                    is_active: true,
                    schedule_time: '09:00',
                    session_name: 'luxe_session',
                    phone_number_sender: '',
                    birthday_message_template: ''
                });
            }
        } catch (error) {
            setMessage({ type: 'error', text: '❌ Error al eliminar' });
        }
        setLoading(false);
    };

    const handleStartSession = async () => {
        setLoading(true);
        setQrCode(null);
        setShowModal(true);
        setMessage({ type: 'info', text: '⏳ Preparando conexión con WhatsApp...' });

        try {
            try {
                await api.post('/api/integrations/whatsapp/start-session/', {}, {
                    baseURL: process.env.REACT_APP_LUXE_SERVICE
                });
            } catch (startError) {
                console.warn('Warning in start-session:', startError);
            }

            let attempts = 0;
            const maxAttempts = 20;

            const pollQr = setInterval(async () => {
                attempts++;
                try {
                    const qrResponse = await api.get('/api/integrations/whatsapp/qrcode/', {
                        baseURL: process.env.REACT_APP_LUXE_SERVICE
                    });

                    if (qrResponse.data.qrcode) {
                        setQrCode(qrResponse.data.qrcode);
                        setLoading(false);
                    } else {
                        const waitMsg = attempts % 3 === 0 ? '⌛ Sincronizando...' : '⏳ Generando imagen...';
                        setMessage({ type: 'info', text: `${waitMsg} (Intento ${attempts})` });
                    }

                    const statusRes = await api.get('/api/integrations/whatsapp/status/', {
                        baseURL: process.env.REACT_APP_LUXE_SERVICE
                    });

                    if (statusRes.data.status === 'connected') {
                        setConnectionStatus('connected');
                        setQrCode(null);
                        setShowModal(false);
                        clearInterval(pollQr);
                        setMessage({ type: 'success', text: '✅ ¡Conectado!' });
                    }

                    if (attempts >= maxAttempts) {
                        clearInterval(pollQr);
                        setLoading(false);
                        setMessage({ type: 'warning', text: '⚠️ Tiempo agotado.' });
                    }
                } catch (err) {
                    console.error('Polling error:', err);
                }
            }, 3000);

            window.activeQrPoll = pollQr;

        } catch (error) {
            setMessage({ type: 'error', text: '❌ Error al iniciar WhatsApp' });
            setLoading(false);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        if (window.activeQrPoll) {
            clearInterval(window.activeQrPoll);
        }
    };

    const handleLogout = async () => {
        if (!window.confirm('¿Cerrar sesión?')) return;
        setLoading(true);
        try {
            await api.post('/api/integrations/whatsapp/logout/', {}, {
                baseURL: process.env.REACT_APP_LUXE_SERVICE
            });
            setMessage({ type: 'success', text: '✅ Sesión cerrada' });
            setConnectionStatus('disconnected');
            setQrCode(null);
        } catch (error) {
            setMessage({ type: 'error', text: '❌ Error al cerrar sesión' });
        }
        setLoading(false);
    };

    const handleTestMessage = async () => {
        if (!testPhone) {
            setMessage({ type: 'error', text: '❌ Ingresa un número' });
            return;
        }
        setLoading(true);
        try {
            await api.post('/api/integrations/whatsapp/test-message/', {
                phone: testPhone,
                message: '🧪 *Luxe*: ¡Conexión exitosa! 🎉'
            }, {
                baseURL: process.env.REACT_APP_LUXE_SERVICE
            });
            setMessage({ type: 'success', text: `✅ Mensaje enviado` });
        } catch (error) {
            setMessage({ type: 'error', text: '❌ Error al enviar' });
        }
        setLoading(false);
    };

    const getStatusHeader = () => {
        switch (connectionStatus) {
            case 'connected': return { label: 'Conectado', color: 'connected' };
            case 'disconnected': return { label: 'Desconectado', color: 'disconnected' };
            case 'offline': return { label: 'Offline', color: 'offline' };
            default: return { label: 'Verificando...', color: 'checking' };
        }
    };

    const statusInfo = getStatusHeader();

    return (
        <div className="whatsapp-config-container">
            <div className="whatsapp-header">
                <div className="header-icon"><i className="bi bi-whatsapp"></i></div>
                <div>
                    <h1>Centro de WhatsApp</h1>
                    <p>Gestión de automatización</p>
                </div>
            </div>

            {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

            <div className="config-card">
                <div className="card-header">
                    <h3>Conectividad</h3>
                    <span className={`status-badge ${statusInfo.color}`}>{statusInfo.label}</span>
                </div>
                <div className="card-body">
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="btn btn-primary" onClick={handleStartSession} disabled={loading || connectionStatus === 'connected'}>
                            {connectionStatus === 'connected' ? 'Sesión Activa' : 'Vincular Dispositivo'}
                        </button>
                        <button className="btn btn-secondary" onClick={checkStatus} disabled={loading}>Actualizar</button>
                        {connectionStatus === 'connected' && (
                            <button className="btn btn-error" onClick={handleLogout} disabled={loading} style={{ background: '#ff4d4f', color: 'white' }}>
                                Cerrar Sesión
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={handleCloseModal}>&times;</button>
                        <h2>Vincular WhatsApp</h2>
                        {qrCode ? (
                            <div className="qr-container">
                                <img src={qrCode} alt="QR" className="qr-code-image" />
                            </div>
                        ) : (
                            <div style={{ padding: '2rem', textAlign: 'center' }}>
                                <div className="spinner-border text-success"></div>
                                <p>Generando QR...</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showSuccessModal && (
                <div className="modal-overlay" onClick={() => setShowSuccessModal(false)}>
                    <div className="modal-content success-modal" onClick={e => e.stopPropagation()}>
                        <div className="success-icon"><i className="bi bi-check-circle-fill"></i></div>
                        <h2>¡Configuración Guardada!</h2>
                        <button className="btn btn-primary" onClick={() => setShowSuccessModal(false)}>Aceptar</button>
                    </div>
                </div>
            )}

            <div className="config-card">
                <div className="card-header">
                    <h3>{editingId ? 'Editar Configuración' : 'Nueva Configuración'}</h3>
                    {editingId && <button className="btn btn-link" onClick={() => {
                        setEditingId(null);
                        setSettings({ is_active: true, schedule_time: '09:00', session_name: 'luxe_session', phone_number_sender: '', birthday_message_template: '' });
                    }}>Nueva</button>}
                </div>
                <div className="card-body">
                    <div className="settings-form">
                        <label><input type="checkbox" checked={settings.is_active} onChange={e => setSettings({ ...settings, is_active: e.target.checked })} /> Activar automático</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                            <input type="time" value={settings.schedule_time} onChange={e => setSettings({ ...settings, schedule_time: e.target.value })} className="form-input" />
                            <input type="text" value={settings.session_name} onChange={e => setSettings({ ...settings, session_name: e.target.value })} className="form-input" placeholder="Nombre Sesión" />
                        </div>
                        <textarea value={settings.birthday_message_template} onChange={e => setSettings({ ...settings, birthday_message_template: e.target.value })} className="form-textarea" rows={4} placeholder="Mensaje..." style={{ marginTop: '1rem' }} />
                        <button className="btn btn-primary" onClick={handleSaveSettings} disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
                            {editingId ? 'Guardar Cambios' : 'Crear'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="config-card">
                <div className="card-header"><h3>Listado de Configuraciones</h3></div>
                <div className="card-body">
                    <table className="config-table" style={{ width: '100%' }}>
                        <thead><tr><th>Sesión</th><th>Hora</th><th>Estado</th><th>Acciones</th></tr></thead>
                        <tbody>
                            {savedConfigs.map(config => (
                                <tr key={config.id}>
                                    <td>{config.session_name}</td>
                                    <td>{config.schedule_time}</td>
                                    <td>{config.is_active ? 'Activo' : 'Inactivo'}</td>
                                    <td>
                                        <button onClick={() => handleEditConfig(config)} className="btn btn-sm btn-secondary">Editar</button>
                                        <button onClick={() => handleDeleteConfig(config.id)} className="btn btn-sm btn-error">Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="config-card">
                <div className="card-header">
                    <h3><i className="bi bi-clock-history"></i> Historial de Mensajes Enviados</h3>
                    <button className="btn btn-secondary btn-sm" onClick={fetchHistory}><i className="bi bi-arrow-repeat"></i></button>
                </div>
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="config-table" style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>Fecha/Hora</th>
                                    <th>Cliente</th>
                                    <th>Teléfono</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {messageHistory.length === 0 ? (
                                    <tr><td colSpan="4" className="no-data">No hay envíos registrados.</td></tr>
                                ) : (
                                    messageHistory.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>{new Date(item.sent_at).toLocaleString()}</td>
                                            <td>{item.customer_name}</td>
                                            <td>{item.phone}</td>
                                            <td><span className="badge badge-success">{item.status}</span></td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WhatsAppConfig;
