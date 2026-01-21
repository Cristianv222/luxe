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
    const [message, setMessage] = useState({ type: '', text: '' });

    const fetchSettings = useCallback(async () => {
        try {
            const response = await api.get('/api/integrations/whatsapp/settings/', {
                baseURL: process.env.REACT_APP_LUXE_SERVICE
            });
            setSettings(response.data);
        } catch (error) {
            console.error('Error fetching settings:', error);
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

        // Polling de estado cada 10 segundos
        const timer = setInterval(checkStatus, 10000);
        return () => clearInterval(timer);
    }, [fetchSettings, checkStatus]);

    const handleSaveSettings = async () => {
        setLoading(true);
        try {
            await api.put('/api/integrations/whatsapp/settings/', settings, {
                baseURL: process.env.REACT_APP_LUXE_SERVICE
            });
            setMessage({ type: 'success', text: '✅ Configuración guardada correctamente' });
            setTimeout(() => setMessage({ type: '', text: '' }), 5000);
        } catch (error) {
            setMessage({ type: 'error', text: '❌ Error al guardar la configuración' });
        }
        setLoading(false);
    };

    const handleStartSession = async () => {
        setLoading(true);
        setQrCode(null);
        setShowModal(true); // Mostrar modal inmediatamente
        setMessage({ type: 'info', text: '⏳ Preparando conexión con WhatsApp...' });

        try {
            // 1. Iniciar sesión en el backend
            try {
                await api.post('/api/integrations/whatsapp/start-session/', {}, {
                    baseURL: process.env.REACT_APP_LUXE_SERVICE
                });
            } catch (startError) {
                console.warn('Advertencia en start-session, intentando polling de todas formas:', startError);
                // Si falla pero es un 503, a veces es porque la sesión ya existe o el token falló momentáneamente.
                // Continuamos al polling para ver si el QR está disponible.
            }

            // 2. Polling agresivo para el QR
            let attempts = 0;
            const maxAttempts = 20;

            const pollQr = setInterval(async () => {
                attempts++;
                try {
                    // 1. Pedir el QR actual
                    const qrResponse = await api.get('/api/integrations/whatsapp/qrcode/', {
                        baseURL: process.env.REACT_APP_LUXE_SERVICE
                    });

                    if (qrResponse.data.qrcode) {
                        setQrCode(qrResponse.data.qrcode);
                        setLoading(false);
                    } else {
                        // Si no hay QR, seguimos informando al usuario
                        const waitMsg = attempts % 3 === 0 ? '⌛ Sincronizando con el servidor...' : '⏳ Generando imagen segura...';
                        setMessage({ type: 'info', text: `${waitMsg} (Intento ${attempts})` });
                    }

                    // 2. Verificar si ya se conectó (para cerrar el modal automáticamente)
                    const statusRes = await api.get('/api/integrations/whatsapp/status/', {
                        baseURL: process.env.REACT_APP_LUXE_SERVICE
                    });

                    if (statusRes.data.status === 'connected') {
                        setConnectionStatus('connected');
                        setQrCode(null);
                        setShowModal(false);
                        clearInterval(pollQr);
                        setMessage({ type: 'success', text: '✅ ¡WhatsApp vinculado con éxito!' });
                    }

                    if (attempts >= maxAttempts) {
                        clearInterval(pollQr);
                        setLoading(false);
                        setMessage({ type: 'warning', text: '⚠️ Tiempo de espera agotado. Intenta de nuevo.' });
                    }
                } catch (err) {
                    console.error('Error en polling:', err);
                }
            }, 3000);

            // Guardamos el ID del intervalo en el objeto window para poder limpiarlo al cerrar el modal
            window.activeQrPoll = pollQr;

        } catch (error) {
            setMessage({ type: 'error', text: '❌ Error al iniciar el servicio de WhatsApp' });
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
        if (!window.confirm('¿Estás seguro de que deseas cerrar la sesión de WhatsApp? Tendrás que volver a vincular el dispositivo.')) {
            return;
        }

        setLoading(true);
        try {
            await api.post('/api/integrations/whatsapp/logout/', {}, {
                baseURL: process.env.REACT_APP_LUXE_SERVICE
            });
            setMessage({ type: 'success', text: '✅ Sesión cerrada correctamente' });
            setConnectionStatus('disconnected');
            setQrCode(null);
        } catch (error) {
            setMessage({ type: 'error', text: '❌ Error al cerrar la sesión' });
        }
        setLoading(false);
    };

    const handleTestMessage = async () => {
        if (!testPhone) {
            setMessage({ type: 'error', text: '❌ Ingresa un número de teléfono' });
            return;
        }
        setLoading(true);
        try {
            await api.post('/api/integrations/whatsapp/test-message/', {
                phone: testPhone,
                message: '🧪 *Luxe Restaurante*: ¡La conexión de WhatsApp funciona perfectamente! 🎉'
            }, {
                baseURL: process.env.REACT_APP_LUXE_SERVICE
            });
            setMessage({ type: 'success', text: `✅ Mensaje enviado con éxito a ${testPhone}` });
        } catch (error) {
            const errorMsg = error.response?.data?.details?.message || 'Error al enviar mensaje';
            setMessage({ type: 'error', text: `❌ ${errorMsg}` });
        }
        setLoading(false);
    };

    const getStatusHeader = () => {
        switch (connectionStatus) {
            case 'connected': return { label: 'Conectado', color: 'connected' };
            case 'disconnected': return { label: 'Desconectado', color: 'disconnected' };
            case 'offline': return { label: 'Servicio Offline', color: 'offline' };
            default: return { label: 'Verificando...', color: 'checking' };
        }
    };

    const statusInfo = getStatusHeader();

    return (
        <div className="whatsapp-config-container">
            <div className="whatsapp-header">
                <div className="header-icon">
                    <i className="bi bi-whatsapp"></i>
                </div>
                <div>
                    <h1>Centro de WhatsApp</h1>
                    <p>Gestiona la conexión y automatización de mensajes</p>
                </div>
            </div>

            {message.text && (
                <div className={`alert alert-${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="config-card">
                <div className="card-header">
                    <h3><i className="bi bi-broadcast"></i> Conectividad</h3>
                    <span className={`status-badge ${statusInfo.color}`}>
                        {statusInfo.label}
                    </span>
                </div>
                <div className="card-body">
                    <div className="connection-actions" style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            className="btn btn-primary"
                            onClick={handleStartSession}
                            disabled={loading || connectionStatus === 'connected'}
                        >
                            <i className="bi bi-qr-code-scan"></i>
                            {connectionStatus === 'connected' ? 'Sesión Activa' : 'Vincular Nuevo Dispositivo'}
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={checkStatus}
                            disabled={loading}
                        >
                            <i className="bi bi-arrow-repeat"></i> Actualizar
                        </button>

                        {connectionStatus === 'connected' && (
                            <button
                                className="btn btn-error"
                                onClick={handleLogout}
                                disabled={loading}
                                style={{ background: '#ff4d4f', color: 'white' }}
                            >
                                <i className="bi bi-box-arrow-right"></i> Cerrar Sesión
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal para Vincular QR */}
            {showModal && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={handleCloseModal}>&times;</button>
                        <h2>Vincular WhatsApp</h2>
                        <p>Escanea el código para habilitar las notificaciones</p>

                        {qrCode ? (
                            <div className="qr-container">
                                <img src={qrCode} alt="WhatsApp QR" className="qr-code-image" />
                                <div className="qr-instructions">
                                    <strong>¿Cómo vincular?</strong><br />
                                    1. Abre WhatsApp en tu teléfono.<br />
                                    2. Menú (⋮ o Configuración) &gt; Dispositivos vinculados.<br />
                                    3. Toca en 'Vincular un dispositivo'.
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: '2rem', textAlign: 'center' }}>
                                <div className="spinner-border text-success" role="status"></div>
                                <p style={{ marginTop: '1rem' }}>Generando código QR...</p>
                                {message.text && <p className="text-muted small">{message.text}</p>}
                                {message.raw && (
                                    <div className="debug-error" style={{ fontSize: '10px', color: '#ff4d4f', marginTop: '10px' }}>
                                        Debug: {message.raw}
                                    </div>
                                )}
                                {!loading && message.type === 'error' && (
                                    <button
                                        className="btn btn-primary mt-3"
                                        onClick={handleStartSession}
                                    >
                                        <i className="bi bi-arrow-repeat"></i> Reintentar
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Test Message Section */}
            <div className="config-card">
                <div className="card-header">
                    <h3><i className="bi bi-patch-check"></i> Prueba de Mensajería</h3>
                </div>
                <div className="card-body">
                    <div className="test-message-form">
                        <input
                            type="text"
                            placeholder="Número con código de país (ej: +593...)"
                            value={testPhone}
                            onChange={(e) => setTestPhone(e.target.value)}
                            className="form-input"
                        />
                        <button
                            className="btn btn-success"
                            onClick={handleTestMessage}
                            disabled={loading || connectionStatus !== 'connected'}
                        >
                            <i className="bi bi-send-fill"></i> Enviar Test
                        </button>
                    </div>
                </div>
            </div>

            {/* Settings Sections */}
            <div className="config-card">
                <div className="card-header">
                    <h3><i className="bi bi-sliders"></i> Parámetros de Automatización</h3>
                </div>
                <div className="card-body">
                    <div className="settings-form">
                        <div className="form-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={settings.is_active}
                                    onChange={(e) => setSettings({ ...settings, is_active: e.target.checked })}
                                    style={{ marginRight: '10px' }}
                                />
                                Activar envío automático de cumpleaños
                            </label>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label>Intervalo de envío (Hora)</label>
                                <input
                                    type="time"
                                    value={settings.schedule_time}
                                    onChange={(e) => setSettings({ ...settings, schedule_time: e.target.value })}
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Nombre Identificador de Sesión</label>
                                <input
                                    type="text"
                                    value={settings.session_name}
                                    readOnly
                                    className="form-input"
                                    style={{ background: '#f5f5f5' }}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Plantilla del Mensaje</label>
                            <textarea
                                value={settings.birthday_message_template}
                                onChange={(e) => setSettings({ ...settings, birthday_message_template: e.target.value })}
                                className="form-textarea"
                                rows={5}
                                placeholder="Hola {first_name}, feliz cumpleaños..."
                            />
                            <small style={{ color: '#666' }}>Usa {'{first_name}'} y {'{last_name}'} para personalizar.</small>
                        </div>

                        <button
                            className="btn btn-primary"
                            onClick={handleSaveSettings}
                            disabled={loading}
                            style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
                        >
                            <i className="bi bi-cloud-check"></i> Guardar Configuración
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WhatsAppConfig;
