import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const LUXE_URL = process.env.REACT_APP_LUXE_SERVICE;

const SistemaEtiquetas = () => {
    const [activeTab, setActiveTab] = useState('printers');
    const [labelPrinters, setLabelPrinters] = useState([]);
    const [labelJobs, setLabelJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPrinter, setEditingPrinter] = useState(null);
    const [testing, setTesting] = useState(null);
    const [testResult, setTestResult] = useState(null);

    // Form state for label printer
    const [formData, setFormData] = useState({
        name: '',
        printer_type: 'label',  // Always label type
        connection_type: 'usb',
        connection_string: '',
        port: 9100,
        paper_width: 57,  // Default 57mm for labels
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

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'printers') {
                // Fetch only label printers
                const response = await api.get('/api/hardware/printers/', {
                    baseURL: LUXE_URL,
                    params: { printer_type: 'label' }
                });
                const data = response.data.results || response.data || [];
                // Filter to only label printers (in case backend doesn't filter)
                setLabelPrinters(data.filter(p => p.printer_type === 'label'));
            } else if (activeTab === 'jobs') {
                // Fetch label jobs
                const response = await api.get('/api/hardware/jobs/', {
                    baseURL: LUXE_URL,
                    params: { ordering: '-created_at', limit: 50 }
                });
                const data = response.data.results || response.data || [];
                // Filter to only label jobs
                setLabelJobs(data.filter(j => j.data?.type === 'label'));
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                printer_type: 'label',  // Ensure it's always label
                has_cash_drawer: false,  // Labels don't have cash drawer
                characters_per_line: 32  // Not used for labels but required
            };

            if (editingPrinter) {
                await api.patch(`/api/hardware/printers/${editingPrinter.id}/`, payload, { baseURL: LUXE_URL });
            } else {
                await api.post('/api/hardware/printers/', payload, { baseURL: LUXE_URL });
            }
            fetchData();
            closeModal();
        } catch (error) {
            console.error('Error saving printer:', error);
            alert(`Error: ${error.response?.data?.detail || JSON.stringify(error.response?.data) || error.message}`);
        }
    };

    const handleDelete = async (printer) => {
        if (!window.confirm(`¿Eliminar la etiquetadora "${printer.name}"?`)) return;
        try {
            await api.delete(`/api/hardware/printers/${printer.id}/`, { baseURL: LUXE_URL });
            fetchData();
        } catch (error) {
            console.error('Error deleting printer:', error);
            alert(`Error: ${error.response?.data?.detail || error.message}`);
        }
    };

    const handleTest = async (printer) => {
        setTesting(printer.id);
        setTestResult(null);
        try {
            const response = await api.post('/api/hardware/print/label/', {
                products: [
                    { name: 'PRUEBA ETIQUETA', code: '12345678', price: 9.99 }
                ],
                copies: 1,
                printer_id: printer.id
            }, { baseURL: LUXE_URL });

            if (response.data.status === 'success') {
                setTestResult({
                    id: printer.id,
                    success: true,
                    message: `✅ Etiqueta de prueba enviada!\nJob: ${response.data.job_number}`
                });
            } else {
                setTestResult({ id: printer.id, success: false, message: `❌ ${response.data.message}` });
            }
        } catch (error) {
            setTestResult({
                id: printer.id,
                success: false,
                message: `❌ ${error.response?.data?.error || error.message}`
            });
        } finally {
            setTesting(null);
        }
    };

    const openModal = (printer = null) => {
        if (printer) {
            setEditingPrinter(printer);
            setFormData({
                name: printer.name,
                printer_type: 'label',
                connection_type: printer.connection_type,
                connection_string: printer.connection_string,
                port: printer.port || 9100,
                paper_width: printer.paper_width || 57,
                is_active: printer.is_active,
                is_default: printer.is_default
            });
        } else {
            setEditingPrinter(null);
            setFormData({
                name: '',
                printer_type: 'label',
                connection_type: 'usb',
                connection_string: '',
                port: 9100,
                paper_width: 57,
                is_active: true,
                is_default: false
            });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingPrinter(null);
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pendiente' },
            printing: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Imprimiendo' },
            completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completado' },
            failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Fallido' },
        };
        const badge = badges[status] || badges.pending;
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                {badge.label}
            </span>
        );
    };

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <i className="bi bi-tags text-purple-600"></i>
                        Sistema de Etiquetas
                    </h1>
                    <p className="text-gray-500 mt-1">Configura y administra tus impresoras de etiquetas</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm mb-6">
                <div className="border-b flex">
                    <button
                        onClick={() => setActiveTab('printers')}
                        className={`px-6 py-4 font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'printers'
                                ? 'border-purple-600 text-purple-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <i className="bi bi-printer"></i> Etiquetadoras
                    </button>
                    <button
                        onClick={() => setActiveTab('jobs')}
                        className={`px-6 py-4 font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'jobs'
                                ? 'border-purple-600 text-purple-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <i className="bi bi-list-check"></i> Trabajos de Etiquetas
                    </button>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="text-center py-12 text-gray-500">
                    <i className="bi bi-arrow-repeat animate-spin text-3xl"></i>
                    <p className="mt-2">Cargando...</p>
                </div>
            ) : (
                <>
                    {/* Printers Tab */}
                    {activeTab === 'printers' && (
                        <div>
                            {/* Add Button */}
                            <div className="mb-6">
                                <button
                                    onClick={() => openModal()}
                                    className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-semibold shadow-sm flex items-center gap-2"
                                >
                                    <i className="bi bi-plus-lg"></i> Nueva Etiquetadora
                                </button>
                            </div>

                            {labelPrinters.length === 0 ? (
                                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                                    <i className="bi bi-tags text-6xl text-purple-200 mb-4"></i>
                                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No hay etiquetadoras configuradas</h3>
                                    <p className="text-gray-500 mb-6">Agrega tu impresora 3nStar LDT114 u otra etiquetadora TSPL.</p>
                                    <button
                                        onClick={() => openModal()}
                                        className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-semibold"
                                    >
                                        <i className="bi bi-plus-lg mr-2"></i> Agregar Etiquetadora
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {labelPrinters.map(printer => {
                                        const connInfo = CONNECTION_TYPES.find(c => c.value === printer.connection_type);
                                        const result = testResult?.id === printer.id ? testResult : null;

                                        return (
                                            <div
                                                key={printer.id}
                                                className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden ${printer.is_default ? 'border-purple-500' : 'border-gray-100'
                                                    } ${!printer.is_active ? 'opacity-60' : ''}`}
                                            >
                                                {/* Card Header */}
                                                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                                                                <i className="bi bi-tags text-purple-600 text-2xl"></i>
                                                            </div>
                                                            <div>
                                                                <h3 className="font-bold text-gray-800">{printer.name}</h3>
                                                                <p className="text-sm text-purple-600">Etiquetadora TSPL</p>
                                                            </div>
                                                        </div>
                                                        {printer.is_default && (
                                                            <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                                                                Principal
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Card Body */}
                                                <div className="p-4 space-y-3">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-500 flex items-center gap-1">
                                                            <i className={`bi ${connInfo?.icon || 'bi-plug'}`}></i> Conexión:
                                                        </span>
                                                        <span className="font-medium">{connInfo?.label}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-500">Puerto/Dir:</span>
                                                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                                            {printer.connection_string}
                                                            {printer.connection_type === 'network' && printer.port && `:${printer.port}`}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-500">Tamaño Etiqueta:</span>
                                                        <span className="font-medium">{printer.paper_width}mm</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-500">Estado:</span>
                                                        <span className={printer.is_active ? 'text-green-600' : 'text-red-500'}>
                                                            {printer.is_active ? '● Activa' : '○ Inactiva'}
                                                        </span>
                                                    </div>

                                                    {/* Test Result */}
                                                    {result && (
                                                        <div className={`mt-2 p-2 rounded text-sm ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                                            }`}>
                                                            {result.message}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Card Footer */}
                                                <div className="border-t px-4 py-3 flex justify-between gap-2 bg-gray-50">
                                                    <button
                                                        onClick={() => handleTest(printer)}
                                                        disabled={testing === printer.id}
                                                        className="flex-1 py-2 px-3 text-sm rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 font-medium flex items-center justify-center gap-1"
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
                        </div>
                    )}

                    {/* Jobs Tab */}
                    {activeTab === 'jobs' && (
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                            <div className="p-4 border-b flex justify-between items-center">
                                <h3 className="font-semibold text-gray-800">Historial de Trabajos de Etiquetas</h3>
                                <button
                                    onClick={fetchData}
                                    className="text-purple-600 hover:text-purple-700 text-sm flex items-center gap-1"
                                >
                                    <i className="bi bi-arrow-clockwise"></i> Actualizar
                                </button>
                            </div>

                            {labelJobs.length === 0 ? (
                                <div className="p-12 text-center text-gray-500">
                                    <i className="bi bi-inbox text-4xl text-gray-300"></i>
                                    <p className="mt-2">No hay trabajos de etiquetas recientes</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 text-left text-sm text-gray-600">
                                            <tr>
                                                <th className="px-4 py-3">Job #</th>
                                                <th className="px-4 py-3">Impresora</th>
                                                <th className="px-4 py-3">Productos</th>
                                                <th className="px-4 py-3">Estado</th>
                                                <th className="px-4 py-3">Fecha</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {labelJobs.map(job => (
                                                <tr key={job.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-mono text-sm">{job.job_number}</td>
                                                    <td className="px-4 py-3">{job.printer?.name || 'N/A'}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                        {job.data?.products?.length || 0} etiqueta(s)
                                                    </td>
                                                    <td className="px-4 py-3">{getStatusBadge(job.status)}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-500">
                                                        {new Date(job.created_at).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Modal for Add/Edit Printer */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-pink-50">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <i className="bi bi-tags text-purple-600"></i>
                                {editingPrinter ? 'Editar Etiquetadora' : 'Nueva Etiquetadora'}
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">Configura tu impresora de etiquetas TSPL</p>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre de la Etiquetadora *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="Ej: 3nStar LDT114"
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>

                            {/* Connection Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tipo de Conexión *
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {CONNECTION_TYPES.map(conn => (
                                        <button
                                            key={conn.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, connection_type: conn.value })}
                                            className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 ${formData.connection_type === conn.value
                                                    ? 'border-purple-500 bg-purple-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <i className={`bi ${conn.icon} text-xl`}></i>
                                            <span className="text-sm">{conn.label}</span>
                                        </button>
                                    ))}
                                </div>
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
                                    placeholder={CONNECTION_TYPES.find(c => c.value === formData.connection_type)?.placeholder}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-mono"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    💡 Tu Bot de Windows se encargará de conectar a este puerto.
                                </p>
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
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                </div>
                            )}

                            {/* Label Size */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tamaño de Etiqueta
                                </label>
                                <select
                                    value={formData.paper_width}
                                    onChange={e => setFormData({ ...formData, paper_width: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                >
                                    {LABEL_SIZES.map(size => (
                                        <option key={size.value} value={size.value}>{size.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Status */}
                            <div className="flex items-center gap-6 pt-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={formData.is_active}
                                        onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-5 h-5 text-purple-600 rounded"
                                    />
                                    <label htmlFor="isActive" className="text-sm text-gray-700">Activa</label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="isDefault"
                                        checked={formData.is_default}
                                        onChange={e => setFormData({ ...formData, is_default: e.target.checked })}
                                        className="w-5 h-5 text-purple-600 rounded"
                                    />
                                    <label htmlFor="isDefault" className="text-sm text-gray-700">Etiquetadora Principal</label>
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
                                    className="px-6 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 font-semibold"
                                >
                                    {editingPrinter ? 'Guardar Cambios' : 'Crear Etiquetadora'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SistemaEtiquetas;
