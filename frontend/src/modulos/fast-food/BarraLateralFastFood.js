
import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const BarraLateralFastFood = () => {
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
                Comida Rápida
            </div>
            <ul className="sidebar-nav">
                <li className={isActive('/fast-food')}>
                    <Link to="/fast-food">Panel Principal</Link>
                </li>
                <li className={isActive('/fast-food/pos')}>
                    <Link to="/fast-food/pos">Punto de Venta</Link>
                </li>
                <li className={isActive('/fast-food/orders')}>
                    <Link to="/fast-food/orders">Órdenes</Link>
                </li>
                <li className={isActive('/fast-food/inventory')}>
                    <Link to="/fast-food/inventory">Inventario</Link>
                </li>
                <li className={isActive('/fast-food/customers')}>
                    <Link to="/fast-food/customers">Clientes</Link>
                </li>
                <li className={isActive('/fast-food/shift')}>
                    <Link to="/fast-food/shift">Caja (Turnos)</Link>
                </li>
            </ul>
            <div className="sidebar-footer" style={{ padding: '1rem', borderTop: '1px solid #444' }}>
                <button
                    onClick={handleLogout}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'inherit',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}
                >
                    <i className="bi bi-box-arrow-right"></i>
                    Cerrar Sesión
                </button>
            </div>
        </aside>
    );
};

export default BarraLateralFastFood;