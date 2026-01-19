import React, { useState, useEffect } from 'react';
import api from '../../services/api'; // Import api service
import logo from '../../assets/logo_luxury.png'; // Start using logo again if needed, or use their colored box
import { useAuth } from '../../context/AuthContext';

const BoutiqueLanding = () => {
    const { user, logout } = useAuth();
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [activeCategory, setActiveCategory] = useState(null);

    // Cargar categorías y productos
    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Categories
                const catResponse = await api.get('/api/menu/categories/', {
                    baseURL: process.env.REACT_APP_LUXE_SERVICE
                });
                const cats = catResponse.data.results || catResponse.data || [];
                const activeCats = cats.filter(c => c.is_active);
                setCategories(activeCats);

                if (activeCats.length > 0) {
                    setActiveCategory(activeCats[0].id);
                }

                // 2. Fetch Products (Initially all or first category? User snippet implies all mixed? Let's fetch all active)
                // Or fetch by category if strictly needed. For now, let's fetch all active products.
                const prodResponse = await api.get('/api/menu/products/', {
                    baseURL: process.env.REACT_APP_LUXE_SERVICE
                });
                const prods = prodResponse.data.results || prodResponse.data || [];
                setProducts(prods.filter(p => p.is_active && p.is_available));

            } catch (err) {
                console.error("Error loading data:", err);
            }
        };
        fetchData();
    }, []);

    return (
        <div style={{ margin: 0, padding: 0, width: '100%' }}>
            {/* HEADER */}
            <header style={{
                backgroundColor: '#F1EEEB', // FROTH
                padding: '20px 40px',
                borderBottom: '2px solid #CFB3A9', // CINNA (More visible)
                position: 'sticky',
                top: 0,
                zIndex: 1000
            }}>
                <div style={{
                    maxWidth: '1400px',
                    margin: '0 auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        {/* Usa el logo real si existe, o el placeholder del usuario */}
                        <img src={logo} alt="Luxe" style={{ height: '60px', width: 'auto' }} />
                        <h1 style={{
                            fontFamily: 'serif',
                            fontSize: '32px',
                            letterSpacing: '6px',
                            color: '#A09086',
                            margin: 0
                        }}>LUXE</h1>
                    </div>
                    <nav style={{ display: 'flex', gap: '30px' }}>
                        <a href="#collection" style={{
                            textDecoration: 'none',
                            color: '#2C2C2C',
                            fontSize: '14px',
                            letterSpacing: '1.5px'
                        }}>COLECCIÓN</a>
                        <a href="#about" style={{
                            textDecoration: 'none',
                            color: '#2C2C2C',
                            fontSize: '14px',
                            letterSpacing: '1.5px'
                        }}>BOUTIQUE</a>
                        {user ? (
                            <button onClick={logout} style={{
                                background: 'none', border: '1px solid #A09086', padding: '8px 20px', cursor: 'pointer',
                                textDecoration: 'none', color: '#2C2C2C', fontSize: '14px', letterSpacing: '1.5px'
                            }}>
                                CERRAR SESIÓN
                            </button>
                        ) : (
                            <a href="/login" style={{
                                textDecoration: 'none',
                                color: '#2C2C2C',
                                fontSize: '14px',
                                letterSpacing: '1.5px'
                            }}>INICIAR SESIÓN</a>
                        )}
                    </nav>
                </div>
            </header>

            {/* HERO SECTION - SUPER SIMPLE */}
            <section style={{
                width: '100%',
                minHeight: '70vh',
                backgroundColor: '#CFB3A9', // CINNA
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 20px'
            }}>
                <div style={{
                    maxWidth: '800px',
                    width: '100%',
                    backgroundColor: '#F1EEEB', // FROTH
                    padding: '80px 60px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                }}>
                    <p style={{
                        fontSize: '14px',
                        letterSpacing: '4px',
                        color: '#A09086',
                        marginBottom: '20px',
                        textTransform: 'uppercase'
                    }}>Luxury Boutique</p>

                    <h2 style={{
                        fontFamily: 'serif',
                        fontSize: '56px',
                        color: '#2C2C2C',
                        margin: '0 0 30px 0',
                        fontWeight: 600,
                        letterSpacing: '2px'
                    }}>Colección Exclusiva</h2>

                    <p style={{
                        fontSize: '18px',
                        lineHeight: '1.8',
                        color: '#A09086',
                        marginBottom: '40px',
                        maxWidth: '500px',
                        margin: '0 auto 40px'
                    }}>
                        Descubre la colección diseñada para resaltar tu esencia única.
                    </p>

                    <a href="#collection" style={{
                        display: 'inline-block',
                        padding: '18px 40px',
                        backgroundColor: '#CFB3A9', // Solid CINNA
                        color: '#FFFFFF',
                        textDecoration: 'none',
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        fontSize: '14px',
                        fontWeight: 600,
                        border: '2px solid #CFB3A9',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 15px rgba(207, 179, 169, 0.4)'
                    }}>
                        Ver Colección
                    </a>
                </div>
            </section>

            {/* SECCIÓN DE COLECCIÓN - Backend Integration */}
            <section id="collection" style={{
                maxWidth: '1400px',
                width: '90%',
                margin: '80px auto',
                padding: '0 20px'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                    <h2 style={{
                        fontFamily: 'serif',
                        fontSize: '48px',
                        color: '#2C2C2C',
                        marginBottom: '20px',
                        fontWeight: 600,
                        letterSpacing: '3px'
                    }}>Nuestra Colección</h2>
                    <div style={{
                        width: '80px',
                        height: '3px',
                        backgroundColor: '#CFB3A9',
                        margin: '0 auto'
                    }}></div>
                </div>

                {/* PRODUCT GRID */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '40px'
                }}>
                    {products.length > 0 ? products.map(product => (
                        <div key={product.id} style={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                            transition: 'transform 0.3s ease',
                            cursor: 'pointer'
                        }}>
                            <div style={{
                                width: '100%',
                                aspectRatio: '3/4',
                                backgroundColor: '#E4D8CB', // Fallback color
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '48px',
                                color: '#A09086',
                                fontFamily: 'serif',
                                backgroundImage: `url(${product.image})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                            }}>
                                {!product.image && (product.name ? product.name.charAt(0) : 'L')}
                            </div>
                            <div style={{ padding: '24px', textAlign: 'center' }}>
                                <h3 style={{
                                    fontSize: '16px',
                                    margin: '0 0 12px',
                                    color: '#2C2C2C',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}>{product.name}</h3>
                                <p style={{
                                    fontFamily: 'serif',
                                    fontSize: '20px',
                                    color: '#A09086',
                                    margin: 0,
                                    fontWeight: 700
                                }}>${parseFloat(product.price).toFixed(2)}</p>
                            </div>
                        </div>
                    )) : (
                        <p style={{ gridColumn: '1/-1', textAlign: 'center', color: '#888' }}>
                            Cargando productos...
                        </p>
                    )}
                </div>
            </section>

            {/* FOOTER */}
            <footer style={{
                backgroundColor: '#CFB3A9', // CINNA Background
                padding: '60px 20px 30px',
                marginTop: '80px',
                color: '#FFF'
            }}>
                <div style={{
                    maxWidth: '1400px',
                    width: '90%',
                    margin: '0 auto',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '40px',
                    marginBottom: '40px'
                }}>
                    <div>
                        <h4 style={{
                            fontFamily: 'serif',
                            fontSize: '20px',
                            marginBottom: '20px',
                            color: '#FFFFFF', // White title
                            letterSpacing: '2px'
                        }}>LUXURY BOUTIQUE</h4>
                        <p style={{ color: '#F1EEEB', lineHeight: '1.8' }}>
                            Redefiniendo el estilo desde 2025.
                        </p>
                    </div>
                    <div>
                        <h4 style={{
                            fontFamily: 'serif',
                            fontSize: '20px',
                            marginBottom: '20px',
                            color: '#FFFFFF', // White title
                            letterSpacing: '2px'
                        }}>Contacto</h4>
                        <p style={{ color: '#F1EEEB', margin: '8px 0' }}>info@luxuryboutique.com</p>
                        <p style={{ color: '#F1EEEB', margin: '8px 0' }}>+593 99 999 9999</p>
                    </div>
                </div>
                <div style={{
                    textAlign: 'center',
                    borderTop: '1px solid rgba(255, 255, 255, 0.3)',
                    paddingTop: '20px',
                    fontSize: '14px',
                    color: '#F1EEEB'
                }}>
                    <p>&copy; 2026 Luxury Boutique. Todos los derechos reservados.</p>
                </div>
            </footer>
        </div>
    );
};

export default BoutiqueLanding;