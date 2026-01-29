import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import './WhatsAppConfig.css';

const WhatsAppConfig = () => {
    const [settings, setSettings] = useState({
        product_id: '',
        token: '',
        phone_id: '',
        api_url: 'https://api.maytapi.com/api',
        is_active: true,
        schedule_time: '09:00',
        birthday_message_template: '¡Feliz cumpleaños {name}! 🎉 En Luxe queremos celebrar contigo. Visítanos hoy y recibe un regalo especial de la casa. ¡Te esperamos!'
    });

    // Test states
    const [testPhone, setTestPhone] = useState('');
    const [testMessage, setTestMessage] = useState('');
    const [sendingTest, setSendingTest] = useState(false);

    // UI states
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [activeTab, setActiveTab] = useState('settings'); // settings, test, birthdays, history

    // Custom Modals State
    const [confirmModal, setConfirmModal] = useState(null); // { show: boolean, onConfirm: func }
    const [resultModal, setResultModal] = useState(null);   // { show: boolean, type: 'success'|'info'|'error', title: string, message: string }


    // Historial
    const [history, setHistory] = useState([]);

    const fetchHistory = useCallback(async () => {
        try {
            const response = await api.get('/api/integrations/whatsapp/history/', {
                baseURL: process.env.REACT_APP_LUXE_SERVICE
            });
            if (Array.isArray(response.data)) {
                setHistory(response.data);
            } else {
                setHistory([]);
                console.error("History response is not an array:", response.data);
            }
        } catch (error) {
            console.error('Error fetching history:', error);
            setHistory([]);
        }
    }, []);

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            // Se usa el endpoint de config (singular porque solo hay una)
            const response = await api.get('/api/integrations/maytapi/config/', {
                baseURL: process.env.REACT_APP_LUXE_SERVICE
            });
            if (response.data) {
                setSettings(prev => ({
                    ...prev, // Mantener defaults si la API no devuelve algún campo
                    ...response.data,
                    // Asegurar que api_url tenga valor por defecto si viene vacía
                    api_url: response.data.api_url || 'https://api.maytapi.com/api'
                }));
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            // No mostrar error crítico si es la primera vez (404)
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchSettings();
        fetchHistory();
    }, [fetchSettings, fetchHistory]);

    const handleSaveSettings = async () => {
        setLoading(true);
        try {
            await api.put('/api/integrations/maytapi/config/', settings, {
                baseURL: process.env.REACT_APP_LUXE_SERVICE
            });
            setShowSuccessModal(true);
            setMessage({ type: 'success', text: '✅ Configuración guardada correctamente' });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: '❌ Error al guardar la configuración' });
        }
        setLoading(false);
    };

    const handleTestMessage = async () => {
        if (!testPhone) {
            setMessage({ type: 'error', text: '❌ Ingresa un número de teléfono' });
            return;
        }
        if (!testMessage.trim()) {
            setMessage({ type: 'error', text: '❌ Escribe un mensaje' });
            return;
        }

        setSendingTest(true);
        setMessage({ type: 'info', text: '📤 Enviando mensaje...' });

        try {
            await api.post('/api/integrations/maytapi/test/', {
                phone: testPhone,
                message: testMessage
            }, {
                baseURL: process.env.REACT_APP_LUXE_SERVICE
            });
            setMessage({ type: 'success', text: `✅ ¡Mensaje enviado a ${testPhone}!` });
            setTestMessage('');
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Error al enviar (Verifica credenciales)';
            setMessage({ type: 'error', text: `❌ ${errorMsg}` });
        }
        setSendingTest(false);
    };

    // Helper to toggle password visibility for token
    const [showToken, setShowToken] = useState(false);

    return (
        <div className="whatsapp-config-wrapper">
            <div className="compact-header-row">
                <div className="title-group">
                    <i className="bi bi-whatsapp"></i>
                    <div>
                        <h1>Integración WhatsApp (Maytapi)</h1>
                        <p className="subtitle">Gestión de API y Credenciales</p>
                    </div>
                </div>
                <div className={`status-indicator-pill ${settings.is_active ? 'connected' : 'offline'}`}>
                    <span className="dot"></span>
                    {settings.is_active ? 'Servicio Activo' : 'Inactivo'}
                </div>
            </div>

            {message && message.text && (
                <div className={`boutique-alert alert-${message.type}`}>
                    <i className={`bi bi-${message.type === 'error' ? 'exclamation-circle' : 'check-circle'}`}></i>
                    {message.text}
                    <button onClick={() => setMessage({ text: '', type: '' })}>&times;</button>
                </div>
            )}

            <div className="boutique-tabs-container">
                <div className="tabs-header">
                    <button
                        className={`tab-item ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('settings')}
                    >
                        <i className="bi bi-gear"></i> Credenciales API
                    </button>
                    <button
                        className={`tab-item ${activeTab === 'test' ? 'active' : ''}`}
                        onClick={() => setActiveTab('test')}
                    >
                        <i className="bi bi-send"></i> Pruebas
                    </button>
                    <button
                        className={`tab-item ${activeTab === 'birthday' ? 'active' : ''}`}
                        onClick={() => setActiveTab('birthday')}
                    >
                        <i className="bi bi-gift"></i> Cumpleaños
                    </button>
                    <button
                        className={`tab-item ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        <i className="bi bi-clock-history"></i> Historial
                    </button>
                </div>

                <div className="tab-content">
                    {/* --- TAB CONFIGURACIÓN --- */}
                    {activeTab === 'settings' && (
                        <div className="tab-pane animate-fade-in">
                            <div className="settings-container">
                                <div className="card-header-compact">
                                    <h3>Datos de Conexión Maytapi</h3>
                                </div>

                                <div className="boutique-form-grid">
                                    {/* Columna Izquierda */}
                                    <div className="form-column">
                                        <div className="input-group">
                                            <label>Product ID</label>
                                            <input
                                                type="text"
                                                value={settings.product_id}
                                                onChange={e => setSettings({ ...settings, product_id: e.target.value })}
                                                placeholder="Ej: 9b2bb5c1-..."
                                            />
                                            <small className="hint">ID único de tu producto en Maytapi.</small>
                                        </div>

                                        <div className="input-group">
                                            <label>Phone ID (Opcional)</label>
                                            <input
                                                type="text"
                                                value={settings.phone_id}
                                                onChange={e => setSettings({ ...settings, phone_id: e.target.value })}
                                                placeholder="Ej: 123456"
                                            />
                                            <small className="hint">ID del teléfono específico. Si está vacío se usará el predeterminado.</small>
                                        </div>

                                        <div className="input-group checkbox-group" style={{ marginTop: '20px' }}>
                                            <input
                                                type="checkbox"
                                                id="is_active"
                                                checked={settings.is_active}
                                                onChange={e => setSettings({ ...settings, is_active: e.target.checked })}
                                            />
                                            <label htmlFor="is_active">Habilitar Servicio</label>
                                        </div>
                                    </div>

                                    {/* Columna Derecha */}
                                    <div className="form-column">
                                        <div className="input-group">
                                            <label>Token API</label>
                                            <div className="password-input-wrapper" style={{ display: 'flex' }}>
                                                <input
                                                    type={showToken ? "text" : "password"}
                                                    value={settings.token}
                                                    onChange={e => setSettings({ ...settings, token: e.target.value })}
                                                    placeholder="Token secreto..."
                                                    style={{ flex: 1 }}
                                                />
                                                <button
                                                    type="button"
                                                    className="btn-icon"
                                                    onClick={() => setShowToken(!showToken)}
                                                    style={{ marginLeft: '10px', border: '1px solid #ddd' }}
                                                >
                                                    <i className={`bi bi-eye${showToken ? '-slash' : ''}`}></i>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="input-group">
                                            <label>API URL Base</label>
                                            <input
                                                type="text"
                                                value={settings.api_url}
                                                onChange={e => setSettings({ ...settings, api_url: e.target.value })}
                                                placeholder="https://api.maytapi.com/api"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="form-footer">
                                    <button
                                        className="btn-boutique primary wide"
                                        onClick={handleSaveSettings}
                                        disabled={loading}
                                    >
                                        {loading ? 'Guardando...' : <><i className="bi bi-save"></i> Guardar Configuración</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- TAB PRUEBAS --- */}
                    {activeTab === 'test' && (
                        <div className="tab-pane animate-fade-in">
                            <div className="boutique-grid">
                                <div className="grid-main">
                                    <div className="info-card">
                                        <h3>Enviar Mensaje de Prueba</h3>
                                        <p className="section-desc">
                                            Verifica que la integración funciona enviando un mensaje directo a cualquier número.
                                        </p>

                                        <div className="test-form">
                                            <div className="input-group">
                                                <label>Número de Destino</label>
                                                <input
                                                    type="text"
                                                    placeholder="Ej: 593991234567 (Formato internacional)"
                                                    value={testPhone}
                                                    onChange={e => setTestPhone(e.target.value)}
                                                />
                                            </div>
                                            <div className="input-group">
                                                <label>Contenido del Mensaje</label>
                                                <textarea
                                                    placeholder="Hola, esto es una prueba desde LuxeSystem..."
                                                    rows={4}
                                                    value={testMessage}
                                                    onChange={e => setTestMessage(e.target.value)}
                                                />
                                            </div>
                                            <button
                                                className="btn-boutique accent"
                                                onClick={handleTestMessage}
                                                disabled={sendingTest}
                                            >
                                                {sendingTest ? 'Enviando...' : <><i className="bi bi-send"></i> Enviar Prueba</>}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid-side">
                                    <div className="info-card instructions">
                                        <h4><i className="bi bi-info-circle"></i> Instrucciones</h4>
                                        <ul className="info-list">
                                            <li>Asegúrate de incluir el código de país en el número (ej: <code>593</code> para Ecuador).</li>
                                            <li>Si no has configurado un <strong>Phone ID</strong>, Maytapi intentará usar el predeterminado.</li>
                                            <li>Revisa el panel de Maytapi si los mensajes no llegan.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- TAB CONFIGURACIÓN CUMPLEAÑOS --- */}
                    {activeTab === 'birthday' && (
                        <div className="tab-pane animate-fade-in">
                            <div className="boutique-grid">
                                <div className="grid-main">
                                    <div className="info-card">
                                        <h3><i className="bi bi-gift-fill" style={{ color: '#d63384' }}></i> Cumpleaños</h3>
                                        <p className="section-desc">
                                            Personaliza el mensaje y envía felicitaciones manualmente.
                                        </p>

                                        <div className="boutique-form-grid" style={{ gridTemplateColumns: '1fr' }}>

                                            {/* Oculto según solicitud, pero mantenemos estado */}
                                            {/* <div className="input-group"> ...Hora... </div> */}
                                            {/* <div className="form-group-checkbox"> ...Activar... </div> */}

                                            <div className="input-group">
                                                <label>Mensaje Personalizado</label>
                                                <div className="template-editor">
                                                    <textarea
                                                        rows={4}
                                                        value={settings.birthday_message_template}
                                                        onChange={e => setSettings({ ...settings, birthday_message_template: e.target.value })}
                                                        placeholder="Escribe tu mensaje aquí..."
                                                    />
                                                    <div className="tags-helper">
                                                        <span>Variables disponibles:</span>
                                                        <span className="tag-pill" onClick={() => setSettings({ ...settings, birthday_message_template: settings.birthday_message_template + ' {name}' })}>
                                                            {'{name}'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="preview-box">
                                                <label>Vista Previa:</label>
                                                <div className="whatsapp-bubble">
                                                    {settings.birthday_message_template ? settings.birthday_message_template.replace('{name}', 'María') : '...'}
                                                    <span className="time">09:00 AM</span>
                                                </div>
                                            </div>

                                            <div className="form-footer" style={{ justifyContent: 'space-between', marginTop: '20px' }}>
                                                <button
                                                    className="btn-boutique primary"
                                                    onClick={handleSaveSettings}
                                                    disabled={loading}
                                                >
                                                    {loading ? 'Guardando...' : <><i className="bi bi-save"></i> Guardar Plantilla</>}
                                                </button>

                                                <button
                                                    type="button"
                                                    className="btn-boutique accent"
                                                    style={{ backgroundColor: '#6c757d' }}
                                                    onClick={() => setConfirmModal({
                                                        show: true,
                                                        onConfirm: async () => {
                                                            setConfirmModal(null); // Cerrar confirm
                                                            setLoading(true); // Mostrar loading visual si se desea, o usar modal de progreso
                                                            try {
                                                                const response = await api.post('/api/integrations/maytapi/run-birthdays/', {}, {
                                                                    baseURL: process.env.REACT_APP_LUXE_SERVICE
                                                                });

                                                                fetchHistory();

                                                                const msg = response.data.message || '';
                                                                // Extraer número si es posible: "x mensajes enviados"
                                                                const match = msg.match(/(\d+)\s+mensajes/);
                                                                const count = match ? parseInt(match[1]) : 0;

                                                                if (count > 0) {
                                                                    setResultModal({
                                                                        show: true,
                                                                        type: 'success',
                                                                        title: '¡Enviado con Éxito!',
                                                                        message: `Se enviaron ${count} mensajes de felicitación.`
                                                                    });
                                                                } else {
                                                                    setResultModal({
                                                                        show: true,
                                                                        type: 'info',
                                                                        title: 'Sin Cumpleañeros',
                                                                        message: 'No hay clientes que cumplan años hoy.'
                                                                    });
                                                                }

                                                            } catch (error) {
                                                                console.error(error);
                                                                const serverError = error.response?.data?.error || error.response?.data?.detail || error.message;
                                                                setResultModal({
                                                                    show: true,
                                                                    type: 'error',
                                                                    title: 'Error',
                                                                    message: `Error del servidor: ${serverError}`
                                                                });
                                                            } finally {
                                                                setLoading(false);
                                                            }
                                                        }
                                                    })}
                                                >
                                                    <i className="bi bi-send-fill"></i> Enviar Felicitaciones
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- TAB HISTORIAL --- */}
                    {activeTab === 'history' && (
                        <div className="tab-pane animate-fade-in">
                            <div className="info-card">
                                <h3>Historial de Mensajes</h3>
                                <div className="table-responsive">
                                    <table className="boutique-table">
                                        <thead>
                                            <tr>
                                                <th>Fecha</th>
                                                <th>Teléfono</th>
                                                <th>Tipo</th>
                                                <th>Estado</th>
                                                <th>Mensaje</th>
                                                <th>Detalle</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {history.length > 0 ? (
                                                history.map((log) => (
                                                    <tr key={log.id}>
                                                        <td>{new Date(log.created_at).toLocaleString()}</td>
                                                        <td>{log.phone_number}</td>
                                                        <td>
                                                            <span className={`badge ${log.message_type === 'BIRTHDAY' ? 'badge-success' : 'badge-info'}`}>
                                                                {log.message_type}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className={`status-pill ${log.status === 'sent' ? 'success' : 'error'}`}>
                                                                {log.status}
                                                            </span>
                                                        </td>
                                                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {log.message}
                                                        </td>
                                                        <td>
                                                            <button
                                                                className="btn-icon-small"
                                                                title="Ver respuesta API"
                                                                onClick={() => alert(JSON.stringify(JSON.parse(log.response_data || '{}'), null, 2))}
                                                            >
                                                                <i className="bi bi-info-circle"></i>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="6" className="text-center">No hay registros aún.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showSuccessModal && (
                <div className="boutique-modal-overlay">
                    <div className="boutique-modal success animate-pop">
                        <div className="success-icon"><i className="bi bi-check2-circle"></i></div>
                        <h2>¡Guardado!</h2>
                        <p>Tus credenciales de Maytapi se han actualizado.</p>
                        <button className="btn-boutique primary wide" onClick={() => setShowSuccessModal(false)}>Aceptar</button>
                    </div>
                </div>
            )}

            {/* Custom Modal for Confirmation */}
            {confirmModal && confirmModal.show && (
                <div className="boutique-modal-overlay">
                    <div className="boutique-modal animate-pop">
                        <div className="modal-header">
                            <h3><i className="bi bi-question-circle"></i> Confirmar Envío</h3>
                        </div>
                        <div className="modal-body">
                            <p>¿Estás seguro de enviar felicitaciones ahora?</p>
                            <p className="text-muted small">Esto enviará mensajes a todos los clientes que cumplan años hoy ({new Date().toLocaleDateString()}).</p>
                        </div>
                        <div className="modal-actions">
                            <button className="btn-boutique secondary" onClick={() => setConfirmModal(null)}>Cancelar</button>
                            <button className="btn-boutique primary" onClick={confirmModal.onConfirm}>Confirmar y Enviar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Modal for Results */}
            {resultModal && resultModal.show && (
                <div className="boutique-modal-overlay">
                    <div className={`boutique-modal ${resultModal.type} animate-pop`}>
                        <div className={`success-icon`}>
                            <i className={`bi bi-${resultModal.type === 'success' ? 'check2-circle' : resultModal.type === 'error' ? 'x-circle' : 'info-circle'}`}></i>
                        </div>
                        <h2>{resultModal.title}</h2>
                        <p>{resultModal.message}</p>
                        <button className="btn-boutique primary wide" onClick={() => setResultModal(null)}>Aceptar</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WhatsAppConfig;



