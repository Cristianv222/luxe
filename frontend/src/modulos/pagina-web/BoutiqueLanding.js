import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import logo from '../../assets/logo_luxury.png';
import heroBg from '../../assets/hero_store.jpg';
import { useAuth } from '../../context/AuthContext';
import './BoutiqueLanding.css';
import './ProductStock.css';
import './ProductBadges.css';

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
        address: '',
        city: ''
    });

    useEffect(() => {
        if (user) {
            setBillingDetails({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                email: user.email || '',
                phone: user.phone || '',
                identification_number: user.identification_number || '',
                address: user.address || '',
                city: user.city || ''
            });
            setIsRegistering(false);
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

    const handleCheckoutSubmit = async (e) => {
        e.preventDefault();
        if (cart.length === 0) return alert("Tu carrito está vacío");
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
                alert("Cuenta creada con éxito. Tu pedido se procesará ahora.");
                // Nota: Podríamos loguearlo aquí, pero por ahora seguimos con la orden vinculada al email.
            }

            // 2. Sincronizar cliente en Luxe Service (necesario para la orden)
            const syncPayload = {
                first_name: billingDetails.first_name,
                last_name: billingDetails.last_name,
                email: billingDetails.email,
                phone: billingDetails.phone,
                cedula: billingDetails.identification_number,
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
                status: 'pending'
            };

            console.log('Enviando orden:', orderPayload);
            const orderResponse = await api.post('api/orders/orders/', orderPayload, { baseURL: '/api/luxe' });
            console.log('Orden creada:', orderResponse.data);

            alert("¡Orden realizada con éxito! Nos contactaremos contigo pronto.");
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

                alert(errorMsg);
            } else {
                alert("Error: " + err.message);
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
            <header className="boutique-header">
                <div className="header-content">
                    <div className="logo-container">
                        <Link to="/"><img src={logo} alt="Luxe" className="boutique-logo" /></Link>
                    </div>

                    <button className={`menu-toggle ${isMenuOpen ? 'open' : ''}`} onClick={toggleMenu}>
                        <span className="bar"></span>
                        <span className="bar"></span>
                        <span className="bar"></span>
                    </button>

                    <nav className={`main-nav ${isMenuOpen ? 'open' : ''}`}>
                        <a href="#collection" className="nav-link" onClick={() => setIsMenuOpen(false)}>DESTACADOS</a>
                        <Link to="/coleccion" className="nav-link" onClick={() => setIsMenuOpen(false)}>COLECCIÓN</Link>
                        <Link to="/nosotros" className="nav-link" onClick={() => setIsMenuOpen(false)}>NOSOTROS</Link>
                        <Link to="/contacto" className="nav-link" onClick={() => setIsMenuOpen(false)}>CONTACTO</Link>
                        {user ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <Link to="/perfil" className="nav-link" onClick={() => setIsMenuOpen(false)}>MI PERFIL</Link>
                                <button onClick={handleLogout} className="btn-logout">CERRAR SESIÓN</button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                <Link to="/login" className="nav-link">INICIAR SESIÓN</Link>
                                <Link to="/registro" className="nav-link" style={{ fontWeight: '700' }}>REGISTRARTE</Link>
                            </div>
                        )}
                    </nav>
                </div>
            </header>

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
                        (() => {
                            const filtered = products.filter(p => {
                                const prodCatId = (typeof p.category === 'object') ? p.category?.id : p.category;
                                return !activeCategory || prodCatId === activeCategory;
                            });

                            if (filtered.length === 0) {
                                return (
                                    <div className="no-products">
                                        No hay productos disponibles en esta categoría actualmente.
                                    </div>
                                );
                            }

                            return filtered.map(product => {
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
                            });
                        })()
                    ) : (
                        <div className="no-products">
                            Cargando colección exclusiva...
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
                <div className="checkout-modal-overlay" onClick={closeProductDetail}>
                    <div className="checkout-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
                        <div className="modal-header" style={{ borderBottom: '1px solid #f0f0f0', padding: '20px 30px' }}>
                            <h3 style={{ margin: 0, fontFamily: 'serif', fontSize: '24px' }}>{selectedProduct.name}</h3>
                            <button onClick={closeProductDetail} className="close-modal" style={{ background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#999' }}>×</button>
                        </div>
                        <div className="modal-body" style={{ padding: '30px', maxHeight: '70vh', overflowY: 'auto' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                                <div>
                                    {selectedProduct.image ? (
                                        <img src={selectedProduct.image} alt={selectedProduct.name} style={{ width: '100%', borderRadius: '4px' }} />
                                    ) : (
                                        <div style={{ width: '100%', aspectRatio: '1', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', color: '#ccc' }}>
                                            {selectedProduct.name.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <div style={{ marginBottom: '20px' }}>
                                        <p style={{ fontSize: '32px', fontWeight: '700', color: 'var(--color-dark)', margin: '0 0 10px 0' }}>
                                            ${parseFloat(selectedProduct.price).toFixed(2)}
                                        </p>
                                        {selectedProduct.track_stock && (
                                            <p style={{ fontSize: '14px', color: isOutOfStock(selectedProduct) ? '#ef4444' : '#22c55e', fontWeight: '600', margin: '0 0 20px 0' }}>
                                                {isOutOfStock(selectedProduct) ? '❌ Sin stock' : `✅ ${selectedProduct.stock_quantity} unidades disponibles`}
                                            </p>
                                        )}
                                    </div>

                                    {selectedProduct.description && (
                                        <div style={{ marginBottom: '20px' }}>
                                            <h4 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: '#888', marginBottom: '10px' }}>Descripción</h4>
                                            <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#333' }}>{selectedProduct.description}</p>
                                        </div>
                                    )}

                                    {selectedProduct.ingredients && (
                                        <div style={{ marginBottom: '20px' }}>
                                            <h4 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: '#888', marginBottom: '10px' }}>Ingredientes</h4>
                                            <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#333' }}>{selectedProduct.ingredients}</p>
                                        </div>
                                    )}

                                    {selectedProduct.allergens && (
                                        <div style={{ marginBottom: '20px' }}>
                                            <h4 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: '#888', marginBottom: '10px' }}>Alérgenos</h4>
                                            <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#ef4444', fontWeight: '600' }}>{selectedProduct.allergens}</p>
                                        </div>
                                    )}

                                    {!isOutOfStock(selectedProduct) && (
                                        <button
                                            onClick={() => { addToCart(selectedProduct); closeProductDetail(); }}
                                            style={{
                                                width: '100%',
                                                padding: '16px',
                                                backgroundColor: 'var(--color-dark)',
                                                color: 'white',
                                                border: 'none',
                                                fontSize: '14px',
                                                fontWeight: '700',
                                                letterSpacing: '2px',
                                                textTransform: 'uppercase',
                                                cursor: 'pointer',
                                                marginTop: '20px'
                                            }}
                                        >
                                            Agregar al Carrito
                                        </button>
                                    )}
                                </div>
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
                                        <label>Identificación</label>
                                        <input type="text" className="checkout-input" required value={billingDetails.identification_number}
                                            onChange={e => setBillingDetails({ ...billingDetails, identification_number: e.target.value })} />
                                    </div>
                                    <div className="checkout-input-group">
                                        <label>Teléfono</label>
                                        <input type="text" className="checkout-input" required value={billingDetails.phone}
                                            onChange={e => setBillingDetails({ ...billingDetails, phone: e.target.value })} />
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

                                {!user && (
                                    <div className="checkout-registration-section" style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f9f9f9', border: '1px dashed #ccc' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                                            <input type="checkbox" checked={isRegistering} onChange={e => setIsRegistering(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                                            ¿Deseas crear una cuenta para futuras compras?
                                        </label>

                                        {isRegistering && (
                                            <div className="checkout-input-group" style={{ marginTop: '15px' }}>
                                                <label>Crea tu Contraseña</label>
                                                <input type="password" placeholder="Mínimo 8 caracteres" className="checkout-input" required={isRegistering} value={checkoutPassword}
                                                    onChange={e => setCheckoutPassword(e.target.value)} />
                                            </div>
                                        )}

                                        <p style={{ marginTop: '15px', fontSize: '13px', color: '#666' }}>
                                            ¿Ya tienes cuenta? <Link to="/login" style={{ color: 'var(--color-cinna)', fontWeight: 'bold' }}>Inicia Sesión aquí</Link>
                                        </p>
                                    </div>
                                )}

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
                            <div className="checkout-summary">
                                <div className="summary-line">
                                    <span>Subtotal</span>
                                    <span>${calculateTotal.toFixed(2)}</span>
                                </div>
                                <div className="summary-line">
                                    <span>Envío</span>
                                    <span>Gratis</span>
                                </div>
                                <div className="summary-total">
                                    <span>Total</span>
                                    <span>${calculateTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* FOOTER */}
            <footer className="boutique-footer" id="contact">
                <div className="footer-content">
                    <div className="footer-column">
                        <h4>LUXURY BOUTIQUE</h4>
                        <p>Redefiniendo el lujo y la exclusividad desde 2025.</p>
                    </div>
                    <div className="footer-column">
                        <h4>Contacto</h4>
                        <p>ventas@luxuryboutique.com</p>
                        <p>+593 99 999 9999</p>
                        <p>Quito, Ecuador</p>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>&copy; 2026 Luxury Boutique. Todos los derechos reservados.</p>
                </div>
            </footer>
        </div>
    );
};

export default BoutiqueLanding;
