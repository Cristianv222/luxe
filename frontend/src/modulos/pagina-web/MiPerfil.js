import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import logo from '../../assets/logo_luxury.png';
import './MiPerfil.css';

const MiPerfil = () => {
    const { user, logout, updateUserInfo } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('datos');
    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [profileData, setProfileData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        identification_number: '',
        date_of_birth: ''
    });
    const [passwordData, setPasswordData] = useState({
        old_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (user) {
            setProfileData({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                email: user.email || '',
                phone: user.phone || '',
                identification_number: user.identification_number || '',
                date_of_birth: user.date_of_birth || ''
            });
            fetchOrders();
        }
    }, [user]);

    const fetchOrders = async () => {
        try {
            // Buscamos órdenes vinculadas al email del usuario.
            const response = await api.get('api/orders/orders/', {
                params: { customer__email: user.email },
                baseURL: '/api/luxe'
            });
            const data = response.data.results || response.data || [];
            setOrders(Array.isArray(data) ? data : (data.results || []));
        } catch (err) {
            console.error("Error fetching orders:", err);
        }
    };

    const handleProfileChange = (e) => {
        setProfileData({ ...profileData, [e.target.name]: e.target.value });
    };

    const handlePasswordChange = (e) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    const updateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            const response = await api.patch('/api/users/me/', profileData);
            // Actualizar el contexto de auth con los nuevos datos
            if (updateUserInfo) updateUserInfo(response.data);
            setMessage({ type: 'success', text: 'Perfil actualizado exitosamente' });
        } catch (err) {
            const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
            setMessage({ type: 'error', text: 'Error al actualizar: ' + errorMsg });
        } finally {
            setLoading(false);
        }
    };

    const changePassword = async (e) => {
        e.preventDefault();
        if (passwordData.new_password !== passwordData.confirm_password) {
            setMessage({ type: 'error', text: 'Las contraseñas nuevas no coinciden' });
            return;
        }
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            await api.post(`/api/users/${user.id}/change_password/`, {
                old_password: passwordData.old_password,
                new_password: passwordData.new_password,
                new_password_confirm: passwordData.confirm_password
            });
            setMessage({ type: 'success', text: 'Contraseña actualizada exitosamente' });
            setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
        } catch (err) {
            const errorMsg = err.response?.data?.error || JSON.stringify(err.response?.data) || err.message;
            setMessage({ type: 'error', text: 'Error: ' + errorMsg });
        } finally {
            setLoading(false);
        }
    };

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="profile-page">
            {/* HEADER (Reutilizado de BoutiqueLanding) */}
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
                        <Link to="/" className="nav-link">INICIO</Link>
                        <a href="/#collection" className="nav-link">COLECCIÓN</a>
                        <button onClick={handleLogout} className="btn-logout">CERRAR SESIÓN</button>
                    </nav>
                </div>
            </header>

            <main className="profile-main">
                <div className="profile-hero">
                    <h1>Mi Perfil</h1>
                    <p>Gestiona tu cuenta y revisa tus compras exclusivas.</p>
                </div>

                <div className="profile-content-wrapper">
                    <aside className="profile-sidebar">
                        <button
                            className={`sidebar-btn ${activeTab === 'datos' ? 'active' : ''}`}
                            onClick={() => setActiveTab('datos')}
                        >
                            Datos Personales
                        </button>
                        <button
                            className={`sidebar-btn ${activeTab === 'seguridad' ? 'active' : ''}`}
                            onClick={() => setActiveTab('seguridad')}
                        >
                            Seguridad
                        </button>
                        <button
                            className={`sidebar-btn ${activeTab === 'compras' ? 'active' : ''}`}
                            onClick={() => setActiveTab('compras')}
                        >
                            Mis Compras
                        </button>
                    </aside>

                    <section className="profile-section">
                        {message.text && (
                            <div className={`status-message ${message.type}`}>
                                {message.text}
                            </div>
                        )}

                        {activeTab === 'datos' && (
                            <div className="tab-pane">
                                <h2>Información Personal</h2>
                                <form onSubmit={updateProfile} className="profile-form">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Nombres</label>
                                            <input
                                                type="text" name="first_name"
                                                value={profileData.first_name} onChange={handleProfileChange}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Apellidos</label>
                                            <input
                                                type="text" name="last_name"
                                                value={profileData.last_name} onChange={handleProfileChange}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Correo Electrónico</label>
                                        <input
                                            type="email" name="email"
                                            value={profileData.email} onChange={handleProfileChange}
                                        />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Cédula / RUC</label>
                                            <input
                                                type="text" name="identification_number"
                                                value={profileData.identification_number} onChange={handleProfileChange}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Teléfono</label>
                                            <input
                                                type="text" name="phone"
                                                value={profileData.phone} onChange={handleProfileChange}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Fecha de Nacimiento</label>
                                        <input
                                            type="date" name="date_of_birth"
                                            value={profileData.date_of_birth} onChange={handleProfileChange}
                                        />
                                    </div>
                                    <button type="submit" className="btn-save" disabled={loading}>
                                        {loading ? 'Guardando...' : 'GUARDAR CAMBIOS'}
                                    </button>
                                </form>
                            </div>
                        )}

                        {activeTab === 'seguridad' && (
                            <div className="tab-pane">
                                <h2>Seguridad de la Cuenta</h2>
                                <form onSubmit={changePassword} className="profile-form">
                                    <div className="form-group">
                                        <label>Contraseña Actual</label>
                                        <input
                                            type="password" name="old_password"
                                            value={passwordData.old_password} onChange={handlePasswordChange}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Nueva Contraseña</label>
                                        <input
                                            type="password" name="new_password"
                                            value={passwordData.new_password} onChange={handlePasswordChange}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Confirmar Nueva Contraseña</label>
                                        <input
                                            type="password" name="confirm_password"
                                            value={passwordData.confirm_password} onChange={handlePasswordChange}
                                            required
                                        />
                                    </div>
                                    <button type="submit" className="btn-save" disabled={loading}>
                                        {loading ? 'Cambiando...' : 'ACTUALIZAR CONTRASEÑA'}
                                    </button>
                                </form>
                            </div>
                        )}

                        {activeTab === 'compras' && (
                            <div className="tab-pane">
                                <h2>Historial de Compras</h2>
                                {orders.length > 0 ? (
                                    <div className="orders-table-wrapper">
                                        <table className="orders-table">
                                            <thead>
                                                <tr>
                                                    <th>Fecha</th>
                                                    <th>Orden #</th>
                                                    <th>Total</th>
                                                    <th>Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {orders.map(order => (
                                                    <tr key={order.id}>
                                                        <td>{new Date(order.created_at).toLocaleDateString()}</td>
                                                        <td>{order.order_number}</td>
                                                        <td>${parseFloat(order.total).toFixed(2)}</td>
                                                        <td>
                                                            <span className={`status-badge ${order.status}`}>
                                                                {order.status_display || order.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="no-orders">Aún no has realizado ninguna compra exclusiva.</p>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            </main>

            <footer className="boutique-footer">
                <div className="footer-bottom">
                    <p>&copy; 2026 Luxury Boutique. Todos los derechos reservados.</p>
                </div>
            </footer>
        </div>
    );
};

export default MiPerfil;
