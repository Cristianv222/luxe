import React from 'react';
import { Link } from 'react-router-dom';
import BarraNavegacion from '../../comun/BarraNavegacion'; // Correct import path?
import PiePagina from '../../comun/PiePagina';
import './BoutiqueLanding.css';

const Nosotros = () => {
    return (
        <div className="boutique-container">
            <BarraNavegacion />

            {/* HERO SECTION */}
            <section className="page-hero-section" style={{ background: 'linear-gradient(135deg, #E8C4C4 0%, #CFB3A9 100%)' }}>
                <div className="page-hero-card">
                    <p className="page-hero-subtitle">Nuestra Historia</p>
                    <h1 className="page-hero-title">Sobre Nosotros</h1>
                    <p className="page-hero-desc">
                        Descubre la esencia de la elegancia y la calidad excepcional que nos define
                    </p>
                </div>
            </section>

            {/* CONTENT SECTION */}
            <section style={{
                width: '100%',
                padding: '80px 20px',
                backgroundColor: '#FFFFFF'
            }}>
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto'
                }}>
                    {/* QUIÉNES SOMOS */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '60px',
                        marginBottom: '80px'
                    }}>
                        <div className="hover-float">
                            <h2 style={{
                                fontFamily: "'Cinzel', serif",
                                fontSize: '2rem',
                                color: '#2C2C2C',
                                marginBottom: '30px'
                            }}>Quiénes Somos</h2>
                            <p style={{
                                fontSize: '1rem',
                                color: '#666',
                                lineHeight: '1.8',
                                marginBottom: '20px'
                            }}>
                                <strong style={{ color: '#CFB3A9' }}>Luxury Boutique</strong> nació de la pasión por ofrecer una experiencia
                                de compra excepcional, donde cada detalle cuenta y cada producto cuenta una historia única.
                            </p>
                            <p style={{
                                fontSize: '1rem',
                                color: '#666',
                                lineHeight: '1.8'
                            }}>
                                Nos dedicamos a seleccionar cuidadosamente los mejores productos para nuestros clientes,
                                manteniendo siempre los más altos estándares de calidad y exclusividad.
                            </p>
                        </div>

                        <div className="hover-float" style={{
                            backgroundColor: '#F9F7F5',
                            padding: '40px',
                            borderRadius: '4px',
                            borderTop: '4px solid #CFB3A9'
                        }}>
                            <h3 style={{
                                fontFamily: "'Cinzel', serif",
                                fontSize: '1.5rem',
                                color: '#2C2C2C',
                                marginBottom: '20px'
                            }}>Nuestra Misión</h3>
                            <p style={{
                                fontSize: '0.95rem',
                                color: '#666',
                                lineHeight: '1.8'
                            }}>
                                Ofrecer productos excepcionales que combinen elegancia, calidad y exclusividad,
                                brindando a nuestros clientes una experiencia de compra memorable y personalizada.
                            </p>
                        </div>
                    </div>

                    {/* VALORES */}
                    <div style={{
                        textAlign: 'center',
                        marginBottom: '60px'
                    }}>
                        <h2 style={{
                            fontFamily: "'Cinzel', serif",
                            fontSize: '2.5rem',
                            color: '#2C2C2C',
                            marginBottom: '60px'
                        }}>Nuestros Valores</h2>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                            gap: '40px'
                        }}>
                            {/* Excelencia */}
                            <div className="hover-float" style={{
                                padding: '40px 30px',
                                borderRadius: '4px',
                                backgroundColor: '#FFFFFF',
                                boxShadow: '0 10px 30px rgba(160, 144, 134, 0.1)',
                                border: '1px solid #F1EEEB'
                            }}>
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    margin: '0 auto 30px',
                                    backgroundColor: '#E8C4C4',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2">
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                    </svg>
                                </div>
                                <h3 style={{
                                    fontFamily: "'Cinzel', serif",
                                    fontSize: '1.3rem',
                                    color: '#2C2C2C',
                                    marginBottom: '15px'
                                }}>Excelencia</h3>
                                <p style={{
                                    fontSize: '0.9rem',
                                    color: '#666',
                                    lineHeight: '1.6'
                                }}>
                                    Nos comprometemos a ofrecer solo lo mejor en cada producto y servicio
                                </p>
                            </div>

                            {/* Calidad */}
                            <div className="hover-float" style={{
                                padding: '40px 30px',
                                borderRadius: '4px',
                                backgroundColor: '#FFFFFF',
                                boxShadow: '0 10px 30px rgba(160, 144, 134, 0.1)',
                                border: '1px solid #F1EEEB'
                            }}>
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    margin: '0 auto 30px',
                                    backgroundColor: '#CFB3A9',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2">
                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                                    </svg>
                                </div>
                                <h3 style={{
                                    fontFamily: "'Cinzel', serif",
                                    fontSize: '1.3rem',
                                    color: '#2C2C2C',
                                    marginBottom: '15px'
                                }}>Calidad</h3>
                                <p style={{
                                    fontSize: '0.9rem',
                                    color: '#666',
                                    lineHeight: '1.6'
                                }}>
                                    Selección rigurosa de productos que cumplen los más altos estándares
                                </p>
                            </div>

                            {/* Atención */}
                            <div className="hover-float" style={{
                                padding: '40px 30px',
                                borderRadius: '4px',
                                backgroundColor: '#FFFFFF',
                                boxShadow: '0 10px 30px rgba(160, 144, 134, 0.1)',
                                border: '1px solid #F1EEEB'
                            }}>
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    margin: '0 auto 30px',
                                    backgroundColor: '#A09086',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2">
                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                    </svg>
                                </div>
                                <h3 style={{
                                    fontFamily: "'Cinzel', serif",
                                    fontSize: '1.3rem',
                                    color: '#2C2C2C',
                                    marginBottom: '15px'
                                }}>Atención Personalizada</h3>
                                <p style={{
                                    fontSize: '0.9rem',
                                    color: '#666',
                                    lineHeight: '1.6'
                                }}>
                                    Cada cliente es único y merece un trato especial y dedicado
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* CTA */}
                    <div style={{
                        textAlign: 'center',
                        padding: '60px 20px',
                        backgroundColor: '#F9F7F5',
                        borderRadius: '4px',
                        marginTop: '60px'
                    }}>
                        <h3 style={{
                            fontFamily: "'Cinzel', serif",
                            fontSize: '2rem',
                            color: '#2C2C2C',
                            marginBottom: '20px'
                        }}>¿Listo para descubrir nuestra colección?</h3>
                        <p style={{
                            fontSize: '1rem',
                            color: '#666',
                            marginBottom: '30px',
                            maxWidth: '600px',
                            margin: '0 auto 30px'
                        }}>
                            Explora nuestros productos cuidadosamente seleccionados
                        </p>
                        <Link to="/" style={{ // Should this be /coleccion or /? User said collection button.
                            display: 'inline-block',
                            padding: '15px 40px',
                            backgroundColor: '#CFB3A9',
                            color: '#FFFFFF',
                            textDecoration: 'none',
                            borderRadius: '2px',
                            fontSize: '14px',
                            letterSpacing: '2px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            transition: 'all 0.3s'
                        }} className="hover-float">
                            Ver Colección
                        </Link>
                    </div>
                </div>
            </section>

            <PiePagina />
        </div>
    );
};

export default Nosotros;


