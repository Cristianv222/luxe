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
    const [testMessage, setTestMessage] = useState('');
    const [sendingTest, setSendingTest] = useState(false);
    const [activeTab, setActiveTab] = useState('connection');

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
            // Updated to use luxe-service history endpoint which includes test messages
            const response = await api.get('/api/integrations/whatsapp/history/', {
                baseURL: process.env.REACT_APP_LUXE_SERVICE
            });
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

        const timer = setInterval(checkStatus, 15000);
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
            setMessage({ type: 'success', text: '✅ Configuración guardada correctamente' });
        } catch (error) {
            setMessage({ type: 'error', text: '❌ Error al guardar la configuración' });
        }
        setLoading(false);
    };

    const handleEditConfig = (config) => {
        setSettings(config);
        setEditingId(config.id);
        setActiveTab('settings');
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
                        fetchHistory();
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
            setMessage({ type: 'error', text: '❌ Ingresa un número de teléfono' });
            return;
        }
        if (!testMessage.trim()) {
            setMessage({ type: 'error', text: '❌ Escribe un mensaje para enviar' });
            return;
        }
        if (connectionStatus !== 'connected') {
            setMessage({ type: 'error', text: '❌ WhatsApp no está conectado. Vincula tu dispositivo primero.' });
            return;
        }

        setSendingTest(true);
        setMessage({ type: 'info', text: '📤 Enviando mensaje...' });

        try {
            await api.post('/api/integrations/whatsapp/test-message/', {
                phone: testPhone,
                message: testMessage
            }, {
                baseURL: process.env.REACT_APP_LUXE_SERVICE
            });
            setMessage({ type: 'success', text: `✅ ¡Mensaje enviado a ${testPhone}!` });
            setTestMessage('');
            fetchHistory();
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Error al enviar';
            setMessage({ type: 'error', text: `❌ ${errorMsg}` });
        }
        setSendingTest(false);
    };

    const getStatusHeader = () => {
        switch (connectionStatus) {
            case 'connected': return { label: 'Conectado', color: 'connected' };
            case 'disconnected': return { label: 'Desconectado', color: 'disconnected' };
            case 'offline': return { label: 'Sin Servicio', color: 'offline' };
            default: return { label: 'Verificando...', color: 'checking' };
        }
    };

    const statusInfo = getStatusHeader();

    return (
        <div className="whatsapp-config-wrapper">
            <div className="compact-header-row">
                <div className="title-group">
                    <i className="bi bi-whatsapp"></i>
                    <div>
                        <h1>WhatsApp Automation</h1>
                        <p className="subtitle">Gestión de Mensajería & Automatización</p>
                    </div>
                </div>
                <div className={`status-indicator-pill ${statusInfo.color}`}>
                    <span className="dot"></span>
                    {statusInfo.label}
                </div>
            </div>

            {message.text && (
                <div className={`boutique-alert alert-${message.type}`}>
                    <i className={`bi bi-${message.type === 'error' ? 'exclamation-circle' : 'check-circle'}`}></i>
                    {message.text}
                    <button onClick={() => setMessage({ text: '', type: '' })}>&times;</button>
                </div>
            )}

            <div className="boutique-tabs-container">
                <div className="tabs-header">
                    <button
                        className={`tab-item ${activeTab === 'connection' ? 'active' : ''}`}
                        onClick={() => setActiveTab('connection')}
                    >
                        <i className="bi bi-link-45deg"></i> Conexión
                    </button>
                    <button
                        className={`tab-item ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('settings')}
                    >
                        <i className="bi bi-gear"></i> Configuración
                    </button>
                    <button
                        className={`tab-item ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        <i className="bi bi-clock-history"></i> Historial
                    </button>
                </div>

                <div className="tab-content">
                    {activeTab === 'connection' && (
                        <div className="tab-pane animate-fade-in">
                            <div className="boutique-grid">
                                <div className="grid-main">
                                    <div className="info-card">
                                        <h3>Estado del Servicio</h3>
                                        <p>Para enviar mensajes, tu cuenta de WhatsApp debe estar vinculada mediante el código QR.</p>
                                        <div className="action-row">
                                            {connectionStatus !== 'connected' ? (
                                                <button className="btn-boutique primary" onClick={handleStartSession} disabled={loading}>
                                                    {loading ? 'Preparando...' : 'Vincular WhatsApp'}
                                                </button>
                                            ) : (
                                                <button className="btn-boutique danger" onClick={handleLogout} disabled={loading}>
                                                    Desconectar Sesión
                                                </button>
                                            )}
                                            <button className="btn-boutique secondary" onClick={checkStatus}>
                                                <i className="bi bi-arrow-repeat"></i> Actualizar
                                            </button>
                                        </div>
                                    </div>

                                    <div className="info-card">
                                        <h3>Enviar Mensaje Directo</h3>
                                        <div className="test-form">
                                            <div className="input-group">
                                                <label>Número de Teléfono</label>
                                                <input
                                                    type="text"
                                                    placeholder="Ej: 0991234567"
                                                    value={testPhone}
                                                    onChange={e => setTestPhone(e.target.value)}
                                                    disabled={connectionStatus !== 'connected'}
                                                />
                                            </div>
                                            <div className="input-group">
                                                <label>Mensaje Personalizado</label>
                                                <textarea
                                                    placeholder="Escribe el mensaje..."
                                                    rows={4}
                                                    value={testMessage}
                                                    onChange={e => setTestMessage(e.target.value)}
                                                    disabled={connectionStatus !== 'connected'}
                                                />
                                            </div>
                                            <button
                                                className="btn-boutique accent"
                                                onClick={handleTestMessage}
                                                disabled={sendingTest || connectionStatus !== 'connected'}
                                            >
                                                {sendingTest ? 'Enviando...' : <><i className="bi bi-send"></i> Enviar Ahora</>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid-side">
                                    <div className="status-overview">
                                        <div className="session-info">
                                            <span>Sesión Activa:</span>
                                            <strong>{settings.session_name || 'Ninguna'}</strong>
                                        </div>
                                        <div className="session-info">
                                            <span>Última Sincronización:</span>
                                            <strong>{new Date().toLocaleTimeString()}</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="tab-pane animate-fade-in">
                            <div className="settings-container">
                                <div className="card-header-compact">
                                    <h3>Configuración de Automatización</h3>
                                    <div className="header-actions">
                                        {editingId && <button className="btn-text" onClick={() => {
                                            setEditingId(null);
                                            setSettings({ is_active: true, schedule_time: '09:00', session_name: 'luxe_session', phone_number_sender: '', birthday_message_template: '' });
                                        }}>+ Nueva Config</button>}
                                    </div>
                                </div>
                                <div className="boutique-form-grid">
                                    <div className="form-column">
                                        <div className="input-group checkbox-group">
                                            <input
                                                type="checkbox"
                                                id="is_active"
                                                checked={settings.is_active}
                                                onChange={e => setSettings({ ...settings, is_active: e.target.checked })}
                                            />
                                            <label htmlFor="is_active">Activar Envío Automático de Cumpleaños</label>
                                        </div>
                                        <div className="input-group">
                                            <label>Hora de Ejecución Diaria</label>
                                            <input
                                                type="time"
                                                value={settings.schedule_time}
                                                onChange={e => setSettings({ ...settings, schedule_time: e.target.value })}
                                            />
                                        </div>
                                        <div className="input-group">
                                            <label>Nombre de la Sesión</label>
                                            <input
                                                type="text"
                                                value={settings.session_name}
                                                onChange={e => setSettings({ ...settings, session_name: e.target.value })}
                                                placeholder="luxe_session"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-column">
                                        <div className="input-group">
                                            <label>Plantilla de Mensaje (Cumpleaños)</label>
                                            <textarea
                                                rows={8}
                                                value={settings.birthday_message_template}
                                                onChange={e => setSettings({ ...settings, birthday_message_template: e.target.value })}
                                                placeholder="¡Feliz cumpleaños {first_name}!..."
                                            />
                                            <small className="hint">Usa {"{first_name}"} para el nombre del cliente.</small>
                                        </div>
                                    </div>
                                </div>
                                <div className="form-footer">
                                    <button className="btn-boutique primary wide" onClick={handleSaveSettings} disabled={loading}>
                                        {loading ? 'Guardando...' : (editingId ? 'Actualizar Configuración' : 'Crear Configuración')}
                                    </button>
                                </div>

                                <div className="configs-list-section">
                                    <h4>Configuraciones Guardadas</h4>
                                    <div className="mini-table-wrapper">
                                        <table className="boutique-table mini">
                                            <thead>
                                                <tr>
                                                    <th>Sesión</th>
                                                    <th>Hora</th>
                                                    <th>Estado</th>
                                                    <th>Opciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {savedConfigs.map(config => (
                                                    <tr key={config.id} className={editingId === config.id ? 'active-row' : ''}>
                                                        <td>{config.session_name}</td>
                                                        <td>{config.schedule_time}</td>
                                                        <td>
                                                            <span className={`mini-badge ${config.is_active ? 'success' : 'neutral'}`}>
                                                                {config.is_active ? 'Activo' : 'Inactivo'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className="table-actions">
                                                                <button onClick={() => handleEditConfig(config)} title="Editar"><i className="bi bi-pencil"></i></button>
                                                                <button onClick={() => handleDeleteConfig(config.id)} title="Eliminar" className="text-danger"><i className="bi bi-trash"></i></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="tab-pane animate-fade-in">
                            <div className="history-full-card">
                                <div className="card-header-compact">
                                    <h3>Historial de Comunicaciones</h3>
                                    <button className="btn-icon" onClick={fetchHistory} title="Refrescar"><i className="bi bi-arrow-clockwise"></i></button>
                                </div>
                                <div className="boutique-table-wrapper">
                                    <table className="boutique-table">
                                        <thead>
                                            <tr>
                                                <th>Fecha & Hora</th>
                                                <th>Destinatario</th>
                                                <th>Tipo</th>
                                                <th>Estado</th>
                                                <th>Mensaje</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {messageHistory.length === 0 ? (
                                                <tr><td colSpan="5" className="empty-state">No hay mensajes registrados aún.</td></tr>
                                            ) : (
                                                messageHistory.map((item, idx) => (
                                                    <tr key={item.id || idx}>
                                                        <td className="time-td">{new Date(item.sent_at).toLocaleString()}</td>
                                                        <td>
                                                            <div className="customer-info">
                                                                <strong>{item.customer_name || 'Desconocido'}</strong>
                                                                <span>{item.phone}</span>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className={`type-tag ${item.message_type}`}>
                                                                {item.message_type_display || item.message_type}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className={`status-tag ${item.status}`}>
                                                                {item.status_display || (item.status === 'sent' ? 'Enviado' : 'Fallido')}
                                                            </span>
                                                        </td>
                                                        <td className="message-td">
                                                            <div className="message-bubble-preview" title={item.message}>
                                                                {item.message}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showModal && (
                <div className="boutique-modal-overlay">
                    <div className="boutique-modal animate-pop">
                        <div className="modal-top">
                            <h2>Vincular WhatsApp</h2>
                            <button className="close-btn" onClick={handleCloseModal}>&times;</button>
                        </div>
                        <div className="modal-middle">
                            {qrCode ? (
                                <div className="qr-wrapper">
                                    <img src={qrCode} alt="WhatsApp QR Code" />
                                    <p>Escanea el código desde tu aplicación de WhatsApp</p>
                                </div>
                            ) : (
                                <div className="loading-qr">
                                    <div className="boutique-spinner"></div>
                                    <p>Generando código QR...</p>
                                    <p className="subtext">Esto puede tardar unos segundos</p>
                                </div>
                            )}
                        </div>
                        <div className="modal-bottom">
                            <button className="btn-boutique secondary wide" onClick={handleCloseModal}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {showSuccessModal && (
                <div className="boutique-modal-overlay">
                    <div className="boutique-modal success animate-pop">
                        <div className="success-icon"><i className="bi bi-check2-circle"></i></div>
                        <h2>¡Cambios Guardados!</h2>
                        <p>La configuración de WhatsApp se ha actualizado con éxito.</p>
                        <button className="btn-boutique primary wide" onClick={() => setShowSuccessModal(false)}>Entendido</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WhatsAppConfig;
