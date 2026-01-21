import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BarraNavegacion from '../../comun/BarraNavegacion';
import PiePagina from '../../comun/PiePagina';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import CheckoutFlow from './components/CheckoutFlow';
import './BoutiqueLanding.css';
import './ProductStock.css';
import './ProductBadges.css';

const Coleccion = () => {
    const { user } = useAuth();
    const { cart, addToCart: contextAddToCart, isCartOpen, setIsCartOpen, toggleCart } = useCart();
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [activeCategory, setActiveCategory] = useState(null);

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

    // Product detail modal
    const [selectedProduct, setSelectedProduct] = useState(null);

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

    const addToCart = (product) => {
        contextAddToCart(product);
        showAlert('success', 'Producto agregado', `${product.name} se agregó a tu carrito.`);
    };

    const openProductDetail = (product) => setSelectedProduct(product);
    const closeProductDetail = () => setSelectedProduct(null);

    const isOutOfStock = (product) => product.track_stock && product.stock_quantity <= 0;

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

            {/* CHECKOUT FLOW */}
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

export default Coleccion;
