import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../../comun/Modal';
import './FastFood.css';

const LUXE_URL = process.env.REACT_APP_LUXE_SERVICE;

const SistemaMaquinas = () => {
    const [activeTab, setActiveTab] = useState('label'); // 'label' o 'thermal'
    const [printers, setPrinters] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPrinter, setEditingPrinter] = useState(null);
    const [testing, setTesting] = useState(null);
    const [testResult, setTestResult] = useState(null);
    const [showJobsModal, setShowJobsModal] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        printer_type: 'label',
        connection_type: 'usb',
        connection_string: '',
        port: 9100,
        paper_width: 57,
        characters_per_line: 42,
        has_cash_drawer: false,
        is_active: true,
        is_default: false
    });

    const CONNECTION_TYPES = [
        { value: 'usb', label: 'USB', placeholder: 'COM1 o /dev/usb/lp0', icon: 'bi-usb-symbol' },
        { value: 'network', label: 'Red/LAN', placeholder: '192.168.1.100', icon: 'bi-ethernet' },
        { value: 'serial', label: 'Serial/COM', placeholder: 'COM3', icon: 'bi-plug' },
    ];

    const LABEL_SIZES = [
        { value: 57, label: '57 x 27 mm (Estándar)' },
        { value: 40, label: '40 x 30 mm' },
        { value: 60, label: '60 x 40 mm' },
        { value: 100, label: '100 x 50 mm' },
    ];

    const PAPER_WIDTHS = [
        { value: 58, label: '58mm' },
        { value: 80, label: '80mm' },
    ];

    useEffect(() => {
        fetchPrinters();
    }, [activeTab]);

    const fetchPrinters = async () => {
        setLoading(true);
        try {
            const printerType = activeTab === 'label' ? 'label' : 'thermal';
            const response = await api.get('/api/hardware/printers/', {
                baseURL: LUXE_URL,
                params: { printer_type: printerType }
            });
            const data = response.data.results || response.data || [];
            setPrinters(data.filter(p => p.printer_type === printerType));
        } catch (error) {
            console.error('Error loading printers:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchJobs = async () => {
        try {
            const response = await api.get('/api/hardware/jobs/', {
                baseURL: LUXE_URL,
                params: { ordering: '-created_at', limit: 50 }
            });
            const data = response.data.results || response.data || [];
            if (activeTab === 'label') {
                setJobs(data.filter(j => j.data?.type === 'label'));
            } else {
                setJobs(data.filter(j => j.data?.type !== 'label'));
            }
            setShowJobsModal(true);
        } catch (error) {
            console.error('Error loading jobs:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const printerType = activeTab === 'label' ? 'label' : 'thermal';
            const payload = {
                ...formData,
                printer_type: printerType,
                has_cash_drawer: activeTab === 'thermal' ? formData.has_cash_drawer : false,
                characters_per_line: activeTab === 'thermal' ? formData.characters_per_line : 32
            };

            if (editingPrinter) {
                await api.patch(`/api/hardware/printers/${editingPrinter.id}/`, payload, { baseURL: LUXE_URL });
            } else {
                await api.post('/api/hardware/printers/', payload, { baseURL: LUXE_URL });
            }
            fetchPrinters();
            closeModal();
        } catch (error) {
            console.error('Error saving printer:', error);
            alert(`Error: ${error.response?.data?.detail || JSON.stringify(error.response?.data) || error.message}`);
        }
    };

    const handleDelete = async (printer) => {
        const tipo = activeTab === 'label' ? 'etiquetadora' : 'impresora';
        if (!window.confirm(`¿Eliminar ${tipo} "${printer.name}"?`)) return;
        try {
            await api.delete(`/api/hardware/printers/${printer.id}/`, { baseURL: LUXE_URL });
            fetchPrinters();
        } catch (error) {
            console.error('Error deleting printer:', error);
            alert(`Error: ${error.response?.data?.detail || error.message}`);
        }
    };

    const handleTest = async (printer) => {
        setTesting(printer.id);
        setTestResult(null);
        try {
            let response;
            if (activeTab === 'label') {
                response = await api.post('/api/hardware/print/label/', {
                    products: [{ name: 'PRUEBA ETIQUETA', code: '12345678', price: 9.99 }],
                    copies: 1,
                    printer_id: printer.id
                }, { baseURL: LUXE_URL });
            } else {
                response = await api.post(`/api/hardware/printers/${printer.id}/test_print/`, {}, { baseURL: LUXE_URL });
            }

            if (response.data.status === 'success' || response.data.message) {
                setTestResult({
                    id: printer.id,
                    success: true,
                    message: `✓ Prueba enviada correctamente`
                });
            } else {
                setTestResult({ id: printer.id, success: false, message: `✗ ${response.data.message || 'Error'}` });
            }
        } catch (error) {
            setTestResult({
                id: printer.id,
                success: false,
                message: `✗ ${error.response?.data?.error || error.message}`
            });
        } finally {
            setTesting(null);
        }
    };

    const openModal = (printer = null) => {
        const printerType = activeTab === 'label' ? 'label' : 'thermal';
        if (printer) {
            setEditingPrinter(printer);
            setFormData({
                name: printer.name,
                printer_type: printerType,
                connection_type: printer.connection_type,
                connection_string: printer.connection_string,
                port: printer.port || 9100,
                paper_width: printer.paper_width || (activeTab === 'label' ? 57 : 80),
                characters_per_line: printer.characters_per_line || 42,
                has_cash_drawer: printer.has_cash_drawer || false,
                is_active: printer.is_active,
                is_default: printer.is_default
            });
        } else {
            setEditingPrinter(null);
            setFormData({
                name: '',
                printer_type: printerType,
                connection_type: 'usb',
                connection_string: '',
                port: 9100,
                paper_width: activeTab === 'label' ? 57 : 80,
                characters_per_line: 42,
                has_cash_drawer: false,
                is_active: true,
                is_default: false
            });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingPrinter(null);
        setTestResult(null);
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { className: 'status-badge pending', label: 'Pendiente' },
            printing: { className: 'status-badge', style: { backgroundColor: 'rgba(33, 150, 243, 0.1)', color: '#1976D2' }, label: 'Imprimiendo' },
            completed: { className: 'status-badge completed', label: 'Completado' },
            failed: { className: 'status-badge', style: { backgroundColor: 'rgba(211, 47, 47, 0.1)', color: '#D32F2F' }, label: 'Fallido' },
        };
        const badge = badges[status] || badges.pending;
        return (
            <span className={badge.className} style={badge.style}>
                {badge.label}
            </span>
        );
    };

    const isLabelTab = activeTab === 'label';
    const titulo = isLabelTab ? 'Etiquetadoras' : 'Impresoras Térmicas';
    const icono = isLabelTab ? 'bi-tags' : 'bi-printer';
    const descripcionVacia = isLabelTab
        ? 'Agrega tu impresora 3nStar LDT114 u otra etiquetadora TSPL.'
        : 'Configura tus impresoras de tickets y recibos.';

    return (
        <div className="luxe-layout" style={{ padding: '2rem', backgroundColor: 'var(--color-froth)', minHeight: '100vh' }}>
            {/* Header */}
            <div className="ff-welcome-header" style={{ marginBottom: '2rem', padding: '2rem', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--color-dark)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <i className="bi bi-gear" style={{ color: 'var(--color-cinna)' }}></i>
                        Sistema de Máquinas
                    </h1>
                    <p style={{ color: 'var(--color-latte)', fontSize: '1rem' }}>
                        Configura y administra tus impresoras de etiquetas y térmica
                    </p>
                </div>
                <button
                    onClick={fetchJobs}
                    className="ff-button ff-button-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <i className="bi bi-clock-history"></i> Historial
                </button>
            </div>

            {/* Tabs */}
            <div className="ff-tabs-container" style={{ marginBottom: '1.5rem' }}>
                <button
                    onClick={() => { setActiveTab('label'); setTestResult(null); }}
                    className={`ff-tab ${activeTab === 'label' ? 'active' : ''}`}
                >
                    <i className="bi bi-tags" style={{ marginRight: '0.5rem' }}></i>
                    Etiquetadoras
                </button>
                <button
                    onClick={() => { setActiveTab('thermal'); setTestResult(null); }}
                    className={`ff-tab ${activeTab === 'thermal' ? 'active' : ''}`}
                >
                    <i className="bi bi-printer" style={{ marginRight: '0.5rem' }}></i>
                    Impresoras
                </button>
            </div>

            {/* Add Button */}
            <div style={{ marginBottom: '1.5rem' }}>
                <button onClick={() => openModal()} className="ff-button ff-button-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <i className="bi bi-plus-lg"></i> Nueva {isLabelTab ? 'Etiquetadora' : 'Impresora'}
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-latte)' }}>
                    <i className="bi bi-arrow-repeat" style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }}></i>
                    <p style={{ marginTop: '1rem' }}>Cargando...</p>
                </div>
            ) : printers.length === 0 ? (
                <div className="ff-card" style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="ff-card-icon-wrapper" style={{ margin: '0 auto 1.5rem', width: '80px', height: '80px' }}>
                        <i className={`bi ${icono}`} style={{ fontSize: '2.5rem', color: 'var(--color-cinna)' }}></i>
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--color-dark)', marginBottom: '0.75rem' }}>
                        No hay {titulo.toLowerCase()} configuradas
                    </h3>
                    <p style={{ color: 'var(--color-latte)', marginBottom: '1.5rem' }}>
                        {descripcionVacia}
                    </p>
                    <button onClick={() => openModal()} className="ff-button ff-button-primary">
                        <i className="bi bi-plus-lg" style={{ marginRight: '0.5rem' }}></i>
                        Agregar {isLabelTab ? 'Etiquetadora' : 'Impresora'}
                    </button>
                </div>
            ) : (
                <div className="ff-card-grid">
                    {printers.map(printer => {
                        const connInfo = CONNECTION_TYPES.find(c => c.value === printer.connection_type);
                        const result = testResult?.id === printer.id ? testResult : null;

                        return (
                            <div key={printer.id} className="ff-card" style={{ padding: 0, overflow: 'hidden' }}>
                                {/* Card Header */}
                                <div style={{
                                    padding: '1.25rem 1.5rem',
                                    backgroundColor: 'var(--color-froth)',
                                    borderBottom: '1px solid var(--color-chai)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div className="ff-card-icon-wrapper" style={{ margin: 0, width: '50px', height: '50px' }}>
                                            <i className={`bi ${icono}`} style={{ fontSize: '1.5rem', color: 'var(--color-cinna)' }}></i>
                                        </div>
                                        <div>
                                            <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--color-dark)', marginBottom: '0.25rem' }}>
                                                {printer.name}
                                            </h4>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--color-latte)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                {isLabelTab ? 'TSPL' : 'ESC/POS'}
                                            </span>
                                        </div>
                                    </div>
                                    {printer.is_default && (
                                        <span style={{
                                            backgroundColor: 'var(--color-cinna)',
                                            color: 'white',
                                            fontSize: '0.7rem',
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '2px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px',
                                            fontWeight: '600'
                                        }}>
                                            Principal
                                        </span>
                                    )}
                                </div>

                                {/* Card Body */}
                                <div style={{ padding: '1.25rem 1.5rem' }}>
                                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                            <span style={{ color: 'var(--color-latte)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <i className={`bi ${connInfo?.icon || 'bi-plug'}`}></i> Conexión:
                                            </span>
                                            <span style={{ fontWeight: '600', color: 'var(--color-dark)' }}>{connInfo?.label}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                            <span style={{ color: 'var(--color-latte)' }}>Puerto/Dir:</span>
                                            <span style={{
                                                fontFamily: 'monospace',
                                                fontSize: '0.8rem',
                                                backgroundColor: 'var(--color-froth)',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '2px'
                                            }}>
                                                {printer.connection_string}
                                                {printer.connection_type === 'network' && printer.port && `:${printer.port}`}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                            <span style={{ color: 'var(--color-latte)' }}>
                                                {isLabelTab ? 'Tamaño Etiqueta:' : 'Ancho Papel:'}
                                            </span>
                                            <span style={{ fontWeight: '600', color: 'var(--color-dark)' }}>{printer.paper_width}mm</span>
                                        </div>
                                        {!isLabelTab && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                                <span style={{ color: 'var(--color-latte)' }}>Caja Registradora:</span>
                                                <span style={{ color: printer.has_cash_drawer ? '#2E7D32' : 'var(--color-latte)' }}>
                                                    {printer.has_cash_drawer ? '● Sí' : '○ No'}
                                                </span>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                            <span style={{ color: 'var(--color-latte)' }}>Estado:</span>
                                            <span style={{ color: printer.is_active ? '#2E7D32' : '#D32F2F' }}>
                                                {printer.is_active ? '● Activa' : '○ Inactiva'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Test Result */}
                                    {result && (
                                        <div style={{
                                            marginTop: '1rem',
                                            padding: '0.75rem',
                                            borderRadius: '4px',
                                            backgroundColor: result.success ? 'rgba(46, 125, 50, 0.1)' : 'rgba(211, 47, 47, 0.1)',
                                            color: result.success ? '#2E7D32' : '#D32F2F',
                                            fontSize: '0.85rem',
                                            fontWeight: '500'
                                        }}>
                                            {result.message}
                                        </div>
                                    )}
                                </div>

                                {/* Card Footer */}
                                <div style={{
                                    borderTop: '1px solid var(--color-froth)',
                                    padding: '1rem 1.5rem',
                                    display: 'flex',
                                    gap: '0.5rem',
                                    backgroundColor: '#FAFAFA'
                                }}>
                                    <button
                                        onClick={() => handleTest(printer)}
                                        disabled={testing === printer.id}
                                        className="ff-button ff-button-primary"
                                        style={{ flex: 1, padding: '0.6rem', fontSize: '0.8rem' }}
                                    >
                                        {testing === printer.id ? (
                                            <><i className="bi bi-arrow-repeat" style={{ animation: 'spin 1s linear infinite' }}></i> Probando...</>
                                        ) : (
                                            <><i className="bi bi-play-fill"></i> Probar</>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => openModal(printer)}
                                        className="ff-button ff-button-secondary"
                                        style={{ padding: '0.6rem 1rem', fontSize: '0.8rem' }}
                                    >
                                        <i className="bi bi-pencil"></i>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(printer)}
                                        className="ff-button ff-button-danger"
                                        style={{ padding: '0.6rem 1rem', fontSize: '0.8rem' }}
                                    >
                                        <i className="bi bi-trash"></i>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal Add/Edit */}
            <Modal isOpen={showModal} onClose={closeModal} title={editingPrinter ? `Editar ${isLabelTab ? 'Etiquetadora' : 'Impresora'}` : `Nueva ${isLabelTab ? 'Etiquetadora' : 'Impresora'}`}>
                <form onSubmit={handleSubmit}>
                    {/* Name */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label className="ff-label">Nombre *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                            placeholder={isLabelTab ? 'Ej: 3nStar LDT114' : 'Ej: Impresora Caja 1'}
                            className="ff-search-input"
                        />
                    </div>

                    {/* Connection Type */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label className="ff-label">Tipo de Conexión *</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                            {CONNECTION_TYPES.map(conn => (
                                <button
                                    key={conn.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, connection_type: conn.value })}
                                    style={{
                                        padding: '0.75rem',
                                        borderRadius: '4px',
                                        border: `2px solid ${formData.connection_type === conn.value ? 'var(--color-cinna)' : 'var(--color-chai)'}`,
                                        backgroundColor: formData.connection_type === conn.value ? 'rgba(207, 179, 169, 0.1)' : 'transparent',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <i className={`bi ${conn.icon}`} style={{ fontSize: '1.25rem', color: formData.connection_type === conn.value ? 'var(--color-cinna)' : 'var(--color-latte)' }}></i>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-dark)' }}>{conn.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Connection String */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label className="ff-label">
                            {formData.connection_type === 'network' ? 'Dirección IP' : 'Puerto/Dispositivo'} *
                        </label>
                        <input
                            type="text"
                            value={formData.connection_string}
                            onChange={e => setFormData({ ...formData, connection_string: e.target.value })}
                            required
                            placeholder={CONNECTION_TYPES.find(c => c.value === formData.connection_type)?.placeholder}
                            className="ff-search-input"
                            style={{ fontFamily: 'monospace' }}
                        />
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-latte)', marginTop: '0.5rem' }}>
                            💡 Tu Bot de Windows se encargará de conectar a este puerto.
                        </p>
                    </div>

                    {/* Port (for network) */}
                    {formData.connection_type === 'network' && (
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label className="ff-label">Puerto de Red</label>
                            <input
                                type="number"
                                value={formData.port}
                                onChange={e => setFormData({ ...formData, port: parseInt(e.target.value) || 9100 })}
                                placeholder="9100"
                                className="ff-search-input"
                            />
                        </div>
                    )}

                    {/* Paper Width / Label Size */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label className="ff-label">{isLabelTab ? 'Tamaño de Etiqueta' : 'Ancho de Papel'}</label>
                        <select
                            value={formData.paper_width}
                            onChange={e => setFormData({ ...formData, paper_width: parseInt(e.target.value) })}
                            className="ff-search-input"
                        >
                            {(isLabelTab ? LABEL_SIZES : PAPER_WIDTHS).map(size => (
                                <option key={size.value} value={size.value}>{size.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Characters per line (thermal only) */}
                    {!isLabelTab && (
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label className="ff-label">Caracteres por Línea</label>
                            <input
                                type="number"
                                value={formData.characters_per_line}
                                onChange={e => setFormData({ ...formData, characters_per_line: parseInt(e.target.value) || 42 })}
                                placeholder="42"
                                className="ff-search-input"
                            />
                        </div>
                    )}

                    {/* Cash Drawer (thermal only) */}
                    {!isLabelTab && (
                        <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <input
                                type="checkbox"
                                id="hasCashDrawer"
                                checked={formData.has_cash_drawer}
                                onChange={e => setFormData({ ...formData, has_cash_drawer: e.target.checked })}
                                style={{ width: '18px', height: '18px', accentColor: 'var(--color-cinna)' }}
                            />
                            <label htmlFor="hasCashDrawer" style={{ color: 'var(--color-dark)', cursor: 'pointer' }}>
                                Tiene Caja Registradora conectada
                            </label>
                        </div>
                    )}

                    {/* Status */}
                    <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={formData.is_active}
                                onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                style={{ width: '18px', height: '18px', accentColor: 'var(--color-cinna)' }}
                            />
                            <label htmlFor="isActive" style={{ color: 'var(--color-dark)', cursor: 'pointer' }}>Activa</label>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                type="checkbox"
                                id="isDefault"
                                checked={formData.is_default}
                                onChange={e => setFormData({ ...formData, is_default: e.target.checked })}
                                style={{ width: '18px', height: '18px', accentColor: 'var(--color-cinna)' }}
                            />
                            <label htmlFor="isDefault" style={{ color: 'var(--color-dark)', cursor: 'pointer' }}>Principal</label>
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--color-froth)' }}>
                        <button type="button" onClick={closeModal} className="ff-button ff-button-secondary">
                            Cancelar
                        </button>
                        <button type="submit" className="ff-button ff-button-primary">
                            {editingPrinter ? 'Guardar Cambios' : 'Crear'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Jobs History */}
            <Modal isOpen={showJobsModal} onClose={() => setShowJobsModal(false)} title="Historial de Trabajos">
                <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    {jobs.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-latte)' }}>
                            <i className="bi bi-inbox" style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}></i>
                            <p>No hay trabajos recientes</p>
                        </div>
                    ) : (
                        <div className="ff-table-container">
                            <table className="ff-table">
                                <thead>
                                    <tr>
                                        <th>Job #</th>
                                        <th>Impresora</th>
                                        <th>Estado</th>
                                        <th>Fecha</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {jobs.map(job => (
                                        <tr key={job.id}>
                                            <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{job.job_number}</td>
                                            <td>{job.printer?.name || 'N/A'}</td>
                                            <td>{getStatusBadge(job.status)}</td>
                                            <td style={{ fontSize: '0.85rem', color: 'var(--color-latte)' }}>
                                                {new Date(job.created_at).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Modal>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default SistemaMaquinas;
