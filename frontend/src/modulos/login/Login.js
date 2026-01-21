import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import '../pagina-web/BoutiqueLanding.css'; // Use Boutique Styles
import logo from '../../assets/logo_luxury.png'; // Import Logo

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const result = await login(email, password);

        if (result.success) {
            const roleName = result.user.role_details?.name;
            if (roleName === 'CLIENTE') {
                navigate('/');
            } else if (roleName === 'ADMIN_LUXE') {
                navigate('/luxe');
            } else {
                navigate('/dashboard');
            }
        } else {
            setError(result.error);
        }
    };

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
                        <Link to="/" className="nav-link">INICIO</Link>
                    </nav>
                </div>
            </header>

            {/* LOGIN FORM CENTERED */}
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: '80px',
                backgroundColor: '#E8C4C4' // Solid Rose
            }}>
                <div className="hover-float" style={{
                    backgroundColor: '#FFFFFF',
                    padding: '50px',
                    borderRadius: '4px',
                    boxShadow: '0 15px 35px rgba(160, 144, 134, 0.1)',
                    maxWidth: '450px',
                    width: '90%',
                    borderTop: '4px solid #CFB3A9' // Cinna accent
                }}>
                    <h2 style={{
                        textAlign: 'center',
                        marginBottom: '10px',
                        fontFamily: "'Cinzel', serif",
                        color: '#2C2C2C',
                        fontSize: '32px'
                    }}>Bienvenido</h2>
                    <p style={{ textAlign: 'center', color: '#A09086', marginBottom: '30px', letterSpacing: '1px' }}>ACCEDE A TU CUENTA</p>

                    {error && <div style={{
                        backgroundColor: '#FFF0F0', color: '#D32F2F', padding: '15px', borderRadius: '4px', marginBottom: '20px', fontSize: '0.9rem'
                    }}>{error}</div>}

                    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '25px' }}>
                        <div>
                            <label htmlFor="email" style={{ display: 'block', marginBottom: '8px', color: '#A09086', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>EMAIL</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={{ width: '100%', padding: '12px', border: '1px solid #E4D8CB', borderRadius: '0', backgroundColor: '#FAFAFA' }}
                            />
                        </div>

                        <div>
                            <label htmlFor="password" style={{ display: 'block', marginBottom: '8px', color: '#A09086', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>CONTRASEÑA</label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                style={{ width: '100%', padding: '12px', border: '1px solid #E4D8CB', borderRadius: '0', backgroundColor: '#FAFAFA' }}
                            />
                        </div>

                        <button type="submit" style={{
                            background: '#CFB3A9', // Cinna
                            color: '#FFFFFF',
                            padding: '15px',
                            border: 'none',
                            cursor: 'pointer',
                            marginTop: '10px',
                            fontSize: '14px',
                            textTransform: 'uppercase',
                            letterSpacing: '2px',
                            fontWeight: '600',
                            transition: 'all 0.3s'
                        }} className="hover-float">
                            INGRESAR
                        </button>
                    </form>


                </div>
            </div>
        </div>
    );
};

export default Login;
