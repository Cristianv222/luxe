import React, { useState, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../modulos/luxe/Luxe.css'; // Import global boutique styles

const BarraLateral = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useContext(AuthContext);
    const [isOpen, setIsOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const isActive = (path) =>
        location.pathname === path || location.pathname.startsWith(path) ? 'active' : '';

    const closeSidebar = () => setIsOpen(false);

    const menuItems = [
        { path: '/luxe', icon: 'bi-grid', label: 'Inicio' },
        { path: '/luxe/pos', icon: 'bi-shop', label: 'Punto de Venta' },
        { path: '/luxe/orders', icon: 'bi-receipt', label: 'Órdenes' },
        { path: '/luxe/inventory', icon: 'bi-box-seam', label: 'Inventario' },
        { path: '/luxe/customers', icon: 'bi-people-fill', label: 'Clientes' },
        { path: '/luxe/labels', icon: 'bi-tags', label: 'Etiquetas' },
        { path: '/luxe/machines', icon: 'bi-gear-wide-connected', label: 'Sistema Máquinas' },
        { path: '/luxe/reports', icon: 'bi-graph-up', label: 'Reportes' },
        { path: '/luxe/shift', icon: 'bi-cash-coin', label: 'Caja (Turnos)' },
        { path: '/luxe/printers', icon: 'bi-printer', label: 'Impresoras' },
        { path: '/luxe/loyalty-config', icon: 'bi-gift', label: 'Config. Puntos' },
        { path: '/luxe/loyalty-management', icon: 'bi-star', label: 'Gestión Puntos' },
        { path: '/luxe/whatsapp-config', icon: 'bi-whatsapp', label: 'WhatsApp' },
        { path: '/luxe/sri-config', icon: 'bi-file-earmark-text', label: 'Facturación SRI' },
        { path: '/users', icon: 'bi-people', label: 'Usuarios del Sistema' },
    ];

    return (
        <>
            {/* Bootstrap Icons */}
            <link
                rel="stylesheet"
                href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
            />

            {/* ── Hamburger toggle button (mobile only) ── */}
            <button
                className="sidebar-hamburger"
                onClick={() => setIsOpen(true)}
                aria-label="Abrir menú"
            >
                <span className="sidebar-bar"></span>
                <span className="sidebar-bar"></span>
                <span className="sidebar-bar"></span>
            </button>

            {/* ── Dark overlay: click to close ── */}
            {isOpen && (
                <div className="sidebar-overlay" onClick={closeSidebar} />
            )}

            {/* ── Sidebar ── */}
            <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
                {/* Close button (mobile only) */}
                <button
                    className="sidebar-close-btn"
                    onClick={closeSidebar}
                    aria-label="Cerrar menú"
                >
                    ✕
                </button>

                {/* Header */}
                <div className="sidebar-header">
                    LUXURY BOUTIQUE
                </div>

                {/* Navigation */}
                <ul className="sidebar-nav">
                    {menuItems.map((item) => (
                        <li key={item.path} className={isActive(item.path)}>
                            <Link to={item.path} onClick={closeSidebar}>
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
