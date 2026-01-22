import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import Modal from '../../comun/Modal';
import './FastFood.css';
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
                const luxePayload = {
                    ...formData,
                    identification_number: formData.cedula,
                    date_of_birth: formData.birth_date
                };

                // 1. Luxe Service
                await api.post('/api/customers/register/', luxePayload, {
                    baseURL: process.env.REACT_APP_LUXE_SERVICE
                });

                // 2. Auth Service (Optional/Best effort)
                try {
                    const authPayload = {
                        ...formData,
                        identification_number: formData.cedula,
                        date_of_birth: formData.birth_date
                    };
                    await api.post('/api/authentication/register/', authPayload);
                } catch (authErr) {
                    console.warn("Auth account creation failed, but customer profile was created.");
                }

                alert('Cliente creado exitosamente');
            }

            setIsFormModalOpen(false);
            fetchCustomers(pagination.page, searchTerm);
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || err.response?.data?.detail || 'Error en la operación';
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

                    {!editingCustomer && (
                        <div className="inventory-control-section" style={{ background: '#F1EEEB', padding: '1rem', borderRadius: '0.8rem' }}>
                            <p style={{ fontSize: '0.8rem', fontWeight: 700, margin: '0 0 0.8rem 0', color: '#A09086', textTransform: 'uppercase' }}>Configuración de Cuenta Web</p>
                            <div className="form-grid-2">
                                <div className="form-group-boutique">
                                    <label>Usuario</label>
                                    <input type="text" name="username" value={formData.username} onChange={handleInputChange} placeholder="Opcional" style={{ background: 'white' }} />
                                </div>
                                <div className="form-group-boutique">
                                    <label>Password Temporal</label>
                                    <input type="password" name="password" value={formData.password} onChange={handleInputChange} style={{ background: 'white' }} />
                                </div>
                            </div>
                        </div>
                    )}

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
        </div>
    );
};

export default Clientes;
