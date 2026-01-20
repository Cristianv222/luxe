import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import logo from '../../assets/logo_luxury.png';
import heroBg from '../../assets/hero_store.jpg';
import { useAuth } from '../../context/AuthContext';
import './BoutiqueLanding.css';

const BoutiqueLanding = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [activeCategory, setActiveCategory] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Categories
                const catResponse = await api.get('api/menu/categories/', {
                    baseURL: '/api/luxe'
                });
                const cats = catResponse.data.results || catResponse.data || [];
                const activeCats = cats.filter(c => c.is_active);
                setCategories(activeCats);

                if (activeCats.length > 0) {
                    setActiveCategory(activeCats[0].id);
                }

                // 2. Fetch Products
                const prodResponse = await api.get('api/menu/products/', {
                    baseURL: '/api/luxe'
                });
                const prods = prodResponse.data.results || prodResponse.data || [];
                setProducts(prods.filter(p => p.is_active && p.is_available));

            } catch (err) {
                console.error("Error loading data:", err);
            }
        };
        fetchData();
    }, []);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="boutique-container">
            {/* HEADER */}
            <header className="boutique-header">
                <div className="header-content">
                    <div className="logo-container">
                        {/* LOGO ONLY */}
                        <img src={logo} alt="Luxe" className="boutique-logo" />
                    </div>

                    <button className={`menu-toggle ${isMenuOpen ? 'open' : ''}`} onClick={toggleMenu}>
                        <span className="bar"></span>
                        <span className="bar"></span>
                        <span className="bar"></span>
                    </button>

                    <nav className={`main-nav ${isMenuOpen ? 'open' : ''}`}>
                        <a href="#collection" className="nav-link" onClick={() => setIsMenuOpen(false)}>COLECCIÓN</a>
                        <a href="#about" className="nav-link" onClick={() => setIsMenuOpen(false)}>NOSOTROS</a>
                        <a href="#contact" className="nav-link" onClick={() => setIsMenuOpen(false)}>CONTACTO</a>
                        {user ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <Link to="/perfil" className="nav-link" onClick={() => setIsMenuOpen(false)} title="Mi Perfil">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="12" cy="7" r="4"></circle>
                                    </svg>
                                </Link>
                                <button onClick={handleLogout} className="btn-logout" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                                    CERRAR SESIÓN
                                </button>
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

            {/* HERO SECTION - IMAGE BACKGROUND */}
            <section style={{
                width: '100%',
                minHeight: '85vh',
                backgroundImage: `url(${heroBg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 20px',
                marginTop: '80px', // Header height
                position: 'relative'
            }}>
                {/* Overlay oscuro suave para mejorar legibilidad */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.2)'
                }}></div>

                <div style={{
                    maxWidth: '800px',
                    width: '100%',
                    backgroundColor: 'rgba(241, 238, 235, 0.4)', // Much more transparent FROTH (40% opacity)
                    backdropFilter: 'blur(5px)', // Softer blur to see more detail behind
                    WebkitBackdropFilter: 'blur(5px)',
                    padding: '80px 60px',
                    borderRadius: '4px',
                    textAlign: 'center',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.1)', // Softer shadow
                    position: 'relative',
                    border: '1px solid rgba(255,255,255,0.3)' // More subtle border
                }}>
                    <p style={{
                        fontSize: '14px',
                        letterSpacing: '5px',
                        color: '#2C2C2C', // Darker for better contrast on transparent bg
                        marginBottom: '20px',
                        textTransform: 'uppercase',
                        fontWeight: '700',
                        textShadow: '0 1px 2px rgba(255,255,255,0.8)' // Text shadow for readability
                    }}>Luxury Boutique</p>

                    <h2 style={{
                        fontFamily: 'serif',
                        fontSize: '56px',
                        color: '#1a1a1a', // Almost black for maximum contrast
                        margin: '0 0 30px 0',
                        fontWeight: 600,
                        letterSpacing: '2px',
                        lineHeight: '1.2',
                        textShadow: '0 2px 4px rgba(255,255,255,0.6)' // Text shadow for readability
                    }}>Colección Exclusiva</h2>

                    <p style={{
                        fontSize: '18px',
                        lineHeight: '1.8',
                        color: '#333333', // Darker text for readability on transparent bg
                        marginBottom: '45px',
                        maxWidth: '500px',
                        margin: '0 auto 45px',
                        fontWeight: '500',
                        textShadow: '0 1px 2px rgba(255,255,255,0.8)' // Light shadow to pop against background
                    }}>
                        Descubre la colección diseñada para resaltar tu esencia única.
                    </p>

                    <a href="#collection" className="hero-btn-simple" style={{
                        display: 'inline-block',
                        padding: '16px 45px',
                        backgroundColor: '#2C2C2C',
                        color: '#FFFFFF',
                        textDecoration: 'none',
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        fontSize: '13px',
                        fontWeight: 600,
                        transition: 'all 0.3s ease',
                        border: '1px solid #2C2C2C'
                    }}
                        onMouseEnter={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                            e.target.style.color = '#2C2C2C';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#2C2C2C';
                            e.target.style.color = '#FFFFFF';
                        }}
                    >
                        Ver Colección
                    </a>
                </div>
            </section>

            {/* SECCIÓN DE COLECCIÓN */}
            <section id="collection" className="collection-section">
                <div className="section-header">
                    <h2 className="section-title">Nuestra Colección</h2>
                    <div className="divider-line"></div>
                </div>

                {/* TABS (If needed, CSS has .tabs-container) - kept empty/simple based on 719 but CSS supports it */}
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

                {/* PRODUCT GRID */}
                <div className="product-grid">
                    {products.length > 0 ? products.map(product => (
                        <div key={product.id} className="product-card">
                            <div className="product-image-container">
                                {product.image ? (
                                    <img src={product.image} alt={product.name} className="product-image" />
                                ) : (
                                    <div className="placeholder-image">
                                        {product.name ? product.name.charAt(0) : 'L'}
                                    </div>
                                )}
                                <div className="quick-add-btn">+</div>
                            </div>
                            <div className="product-info">
                                <h3 className="product-name">{product.name}</h3>
                                <p className="product-price">${parseFloat(product.price).toFixed(2)}</p>
                            </div>
                        </div>
                    )) : (
                        <div className="no-products">
                            Cargando productos...
                        </div>
                    )}
                </div>
            </section>

            {/* FOOTER */}
            <footer className="boutique-footer">
                <div className="footer-content">
                    <div className="footer-column">
                        <h4>LUXURY BOUTIQUE</h4>
                        <p>Redefiniendo el estilo desde 2025.</p>
                    </div>
                    <div className="footer-column">
                        <h4>Contacto</h4>
                        <p>info@luxuryboutique.com</p>
                        <p>+593 99 999 9999</p>
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