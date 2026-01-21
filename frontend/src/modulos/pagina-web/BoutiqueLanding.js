import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import logo from '../../assets/logo_luxury.png';
import heroBg from '../../assets/hero_store.jpg';
import { useAuth } from '../../context/AuthContext';
import './BoutiqueLanding.css';
import './ProductStock.css';
import './ProductBadges.css';
import BarraNavegacion from '../../comun/BarraNavegacion';
import PiePagina from '../../comun/PiePagina';

const BoutiqueLanding = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [activeCategory, setActiveCategory] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // ============================================
    // CART & CHECKOUT STATE
    // ============================================
    const [cart, setCart] = useState([]);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [loadingCheckout, setLoadingCheckout] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('efectivo');
    const [isRegistering, setIsRegistering] = useState(false);
    const [checkoutPassword, setCheckoutPassword] = useState('');
    const [billingDetails, setBillingDetails] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        identification_number: '',
        birth_date: '',  // Nuevo campo
        address: '',
        city: ''
    });
    const [loadingCustomerSearch, setLoadingCustomerSearch] = useState(false);
    const [customerFound, setCustomerFound] = useState(false);

    // ============================================
    // DISCOUNT/COUPON STATE
    // ============================================
    const [discountCode, setDiscountCode] = useState('');
    const [discountInfo, setDiscountInfo] = useState(null);
    const [discountLoading, setDiscountLoading] = useState(false);
    const [discountError, setDiscountError] = useState('');



    // ============================================
    // CUSTOM ALERT STATE
    // ============================================
    const [alertModal, setAlertModal] = useState({
        show: false,
        type: 'info', // 'success', 'error', 'info', 'warning'
        title: '',
        message: ''
    });

    const showAlert = (type, title, message) => {
        setAlertModal({ show: true, type, title, message });
    };

    const closeAlert = () => {
        setAlertModal({ ...alertModal, show: false });
    };





    // Función para buscar cliente por cédula
    const searchCustomerByCedula = async (cedula) => {
        if (!cedula || cedula.length < 10) return;

        setLoadingCustomerSearch(true);
        try {
            const response = await api.get(`api/customers/search_by_cedula/?cedula=${cedula}`, { baseURL: '/api/luxe' });
            if (response.data && response.data.found) {
                const customer = response.data.customer;
                setBillingDetails({
                    first_name: customer.first_name || '',
                    last_name: customer.last_name || '',
                    email: customer.email || '',
                    phone: customer.phone || '',
                    identification_number: cedula,
                    birth_date: customer.birth_date || '',
                    address: customer.address || '',
                    city: customer.city || ''
                });
                setCustomerFound(true);
            } else {
                setCustomerFound(false);
            }
        } catch (err) {
            console.log('Cliente no encontrado, puede continuar con el registro');
            setCustomerFound(false);
        } finally {
            setLoadingCustomerSearch(false);
        }
    };

    useEffect(() => {
        if (user) {
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
    }, [user]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const catResponse = await api.get('api/menu/categories/', { baseURL: '/api/luxe' });
                const cats = catResponse.data.results || catResponse.data || [];
                const activeCats = cats.filter(c => c.is_active);
                setCategories(activeCats);
                if (activeCats.length > 0) setActiveCategory(activeCats[0].id);

                const prodResponse = await api.get('api/menu/products/', { baseURL: '/api/luxe' });
                const prods = prodResponse.data.results || prodResponse.data || [];
                // SOLO mostrar productos activos Y destacados (is_featured = true)
                setProducts(prods.filter(p => p.is_active && p.is_featured));
            } catch (err) {
                console.error("Error loading data:", err);
            }
        };
        fetchData();
    }, []);

    // ============================================
    // CART LOGIC
    // ============================================
    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            return [...prev, { ...product, quantity: 1 }];
        });
        // Feedback inmediato: Mostrar alerta pequeña o abrir carrito
        // Por ahora, mostraremos una alerta sutil de éxito
        showAlert('success', 'Producto agregado', `${product.name} se agregó a tu carrito.`);
    };

    const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));
    const calculateTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

    // ============================================
    // PRODUCT DETAIL MODAL
    // ============================================
    const [selectedProduct, setSelectedProduct] = useState(null);

    const openProductDetail = (product) => {
        setSelectedProduct(product);
    };

    const closeProductDetail = () => {
        setSelectedProduct(null);
    };

    const isOutOfStock = (product) => {
        return product.track_stock && product.stock_quantity <= 0;
    };

    // Función para validar cupón de descuento
    const validateDiscountCode = async () => {
        if (!discountCode.trim()) return;

        setDiscountLoading(true);
        setDiscountError('');
        setDiscountInfo(null);

        try {
            const response = await api.post('api/pos/discounts/validate/',
                { discount_code: discountCode.trim(), order_amount: calculateTotal },
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
            setDiscountError(err.response?.data?.message || err.response?.data?.error || 'Error al validar cupón');
        } finally {
            setDiscountLoading(false);
        }
    };

    const removeDiscount = () => {
        setDiscountCode('');
        setDiscountInfo(null);
        setDiscountError('');
    };

    // Calcular total con descuento
    const discountAmount = discountInfo ? discountInfo.amount : 0;
    const finalTotal = calculateTotal - discountAmount;

    const handleCheckoutSubmit = async (e) => {
        e.preventDefault();
        if (cart.length === 0) return showAlert('warning', 'Carrito vacío', 'Tu carrito está vacío');
        setLoadingCheckout(true);

        try {
            // 1. Si el usuario quiere registrarse, llamar al endpoint de registro
            if (!user && isRegistering) {
                if (!checkoutPassword) throw new Error("La contraseña es requerida para crear una cuenta");

                await api.post('/api/authentication/register/', {
                    ...billingDetails,
                    username: billingDetails.email, // Usamos email como username por defecto
                    password: checkoutPassword,
                    password_confirm: checkoutPassword
                });
                showAlert('success', 'Cuenta creada', 'Cuenta creada con éxito. Tu pedido se procesará ahora.');
                // Nota: Podríamos loguearlo aquí, pero por ahora seguimos con la orden vinculada al email.
            }

            // 2. Sincronizar cliente en Luxe Service (necesario para la orden)
            const syncPayload = {
                first_name: billingDetails.first_name,
                last_name: billingDetails.last_name,
                email: billingDetails.email,
                phone: billingDetails.phone,
                cedula: billingDetails.identification_number,
                birth_date: billingDetails.birth_date || null,  // Enviar fecha de nacimiento
                address: billingDetails.address,
                city: billingDetails.city
            };

            const syncRes = await api.post('api/customers/admin/sync/', syncPayload, { baseURL: '/api/luxe' });
            const customerId = syncRes.data.data.id;

            const orderPayload = {
                customer_id: customerId,
                items: cart.map(item => ({
                    product_id: item.id,
                    quantity: item.quantity
                })),
                order_type: 'in_store',
                payment_method: paymentMethod === 'efectivo' ? 'cash' : 'transfer',
                status: 'pending',
                discount_code: discountInfo ? discountInfo.code : null  // Enviar cupón si existe
            };

            console.log('Enviando orden:', orderPayload);
            const orderResponse = await api.post('api/orders/orders/', orderPayload, { baseURL: '/api/luxe' });
            console.log('Orden creada:', orderResponse.data);

            showAlert('success', '¡Pedido confirmado!', 'Tu orden ha sido realizada con éxito. Nos contactaremos contigo pronto.');
            setCart([]);
            setShowCheckoutModal(false);
            if (isRegistering) navigate('/login');
        } catch (err) {
            console.error("Error en checkout:", err);
            console.error("Respuesta del servidor:", err.response?.data);

            // Mostrar errores de validación del servidor
            if (err.response?.data) {
                const errors = err.response.data;
                let errorMsg = "Error al procesar la orden:\n\n";

                // Si hay errores de validación, mostrarlos
                if (typeof errors === 'object' && !errors.error) {
                    Object.keys(errors).forEach(field => {
                        const messages = Array.isArray(errors[field]) ? errors[field].join(', ') : errors[field];
                        errorMsg += `${field}: ${messages}\n`;
                    });
                } else {
                    errorMsg += JSON.stringify(errors);
                }

                showAlert('error', 'Error', errorMsg);
            } else {
                showAlert('error', 'Error', err.message);
            }
        } finally {
            setLoadingCheckout(false);
        }
    };

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const handleLogout = () => { logout(); navigate('/'); };

    return (
        <div className="boutique-container">
            {/* HEADER */}
            <BarraNavegacion />

            {/* BOTÓN FLOTANTE DE CARRITO */}
            {cart.length > 0 && (
                <div className="cart-floating-btn" onClick={() => setShowCheckoutModal(true)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    <span className="cart-badge">{cart.reduce((a, b) => a + b.quantity, 0)}</span>
                </div>
            )}

            {/* HERO SECTION */}
            <section style={{
                width: '100%', minHeight: '85vh', backgroundImage: `url(${heroBg})`,
                backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex',
                alignItems: 'center', justifyContent: 'center', padding: '60px 20px',
                marginTop: '80px', position: 'relative'
            }}>
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.2)' }}></div>
                <div style={{
                    maxWidth: '800px', width: '100%', backgroundColor: 'rgba(241, 238, 235, 0.4)',
                    backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', padding: '80px 60px',
                    borderRadius: '4px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
                    position: 'relative', border: '1px solid rgba(255,255,255,0.3)'
                }}>
                    <p style={{
                        fontSize: '14px', letterSpacing: '5px', color: '#2C2C2C',
                        marginBottom: '20px', textTransform: 'uppercase', fontWeight: '700'
                    }}>Luxury Boutique</p>
                    <h2 style={{
                        fontFamily: 'serif', fontSize: '56px', color: '#1a1a1a',
                        margin: '0 0 30px 0', fontWeight: 600, letterSpacing: '2px', lineHeight: '1.2'
                    }}>Colección Exclusiva</h2>
                    <p style={{
                        fontSize: '18px', lineHeight: '1.8', color: '#333333',
                        marginBottom: '45px', maxWidth: '500px', margin: '0 auto 45px', fontWeight: '500'
                    }}>Define tu estilo con piezas únicas y atemporales.</p>
                    <a href="#collection" className="hero-btn-simple" style={{
                        display: 'inline-block', padding: '16px 45px', backgroundColor: '#2C2C2C',
                        color: '#FFFFFF', textDecoration: 'none', textTransform: 'uppercase',
                        letterSpacing: '2px', fontSize: '13px', fontWeight: 600,
                        transition: 'all 0.3s ease', border: '1px solid #2C2C2C'
                    }}>Ver Colección</a>
                </div>
            </section>

            {/* SECCIÓN DE COLECCIÓN */}
            <section id="collection" className="collection-section">
                <div className="section-header">
                    <h2 className="section-title">Productos Destacados</h2>
                    <div className="divider-line"></div>
                </div>

                <div className="product-grid">
                    {/* Renderizamos solo si el producto coincide con la categoría activa (o si aún no hay categoría activa, mostramos todos) */}
                    {products.length > 0 ? (
                        products.map(product => {
                            const outOfStock = isOutOfStock(product);

                            return (
                                <div key={product.id} className="product-card">
                                    {/* Badge DESTACADO - Siempre visible */}
                                    <div className="featured-ribbon">DESTACADO</div>

                                    {/* Badge AGOTADO - Solo si está sin stock */}
                                    {outOfStock && (
                                        <div className="ribbon-badge">AGOTADO</div>
                                    )}
                                    <div className="product-image-container" onClick={() => openProductDetail(product)} style={{ cursor: 'pointer' }}>
                                        {product.image ? (
                                            <img src={product.image} alt={product.name} className="product-image" />
                                        ) : (
                                            <div className="placeholder-image">{product.name.charAt(0)}</div>
                                        )}
                                        {!outOfStock && (
                                            <div className="quick-add-btn" onClick={(e) => { e.stopPropagation(); addToCart(product); }}>+</div>
                                        )}
                                    </div>
                                    <div className="product-info">
                                        <h3 className="product-name">{product.name}</h3>
                                        <p className="product-price">${parseFloat(product.price).toFixed(2)}</p>
                                        {product.track_stock && (
                                            <p className={`product-stock ${outOfStock ? 'out-of-stock' : ''}`}>
                                                {outOfStock ? 'Sin stock' : `Stock: ${product.stock_quantity} unidades`}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="no-products">
                            No hay productos destacados disponibles en este momento.
                        </div>
                    )}
                </div>

                {/* Botón Ver Más - Redirige a página de colección completa */}
                <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                    <Link
                        to="/coleccion"
                        style={{
                            display: 'inline-block',
                            padding: '16px 45px',
                            backgroundColor: '#CFB3A9',
                            color: '#FFFFFF',
                            textDecoration: 'none',
                            textTransform: 'uppercase',
                            letterSpacing: '2px',
                            fontSize: '13px',
                            fontWeight: 600,
                            transition: 'all 0.3s ease',
                            border: '1px solid #CFB3A9',
                            borderRadius: '2px'
                        }}
                        className="hover-float"
                    >
                        Ver Más Productos
                    </Link>
                </div>
            </section>

            {/* PRODUCT DETAIL MODAL */}
            {selectedProduct && (
                <div className="product-modal-overlay" onClick={closeProductDetail}>
                    <div className="product-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={closeProductDetail}>×</button>
                        <div className="modal-content-grid">
                            <div className="modal-image-section">
                                {selectedProduct.image ? (
                                    <img src={selectedProduct.image} alt={selectedProduct.name} className="modal-product-image" />
                                ) : (
                                    <div className="modal-placeholder-image">{selectedProduct.name.charAt(0)}</div>
                                )}
                            </div>
                            <div className="modal-info-section">
                                <h2 className="modal-product-name">{selectedProduct.name}</h2>
                                <p className="modal-product-price">${parseFloat(selectedProduct.price).toFixed(2)}</p>
                                <p className="modal-product-description">{selectedProduct.description || 'Producto de alta calidad seleccionado especialmente para ti.'}</p>

                                {selectedProduct.track_stock && (
                                    <p className={`modal-stock-info ${isOutOfStock(selectedProduct) ? 'out-of-stock' : ''}`}>
                                        {isOutOfStock(selectedProduct) ? '✕ Sin stock disponible' : `✓ En stock: ${selectedProduct.stock_quantity} unidades`}
                                    </p>
                                )}

                                <button
                                    className="modal-add-to-cart-btn"
                                    onClick={() => {
                                        if (!isOutOfStock(selectedProduct)) {
                                            addToCart(selectedProduct);
                                            closeProductDetail();
                                        }
                                    }}
                                    disabled={isOutOfStock(selectedProduct)}
                                    style={{
                                        opacity: isOutOfStock(selectedProduct) ? 0.5 : 1,
                                        cursor: isOutOfStock(selectedProduct) ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {isOutOfStock(selectedProduct) ? 'Agotado' : 'Agregar al Carrito'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CHECKOUT MODAL */}
            {showCheckoutModal && (
                <div className="checkout-modal-overlay" onClick={() => setShowCheckoutModal(false)}>
                    <div className="checkout-modal" onClick={e => e.stopPropagation()}>
                        <div className="checkout-left">
                            <h3 className="checkout-title">Datos de Facturación</h3>
                            <form className="checkout-form" onSubmit={handleCheckoutSubmit}>
                                {/* IDENTIFICACIÓN PRIMERO - Con búsqueda automática */}
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
                                            // Buscar automáticamente cuando tenga 10 dígitos
                                            if (valor.length === 10 && !user) {
                                                searchCustomerByCedula(valor);
                                            }
                                        }}
                                        onBlur={() => {
                                            if (billingDetails.identification_number.length >= 10 && !user) {
                                                searchCustomerByCedula(billingDetails.identification_number);
                                            }
                                        }}
                                        placeholder="Ingrese su cédula o RUC"
                                        style={{ borderColor: customerFound ? '#10b981' : '#cbd5e1' }}
                                    />
                                    {loadingCustomerSearch && (
                                        <small style={{ display: 'block', marginTop: '5px', color: '#6366f1' }}>Buscando cliente...</small>
                                    )}
                                    {customerFound && (
                                        <small style={{ display: 'block', marginTop: '5px', color: '#10b981', fontWeight: 'bold' }}>Cliente encontrado - Datos autocompletados</small>
                                    )}
                                </div>

                                {/* Resto de campos */}
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
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="checkout-input-group">
                                        <label>Teléfono</label>
                                        <input type="text" className="checkout-input" required value={billingDetails.phone}
                                            onChange={e => setBillingDetails({ ...billingDetails, phone: e.target.value })} />
                                    </div>
                                    <div className="checkout-input-group">
                                        <label>Fecha de Nacimiento</label>
                                        <input
                                            type="date"
                                            className="checkout-input"
                                            value={billingDetails.birth_date}
                                            onChange={e => setBillingDetails({ ...billingDetails, birth_date: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="checkout-input-group">
                                    <label>Dirección de Envío</label>
                                    <input type="text" className="checkout-input" required value={billingDetails.address}
                                        onChange={e => setBillingDetails({ ...billingDetails, address: e.target.value })} />
                                </div>

                                <div className="checkout-input-group">
                                    <label>Método de Pago</label>
                                    <div className="payment-methods">
                                        <div className={`payment-btn ${paymentMethod === 'efectivo' ? 'active' : ''}`}
                                            onClick={() => setPaymentMethod('efectivo')}>Efectivo (Entrega)</div>
                                        <div className={`payment-btn ${paymentMethod === 'transferencia' ? 'active' : ''}`}
                                            onClick={() => setPaymentMethod('transferencia')}>Transferencia</div>
                                    </div>
                                </div>



                                <button type="submit" className="btn-checkout-final" disabled={loadingCheckout} style={{ marginTop: '30px' }}>
                                    {loadingCheckout ? 'PROCESANDO...' : 'CONFIRMAR COMPRA'}
                                </button>
                            </form>
                        </div>
                        <div className="checkout-right">
                            <h3 className="checkout-title">Resumen</h3>
                            <div className="cart-items-review">
                                {cart.map(item => (
                                    <div key={item.id} className="cart-item-row">
                                        <div className="item-info">
                                            <h5>{item.name}</h5>
                                            <span>Cant: {item.quantity}</span>
                                        </div>
                                        <div className="item-price-actions">
                                            <span className="item-price">${(item.price * item.quantity).toFixed(2)}</span>
                                            <button className="remove-item" onClick={() => removeFromCart(item.id)}>Quitar</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* SECCIÓN DE CUPÓN DE DESCUENTO */}
                            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9f5f1', borderRadius: '8px', border: '1px dashed #cfb3a9' }}>
                                <label style={{ fontWeight: 'bold', fontSize: '14px', color: '#2c2c2c', marginBottom: '10px', display: 'block' }}>¿Tienes un cupón de descuento?</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input
                                        type="text"
                                        placeholder="Ingresa tu código"
                                        value={discountCode}
                                        onChange={e => setDiscountCode(e.target.value.toUpperCase())}
                                        disabled={discountInfo !== null}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            border: `1px solid ${discountInfo ? '#10b981' : discountError ? '#ef4444' : '#ccc'}`,
                                            borderRadius: '4px',
                                            fontSize: '14px',
                                            textTransform: 'uppercase'
                                        }}
                                    />
                                    {!discountInfo ? (
                                        <button
                                            type="button"
                                            onClick={validateDiscountCode}
                                            disabled={discountLoading || !discountCode.trim()}
                                            style={{
                                                padding: '10px 20px',
                                                backgroundColor: '#2c2c2c',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '13px',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {discountLoading ? '...' : 'APLICAR'}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={removeDiscount}
                                            style={{
                                                padding: '10px 20px',
                                                backgroundColor: '#ef4444',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '13px'
                                            }}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                                {discountError && (
                                    <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px', marginBottom: 0 }}>{discountError}</p>
                                )}
                                {discountInfo && (
                                    <p style={{ color: '#10b981', fontSize: '12px', marginTop: '8px', marginBottom: 0 }}>{discountInfo.description} (-${discountInfo.amount.toFixed(2)})</p>
                                )}
                            </div>

                            <div className="checkout-summary">
                                <div className="summary-line">
                                    <span>Subtotal</span>
                                    <span>${calculateTotal.toFixed(2)}</span>
                                </div>
                                {discountInfo && (
                                    <div className="summary-line" style={{ color: '#10b981' }}>
                                        <span>Descuento ({discountInfo.code})</span>
                                        <span>-${discountInfo.amount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="summary-line">
                                    <span>Envío</span>
                                    <span>Gratis</span>
                                </div>
                                <div className="summary-total">
                                    <span>Total</span>
                                    <span>${finalTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}



            {/* CUSTOM ALERT MODAL */}
            {alertModal.show && (
                <div
                    className="alert-modal-overlay"
                    onClick={closeAlert}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10000,
                        animation: 'fadeIn 0.2s ease-out'
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            padding: '0',
                            maxWidth: '400px',
                            width: '90%',
                            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
                            animation: 'slideUp 0.3s ease-out',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Header con color según tipo */}
                        <div style={{
                            padding: '25px 25px 20px',
                            background: alertModal.type === 'success' ? 'linear-gradient(135deg, #CFB3A9 0%, #e8d4cf 100%)' :
                                alertModal.type === 'error' ? 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)' :
                                    alertModal.type === 'warning' ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' :
                                        'linear-gradient(135deg, #2C2C2C 0%, #4a4a4a 100%)',
                            textAlign: 'center'
                        }}>
                            {/* Icono según tipo */}
                            <div style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 15px',
                                fontSize: '28px',
                                color: 'white'
                            }}>
                                {alertModal.type === 'success' && '✓'}
                                {alertModal.type === 'error' && '✕'}
                                {alertModal.type === 'warning' && '!'}
                                {alertModal.type === 'info' && 'i'}
                            </div>
                            <h3 style={{
                                margin: 0,
                                color: 'white',
                                fontSize: '20px',
                                fontFamily: 'serif',
                                fontWeight: '600'
                            }}>
                                {alertModal.title}
                            </h3>
                        </div>

                        {/* Mensaje */}
                        <div style={{ padding: '25px', textAlign: 'center' }}>
                            <p style={{
                                margin: '0 0 25px',
                                color: '#666',
                                fontSize: '15px',
                                lineHeight: '1.6'
                            }}>
                                {alertModal.message}
                            </p>

                            {/* Botón */}
                            <button
                                onClick={closeAlert}
                                style={{
                                    padding: '14px 50px',
                                    backgroundColor: alertModal.type === 'error' ? '#ef4444' : '#2C2C2C',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    letterSpacing: '1px',
                                    transition: 'transform 0.2s, box-shadow 0.2s'
                                }}
                                onMouseOver={e => {
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                }}
                                onMouseOut={e => {
                                    e.target.style.transform = 'translateY(0)';
                                    e.target.style.boxShadow = 'none';
                                }}
                            >
                                ACEPTAR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FOOTER */}
            <PiePagina />
        </div>
    );
};

export default BoutiqueLanding;
