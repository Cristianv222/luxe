import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const LUXE_URL = process.env.REACT_APP_LUXE_SERVICE;

const Impresoras = () => {
    const [printers, setPrinters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPrinter, setEditingPrinter] = useState(null);
    const [testing, setTesting] = useState(null);
    const [testResult, setTestResult] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        printer_type: 'thermal',
        connection_type: 'usb',
        connection_string: '',
        port: 9100,
        paper_width: 80,
        characters_per_line: 42,
        has_cash_drawer: true,
        is_active: true,
        is_default: false,
        config: {} // JSON field for extra config
    });

    const PRINTER_TYPES = [
        { value: 'thermal', label: 'Térmica (Tickets)', icon: 'bi-receipt' },
        { value: 'label', label: 'Etiquetas (TSPL)', icon: 'bi-tags' },
        { value: 'laser', label: 'Láser (Facturas)', icon: 'bi-file-earmark-text' },
        { value: 'matrix', label: 'Matriz de Puntos', icon: 'bi-grid-3x3' },
    ];

    const CONNECTION_TYPES = [
        { value: 'usb', label: 'USB', placeholder: 'COM1 o /dev/usb/lp0' },
        { value: 'network', label: 'Red/IP', placeholder: '192.168.1.100' },
        { value: 'serial', label: 'Serial/COM', placeholder: 'COM3' },
        { value: 'bluetooth', label: 'Bluetooth', placeholder: 'XX:XX:XX:XX:XX:XX' },
    ];

    useEffect(() => {
        fetchPrinters();
    }, []);

    const fetchPrinters = async () => {
        try {
            const response = await api.get('/api/hardware/printers/', { baseURL: LUXE_URL });
            setPrinters(response.data.results || response.data || []);
        } catch (error) {
            console.error('Error loading printers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingPrinter) {
                await api.patch(`/api/hardware/printers/${editingPrinter.id}/`, formData, { baseURL: LUXE_URL });
            } else {
                await api.post('/api/hardware/printers/', formData, { baseURL: LUXE_URL });
            }
            fetchPrinters();
            closeModal();
        } catch (error) {
            console.error('Error saving printer:', error);
            alert(`Error: ${error.response?.data?.detail || error.message}`);
        }
    };

    const handleDelete = async (printer) => {
        if (!window.confirm(`¿Eliminar la impresora "${printer.name}"?`)) return;
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
            // Create a test print job
            const testContent = printer.printer_type === 'label'
                ? { products: [{ name: 'PRUEBA', code: '12345678', price: 1.00 }], copies: 1 }
                : { order: { items: [{ name: 'Producto de Prueba', quantity: 1, price: 1.00 }], total: 1.00 } };

            const endpoint = printer.printer_type === 'label'
                ? '/api/hardware/print/label/'
                : '/api/hardware/print/receipt/';

            const response = await api.post(endpoint, {
                ...testContent,
                printer_id: printer.id
            }, { baseURL: LUXE_URL });

            if (response.data.status === 'success') {
                setTestResult({ id: printer.id, success: true, message: `✅ Trabajo enviado: ${response.data.job_number}` });
            } else {
                setTestResult({ id: printer.id, success: false, message: `❌ ${response.data.message}` });
            }
        } catch (error) {
            setTestResult({ id: printer.id, success: false, message: `❌ ${error.response?.data?.error || error.message}` });
        } finally {
            setTesting(null);
        }
    };

    const openModal = (printer = null) => {
        if (printer) {
            setEditingPrinter(printer);
            setFormData({
                name: printer.name,
                printer_type: printer.printer_type,
                connection_type: printer.connection_type,
                connection_string: printer.connection_string,
                port: printer.port || 9100,
                paper_width: printer.paper_width,
                characters_per_line: printer.characters_per_line,
                has_cash_drawer: printer.has_cash_drawer,
                is_active: printer.is_active,
                is_default: printer.is_default,
                config: printer.config || {}
            });
        } else {
            setEditingPrinter(null);
            setFormData({
                name: '',
                printer_type: 'thermal',
                connection_type: 'usb',
                connection_string: '',
                port: 9100,
                paper_width: 80,
                characters_per_line: 42,
                has_cash_drawer: true,
                is_active: true,
                is_default: false,
                config: {}
            });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingPrinter(null);
    };

    const getConnectionPlaceholder = () => {
        const conn = CONNECTION_TYPES.find(c => c.value === formData.connection_type);
        return conn?.placeholder || '';
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando configuración...</div>;

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Configuración de Impresoras</h1>
                    <p className="text-gray-500 mt-1">Administra tus impresoras de tickets y etiquetas</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold shadow-sm flex items-center gap-2"
                >
                    <i className="bi bi-plus-lg"></i> Nueva Impresora
                </button>
            </div>

            {/* Printers Grid */}
            {printers.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                    <i className="bi bi-printer text-6xl text-gray-300 mb-4"></i>
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No hay impresoras configuradas</h3>
                    <p className="text-gray-500 mb-6">Agrega tu primera impresora para comenzar a imprimir tickets y etiquetas.</p>
                    <button
                        onClick={() => openModal()}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
                    >
                        <i className="bi bi-plus-lg mr-2"></i> Agregar Impresora
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {printers.map(printer => {
                        const typeInfo = PRINTER_TYPES.find(t => t.value === printer.printer_type);
                        const connInfo = CONNECTION_TYPES.find(c => c.value === printer.connection_type);
                        const result = testResult?.id === printer.id ? testResult : null;

                        return (
                            <div
                                key={printer.id}
                                className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden ${printer.is_default ? 'border-blue-500' : 'border-gray-100'
                                    } ${!printer.is_active ? 'opacity-60' : ''}`}
                            >
                                {/* Card Header */}
                                <div className={`p-4 ${printer.printer_type === 'label' ? 'bg-purple-50' : 'bg-blue-50'}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${printer.printer_type === 'label' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                                                }`}>
                                                <i className={`bi ${typeInfo?.icon || 'bi-printer'} text-2xl`}></i>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800">{printer.name}</h3>
                                                <p className="text-sm text-gray-500">{typeInfo?.label}</p>
                                            </div>
                                        </div>
                                        {printer.is_default && (
                                            <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                                                Principal
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="p-4 space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Conexión:</span>
                                        <span className="font-medium">{connInfo?.label}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Puerto/Dir:</span>
                                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                            {printer.connection_string}
                                            {printer.port && `:${printer.port}`}
                                        </span>
                                    </div>
                                    {printer.printer_type === 'thermal' && (
                                        <>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Papel:</span>
                                                <span className="font-medium">{printer.paper_width}mm</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Caja:</span>
                                                <span className={printer.has_cash_drawer ? 'text-green-600' : 'text-gray-400'}>
                                                    {printer.has_cash_drawer ? '✓ Conectada' : '✗ No tiene'}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Estado:</span>
                                        <span className={printer.is_active ? 'text-green-600' : 'text-red-500'}>
                                            {printer.is_active ? '● Activa' : '○ Inactiva'}
                                        </span>
                                    </div>

                                    {/* Test Result */}
                                    {result && (
                                        <div className={`mt-2 p-2 rounded text-sm ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                            {result.message}
                                        </div>
                                    )}
                                </div>

                                {/* Card Footer - Actions */}
                                <div className="border-t px-4 py-3 flex justify-between gap-2 bg-gray-50">
                                    <button
                                        onClick={() => handleTest(printer)}
                                        disabled={testing === printer.id}
                                        className="flex-1 py-2 px-3 text-sm rounded-lg bg-green-100 text-green-700 hover:bg-green-200 font-medium flex items-center justify-center gap-1"
                                    >
                                        {testing === printer.id ? (
                                            <><i className="bi bi-arrow-repeat animate-spin"></i> Probando...</>
                                        ) : (
                                            <><i className="bi bi-play-fill"></i> Probar</>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => openModal(printer)}
                                        className="py-2 px-3 text-sm rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
                                    >
                                        <i className="bi bi-pencil"></i>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(printer)}
                                        className="py-2 px-3 text-sm rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
                                    >
                                        <i className="bi bi-trash"></i>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b">
                            <h2 className="text-xl font-bold text-gray-800">
                                {editingPrinter ? 'Editar Impresora' : 'Nueva Impresora'}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="Ej: Impresora Caja 1"
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            {/* Printer Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Impresora *</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {PRINTER_TYPES.map(type => (
                                        <button
                                            key={type.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, printer_type: type.value })}
                                            className={`p-3 rounded-lg border-2 flex items-center gap-2 ${formData.printer_type === type.value
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <i className={`bi ${type.icon}`}></i>
                                            <span className="text-sm">{type.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Connection Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Conexión *</label>
                                <select
                                    value={formData.connection_type}
                                    onChange={e => setFormData({ ...formData, connection_type: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    {CONNECTION_TYPES.map(conn => (
                                        <option key={conn.value} value={conn.value}>{conn.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Connection String */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {formData.connection_type === 'network' ? 'Dirección IP' : 'Puerto/Dispositivo'} *
                                </label>
                                <input
                                    type="text"
                                    value={formData.connection_string}
                                    onChange={e => setFormData({ ...formData, connection_string: e.target.value })}
                                    required
                                    placeholder={getConnectionPlaceholder()}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                />
                            </div>

                            {/* Port (for network) */}
                            {formData.connection_type === 'network' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Puerto de Red</label>
                                    <input
                                        type="number"
                                        value={formData.port}
                                        onChange={e => setFormData({ ...formData, port: parseInt(e.target.value) || 9100 })}
                                        placeholder="9100"
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            )}

                            {/* Printer Settings based on type */}
                            <div className="space-y-4 border-t pt-4">
                                <h3 className="font-medium text-gray-900">Configuración de Impresión</h3>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Paper Width - Available for both Thermal and Label */}
                                    {(formData.printer_type === 'thermal' || formData.printer_type === 'label') && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Ancho Papel (mm) <span className="text-gray-400 text-xs font-normal">(Ej: 80, 104)</span>
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.paper_width}
                                                onChange={e => setFormData({ ...formData, paper_width: parseInt(e.target.value) || 0 })}
                                                placeholder={formData.printer_type === 'label' ? "104" : "80"}
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                    )}

                                    {/* Label Specific Settings - Height & Gap */}
                                    {formData.printer_type === 'label' && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Alto Etiqueta (mm)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={formData.config?.label_height || ''}
                                                    onChange={e => setFormData({
                                                        ...formData,
                                                        config: { ...formData.config, label_height: e.target.value }
                                                    })}
                                                    placeholder="27"
                                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Salto/Gap (mm)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={formData.config?.label_gap || ''}
                                                    onChange={e => setFormData({
                                                        ...formData,
                                                        config: { ...formData.config, label_gap: e.target.value }
                                                    })}
                                                    placeholder="0"
                                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                />
                                            </div>
                                        </>
                                    )}

                                    {/* Characters per Line - Available for both Thermal and Label */}
                                    {(formData.printer_type === 'thermal' || formData.printer_type === 'label') && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Caracteres/Línea <span className="text-gray-400 text-xs font-normal">(Tickets: 42-48, Etiquetas: ~60)</span>
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.characters_per_line}
                                                onChange={e => setFormData({ ...formData, characters_per_line: parseInt(e.target.value) || 42 })}
                                                placeholder="42"
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Cash Drawer - Only for Thermal */}
                                {formData.printer_type === 'thermal' && (
                                    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border">
                                        <input
                                            type="checkbox"
                                            id="hasCashDrawer"
                                            checked={formData.has_cash_drawer}
                                            onChange={e => setFormData({ ...formData, has_cash_drawer: e.target.checked })}
                                            className="w-5 h-5 text-blue-600 rounded"
                                        />
                                        <label htmlFor="hasCashDrawer" className="text-sm text-gray-700 cursor-pointer select-none">
                                            Tiene caja registradora conectada
                                        </label>
                                    </div>
                                )}
                            </div>

                            {/* Status */}
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={formData.is_active}
                                        onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-5 h-5 text-blue-600 rounded"
                                    />
                                    <label htmlFor="isActive" className="text-sm text-gray-700">Activa</label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="isDefault"
                                        checked={formData.is_default}
                                        onChange={e => setFormData({ ...formData, is_default: e.target.checked })}
                                        className="w-5 h-5 text-blue-600 rounded"
                                    />
                                    <label htmlFor="isDefault" className="text-sm text-gray-700">Impresora Principal</label>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-6 py-2 rounded-lg border text-gray-600 hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold"
                                >
                                    {editingPrinter ? 'Guardar Cambios' : 'Crear Impresora'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Impresoras;


