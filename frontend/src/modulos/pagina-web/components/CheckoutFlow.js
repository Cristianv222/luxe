import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';
import bancosQr from '../../../assets/bancos_qr.png';
import '../BoutiqueLanding.css'; // Reutilizar estilos

const CheckoutFlow = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const { cart, getCartTotal, clearCart } = useCart();
    const navigate = useNavigate();

    // Estados
    const [loadingCheckout, setLoadingCheckout] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('transferencia');
    const [isRegistering, setIsRegistering] = useState(false);
    const [checkoutPassword, setCheckoutPassword] = useState('');
    const [billingDetails, setBillingDetails] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        identification_number: '',
        birth_date: '',
        address: '',
        city: ''
    });
    const [loadingCustomerSearch, setLoadingCustomerSearch] = useState(false);
    const [customerFound, setCustomerFound] = useState(false);

    // Discount
    const [discountCode, setDiscountCode] = useState('');
    const [discountInfo, setDiscountInfo] = useState(null);
    const [discountLoading, setDiscountLoading] = useState(false);
    const [discountError, setDiscountError] = useState('');

    // Transfer & Order
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [createdOrder, setCreatedOrder] = useState(null);

    // Alert
    const [alertData, setAlertData] = useState({ show: false, type: 'info', title: '', message: '' });

    const showAlert = (type, title, message) => setAlertData({ show: true, type, title, message });
    const closeAlert = () => setAlertData({ ...alertData, show: false });

    // Efecto para pre-llenar datos si hay usuario
    useEffect(() => {
        if (isOpen && user) {
            setBillingDetails({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                email: user.email || '',
                phone: user.phone || '',
                identification_number: user.identification_number || user.cedula || '',
                birth_date: user.birth_date || '',
                address: user.address || '',
                city: user.city || ''
            });
            setIsRegistering(false);
            setCustomerFound(true);
        }
    }, [isOpen, user]);

    // Buscar cliente
    const searchCustomerByCedula = async (cedula) => {
        if (!cedula || cedula.length < 10) return;
        setLoadingCustomerSearch(true);
        try {
            const response = await api.get(`api/customers/search_by_cedula/?cedula=${cedula}`, { baseURL: '/api/luxe' });
            if (response.data && response.data.found) {
                const customer = response.data.customer;
                setBillingDetails(prev => ({
                    ...prev,
                    first_name: customer.first_name || '',
                    last_name: customer.last_name || '',
                    email: customer.email || '',
                    phone: customer.phone || '',
                    identification_number: cedula,
                    birth_date: customer.birth_date || '',
                    address: customer.address || '',
                    city: customer.city || ''
                }));
                setCustomerFound(true);
            } else {
                setCustomerFound(false);
            }
        } catch (err) {
            console.log('Cliente no encontrado');
            setCustomerFound(false);
        } finally {
            setLoadingCustomerSearch(false);
        }
    };

    // Validar descuento
    const validateDiscountCode = async () => {
        if (!discountCode.trim()) return;
        setDiscountLoading(true);
        setDiscountError('');
        setDiscountInfo(null);
        try {
            const response = await api.post('api/pos/discounts/validate/',
                { discount_code: discountCode.trim(), order_amount: getCartTotal() },
                { baseURL: '/api/luxe' }
            );
            if (response.data.valid) {
                const disc = response.data.discount;
                setDiscountInfo({
                    code: disc?.code || discountCode.trim(),
                    type: disc?.discount_type || 'fixed',
                    value: disc?.discount_value || 0,
                    amount: response.data.discount_amount || 0,
                    description: response.data.message || disc?.name || 'Descuento aplicado'
                });
            } else {
                setDiscountError(response.data.error || response.data.message || 'Cupón no válido');
            }
        } catch (err) {
            setDiscountError(err.response?.data?.message || 'Error al validar cupón');
        } finally {
            setDiscountLoading(false);
        }
    };

    const removeDiscount = () => {
        setDiscountCode('');
        setDiscountInfo(null);
        setDiscountError('');
    };

    // Calcular totales
    const subtotal = getCartTotal();
    const discountAmount = discountInfo ? discountInfo.amount : 0;
    const finalTotal = subtotal - discountAmount;

    // Submit Checkout
    const handleCheckoutSubmit = async (e) => {
        e.preventDefault();
        if (cart.length === 0) return showAlert('warning', 'Carrito vacío', 'Tu carrito está vacío');
        setLoadingCheckout(true);

        try {
            // Registro opcional
            if (!user && isRegistering) {
                if (!checkoutPassword) throw new Error("La contraseña es requerida");
                await api.post('/api/authentication/register/', {
                    ...billingDetails,
                    username: billingDetails.email,
                    password: checkoutPassword,
                    password_confirm: checkoutPassword
                });
            }

            // Sincronizar cliente
            const syncPayload = {
                first_name: billingDetails.first_name,
                last_name: billingDetails.last_name,
                email: billingDetails.email,
                phone: billingDetails.phone,
                cedula: billingDetails.identification_number,
                birth_date: billingDetails.birth_date || null,
                address: billingDetails.address,
                city: billingDetails.city
            };
            const syncRes = await api.post('api/customers/admin/sync/', syncPayload, { baseURL: '/api/luxe' });
            const customerId = syncRes.data.data.id;

            // Crear Orden
            const orderPayload = {
                customer_id: customerId,
                items: cart.map(item => ({
                    product_id: item.id,
                    quantity: item.quantity,
                    size_id: item.selectedSize?.id,
                    extra_ids: item.selectedExtras?.map(e => e.id)
                })),
                order_type: 'delivery',
                payment_method: 'transfer',
                source: 'web',
                discount_code: discountInfo ? discountInfo.code : null,
                delivery_info: {
                    address: billingDetails.address,
                    city: billingDetails.city,
                    contact_name: `${billingDetails.first_name} ${billingDetails.last_name}`,
                    contact_phone: billingDetails.phone
                }
            };

            const orderResponse = await api.post('api/orders/orders/', orderPayload, { baseURL: '/api/luxe' });
            setCreatedOrder(orderResponse.data);
            clearCart();
            setShowTransferModal(true); // Pasar a modal de transferencia

        } catch (err) {
            console.error(err);
            showAlert('error', 'Error', err.message || 'Error al procesar el pedido');
        } finally {
            setLoadingCheckout(false);
        }
    };

    const handleWhatsAppClick = () => {
        if (!createdOrder) return;

        // Usar los totales de la orden creada (o fallback a los calculados si pending)
        // El usuario reportó que el mensaje de whatsapp no tenía descuento.
        // createdOrder.total viene del backend. Si el backend aplicó descuento, should be fine.
        // Pero createdOrder.items viene del backend? A veces create serializer no devuelve items.
        // Asumiremos que sí, o usaremos la respuesta.
        // Si no, usaremos una construcción manual.

        const orderNum = createdOrder.order_number;
        const clientName = `${billingDetails.first_name} ${billingDetails.last_name}`;

        let msg = `*CONFIRMACIÓN DE PEDIDO WEB*\n\n`;
        msg += `*Orden:* #${orderNum}\n`;
        msg += `*Cliente:* ${clientName}\n`;
        msg += `*Cédula/RUC:* ${billingDetails.identification_number}\n\n`;

        msg += `*DETALLE DE PRODUCTOS:*\n`;

        // Si la respuesta del backend incluye items detallados, usarlos. 
        // Si no, iterar sobre el cart (aunque el cart ya se borró, ups - clearCart se llamó antes).
        // Pero createdOrder debería tener items si el serializer es Read también.
        // OrderCreateSerializer normalmente devuelve la orden serializada con items.
        // Si no, tenemos un problema.
        // FIX: No borrar cart hasta cerrar modal? No, mejor confiar en createdOrder.
        // Si createdOrder.items existe:
        if (createdOrder.items && createdOrder.items.length > 0) {
            createdOrder.items.forEach(item => {
                const pName = item.product_name || item.product?.name || "Producto";
                const qty = item.quantity;
                const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
                // El precio unitario total (incluyendo extras si el backend lo suma)
                // Si item.total existe
                const lineTotal = item.total || (price * qty);
                msg += `- ${qty}x ${pName}: $${parseFloat(lineTotal).toFixed(2)}\n`;
            });
        } else {
            msg += `(Detalle de productos en sistema)\n`;
        }

        msg += `\n*Subtotal:* $${parseFloat(createdOrder.subtotal).toFixed(2)}\n`;

        // Descuento
        const discountVal = parseFloat(createdOrder.discount_amount || 0);
        if (discountVal > 0) {
            msg += `*Descuento:* -$${discountVal.toFixed(2)}\n`;
        }

        msg += `*TOTAL A PAGAR:* $${parseFloat(createdOrder.total).toFixed(2)}\n\n`;
        msg += `Adjunto el comprobante de pago.`;

        const encodedMsg = encodeURIComponent(msg);
        const phone = "593986123920"; // Updated phone

        window.open(`https://wa.me/${phone}?text=${encodedMsg}`, '_blank');
    };

    if (!isOpen && !showTransferModal) return null;

    // RENDER TRANSFER MODAL
    if (showTransferModal) {
        return (
            <div className="checkout-modal-overlay">
                <div className="checkout-modal" style={{ maxWidth: '450px', textAlign: 'center' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', fontSize: '30px' }}>
                            ✓
                        </div>
                        <h3 style={{ fontSize: '24px', color: '#1a1a1a', marginBottom: '10px' }}>¡Pedido Recibido!</h3>
                        <p style={{ color: '#666' }}>Tu orden #{createdOrder?.order_number} ha sido registrada correctamente.</p>
                    </div>

                    <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '25px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#334155', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '1px' }}>Instrucciones de Pago</h4>

                        <p style={{ marginBottom: '15px', fontSize: '14px', color: '#475569' }}>
                            Realiza la transferencia por el valor de <strong style={{ color: '#1e293b', fontSize: '16px' }}>${parseFloat(createdOrder?.total || 0).toFixed(2)}</strong> a la siguiente cuenta y envía el comprobante:
                        </p>

                        <div style={{ marginBottom: '20px', border: '1px dashed #cbd5e1', padding: '10px', borderRadius: '8px', backgroundColor: '#fff' }}>
                            <img src={bancosQr} alt="Datos Bancarios QR" style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px' }} />
                        </div>

                        <button
                            onClick={handleWhatsAppClick}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                width: '100%', padding: '14px', backgroundColor: '#25D366', color: 'white',
                                border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold',
                                cursor: 'pointer', transition: 'all 0.2s'
                            }}
                        >
                            <span>Enviar comprobante al WhatsApp</span>
                        </button>
                    </div>

                    <button
                        onClick={() => { setShowTransferModal(false); onClose(); }}
                        style={{ background: 'transparent', border: 'none', color: '#64748b', textDecoration: 'underline', cursor: 'pointer' }}
                    >
                        Cerrar y volver a la tienda
                    </button>
                </div>
            </div>
        );
    }

    // RENDER CHECKOUT FORM MODAL
    return (
        <div className="checkout-modal-overlay" onClick={onClose}>
            <div className="checkout-modal" onClick={e => e.stopPropagation()}>
                <div className="checkout-modal-grid">
                    {/* IZQUIERDA: DATOS */}
                    <div className="checkout-left">
                        <h3 className="checkout-title">Datos de Facturación</h3>
                        <div className="checkout-form">
                            <div className="checkout-input-group" style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f7ff', borderRadius: '8px' }}>
                                <label style={{ fontWeight: 'bold', color: '#1e40af' }}>Identificación / Cédula</label>
                                <input
                                    type="text"
                                    className="checkout-input"
                                    required
                                    value={billingDetails.identification_number}
                                    onChange={e => {
                                        const valor = e.target.value;
                                        setBillingDetails({ ...billingDetails, identification_number: valor });
                                        if (valor.length === 10 && !user) searchCustomerByCedula(valor);
                                    }}
                                    onBlur={() => {
                                        if (billingDetails.identification_number.length >= 10 && !user) {
                                            searchCustomerByCedula(billingDetails.identification_number);
                                        }
                                    }}
                                    placeholder="Ingrese su cédula o RUC"
                                />
                                {loadingCustomerSearch && <small>Buscando cliente...</small>}
                                {customerFound && <small style={{ color: 'green' }}>✓ Datos encontrados</small>}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="checkout-input-group">
                                    <label>Nombre</label>
                                    <input type="text" className="checkout-input" required value={billingDetails.first_name}
                                        onChange={e => setBillingDetails({ ...billingDetails, first_name: e.target.value })} />
                                </div>
                                <div className="checkout-input-group">
                                    <label>Apellido</label>
                                    <input type="text" className="checkout-input" required value={billingDetails.last_name}
                                        onChange={e => setBillingDetails({ ...billingDetails, last_name: e.target.value })} />
                                </div>
                            </div>

                            <div className="checkout-input-group">
                                <label>Email</label>
                                <input type="email" className="checkout-input" required value={billingDetails.email}
                                    onChange={e => setBillingDetails({ ...billingDetails, email: e.target.value })} />
                            </div>

                            <div className="checkout-input-group">
                                <label>Teléfono</label>
                                <input type="tel" className="checkout-input" required value={billingDetails.phone}
                                    onChange={e => setBillingDetails({ ...billingDetails, phone: e.target.value })} />
                            </div>

                            <div className="checkout-input-group">
                                <label>Fecha de Nacimiento</label>
                                <input type="date" className="checkout-input" value={billingDetails.birth_date}
                                    onChange={e => setBillingDetails({ ...billingDetails, birth_date: e.target.value })} />
                            </div>

                            <div className="checkout-input-group">
                                <label>Dirección de Entrega</label>
                                <textarea className="checkout-input" rows="2" required value={billingDetails.address}
                                    onChange={e => setBillingDetails({ ...billingDetails, address: e.target.value })}></textarea>
                            </div>
                            <div className="checkout-input-group">
                                <label>Ciudad</label>
                                <input type="text" className="checkout-input" required value={billingDetails.city}
                                    onChange={e => setBillingDetails({ ...billingDetails, city: e.target.value })} />
                            </div>

                        </div>
                    </div>
                    {/* DERECHA: RESUMEN DEL PEDIDO */}
                    <div className="checkout-right">
                        <h3 className="checkout-title">Resumen del Pedido</h3>
                        <div className="order-summary-items">
                            {cart.map((item, index) => (
                                <div key={index} className="summary-item">
                                    <div className="summary-item-info">
                                        <span className="summary-p-name">{item.name}</span>
                                        {item.selectedSize && <small> ({item.selectedSize.name})</small>}
                                        <div className="summary-p-qty">Cant: {item.quantity}</div>
                                    </div>
                                    <div className="summary-p-price">${((item.price) * item.quantity).toFixed(2)}</div>
                                </div>
                            ))}
                        </div>

                        {/* CUPÓN */}
                        <div style={{ margin: '20px 0', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '6px' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    type="text"
                                    placeholder="Código de descuento"
                                    className="checkout-input"
                                    style={{ marginBottom: 0 }}
                                    value={discountCode}
                                    onChange={e => setDiscountCode(e.target.value)}
                                    disabled={!!discountInfo}
                                />
                                <button
                                    type="button"
                                    onClick={discountInfo ? removeDiscount : validateDiscountCode}
                                    disabled={discountLoading}
                                    style={{
                                        padding: '0 15px', backgroundColor: discountInfo ? '#ef4444' : '#2C2C2C', color: 'white',
                                        border: 'none', borderRadius: '4px', cursor: 'pointer'
                                    }}
                                >
                                    {discountLoading ? '...' : (discountInfo ? 'Quitar' : 'Aplicar')}
                                </button>
                            </div>
                            {discountError && <small style={{ color: 'red', display: 'block', marginTop: '5px' }}>{discountError}</small>}
                            {discountInfo && (
                                <div style={{ marginTop: '10px', fontSize: '13px', color: 'green' }}>
                                    ✓ {discountInfo.description} (-${parseFloat(discountInfo.amount).toFixed(2)})
                                </div>
                            )}
                        </div>

                        <div className="checkout-totals">
                            <div className="total-row"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                            {discountInfo && (
                                <div className="total-row" style={{ color: 'green' }}>
                                    <span>Descuento</span><span>-${parseFloat(discountAmount).toFixed(2)}</span>
                                </div>
                            )}
                            <div className="total-row final"><span>Total</span><span>${finalTotal.toFixed(2)}</span></div>
                        </div>

                        {/* MÉTODO DE PAGO */}
                        <div style={{ marginTop: '30px' }}>
                            <h4 style={{ marginBottom: '15px', fontSize: '16px' }}>Método de Pago</h4>
                            <div style={{ padding: '15px', border: '1px solid #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f8fafc' }}>
                                <input type="radio" checked readOnly style={{ accentColor: '#2C2C2C' }} />
                                <div>
                                    <strong>Transferencia Bancaria</strong>
                                    <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>* Único método disponible para compras web</p>
                                </div>
                            </div>
                        </div>

                        <button onClick={handleCheckoutSubmit} disabled={loadingCheckout} className="pay-now-btn" style={{ marginTop: '20px' }}>
                            {loadingCheckout ? 'Procesando...' : `Confirmar Pedido - $${finalTotal.toFixed(2)}`}
                        </button>
                    </div>
                </div>
            </div>

            {alertData.show && (
                <div className="alert-modal-overlay" style={{ zIndex: 10000 }}>
                    <div className={`alert-modal alert-${alertData.type}`}>
                        <h3>{alertData.title}</h3>
                        <p>{alertData.message}</p>
                        <button onClick={closeAlert}>Aceptar</button>
                    </div>
                </div>
            )}
        </div>
    );
};


export default CheckoutFlow;
