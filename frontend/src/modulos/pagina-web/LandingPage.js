import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import './LandingPage.css';

const LandingPage = () => {
    const { user, logout } = useContext(AuthContext);

    return (
        <div className="landing-container">
            <header className="landing-header">
                <div className="logo-container">
                    <h1>Luxe System</h1>
                </div>
                <nav>
                    {user ? (
                        <button onClick={logout} className="login-btn">Cerrar Sesión</button>
                    ) : (
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <Link to="/registro" className="login-btn">Registrarse</Link>
                            <Link to="/login" className="login-btn">Iniciar Sesión</Link>
                        </div>
                    )}
                </nav>
            </header>

            <main className="landing-content">
                <section className="hero-section">
                    <h2>Bienvenido a Luxe</h2>
                    <p>Sistema Integral de Gestión para Restaurantes y Hoteles</p>
                    <div className="cta-container">
                        {!user && (
                            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                                <Link to="/registro" className="cta-button">Crear Cuenta</Link>
                                <Link to="/login" className="cta-button" style={{ background: 'transparent', border: '1px solid #fff' }}>Acceder al Sistema</Link>
                            </div>
                        )}
                    </div>
                </section>

                <section className="features-preview">
                    <div className="feature-card">
                        <h3>Catálogo</h3>
                        <p>Próximamente: Explora nuestros servicios y productos.</p>
                    </div>
                    <div className="feature-card">
                        <h3>Reservas</h3>
                        <p>Gestión eficiente de espacios y tiempos.</p>
                    </div>
                    <div className="feature-card">
                        <h3>Servicios</h3>
                        <p>Atención de primera calidad para tus clientes.</p>
                    </div>
                </section>
            </main>

            <footer className="landing-footer">
                <p>&copy; {new Date().getFullYear()} Luxe System. Todos los derechos reservados.</p>
            </footer>
        </div>
    );
};

export default LandingPage;
