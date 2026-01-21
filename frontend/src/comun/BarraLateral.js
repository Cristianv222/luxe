import React, { useState, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../modulos/fast-food/FastFood.css'; // Import global boutique styles

const BarraLateral = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useContext(AuthContext);

    // Keeping this state for structure, though the boutique design is fixed width
    // You could expand this later if you want a collapsible boutique sidebar
    const [isCollapsed, setIsCollapsed] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const isActive = (path) => {
        return location.pathname === path || location.pathname.startsWith(path) ? 'active' : '';
    };

    const menuItems = [
        { path: '/luxe', icon: 'bi-house-door', label: 'Inicio' },
        { path: '/users', icon: 'bi-people', label: 'Usuarios' },
        { path: '/luxe/loyalty-config', icon: 'bi-gear', label: 'Config. Puntos' },
        { path: '/luxe/loyalty-management', icon: 'bi-star', label: 'Gestión Puntos' },
    ];

    return (
        <>
            {/* Bootstrap Icons */}
            <link
                rel="stylesheet"
                href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
            />

            <aside className="sidebar">
                {/* Header */}
                <div className="sidebar-header">
                    LUXURY BOUTIQUE
                </div>

                {/* Navigation */}
                <ul className="sidebar-nav">
                    {menuItems.map((item) => (
                        <li key={item.path} className={isActive(item.path)}>
                            <Link to={item.path}>
                                <i className={`bi ${item.icon}`} style={{ marginRight: '10px', fontSize: '1.1rem' }}></i>
                                {item.label}
                            </Link>
                        </li>
                    ))}
                </ul>

                {/* Footer */}
                <div className="sidebar-footer">
                    <button onClick={handleLogout}>
                        <i className="bi bi-box-arrow-right"></i>
                        CERRAR SESIÓN
                    </button>
                    <div style={{
                        textAlign: 'center',
                        marginTop: '1rem',
                        color: '#A09086',
                        fontSize: '0.7rem',
                        fontFamily: 'Lato, sans-serif'
                    }}>
                        v1.0.0
                    </div>
                </div>
            </aside>
        </>
    );
};

export default BarraLateral;