import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const ConfiguracionSRI = () => {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Testing logic
    const [testOrderNumber, setTestOrderNumber] = useState('');
    const [emitResult, setEmitResult] = useState(null);
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/sri/config/', { baseURL: process.env.REACT_APP_LUXE_SERVICE });
            // Since it's a list (ModelViewSet), we expect first one.
            // Wait, we defined list() in backend to return the object directly.
            setConfig(response.data);
        } catch (error) {
            console.error(error);
            // Si es 404/Empty, crear en blanco
            setConfig({
                api_url: 'https://apivendo.fronteratech.ec/api/sri/documents/create_and_process_invoice_complete/',
                auth_token: '',
                environment: 'TEST',
                company_id: null,
                is_active: true
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            // La vista es un ModelViewSet pero con pk=1 forzado.
            // Para actualizar podríamos necesitar hacer POST si no existe, o PUT si existe.
            // Pero nuestro backend list() retorna el objeto único.
            // Vamos a intentar hacer POST a /api/sri/config/ (si viewset create) O PUT a /api/sri/config/1/
            // Pero el ViewSet get_object fuerza pk=1.
            // Si el objeto no existe, list() lo puede crear en get_object? No, nuestro list lo toma de get_settings() que hace get_or_create.
            // Entonces para actualizar, debemos hacer PUT/PATCH a /api/sri/config/1/

            await api.patch('/api/sri/config/1/', config, { baseURL: process.env.REACT_APP_LUXE_SERVICE });
            alert('Configuración guardada exitosamente.');
        } catch (error) {
            console.error(error);
            alert('Error al guardar configuración.');
        } finally {
            setSaving(false);
        }
    };

    const handleEmitTest = async () => {
        if (!testOrderNumber) return alert('Ingrese un número de orden');
        setTesting(true);
        setEmitResult(null);
        try {
            const res = await api.post(`/api/sri/documents/emit/${testOrderNumber}/`, {}, { baseURL: process.env.REACT_APP_LUXE_SERVICE });
            setEmitResult({ success: true, data: res.data });
        } catch (error) {
            setEmitResult({
                success: false,
                error: error.response?.data?.error || error.message,
                details: error.response?.data
            });
        } finally {
            setTesting(false);
        }
    };

    if (loading) return <div>Cargando...</div>;

    return (
        <div style={{ padding: '2rem' }}>
            <h1 style={{ marginBottom: '1.5rem', fontFamily: 'serif' }}>Configuración Facturación Electrónica (SRI)</h1>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                {/* COLUMNA IZQUIERDA: CONFIGURACION */}
                <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Credenciales y Ambiente</h2>
                    <form onSubmit={handleSave}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Ambiente</label>
                            <select
                                value={config.environment}
                                onChange={e => setConfig({ ...config, environment: e.target.value })}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                            >
                                <option value="TEST">PRUEBAS (Sandbox)</option>
                                <option value="PRODUCTION">PRODUCCIÓN</option>
                            </select>
                            {config.environment === 'TEST' && <small style={{ color: 'green' }}>✓ Modo seguro para pruebas</small>}
                            {config.environment === 'PRODUCTION' && <small style={{ color: 'red' }}>⚠️ Las facturas generadas serán válidas ante el SRI</small>}
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Token VSR (API VENDO)</label>
                            <input
                                type="text"
                                value={config.auth_token}
                                // Ocultar parcialmente si es largo
                                onChange={e => setConfig({ ...config, auth_token: e.target.value })}
                                placeholder="vsr_xxxxxxxxxxxxxxxx..."
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                            />
                            <small style={{ color: '#666' }}>Token proporcionado por FronteraTech en el panel de integración.</small>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={config.is_active}
                                    onChange={e => setConfig({ ...config, is_active: e.target.checked })}
                                />
                                <span>Activar Integración</span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="ff-button ff-button-primary"
                            style={{ width: '100%', marginTop: '1rem', cursor: saving ? 'wait' : 'pointer' }}
                        >
                            {saving ? 'Guardando...' : 'Guardar Configuración'}
                        </button>

                        {/* Opciones Avanzadas */}
                        <div style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                            <details>
                                <summary style={{ cursor: 'pointer', color: '#666', fontSize: '0.9rem', userSelect: 'none' }}>⚙️ Opciones Avanzadas</summary>
                                <div style={{ marginTop: '1rem', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>

                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem' }}>URL del Endpoint (API)</label>
                                        <input
                                            type="url"
                                            value={config.api_url || ''}
                                            onChange={e => setConfig({ ...config, api_url: e.target.value })}
                                            placeholder="https://..."
                                            style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem' }}
                                        />
                                        <small style={{ color: '#999', fontSize: '0.75rem' }}>Solo cambiar si FronteraTech provee una URL distinta.</small>
                                    </div>

                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem' }}>ID de Empresa (Forzar)</label>
                                        <input
                                            type="number"
                                            value={config.company_id || ''}
                                            onChange={e => setConfig({ ...config, company_id: e.target.value ? parseInt(e.target.value) : null })}
                                            placeholder="Ej: 4"
                                            style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem' }}
                                        />
                                        <small style={{ color: '#999', fontSize: '0.75rem' }}>Dejar vacío para usar la empresa predeterminada del Token.</small>
                                    </div>

                                </div>
                            </details>
                        </div>
                    </form>
                </div>

                {/* COLUMNA DERECHA: PRUEBAS */}
                <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Entorno de Pruebas</h2>
                    <p style={{ marginBottom: '1rem', color: '#666' }}>
                        Prueba la emisión de una factura tomando una orden existente. Asegúrate de estar en ambiente <strong>TEST</strong> si es una prueba.
                    </p>

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
                        <input
                            type="text"
                            placeholder="Número de Orden (ej: ORD-123)"
                            value={testOrderNumber}
                            onChange={e => setTestOrderNumber(e.target.value)}
                            style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                        <button
                            onClick={handleEmitTest}
                            disabled={testing || !config.auth_token}
                            className="ff-button"
                            style={{ backgroundColor: '#28a745', color: 'white', border: 'none', cursor: (testing || !config.auth_token) ? 'not-allowed' : 'pointer' }}
                        >
                            {testing ? 'Emitiendo...' : '🚀 Emitir Prueba'}
                        </button>
                    </div>

                    {emitResult && (
                        <div style={{
                            padding: '1rem',
                            borderRadius: '4px',
                            backgroundColor: emitResult.success ? '#d4edda' : '#f8d7da',
                            color: emitResult.success ? '#155724' : '#721c24',
                            border: `1px solid ${emitResult.success ? '#c3e6cb' : '#f5c6cb'}`
                        }}>
                            {emitResult.success ? (
                                <div>
                                    <strong>¡Éxito! Factura Emitida</strong>
                                    <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
                                        <li>Estado: {emitResult.data.status}</li>
                                        <li>Nro. SRI: {emitResult.data.sri_number}</li>
                                        <li>Clave Acceso: <span style={{ fontSize: '0.8em' }}>{emitResult.data.access_key}</span></li>
                                    </ul>
                                </div>
                            ) : (
                                <div>
                                    <strong style={{ display: 'block', marginBottom: '8px' }}>❌ Error al Emitir</strong>

                                    {/* Mensaje principal */}
                                    <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                                        {emitResult.details?.error_message || emitResult.error}
                                    </p>

                                    {/* Sugerencias Inteligentes */}
                                    {JSON.stringify(emitResult.details).includes('CERTIFICATE_NOT_AVAILABLE') && (
                                        <div style={{ backgroundColor: '#fff3cd', padding: '10px', borderRadius: '4px', marginBottom: '10px', fontSize: '0.9rem', color: '#856404', border: '1px solid #ffeeba' }}>
                                            <strong>💡 Solución:</strong> Falta subir la <u>Firma Electrónica (.p12)</u> en el panel de FronteraTech.
                                            <br />Luxe se conectó bien, pero la API de facturación no puede firmar sin ese archivo.
                                        </div>
                                    )}

                                    {JSON.stringify(emitResult.details).includes('SRI_CONFIGURATION_MISSING') && (
                                        <div style={{ backgroundColor: '#fff3cd', padding: '10px', borderRadius: '4px', marginBottom: '10px', fontSize: '0.9rem', color: '#856404', border: '1px solid #ffeeba' }}>
                                            <strong>💡 Solución:</strong> Falta configurar el establecimiento y punto de emisión en el panel de FronteraTech.
                                        </div>
                                    )}

                                    {/* Detalles técnicos (collapsible o pequeño) */}
                                    <details style={{ marginTop: '10px' }}>
                                        <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: '#666' }}>Ver detalles técnicos</summary>
                                        <pre style={{ fontSize: '0.7em', overflowX: 'auto', marginTop: '5px', backgroundColor: 'rgba(255,255,255,0.5)', padding: '5px' }}>
                                            {JSON.stringify(emitResult.details, null, 2)}
                                        </pre>
                                    </details>
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default ConfiguracionSRI;
