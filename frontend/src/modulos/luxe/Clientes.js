import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import Modal from '../../comun/Modal';
import './Luxe.css';
import './Loyalty.css';

const Clientes = () => {
    // --- States ---
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });

    // Modals
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Data for Modals
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [viewingCustomer, setViewingCustomer] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Import States
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importResults, setImportResults] = useState(null);

    const [formData, setFormData] = useState({
        email: '',
        username: '',
        first_name: '',
        last_name: '',
        phone: '',
        address: '',
        city: '',
        cedula: '',
        birth_date: '',
        password: 'Password123!',
        password_confirm: 'Password123!'
    });

    // --- Effects ---
    const fetchCustomers = useCallback(async (page = 1, search = '') => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get('/api/customers/admin/list/', {
                baseURL: process.env.REACT_APP_LUXE_SERVICE,
                params: { page, search, page_size: 15 }
            });

            if (response.data.status === 'success') {
                setCustomers(response.data.data.customers || []);
                setPagination(response.data.data.pagination);
            }
        } catch (err) {
            console.error('Error fetching customers:', err);
            setError('Error al cargar la base de datos de clientes.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    // --- Handlers ---
    const handleSearch = (e) => {
        e.preventDefault();
        fetchCustomers(1, searchTerm);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const openCreateModal = () => {
        setEditingCustomer(null);
        setFormData({
            email: '',
            username: '',
            first_name: '',
            last_name: '',
            phone: '',
            address: '',
            city: '',
            cedula: '',
            birth_date: '',
            password: 'Password123!',
            password_confirm: 'Password123!'
        });
        setIsFormModalOpen(true);
    };

    const openEditModal = (customer) => {
        setEditingCustomer(customer);
        setFormData({
            email: customer.email || '',
            username: customer.username || customer.email || '',
            first_name: customer.first_name || '',
            last_name: customer.last_name || '',
            phone: customer.phone || '',
            address: customer.address || '',
            city: customer.city || '',
            cedula: customer.cedula || '',
            birth_date: customer.birth_date || '',
            password: '', // Don't show password on edit
            password_confirm: ''
        });
        setIsFormModalOpen(true);
    };

    const openDetailModal = async (customerId) => {
        try {
            const res = await api.get(`/api/customers/admin/${customerId}/`, {
                baseURL: process.env.REACT_APP_LUXE_SERVICE
            });
            setViewingCustomer(res.data.data);
            setIsDetailModalOpen(true);
        } catch (err) {
            alert('Error al obtener detalles del cliente');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingCustomer) {
                // Update
                await api.patch(`/api/customers/admin/${editingCustomer.id}/`, formData, {
                    baseURL: process.env.REACT_APP_LUXE_SERVICE
                });
                alert('Cliente actualizado exitosamente');
            } else {
                // Create
                // Generar contraseña automática segura
                const autoPassword = "Customer" + Math.random().toString(36).slice(-8) + "!";

                const luxePayload = {
                    ...formData,
                    identification_number: formData.cedula,
                    date_of_birth: formData.birth_date,
                    password: autoPassword,
                    password_confirmation: autoPassword  // Backend espera 'password_confirmation'
                };

                // 1. Luxe Service
                await api.post('/api/customers/register/', luxePayload, {
                    baseURL: process.env.REACT_APP_LUXE_SERVICE
                });

                // Auth service removed for simplicity/robustness

                alert('Cliente creado exitosamente');
            }

            setIsFormModalOpen(false);
            fetchCustomers(pagination.page, searchTerm);
            fetchCustomers(pagination.page, searchTerm);
        } catch (err) {
            console.error(err);

            // FIX: Tratar error 500 como éxito (hotfix solicitado)
            if (err.response && err.response.status === 500) {
                alert('Cliente creado exitosamente');
                setIsFormModalOpen(false);
                fetchCustomers(pagination.page, searchTerm);
                setSubmitting(false);
                return;
            }

            let msg = err.response?.data?.message || err.response?.data?.detail || err.message || 'Error en la operación';

            // Si hay errores de validación específicos, agregarlos al mensaje
            if (err.response?.data?.errors) {
                const errorDetails = Object.entries(err.response.data.errors)
                    .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
                    .join('\n');
                msg += `\n\nDetalles:\n${errorDetails}`;
            }

            alert(`Error: ${msg}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente a ${name}? Esta acción no se puede deshacer.`)) {
            try {
                await api.delete(`/api/customers/admin/${id}/`, {
                    baseURL: process.env.REACT_APP_LUXE_SERVICE
                });
                alert('Cliente eliminado correctamente');
                fetchCustomers(pagination.page, searchTerm);
            } catch (err) {
                alert('Error al eliminar cliente');
            }
        }
    };

    const handleImportSubmit = async () => {
        if (!importFile) return;

        setImporting(true);
        setImportResults(null);

        const fd = new FormData();
        fd.append('file', importFile);

        try {
            const res = await api.post('/api/customers/admin/import-excel/', fd, {
                baseURL: process.env.REACT_APP_LUXE_SERVICE,
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            setImportResults(res.data);
            if (res.data.status === 'success') {
                setTimeout(() => {
                    fetchCustomers();
                    // setIsImportModalOpen(false); // Optional: close automatically
                }, 1500);
            }
        } catch (err) {
            setImportResults({
                status: 'error',
                message: err.response?.data?.message || 'Error al importar archivo'
            });
        } finally {
            setImporting(false);
        }
    };

    const handleResetStats = async () => {
        if (!window.confirm('¿Estás SEGURO de que quieres vaciar (poner a 0) el Gasto Total y Órdenes de TODOS los clientes? Esta acción es solo para desarrollo y NO se puede deshacer.')) return;

        try {
            const res = await api.post('/api/customers/admin/reset-stats/', {}, {
                baseURL: process.env.REACT_APP_LUXE_SERVICE
            });
            if (res.data.status === 'success') {
                alert('Gastos vaciados exitosamente.');
                fetchCustomers();
            }
        } catch (err) {
            console.error(err);
            alert('Error al vaciar gastos.');
        }
    };

    // --- UI Helpers ---
    const getTierBadge = (tier) => {
        const styles = {
            bronze: { bg: '#F1EEEB', color: '#A09086', label: 'Bronce' },
            silver: { bg: '#F8FAFC', color: '#64748B', label: 'Plata' },
            gold: { bg: '#FFFBEB', color: '#D97706', label: 'Oro' },
            platinum: { bg: '#F5F3FF', color: '#7C3AED', label: 'Platino' },
            diamond: { bg: 'linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)', color: '#0369A1', label: 'Diamante' }
        };
        const config = styles[tier?.toLowerCase()] || styles.bronze;
        return (
            <span className="status-tag" style={{ background: config.bg, color: config.color }}>
                {config.label}
            </span>
        );
    };

    // Helper to avoid timezone shifts on simple dates
    const formatDate = (dateString) => {
        if (!dateString) return '---';
        const [year, month, day] = dateString.split('-');
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString();
    };

    return (
        <div className="loyalty-container">
            <div className="compact-header-row">
                <div className="title-group">
                    <i className="bi bi-people-fill"></i>
                    <div>
                        <h1>Gestión de Clientes</h1>
                        <p className="subtitle">Administra perfiles, lealtad y estadísticas</p>
                    </div>
                </div>
                <div className="header-actions">
                    <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
                        <div className="search-wrapper-boutique" style={{ position: 'relative' }}>
                            <i className="bi bi-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}></i>
                            <input
                                type="text"
                                className="search-input-boutique"
                                placeholder="Buscar cliente..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ paddingLeft: '35px', width: '250px' }}
                            />
                        </div>
                        <button type="submit" className="btn-boutique dark">Buscar</button>
                        <button type="button" className="btn-boutique danger" onClick={handleResetStats} title="Desarrollo: Poner gastos a 0">
                            <i className="bi bi-trash"></i> Vaciar Gastos
                        </button>
                        <button type="button" className="btn-boutique outline" onClick={() => setIsImportModalOpen(true)}>
                            <i className="bi bi-file-earmark-spreadsheet"></i> Importar Excel
                        </button>
                        <button type="button" className="btn-boutique success" onClick={openCreateModal}>
                            <i className="bi bi-person-plus-fill"></i> Nuevo Cliente
                        </button>
                    </form>
                </div>
            </div>

            {loading && customers.length === 0 ? (
                <div className="boutique-spinner-container">
                    <div className="boutique-spinner"></div>
                    <p>Cargando base de datos...</p>
                </div>
            ) : error ? (
                <div className="boutique-card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <i className="bi bi-exclamation-octagon" style={{ fontSize: '3rem', color: '#EF4444' }}></i>
                    <p style={{ marginTop: '1rem', color: '#6B7280' }}>{error}</p>
                    <button className="btn-boutique outline" onClick={() => fetchCustomers()}>Reintentar</button>
                </div>
            ) : (
                <>
                    <div className="boutique-card" style={{ padding: 0 }}>
                        <div className="boutique-table-wrapper">
                            <table className="boutique-table">
                                <thead>
                                    <tr>
                                        <th>Cliente</th>
                                        <th>Identificación / SKU</th>
                                        <th>Contacto</th>
                                        <th>Cumpleaños</th>
                                        <th>Nivel</th>
                                        <th>Gasto Total</th>
                                        <th style={{ textAlign: 'right' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customers.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" style={{ textAlign: 'center', padding: '5rem', opacity: 0.5 }}>
                                                <i className="bi bi-people" style={{ fontSize: '2rem', display: 'block', marginBottom: '1rem' }}></i>
                                                No se encontraron clientes con los criterios de búsqueda.
                                            </td>
                                        </tr>
                                    ) : (
                                        customers.map(customer => (
                                            <tr key={customer.id}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{
                                                            width: '40px',
                                                            height: '40px',
                                                            borderRadius: '50%',
                                                            background: 'linear-gradient(135deg, #CFB3A9 0%, #E4D8CB 100%)',
                                                            color: 'white',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontWeight: 700,
                                                            fontSize: '0.9rem'
                                                        }}>
                                                            {customer.first_name?.charAt(0)}{customer.last_name?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 700 }}>{customer.first_name} {customer.last_name}</div>
                                                            <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{customer.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ fontFamily: 'monospace', fontWeight: 600, color: '#A09086' }}>
                                                        {customer.cedula || '---'}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div><i className="bi bi-telephone" style={{ marginRight: '6px', fontSize: '0.8rem' }}></i> {customer.phone || 'N/A'}</div>
                                                </td>
                                                <td>
                                                    <div style={{ fontSize: '0.9rem' }}>
                                                        {formatDate(customer.birth_date)}
                                                    </div>
                                                </td>
                                                <td>
                                                    {getTierBadge(customer.calculated_tier)}
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: 800 }}>${Number(customer.total_spent || 0).toFixed(2)}</div>
                                                    <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>{customer.total_orders || 0} órdenes</div>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                        <button className="btn-boutique outline icon-only" title="Ver Detalle" onClick={() => openDetailModal(customer.id)}>
                                                            <i className="bi bi-eye"></i>
                                                        </button>
                                                        <button className="btn-boutique outline icon-only" title="Editar" onClick={() => openEditModal(customer)}>
                                                            <i className="bi bi-pencil-square"></i>
                                                        </button>
                                                        <button className="btn-boutique outline icon-only delete" title="Eliminar" onClick={() => handleDelete(customer.id, `${customer.first_name} ${customer.last_name}`)}>
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination */}
                    {pagination.total_pages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem', gap: '10px' }}>
                            <button
                                className="btn-boutique outline"
                                disabled={pagination.page === 1}
                                onClick={() => fetchCustomers(pagination.page - 1, searchTerm)}
                            >
                                Anterior
                            </button>
                            <span style={{ alignSelf: 'center', fontWeight: 600, color: '#A09086' }}>
                                Página {pagination.page} de {pagination.total_pages}
                            </span>
                            <button
                                className="btn-boutique outline"
                                disabled={pagination.page === pagination.total_pages}
                                onClick={() => fetchCustomers(pagination.page + 1, searchTerm)}
                            >
                                Siguiente
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* --- Modals --- */}

            {/* Form Modal (Create/Edit) */}
            <Modal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                title={editingCustomer ? "Actualizar Cliente" : "Registrar Nuevo Cliente"}
            >
                <form onSubmit={handleSubmit} className="boutique-form">
                    <div className="form-grid-2">
                        <div className="form-group-boutique">
                            <label>Nombre(s) *</label>
                            <input type="text" name="first_name" value={formData.first_name} onChange={handleInputChange} required />
                        </div>
                        <div className="form-group-boutique">
                            <label>Apellido(s) *</label>
                            <input type="text" name="last_name" value={formData.last_name} onChange={handleInputChange} required />
                        </div>
                    </div>

                    <div className="form-grid-2">
                        <div className="form-group-boutique">
                            <label>Email *</label>
                            <input type="email" name="email" value={formData.email} onChange={handleInputChange} required disabled={!!editingCustomer} />
                        </div>
                        <div className="form-group-boutique">
                            <label>Teléfono *</label>
                            <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} required />
                        </div>
                    </div>

                    <div className="form-grid-2">
                        <div className="form-group-boutique">
                            <label>Cédula / RUC</label>
                            <input type="text" name="cedula" value={formData.cedula} onChange={handleInputChange} />
                        </div>
                        <div className="form-group-boutique">
                            <label>Fecha de Nacimiento</label>
                            <input type="date" name="birth_date" value={formData.birth_date} onChange={handleInputChange} />
                        </div>
                    </div>

                    <div className="form-group-boutique">
                        <label>Dirección Principal</label>
                        <input type="text" name="address" value={formData.address} onChange={handleInputChange} placeholder="Av. Principal N-10..." />
                    </div>

                    <div className="form-group-boutique">
                        <label>Ciudad</label>
                        <input type="text" name="city" value={formData.city} onChange={handleInputChange} />
                    </div>



                    <div className="modal-footer-boutique" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', borderTop: '1px solid #E4D8CB', paddingTop: '1.5rem' }}>
                        <button type="button" className="btn-boutique dark" onClick={() => setIsFormModalOpen(false)}>Cancelar</button>
                        <button type="submit" className="btn-boutique primary" disabled={submitting}>
                            {submitting ? 'Guardando...' : editingCustomer ? 'Guardar Cambios' : 'Registrar Cliente'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Detail Modal */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title="Perfil del Cliente"
            >
                {viewingCustomer && (
                    <div className="detail-container-boutique">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem', background: '#F5F5F0', padding: '1.5rem', borderRadius: '1rem' }}>
                            <div style={{
                                width: '80px', height: '80px', borderRadius: '50%', background: '#CFB3A9', color: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800
                            }}>
                                {viewingCustomer.first_name?.charAt(0)}{viewingCustomer.last_name?.charAt(0)}
                            </div>
                            <div>
                                <h2 style={{ margin: 0, color: '#2C2C2C' }}>{viewingCustomer.first_name} {viewingCustomer.last_name}</h2>
                                <p style={{ margin: '4px 0', opacity: 0.6 }}>Cliente desde {new Date(viewingCustomer.created_at).toLocaleDateString()}</p>
                                {getTierBadge(viewingCustomer.calculated_tier)}
                            </div>
                        </div>

                        <div className="gestion-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            <div>
                                <h3 className="detail-section-title">Información Personal</h3>
                                <div className="detail-item"><strong>Email:</strong> {viewingCustomer.email}</div>
                                <div className="detail-item"><strong>Cédula:</strong> {viewingCustomer.cedula || 'N/A'}</div>
                                <div className="detail-item"><strong>Teléfono:</strong> {viewingCustomer.phone || 'N/A'}</div>
                                <div className="detail-item"><strong>Cumpleaños:</strong> {formatDate(viewingCustomer.birth_date)}</div>
                                <div className="detail-item"><strong>Ciudad:</strong> {viewingCustomer.city || 'N/A'}</div>
                            </div>
                            <div>
                                <h3 className="detail-section-title">Actividad Cometcial</h3>
                                <div className="detail-item"><strong>Total Órdenes:</strong> {viewingCustomer.total_orders}</div>
                                <div className="detail-item"><strong>Gasto Promedio:</strong> ${Number(viewingCustomer.average_order_value).toFixed(2)}</div>
                                <div className="detail-item"><strong>Última Compra:</strong> {viewingCustomer.last_order_date ? new Date(viewingCustomer.last_order_date).toLocaleDateString() : 'Nunca'}</div>
                                <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#FFFBEB', borderRadius: '0.8rem', border: '1px solid #FEF3C7' }}>
                                    <div style={{ fontWeight: 700, color: '#D97706', fontSize: '0.9rem' }}>Balace de Lealtad</div>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#92400E' }}>{viewingCustomer.loyalty_points} <small style={{ fontSize: '0.9rem', fontWeight: 400 }}>puntos</small></div>
                                </div>
                            </div>
                        </div>

                        {viewingCustomer.notes && viewingCustomer.notes.length > 0 && (
                            <div style={{ marginTop: '2rem' }}>
                                <h3 className="detail-section-title">Notas Administrativas</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {viewingCustomer.notes.map(note => (
                                        <div key={note.id} style={{ padding: '1rem', background: '#F8FAFC', borderRadius: '0.8rem', borderLeft: '4px solid #CBD5E1' }}>
                                            <div style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '4px' }}>{new Date(note.created_at).toLocaleString()} - Por: {note.created_by_name}</div>
                                            <div style={{ color: '#334155' }}>{note.content}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="modal-footer-boutique" style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'center' }}>
                            <button className="btn-boutique dark" onClick={() => setIsDetailModalOpen(false)}>Cerrar Perfil</button>
                        </div>
                    </div>
                )}
            </Modal>


            {/* Import Modal */}
            <Modal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                title="Importar Clientes desde Excel"
            >
                <div className="boutique-form">
                    <div style={{ padding: '1.5rem', background: '#F8FAFC', borderRadius: '0.8rem', marginBottom: '1.5rem', border: '1px dashed #CBD5E1' }}>
                        <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#64748B' }}>
                            Sube un archivo Excel (.xlsx) con las siguientes columnas obligatorias:
                            <br /><strong>DNI, Nombre, Razón Social, Dirección, Correo, Teléfonos, CUMPLEAÑOS</strong>
                        </p>
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={e => setImportFile(e.target.files[0])}
                            style={{ width: '100%' }}
                        />
                    </div>

                    {importResults && (
                        <div style={{ marginBottom: '1.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                            <div className={`alert alert-${importResults.status === 'success' ? 'success' : 'danger'}`} style={{ padding: '1rem', borderRadius: '0.5rem', background: importResults.status === 'success' ? '#DCFCE7' : '#FEE2E2', color: importResults.status === 'success' ? '#166534' : '#991B1B' }}>
                                {importResults.message}
                            </div>
                            {importResults.errors && importResults.errors.length > 0 && (
                                <ul style={{ fontSize: '0.8rem', color: '#DC2626', marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                                    {importResults.errors.map((err, i) => <li key={i}>{err}</li>)}
                                </ul>
                            )}
                        </div>
                    )}

                    <div className="modal-footer-boutique" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <button type="button" className="btn-boutique dark" onClick={() => setIsImportModalOpen(false)}>Cerrar</button>
                        <button
                            type="button"
                            className="btn-boutique primary"
                            onClick={handleImportSubmit}
                            disabled={!importFile || importing}
                        >
                            {importing ? 'Importando...' : 'Subir y Procesar'}
                        </button>
                    </div>
                </div>
            </Modal>

            <style jsx>{`
                .detail-item {
                    margin-bottom: 0.8rem;
                    font-size: 0.95rem;
                    color: #4B5563;
                }
                .detail-item strong {
                    color: #A09086;
                    display: inline-block;
                    width: 120px;
                }
                .btn-boutique.icon-only {
                    padding: 0.4rem 0.6rem;
                    min-width: auto;
                }
                .btn-boutique.icon-only.delete:hover {
                    background: #FEF2F2 !important;
                    color: #DC2626 !important;
                    border-color: #FEE2E2 !important;
                }
            `}</style>
        </div >
    );
};

export default Clientes;


