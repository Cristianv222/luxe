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

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await api.get('/api/orders/orders/', {
                    baseURL: process.env.REACT_APP_LUXE_SERVICE
                });
                setOrders(response.data.results || response.data || []);
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
        if (!window.confirm(`¿Estás seguro de que quieres eliminar la Orden ${selectedOrder.order_number}?`)) {
            return;
        }

        try {
            await api.delete(`/api/orders/orders/${selectedOrder.order_number}/`, {
                baseURL: process.env.REACT_APP_LUXE_SERVICE
            });
            setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
            closeModal();
        } catch (err) {
            console.error('Error deleting order:', err);
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
                total: parseFloat(selectedOrder.total)
            };
            await printerService.printReceipt(receiptData);
            alert('Ticket enviado a la impresora');
        } catch (error) {
            console.error('Error printing ticket:', error);
            alert('Error al imprimir el ticket.');
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
                            <th>Estado</th>
                            <th>Fecha</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedAndFilteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>
                                    No se encontraron órdenes
                                </td>
                            </tr>
                        ) : (
                            sortedAndFilteredOrders.map(order => (
                                <tr key={order.id} onClick={() => handleRowClick(order)} style={{ cursor: 'pointer' }}>
                                    <td>
                                        <span style={{ fontWeight: '700', color: 'var(--color-latte)' }}>#{order.order_number}</span>
                                    </td>
                                    <td>{(order.customer_name === 'Cliente Casual' || !order.customer_name) ? 'Consumidor Final' : order.customer_name}</td>
                                    <td>{order.order_type_display}</td>
                                    <td><strong>${order.total}</strong></td>
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
                                    <p style={{ fontSize: '1.1rem' }}>{(selectedOrder.customer_name === 'Cliente Casual' || !selectedOrder.customer_name) ? 'Consumidor Final' : selectedOrder.customer_name}</p>
                                </div>
                                <div>
                                    <button onClick={handlePrintTicket} className="ff-button ff-button-primary">
                                        <i className="bi bi-printer" style={{ marginRight: '8px' }}></i> Imprimir
                                    </button>
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
                                        <span>Subtotal:</span>
                                        <span>${selectedOrder.subtotal}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-dark)' }}>
                                        <span>Total:</span>
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
                                <button onClick={handleDeleteOrder} className="ff-button ff-button-danger">
                                    Eliminar Orden
                                </button>
                                <button onClick={closeModal} className="ff-button ff-button-secondary" style={{ marginLeft: 'auto' }}>
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Ordenes;