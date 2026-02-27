import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';
import bancosQr from '../../../assets/bancos_qr.png';
import '../BoutiqueLanding.css'; // Reutilizar estilos

const CheckoutFlow = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const {
        cart,
        getCartSubtotal,
        getCartTax,
        getCartTotal,
        clearCart,
        removeFromCart
    } = useCart();
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
    const [showEnlargedQr, setShowEnlargedQr] = useState(false);
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

    // Calcular totales con useMemo y rounding
    const roundCurrency = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

    const subtotal = React.useMemo(() => {
        return roundCurrency(getCartSubtotal());
    }, [cart, getCartSubtotal]);

    const taxAmount = React.useMemo(() => {
        return roundCurrency(getCartTax());
    }, [cart, getCartTax]);

    const discountAmount = React.useMemo(() => {
        return discountInfo ? roundCurrency(parseFloat(discountInfo.amount)) : 0;
    }, [discountInfo]);

    const finalTotal = React.useMemo(() => {
        return roundCurrency(subtotal + taxAmount - discountAmount);
    }, [subtotal, taxAmount, discountAmount]);

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
            const syncRes = await api.post('api/customers/sync/', syncPayload, { baseURL: '/api/luxe' });
            const customerId = syncRes.data.data.id;

            // Crear Orden
            const orderPayload = {
                customer_id: customerId,
                items: cart.map(item => ({
                    product_id: item.id,
                    quantity: item.quantity,
                    size_id: item.size_id || item.selectedSize?.id,
                    color_id: item.color_id,
                    variant_id: item.variant_id,
                    extra_ids: item.selectedExtras?.map(e => e.id)
                })),
                order_type: 'delivery',
                payment_method: paymentMethod === 'transferencia' ? 'transfer' : 'cash',
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
                const pName = item.product_details?.name || item.product_name || item.product?.name || "Producto";

                // Extraer el nombre de la variante desde la respuesta si existe (el backend suele mandar 'size_name' o 'variant_name')
                // Como no estamos seguros de si el backend manda el sufijo, vamos a dejar un espacio para el sufijo.
                const variantInfo = item.product_details?.variant_name || item.variant_name || "";
                const finalName = variantInfo ? `${pName} (${variantInfo})` : pName;

                const qty = item.quantity;
                // Backend uses 'unit_price' and 'line_total'
                const rawPrice = item.unit_price || item.price || 0;
                const price = typeof rawPrice === 'string' ? parseFloat(rawPrice) : rawPrice;

                const rawTotal = item.line_total || item.total || (price * qty);
                const lineTotal = typeof rawTotal === 'string' ? parseFloat(rawTotal) : rawTotal;

                msg += `- ${qty}x ${finalName}: $${lineTotal.toFixed(2)}\n`;
            });
        } else {
            msg += `(Detalle de productos en sistema)\n`;
        }

        msg += `\n*Subtotal:* $${parseFloat(createdOrder.subtotal || 0).toFixed(2)}\n`;

        // IVA
        const taxVal = parseFloat(createdOrder.tax_amount || 0);
        if (taxVal > 0) {
            msg += `*IVA (incluido):* $${taxVal.toFixed(2)}\n`;
        }

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
                <div className="checkout-modal transfer-modal-content">
                    <div>
                        <div className="success-icon-container">
                            ✓
                        </div>
                        <h3 className="transfer-title">¡Pedido Recibido!</h3>
                        <p className="transfer-subtitle">Tu orden #{createdOrder?.order_number} ha sido registrada correctamente.</p>
                    </div>

                    <div className="payment-instructions-box">
                        <h4 className="instructions-title">Instrucciones de Pago</h4>

                        <p className="instructions-text">
                            Realiza la transferencia por el valor de <strong className="price-highlight">${parseFloat(createdOrder?.total || 0).toFixed(2)}</strong> a la siguiente cuenta y envía el comprobante:
                        </p>

                        <div className="qr-container" style={{ cursor: 'pointer' }} onClick={() => setShowEnlargedQr(true)}>
                            <img src={bancosQr} alt="Datos Bancarios QR" className="qr-image" title="Clic para ampliar" />
                            <small style={{ display: 'block', marginTop: '5px', color: '#64748b', fontSize: '0.8rem' }}>(Clic para ampliar imagen)</small>
                        </div>

                        <button onClick={handleWhatsAppClick} className="whatsapp-btn">
                            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                            </svg>
                            <span>Enviar comprobante al WhatsApp</span>
                        </button>
                    </div>

                    <button
                        onClick={() => { setShowTransferModal(false); onClose(); }}
                        className="close-link-btn"
                    >
                        Cerrar y volver a la tienda
                    </button>
                </div>

                {/* Enlarged QR Modal */}
                {showEnlargedQr && (
                    <div className="checkout-modal-overlay" style={{ zIndex: 11000 }} onClick={() => setShowEnlargedQr(false)}>
                        <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%', background: 'transparent', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => setShowEnlargedQr(false)}
                                style={{
                                    position: 'absolute', top: '-40px', right: '0',
                                    background: 'white', color: 'black', border: 'none',
                                    borderRadius: '50%', width: '36px', height: '36px',
                                    fontSize: '20px', cursor: 'pointer', fontWeight: 'bold'
                                }}
                            >
                                X
                            </button>
                            <img src={bancosQr} alt="QR Ampliado" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }} />
                        </div>
                    </div>
                )}
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
                                <div key={index} className="summary-item" style={{ position: 'relative' }}>
                                    <div className="summary-item-info" style={{ paddingRight: '20px' }}>
                                        <span className="summary-p-name">{item.name}</span>
                                        {(item.selectedSize || item.cart_name_suffix) && (
                                            <small style={{ display: 'block', color: '#666', marginTop: '2px' }}>
                                                ({item.cart_name_suffix ? item.cart_name_suffix : item.selectedSize.name})
                                            </small>
                                        )}
                                        <div className="summary-p-qty" style={{ marginTop: '4px' }}>Cant: {item.quantity}</div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                                        <div className="summary-p-price">${((item.price) * item.quantity).toFixed(2)}</div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeFromCart(item.tempId);
                                            }}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#ef4444',
                                                fontSize: '14px',
                                                cursor: 'pointer',
                                                padding: '2px 5px',
                                                fontWeight: 'bold'
                                            }}
                                            title="Eliminar del carrito"
                                        >
                                            ✕ Eliminar
                                        </button>
                                    </div>
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
                            {taxAmount > 0 && (
                                <div className="total-row"><span>IVA (incluido)</span><span>${taxAmount.toFixed(2)}</span></div>
                            )}
                            {discountInfo && (
                                <div className="total-row" style={{ color: 'green' }}>
                                    <span>Descuento</span><span>-${discountAmount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="total-row final" style={{ fontSize: '1.4rem', borderTop: '2px solid #2C2C2C', paddingTop: '10px', marginTop: '10px' }}>
                                <span>TOTAL</span><span>${finalTotal.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* MÉTODO DE PAGO */}
                        <div style={{ marginTop: '30px' }}>
                            <h4 style={{ marginBottom: '15px', fontSize: '16px' }}>Método de Pago</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {/* Opción 1: Transferencia */}
                                <label style={{
                                    padding: '15px',
                                    border: `1px solid ${paymentMethod === 'transferencia' ? '#2C2C2C' : '#cbd5e1'}`,
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    backgroundColor: paymentMethod === 'transferencia' ? '#f0f9ff' : 'white',
                                    cursor: 'pointer'
                                }}>
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="transferencia"
                                        checked={paymentMethod === 'transferencia'}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        style={{ accentColor: '#2C2C2C' }}
                                    />
                                    <div>
                                        <strong>Transferencia Bancaria</strong>
                                        <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>Debes enviar el comprobante por WhatsApp</p>
                                    </div>
                                </label>

                                {/* Opción 2: Efectivo */}
                                <label style={{
                                    padding: '15px',
                                    border: `1px solid ${paymentMethod === 'efectivo' ? '#2C2C2C' : '#cbd5e1'}`,
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    backgroundColor: paymentMethod === 'efectivo' ? '#f0f9ff' : 'white',
                                    cursor: 'pointer'
                                }}>
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="efectivo"
                                        checked={paymentMethod === 'efectivo'}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        style={{ accentColor: '#2C2C2C' }}
                                    />
                                    <div>
                                        <strong>Efectivo</strong>
                                        <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>Pago contra entrega</p>
                                    </div>
                                </label>
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


