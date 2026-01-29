import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import logo from '../../assets/logo_luxury.png';
import heroBg from '../../assets/hero_store.jpg';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import CheckoutFlow from './components/CheckoutFlow';
import './BoutiqueLanding.css';
import './ProductStock.css';
import './ProductBadges.css';
import BarraNavegacion from '../../comun/BarraNavegacion';
import PiePagina from '../../comun/PiePagina';

const BoutiqueLanding = () => {
    const { user, logout } = useAuth();
    const { cart, addToCart: contextAddToCart, isCartOpen, setIsCartOpen, toggleCart } = useCart();
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [activeCategory, setActiveCategory] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Alert Modal State
    const [alertModal, setAlertModal] = useState({
        show: false,
        type: 'info',
        title: '',
        message: ''
    });

    const showAlert = (type, title, message) => {
        setAlertModal({ show: true, type, title, message });
    };

    const closeAlert = () => {
        setAlertModal({ ...alertModal, show: false });
    };

    const addToCart = (product) => {
        contextAddToCart(product);
        showAlert('success', 'Producto agregado', `${product.name} se agregó a tu carrito.`);
    };

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
                setProducts(prods.filter(p => p.is_active && p.is_featured));
            } catch (err) {
                console.error("Error loading data:", err);
            }
        };
        fetchData();
    }, []);

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

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const handleLogout = () => { logout(); navigate('/'); };

    return (
        <div className="boutique-container">
            <BarraNavegacion />

            {/* BOTÓN FLOTANTE DE CARRITO */}
            {cart.length > 0 && (
                <div className="cart-floating-btn" onClick={toggleCart}>
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
                    {products.length > 0 ? (
                        products.map(product => {
                            const outOfStock = isOutOfStock(product);

                            return (
                                <div key={product.id} className="product-card">
                                    <div className="featured-ribbon">DESTACADO</div>
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
                                        <p className="product-price">
                                            ${parseFloat(product.price).toFixed(2)}
                                            {product.tax_rate > 0 && <span style={{ fontSize: '0.75rem', color: '#888', marginLeft: '5px' }}>+ {product.tax_rate}% IVA</span>}
                                        </p>
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

                <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                    <Link
                        to="/coleccion"
                        style={{
                            display: 'inline-block', padding: '16px 45px', backgroundColor: '#CFB3A9',
                            color: '#FFFFFF', textDecoration: 'none', textTransform: 'uppercase',
                            letterSpacing: '2px', fontSize: '13px', fontWeight: 600,
                            transition: 'all 0.3s ease', border: '1px solid #CFB3A9', borderRadius: '2px'
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
                                <p className="modal-product-price">
                                    ${parseFloat(selectedProduct.price).toFixed(2)}
                                    {selectedProduct.tax_rate > 0 && <span style={{ fontSize: '0.9rem', color: '#888', marginLeft: '10px' }}>+ {selectedProduct.tax_rate}% IVA</span>}
                                </p>
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

            <CheckoutFlow isOpen={isCartOpen} onClose={toggleCart} />

            {/* CUSTOM ALERT MODAL */}
            {alertModal.show && (
                <div className="alert-modal-overlay" onClick={closeAlert} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, animation: 'fadeIn 0.2s ease-out' }}>
                    <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '0', maxWidth: '400px', width: '90%', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', animation: 'slideUp 0.3s ease-out', overflow: 'hidden' }}>
                        <div style={{ padding: '25px 25px 20px', background: alertModal.type === 'success' ? 'linear-gradient(135deg, #CFB3A9 0%, #e8d4cf 100%)' : alertModal.type === 'error' ? 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)' : alertModal.type === 'warning' ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' : 'linear-gradient(135deg, #2C2C2C 0%, #4a4a4a 100%)', textAlign: 'center' }}>
                            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', fontSize: '28px', color: 'white' }}>
                                {alertModal.type === 'success' && '✓'}
                                {alertModal.type === 'error' && '✕'}
                                {alertModal.type === 'warning' && '!'}
                                {alertModal.type === 'info' && 'i'}
                            </div>
                            <h3 style={{ margin: 0, color: 'white', fontSize: '20px', fontFamily: 'serif', fontWeight: '600' }}>{alertModal.title}</h3>
                        </div>
                        <div style={{ padding: '25px', textAlign: 'center' }}>
                            <p style={{ margin: '0 0 25px', color: '#666', fontSize: '15px', lineHeight: '1.6' }}>{alertModal.message}</p>
                            <button onClick={closeAlert} style={{ padding: '14px 50px', backgroundColor: alertModal.type === 'error' ? '#ef4444' : '#2C2C2C', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '1px', transition: 'transform 0.2s, box-shadow 0.2s' }}>ACEPTAR</button>
                        </div>
                    </div>
                </div>
            )}

            <PiePagina />
        </div>
    );
};

export default BoutiqueLanding;


