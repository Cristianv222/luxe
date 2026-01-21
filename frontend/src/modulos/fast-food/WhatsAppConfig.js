import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import './WhatsAppConfig.css';

const WhatsAppConfig = () => {
    const [settings, setSettings] = useState({
        is_active: true,
        schedule_time: '09:00',
        session_name: 'luxe_session',
        phone_number_sender: '0994712899',
        birthday_message_template: '🎉 ¡Feliz Cumpleaños {first_name}! 🎂\nEn Luxe queremos celebrar contigo.\n🎁 Tienes un 10% DE DESCUENTO en tu próxima compra.\n¡Te esperamos!'
    });
    const [connectionStatus, setConnectionStatus] = useState('checking');
    const [qrCode, setQrCode] = useState(null);
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
        setConnectionStatus('checking');
        try {
            const response = await api.get('/api/integrations/whatsapp/status/', {
                baseURL: process.env.REACT_APP_LUXE_SERVICE
            });
            setConnectionStatus(response.data.status);
        } catch (error) {
            setConnectionStatus('offline');
        }
    }, []);

    useEffect(() => {
        fetchSettings();
        checkStatus();
    }, [fetchSettings, checkStatus]);

    const handleSaveSettings = async () => {
        setLoading(true);
        try {
            await api.put('/api/integrations/whatsapp/settings/', settings, {
                baseURL: process.env.REACT_APP_LUXE_SERVICE
            });
            setMessage({ type: 'success', text: '✅ Configuración guardada correctamente' });
        } catch (error) {
            setMessage({ type: 'error', text: '❌ Error al guardar la configuración' });
        }
        setLoading(false);
    };

    const handleStartSession = async () => {
        setLoading(true);
        setQrCode(null);
        setMessage({ type: 'info', text: '⏳ Iniciando sesión de WhatsApp...' });
        try {
            await api.post('/api/integrations/whatsapp/start-session/', {}, {
                baseURL: process.env.REACT_APP_LUXE_SERVICE
            });

            // Iniciar polling para obtener el QR
            let attempts = 0;
            const maxAttempts = 10;

            const pollQr = setInterval(async () => {
                attempts++;
                try {
                    const qrResponse = await api.get('/api/integrations/whatsapp/qrcode/', {
                        baseURL: process.env.REACT_APP_LUXE_SERVICE
                    });

                    if (qrResponse.data.qrcode) {
                        setQrCode(qrResponse.data.qrcode);
                        setMessage({ type: 'info', text: '📷 Escanea el código QR con tu WhatsApp' });
                        clearInterval(pollQr);
                        setLoading(false);
                    } else if (attempts >= maxAttempts) {
                        setMessage({ type: 'warning', text: '⚠️ El QR tardó demasiado. Intenta refrescar el estado.' });
                        clearInterval(pollQr);
                        setLoading(false);
                    }
                } catch (err) {
                    if (attempts >= maxAttempts) {
                        clearInterval(pollQr);
                        setLoading(false);
                    }
                }
            }, 3000);

        } catch (error) {
            setMessage({ type: 'error', text: '❌ Error al iniciar sesión' });
            setLoading(false);
        }
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
                message: '🧪 Mensaje de prueba desde Luxe Sistema - ¡La conexión funciona!'
            }, {
                baseURL: process.env.REACT_APP_LUXE_SERVICE
            });
            setMessage({ type: 'success', text: `✅ Mensaje de prueba enviado a ${testPhone}` });
        } catch (error) {
            setMessage({ type: 'error', text: '❌ Error al enviar mensaje de prueba' });
        }
        setLoading(false);
    };

    const getStatusBadge = () => {
        switch (connectionStatus) {
            case 'connected':
                return <span className="status-badge connected">🟢 Conectado</span>;
            case 'disconnected':
                return <span className="status-badge disconnected">🔴 Desconectado</span>;
            case 'offline':
                return <span className="status-badge offline">⚫ Servicio No Disponible</span>;
            default:
                return <span className="status-badge checking">🔄 Verificando...</span>;
        }
    };

    return (
        <div className="whatsapp-config-container">
            <div className="whatsapp-header">
                <div className="header-icon">
                    <i className="bi bi-whatsapp"></i>
                </div>
                <div>
                    <h1>Configuración WhatsApp</h1>
                    <p>Automatización de mensajes de cumpleaños</p>
                </div>
            </div>

            {message.text && (
                <div className={`alert alert-${message.type}`}>
                    {message.text}
                </div>
            )}

            {/* Connection Status Card */}
            <div className="config-card">
                <div className="card-header">
                    <h3><i className="bi bi-wifi"></i> Estado de Conexión</h3>
                    {getStatusBadge()}
                </div>
                <div className="card-body">
                    <div className="connection-actions">
                        <button
                            className="btn btn-primary"
                            onClick={handleStartSession}
                            disabled={loading}
                        >
                            <i className="bi bi-qr-code"></i> Iniciar/Vincular Sesión
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={checkStatus}
                            disabled={loading}
                        >
                            <i className="bi bi-arrow-clockwise"></i> Actualizar Estado
                        </button>
                    </div>

                    {qrCode && (
                        <div className="qr-code-container">
                            <p>Escanea este código con tu WhatsApp:</p>
                            <img src={qrCode} alt="QR Code" className="qr-code-image" />
                            <p className="qr-instructions">
                                Abre WhatsApp → Configuración → Dispositivos Vinculados → Vincular un dispositivo
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Test Message Card */}
            <div className="config-card">
                <div className="card-header">
                    <h3><i className="bi bi-send"></i> Enviar Mensaje de Prueba</h3>
                </div>
                <div className="card-body">
                    <div className="test-message-form">
                        <input
                            type="text"
                            placeholder="Número de teléfono (ej: 0987654321)"
                            value={testPhone}
                            onChange={(e) => setTestPhone(e.target.value)}
                            className="form-input"
                        />
                        <button
                            className="btn btn-success"
                            onClick={handleTestMessage}
                            disabled={loading || connectionStatus !== 'connected'}
                        >
                            <i className="bi bi-send-fill"></i> Enviar Prueba
                        </button>
                    </div>
                </div>
            </div>

            {/* Settings Card */}
            <div className="config-card">
                <div className="card-header">
                    <h3><i className="bi bi-gear"></i> Configuración de Automatización</h3>
                </div>
                <div className="card-body">
                    <div className="settings-form">
                        <div className="form-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={settings.is_active}
                                    onChange={(e) => setSettings({ ...settings, is_active: e.target.checked })}
                                />
                                <span className="checkbox-label">Automatización Activa</span>
                            </label>
                        </div>

                        <div className="form-group">
                            <label>Hora de Envío Diario</label>
                            <input
                                type="time"
                                value={settings.schedule_time}
                                onChange={(e) => setSettings({ ...settings, schedule_time: e.target.value })}
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label>Nombre de Sesión</label>
                            <input
                                type="text"
                                value={settings.session_name}
                                onChange={(e) => setSettings({ ...settings, session_name: e.target.value })}
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label>Número Emisor (Referencia)</label>
                            <input
                                type="text"
                                value={settings.phone_number_sender}
                                onChange={(e) => setSettings({ ...settings, phone_number_sender: e.target.value })}
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label>Plantilla de Mensaje de Cumpleaños</label>
                            <textarea
                                value={settings.birthday_message_template}
                                onChange={(e) => setSettings({ ...settings, birthday_message_template: e.target.value })}
                                className="form-textarea"
                                rows={6}
                            />
                            <small className="form-hint">
                                Variables disponibles: {'{first_name}'}, {'{last_name}'}
                            </small>
                        </div>

                        <button
                            className="btn btn-primary btn-save"
                            onClick={handleSaveSettings}
                            disabled={loading}
                        >
                            <i className="bi bi-check-lg"></i> Guardar Configuración
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WhatsAppConfig;
