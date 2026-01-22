
import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const BarraLateralLuxe = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useContext(AuthContext);

    const isActive = (path) => {
        return location.pathname === path ? 'active' : '';
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                LUXURY BOUTIQUE
            </div>
            <ul className="sidebar-nav">
                <li className={isActive('/luxe')}>
                    <Link to="/luxe">
                        <i className="bi bi-grid" style={{ marginRight: '10px' }}></i>
                        Panel Principal
                    </Link>
                </li>
                <li className={isActive('/luxe/pos')}>
                    <Link to="/luxe/pos">
                        <i className="bi bi-shop" style={{ marginRight: '10px' }}></i>
                        Punto de Venta
                    </Link>
                </li>
                <li className={isActive('/luxe/orders')}>
                    <Link to="/luxe/orders">
                        <i className="bi bi-receipt" style={{ marginRight: '10px' }}></i>
                        Órdenes
                    </Link>
                </li>
                <li className={isActive('/luxe/inventory')}>
                    <Link to="/luxe/inventory">
                        <i className="bi bi-box-seam" style={{ marginRight: '10px' }}></i>
                        Inventario
                    </Link>
                </li>
                <li className={isActive('/luxe/customers')}>
                    <Link to="/luxe/customers">
                        <i className="bi bi-people-fill" style={{ marginRight: '10px' }}></i>
                        Clientes
                    </Link>
                </li>
                <li className={isActive('/luxe/reports')}>
                    <Link to="/luxe/reports">
                        <i className="bi bi-graph-up" style={{ marginRight: '10px' }}></i>
                        Reportes
                    </Link>
                </li>
                <li className={isActive('/luxe/shift')}>
                    <Link to="/luxe/shift">
                        <i className="bi bi-cash-coin" style={{ marginRight: '10px' }}></i>
                        Caja (Turnos)
                    </Link>
                </li>
                <li className={isActive('/luxe/printers')}>
                    <Link to="/luxe/printers">
                        <i className="bi bi-printer" style={{ marginRight: '10px' }}></i>
                        Impresoras
                    </Link>
                </li>
                <li className={isActive('/luxe/loyalty-config')}>
                    <Link to="/luxe/loyalty-config">
                        <i className="bi bi-gear" style={{ marginRight: '10px' }}></i>
                        Config. Puntos
                    </Link>
                </li>
                <li className={isActive('/luxe/loyalty-management')}>
                    <Link to="/luxe/loyalty-management">
                        <i className="bi bi-star" style={{ marginRight: '10px' }}></i>
                        Gestión Puntos
                    </Link>
                </li>
                <li className={isActive('/luxe/whatsapp-config')}>
                    <Link to="/luxe/whatsapp-config">
                        <i className="bi bi-whatsapp" style={{ marginRight: '10px' }}></i>
                        WhatsApp
                    </Link>
                </li>
            </ul>
            <div className="sidebar-footer">
                <button
                    onClick={handleLogout}
                >
                    <i className="bi bi-box-arrow-right"></i>
                    Cerrar Sesión
                </button>
            </div>
        </aside>
    );
};

export default BarraLateralLuxe;