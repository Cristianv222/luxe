import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import printerService from '../../services/printerService';

const Ordenes = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [updatingStatus, setUpdatingStatus] = useState({});
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [sriLoading, setSriLoading] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const ORDERS_PER_PAGE = 10;

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await api.get('/api/orders/orders/', {
                    baseURL: process.env.REACT_APP_LUXE_SERVICE
                });
                const data = response.data;
                // Backend has pagination_class=None so returns plain array
                setOrders(Array.isArray(data) ? data : (data.results || []));
            } catch (err) {
                console.error('Error fetching orders:', err);
                setError('Error al cargar las órdenes');
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);




    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && showModal) {
                closeModal();
            }
        };

        if (showModal) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [showModal]);

    const handleStatusChange = async (orderNumber, newStatus, event) => {
        event.stopPropagation();
        setUpdatingStatus(prev => ({ ...prev, [orderNumber]: true }));
        try {
            const response = await api.post(
                `/api/orders/orders/${orderNumber}/update_status/`,
                { status: newStatus },
                { baseURL: process.env.REACT_APP_LUXE_SERVICE }
            );

            setOrders(prevOrders =>
                prevOrders.map(order =>
                    order.order_number === orderNumber
                        ? { ...order, ...response.data }
                        : order
                )
            );
        } catch (err) {
            console.error('Error updating status:', err);
            alert(`Error al actualizar el estado: ${err.response?.data?.detail || err.message}`);
        } finally {
            setUpdatingStatus(prev => ({ ...prev, [orderNumber]: false }));
        }
    };

    const handleRowClick = async (order) => {
        setShowModal(true);
        setSelectedOrder({ ...order, loading: true });

        try {
            const response = await api.get(
                `/api/orders/orders/${order.order_number}/`,
                { baseURL: process.env.REACT_APP_LUXE_SERVICE }
            );
            const orderData = response.data;
            setSelectedOrder({
                ...orderData,
                customer_name: orderData.customer_name || order.customer_name
            });
        } catch (err) {
            console.error('Error fetching order details:', err);
            setShowModal(false);
            setSelectedOrder(null);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedOrder(null);
    };

    const handleDeleteOrder = async () => {
        if (!selectedOrder) return;

        // La confirmación ya fue hecha por el modal personalizado

        try {
            await api.delete(`/api/orders/orders/${selectedOrder.order_number}/`, {
                baseURL: process.env.REACT_APP_LUXE_SERVICE
            });
            setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
            setShowDeleteConfirm(false); // Cierra confirmación
            closeModal(); // Cierra detalle
            alert('Orden eliminada y proceso de anulación iniciado.');
        } catch (err) {
            console.error('Error deleting order:', err);
            setShowDeleteConfirm(false);
            alert('Error al eliminar la orden');
        }
    };

    const handlePrintTicket = async () => {
        if (!selectedOrder) return;
        try {
            const receiptData = {
                order_number: selectedOrder.order_number,
                customer_name: selectedOrder.customer_name || 'CONSUMIDOR FINAL',
                table_number: selectedOrder.table_number || (selectedOrder.order_type === 'in_store' ? 'TIENDA' : (selectedOrder.order_type === 'pickup' ? 'RECOGIDA' : 'ENVÍO')),
                items: selectedOrder.items.map(item => ({
                    name: item.product_details?.name || item.product_name || 'Producto',
                    quantity: item.quantity,
                    price: parseFloat(item.unit_price),
                    total: parseFloat(item.line_total || item.subtotal),
                    note: item.notes || ''
                })),
                subtotal: parseFloat(selectedOrder.subtotal),
                discount: parseFloat(selectedOrder.discount_amount || 0),
                tax: parseFloat(selectedOrder.tax_amount || 0),
                total: parseFloat(selectedOrder.total),
                sri_info: selectedOrder.sri_info || null,
                customer_identification: selectedOrder.customer_identification || (selectedOrder.customer?.cedula || '9999999999999'),
                customer_address: selectedOrder.delivery_info?.address || selectedOrder.customer?.address || 'Cuenca',
                customer_phone: selectedOrder.delivery_info?.contact_phone || selectedOrder.customer?.phone || '9999999999',
                customer_email: selectedOrder.customer?.email || '',
                printed_at: new Date().toISOString()
            };
            await printerService.printReceipt(receiptData);
            alert('Ticket enviado a la impresora');
        } catch (error) {
            console.error('Error printing ticket:', error);
            alert('Error al imprimir el ticket.');
        }
    };

    const handleDownloadDocument = async (url, type) => {
        if (!url) return;
        try {
            // El backend espera una petición autenticada para generar el PDF/XML
            const response = await api.get(url, {
                responseType: 'blob',
                baseURL: process.env.REACT_APP_LUXE_SERVICE
            });
            const blob = new Blob([response.data], { type: type === 'pdf' ? 'application/pdf' : 'application/xml' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = `factura_${selectedOrder.sri_info?.sri_number || selectedOrder.order_number}.${type}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error(`Error downloading ${type}:`, error);
            alert(`Error al descargar el documento ${type.toUpperCase()}.`);
        }
    };

    const handleRetrySRI = async () => {
        if (!selectedOrder) return;
        setSriLoading(true);
        try {
            const res = await api.post(`/api/orders/orders/${selectedOrder.order_number}/retry_sri/`, {}, {
                baseURL: process.env.REACT_APP_LUXE_SERVICE
            });

            // Mostrar resultado
            let msg = `SRI: ${res.data.status_display}`;
            if (res.data.error) msg += `\n${res.data.error}`;
            alert(msg);

            // Actualizar estado local
            setSelectedOrder(prev => ({
                ...prev,
                sri_info: {
                    ...(prev.sri_info || {}),
                    status: res.data.status,
                    status_display: res.data.status_display,
                    sri_number: res.data.sri_number,
                    error: res.data.error,
                    key: res.data.access_key
                }
            }));
        } catch (err) {
            console.error('Error retrying SRI:', err);
            alert('Error al reintentar SRI: ' + (err.response?.data?.error || err.message));
        } finally {
            setSriLoading(false);
        }
    };

    const getStatusDisplay = (status) => {
        const statusMap = { 'pending': 'Pendiente', 'completed': 'Completado' };
        return statusMap[status] || status;
    };

    const getStatusClass = (status) => {
        const s = status?.toLowerCase() || '';
        if (s === 'completado' || s === 'completed') return 'status-badge completed';
        return 'status-badge pending';
    };

    const getStatusKey = (statusDisplay) => {
        const reverseMap = { 'Pendiente': 'pending', 'Completado': 'completed' };
        return reverseMap[statusDisplay] || statusDisplay.toLowerCase();
    };

    const sortedAndFilteredOrders = orders
        .filter(order =>
            order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (order.customer_name && order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .sort((a, b) => {
            const aCompleted = ['completado', 'completed'].includes(a.status_display?.toLowerCase()) || ['completed'].includes(a.status?.toLowerCase());
            const bCompleted = ['completado', 'completed'].includes(b.status_display?.toLowerCase()) || ['completed'].includes(b.status?.toLowerCase());
            if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;
            return aCompleted ? new Date(b.created_at) - new Date(a.created_at) : new Date(a.created_at) - new Date(b.created_at);
        });

    // Pagination logic
    const indexOfLastOrder = currentPage * ORDERS_PER_PAGE;
    const indexOfFirstOrder = indexOfLastOrder - ORDERS_PER_PAGE;
    const currentOrders = sortedAndFilteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
    const totalPages = Math.ceil(sortedAndFilteredOrders.length / ORDERS_PER_PAGE);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    // Reset page to 1 on search
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    if (loading) return <div className="text-center p-5">Cargando órdenes...</div>;
    if (error) return <div className="text-center p-5 text-red-500">{error}</div>;

    return (
        <div>
            <div className="ff-welcome-header" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <h1 style={{ marginBottom: '0.5rem' }}>Órdenes</h1>
                <p>Gestiona y visualiza todas las órdenes de la tienda</p>
            </div>

            {/* Search Bar */}
            <div style={{ marginBottom: '2rem' }}>
                <input
                    type="text"
                    className="ff-search-input"
                    placeholder="Buscar por número de orden o cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Orders Table */}
            <div className="ff-table-container">
                <table className="ff-table">
                    <thead>
                        <tr>
                            <th>N° Orden</th>
                            <th>Cliente</th>
                            <th>Tipo</th>
                            <th>Total</th>
                            <th>Método Pago</th>
                            <th>Estado</th>
                            <th>Fecha</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentOrders.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>
                                    No se encontraron órdenes
                                </td>
                            </tr>
                        ) : (
                            currentOrders.map(order => (
                                <tr key={order.id} onClick={() => handleRowClick(order)} style={{ cursor: 'pointer' }}>
                                    <td>
                                        <span style={{ fontWeight: '700', color: 'var(--color-latte)' }}>#{order.order_number}</span>
                                    </td>
                                    <td>{(order.customer_name === 'Cliente Casual' || !order.customer_name) ? 'Consumidor Final' : order.customer_name}</td>
                                    <td>{order.order_type_display}</td>
                                    <td><strong>${order.total}</strong></td>
                                    <td>
                                        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                                            {order.payment_method_display || '-'}
                                        </span>
                                    </td>
                                    <td>
                                        <div
                                            className={getStatusClass(order.status_display)}
                                            onClick={(e) => e.stopPropagation()}
                                            style={{ display: 'inline-block', cursor: 'default' }}
                                        >
                                            <select
                                                value={getStatusKey(order.status_display)}
                                                onChange={(e) => handleStatusChange(order.order_number, e.target.value, e)}
                                                disabled={updatingStatus[order.order_number]}
                                                style={{ border: 'none', background: 'transparent', color: 'inherit', fontWeight: 'inherit', cursor: 'pointer', outline: 'none' }}
                                            >
                                                <option value="pending">Pendiente</option>
                                                <option value="completed">Completado</option>
                                            </select>
                                        </div>
                                    </td>
                                    <td>
                                        {new Date(order.created_at).toLocaleString('es-ES', {
                                            day: '2-digit', month: '2-digit', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginTop: '1.5rem', gap: '8px' }}>
                    <button
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="ff-button ff-button-secondary"
                        style={{ padding: '0.5rem 1rem', minWidth: '100px' }}
                    >
                        Anterior
                    </button>
                    <span style={{ margin: '0 15px', fontWeight: 'bold', minWidth: '120px', textAlign: 'center' }}>
                        Página {currentPage} de {totalPages}
                    </span>
                    <button
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="ff-button ff-button-secondary"
                        style={{ padding: '0.5rem 1rem', minWidth: '100px' }}
                    >
                        Siguiente
                    </button>
                </div>
            )}

            {/* Modal */}
            {showModal && selectedOrder && (
                <div className="ff-modal-overlay" onClick={closeModal} style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="ff-modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>

                        <div className="ff-modal-header">
                            <div>
                                <h2 className="ff-modal-title">Orden #{selectedOrder.order_number}</h2>
                                <span style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-latte)', fontSize: '0.9rem' }}>
                                    {new Date(selectedOrder.created_at).toLocaleString()}
                                </span>
                            </div>
                            <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-latte)' }}>×</button>
                        </div>

                        <div className="ff-modal-body">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                                <div>
                                    <h4 style={{ fontFamily: 'var(--font-serif)', marginBottom: '0.5rem' }}>Cliente</h4>
                                    <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{(selectedOrder.customer_name === 'Cliente Casual' || !selectedOrder.customer_name) ? 'Consumidor Final' : selectedOrder.customer_name}</p>

                                    <h4 style={{ fontFamily: 'var(--font-serif)', marginBottom: '0.5rem', marginTop: '1rem' }}>Método de Pago</h4>
                                    <p style={{ fontSize: '1rem', color: 'var(--color-latte)' }}>{selectedOrder.payment_method_display || 'Desconocido'}</p>
                                </div>
                                <div>
                                    <button onClick={handlePrintTicket} className="ff-button ff-button-primary">
                                        <i className="bi bi-printer" style={{ marginRight: '8px' }}></i> Imprimir
                                    </button>

                                    {selectedOrder.sri_info?.pdf_url && (
                                        <button
                                            onClick={() => handleDownloadDocument(selectedOrder.sri_info.pdf_url, 'pdf')}
                                            className="ff-button ff-button-secondary"
                                            style={{ marginLeft: '10px', display: 'inline-flex', alignItems: 'center' }}
                                        >
                                            <i className="bi bi-file-earmark-pdf" style={{ marginRight: '8px' }}></i> Factura PDF
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #e9ecef' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ fontFamily: 'var(--font-serif)', marginBottom: '0.5rem', color: '#495057' }}>Estado SRI / Facturación</h4>
                                        {selectedOrder.sri_info ? (
                                            <div>
                                                <div style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <strong>Estado: </strong>
                                                    <span className={`status-badge ${selectedOrder.sri_info.status === 'AUTHORIZED' ? 'completed' : 'pending'}`}>
                                                        {selectedOrder.sri_info.status_display}
                                                    </span>

                                                    {/* Mostrar botones PDF/XML solo si existen las URLs */}
                                                    {selectedOrder.sri_info.status === 'AUTHORIZED' && (
                                                        <div style={{ display: 'flex', gap: '8px', marginLeft: '10px' }}>
                                                            {selectedOrder.sri_info.pdf_url && (
                                                                <button
                                                                    onClick={() => handleDownloadDocument(selectedOrder.sri_info.pdf_url, 'pdf')}
                                                                    className="btn-boutique outline"
                                                                    style={{ padding: '2px 8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', border: '1px solid currentColor', background: 'transparent' }}
                                                                    title="Ver PDF Factura"
                                                                >
                                                                    <i className="bi bi-file-earmark-pdf"></i> PDF
                                                                </button>
                                                            )}

                                                        </div>
                                                    )}
                                                </div>

                                                {selectedOrder.sri_info.sri_number && (
                                                    <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>
                                                        <strong>Factura: </strong> {selectedOrder.sri_info.sri_number}
                                                    </div>
                                                )}
                                                {selectedOrder.sri_info.key && (
                                                    <div style={{ fontSize: '0.8rem', color: '#adb5bd', marginTop: '2px', fontFamily: 'monospace' }}>
                                                        CA: {selectedOrder.sri_info.key}
                                                    </div>
                                                )}
                                                {selectedOrder.sri_info.error && (
                                                    <div style={{ fontSize: '0.85rem', color: '#dc3545', marginTop: '0.5rem', maxWidth: '400px' }}>
                                                        {selectedOrder.sri_info.error}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <p style={{ color: '#6c757d', fontStyle: 'italic' }}>Sin información de facturación</p>
                                        )}
                                    </div>
                                    <div>
                                        {/* Mostrar botón de reintentar solo si NO está autorizado */}
                                        {(!selectedOrder.sri_info || selectedOrder.sri_info.status !== 'AUTHORIZED') && (
                                            <button
                                                onClick={handleRetrySRI}
                                                className="ff-button ff-button-secondary"
                                                disabled={sriLoading}
                                                style={{ fontSize: '0.9rem' }}
                                            >
                                                {sriLoading ? 'Procesando...' : (
                                                    <>
                                                        <i className="bi bi-arrow-repeat" style={{ marginRight: '5px' }}></i>
                                                        {selectedOrder.sri_info ? 'Reintentar SRI' : 'Emitir Factura'}
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="ff-table-container">
                                <table className="ff-table">
                                    <thead>
                                        <tr>
                                            <th>Producto</th>
                                            <th>Cant.</th>
                                            <th>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedOrder.loading ? (
                                            <tr><td colSpan="3" style={{ textAlign: 'center' }}>Cargando...</td></tr>
                                        ) : (
                                            selectedOrder.items?.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td>
                                                        {item.product_details?.name || item.product_name}
                                                        {item.variant_name && <span style={{ marginLeft: '5px', fontSize: '0.9em', color: '#666' }}>({item.variant_name})</span>}
                                                        {item.notes && <div style={{ fontSize: '0.8rem', color: 'var(--color-latte)', marginTop: '4px' }}>Nota: {item.notes}</div>}
                                                    </td>
                                                    <td>{item.quantity} x ${item.unit_price}</td>
                                                    <td><strong>${item.line_total || item.subtotal}</strong></td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--color-froth)', paddingTop: '1.5rem' }}>
                                <div style={{ textAlign: 'right', minWidth: '200px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span>Subtotal (sin IVA):</span>
                                        <span>${selectedOrder.subtotal}</span>
                                    </div>
                                    {selectedOrder.tax_amount > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span>IVA:</span>
                                            <span>${selectedOrder.tax_amount}</span>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-dark)' }}>
                                        <span>TOTAL:</span>
                                        <span>${selectedOrder.total}</span>
                                    </div>
                                </div>
                            </div>

                            {selectedOrder.notes && (
                                <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'var(--color-froth)', borderRadius: '4px' }}>
                                    <strong>Notas de Orden:</strong> {selectedOrder.notes}
                                </div>
                            )}

                            <div style={{ marginTop: '3rem', display: 'flex', gap: '1rem', justifyContent: 'flex-start' }}>
                                <button onClick={() => setShowDeleteConfirm(true)} className="ff-button ff-button-danger">
                                    Eliminar Orden
                                </button>
                                <button onClick={closeModal} className="ff-button ff-button-secondary" style={{ marginLeft: 'auto' }}>
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Custom Delete Confirmation Modal */}
            {
                showDeleteConfirm && (
                    <div className="ff-modal-overlay" style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: 'rgba(0,0,0,0.6)'
                    }}>
                        <div className="ff-modal-content" style={{ maxWidth: '500px', padding: '2rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', color: '#e74c3c', marginBottom: '1rem' }}>
                                <i className="bi bi-exclamation-triangle"></i>
                            </div>
                            <h3 className="ff-modal-title" style={{ color: '#c0392b', marginBottom: '1rem' }}>
                                ¡Atención! Proceso SRI
                            </h3>
                            <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                                Estás a punto de eliminar la orden <strong>#{selectedOrder?.order_number}</strong>.
                            </p>
                            <div style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeeba', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', color: '#856404' }}>
                                <strong>⚠️ Confirmar:</strong><br />
                                Esta acción eliminará la orden permanentemente, restaurará el stock y ajustará el saldo del cliente.
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button onClick={handleDeleteOrder} className="ff-button ff-button-danger">
                                    Sí, Eliminar todo
                                </button>
                                <button onClick={() => setShowDeleteConfirm(false)} className="ff-button ff-button-secondary">
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Ordenes;

