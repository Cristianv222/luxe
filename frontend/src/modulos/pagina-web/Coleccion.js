import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import logo from '../../assets/logo_luxury.png';
import { useAuth } from '../../context/AuthContext';
import './BoutiqueLanding.css';
import './ProductStock.css';
import './ProductBadges.css';

const Coleccion = () => {
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

    // Product detail modal
    const [selectedProduct, setSelectedProduct] = useState(null);

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
                // Mostrar TODOS los productos activos (no solo destacados)
                setProducts(prods.filter(p => p.is_active));
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

    const openProductDetail = (product) => setSelectedProduct(product);
    const closeProductDetail = () => setSelectedProduct(null);

    const isOutOfStock = (product) => product.track_stock && product.stock_quantity <= 0;

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    return (
        <div className="boutique-container">
            {/* BOUTIQUE HEADER */}
            <header className="boutique-header">
                <div className="header-content">
                    <div className="logo-container">
                        <Link to="/">
                            <img src={logo} alt="Luxe" className="boutique-logo" />
                        </Link>
                    </div>

                    <button className={`menu-toggle ${isMenuOpen ? 'open' : ''}`} onClick={toggleMenu}>
                        <span className="bar"></span>
                        <span className="bar"></span>
                        <span className="bar"></span>
                    </button>

                    <nav className={`main-nav ${isMenuOpen ? 'open' : ''}`}>
                        <Link to="/" className="nav-link" onClick={() => setIsMenuOpen(false)}>INICIO</Link>
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
                width: '100%',
                minHeight: '40vh',
                background: 'linear-gradient(135deg, #CFB3A9 0%, #E8C4C4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '100px 20px 60px',
                marginTop: '80px'
            }}>
                <div style={{ maxWidth: '800px', textAlign: 'center' }}>
                    <p style={{
                        fontSize: '14px',
                        letterSpacing: '5px',
                        color: '#2C2C2C',
                        marginBottom: '20px',
                        textTransform: 'uppercase',
                        fontWeight: '700'
                    }}>Explora Nuestra</p>
                    <h1 style={{
                        fontFamily: "'Cinzel', serif",
                        fontSize: '3.5rem',
                        color: '#2C2C2C',
                        marginBottom: '30px',
                        lineHeight: '1.2'
                    }}>Colección Completa</h1>
                    <p style={{
                        fontSize: '1.1rem',
                        color: '#666',
                        lineHeight: '1.8',
                        maxWidth: '700px',
                        margin: '0 auto'
                    }}>
                        Descubre todos nuestros productos organizados por categoría
                    </p>
                </div>
            </section>

            {/* SECCIÓN DE COLECCIÓN CON FILTRO DE CATEGORÍAS */}
            <section className="collection-section" style={{ padding: '80px 20px' }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                    <div className="section-header">
                        <h2 className="section-title">Nuestra Colección</h2>
                        <div className="divider-line"></div>
                    </div>

                    {/* TABS DE CATEGORÍAS */}
                    <div className="tabs-container">
                        <div className="tabs-scroll">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    className={`tab-btn ${activeCategory === cat.id ? 'active' : ''}`}
                                    onClick={() => setActiveCategory(cat.id)}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* GRID DE PRODUCTOS */}
                    <div className="product-grid">
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
                                Cargando colección...
                            </div>
                        )}
                    </div>
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

            {/* CHECKOUT MODAL - Reutilizando el mismo del BoutiqueLanding */}
            {showCheckoutModal && (
                <div className="checkout-modal-overlay" onClick={() => setShowCheckoutModal(false)}>
                    <div className="checkout-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={() => setShowCheckoutModal(false)}>×</button>
                        <h2 className="checkout-title">Finalizar Compra</h2>

                        <div className="checkout-content">
                            <div className="cart-items-list">
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
            <footer className="boutique-footer">
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

export default Coleccion;
