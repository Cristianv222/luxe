import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';

const BarraLateralLuxe = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useContext(AuthContext);
    const { isSidebarOpen, openSidebar, closeSidebar } = useSidebar();

    const isActive = (path) => location.pathname === path ? 'active' : '';

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const navLinks = [
        { path: '/luxe', icon: 'bi-grid', label: 'Panel Principal' },
        { path: '/luxe/pos', icon: 'bi-shop', label: 'Punto de Venta' },
        { path: '/luxe/orders', icon: 'bi-receipt', label: 'Órdenes' },
        { path: '/luxe/inventory', icon: 'bi-box-seam', label: 'Inventario' },
        { path: '/luxe/customers', icon: 'bi-people-fill', label: 'Clientes' },
        { path: '/luxe/labels', icon: 'bi-tags', label: 'Etiquetas' },
        { path: '/luxe/machines', icon: 'bi-gear-wide-connected', label: 'Sistema Máquinas' },
        { path: '/luxe/reports', icon: 'bi-graph-up', label: 'Reportes' },
        { path: '/luxe/shift', icon: 'bi-cash-coin', label: 'Caja (Turnos)' },
        { path: '/luxe/printers', icon: 'bi-printer', label: 'Impresoras' },
        { path: '/luxe/loyalty-config', icon: 'bi-gear', label: 'Config. Puntos' },
        { path: '/luxe/loyalty-management', icon: 'bi-star', label: 'Gestión Puntos' },
        { path: '/luxe/whatsapp-config', icon: 'bi-whatsapp', label: 'WhatsApp' },
        { path: '/luxe/sri-config', icon: 'bi-file-earmark-text', label: 'Facturación SRI' },
    ];

    return (
        <>
            {/* ── Hamburger button (mobile only) ── */}
            <button
                className="sidebar-hamburger"
                onClick={openSidebar}
                aria-label="Abrir menú"
            >
                <span className="sidebar-bar"></span>
                <span className="sidebar-bar"></span>
                <span className="sidebar-bar"></span>
            </button>

            {/* ── Dark overlay (mobile only, click to close) ── */}
            {isSidebarOpen && (
                <div className="sidebar-overlay" onClick={closeSidebar} />
            )}

            {/* ── Sidebar drawer ── */}
            <aside className={`sidebar ${isSidebarOpen ? 'sidebar-open' : ''}`}>
                {/* Close button inside drawer */}
                <button
                    className="sidebar-close-btn"
                    onClick={closeSidebar}
                    aria-label="Cerrar menú"
                >
                    ✕
                </button>

                <div className="sidebar-header">
                    LUXURY BOUTIQUE
                </div>

                <ul className="sidebar-nav">
                    {navLinks.map(({ path, icon, label }) => (
                        <li key={path} className={isActive(path)}>
                            <Link to={path} onClick={closeSidebar}>
                                <i className={`bi ${icon}`} style={{ marginRight: '10px' }}></i>
                                {label}
                            </Link>
                        </li>
                    ))}
                </ul>

                <div className="sidebar-footer">
                    <button onClick={handleLogout}>
                        <i className="bi bi-box-arrow-right"></i>
                        Cerrar Sesión
                    </button>
                </div>
            </aside>
        </>
    );
};

export default BarraLateralLuxe;
