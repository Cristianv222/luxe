import React from 'react';
import { useNavigate } from 'react-router-dom';

const PanelLuxe = () => {
    const navigate = useNavigate();

    const quickAccess = [
        {
            title: 'Punto de Venta',
            description: 'Gestionar ventas y órdenes en tiempo real',
            path: '/luxe/pos',
            icon: 'bi-cart-check-fill'
        },
        {
            title: 'Órdenes',
            description: 'Ver y gestionar todas las órdenes',
            path: '/luxe/orders',
            icon: 'bi-receipt-cutoff'
        },
        {
            title: 'Inventario',
            description: 'Administrar productos y stock',
            path: '/luxe/inventory',
            icon: 'bi-box-seam-fill'
        },
        {
            title: 'Reportes',
            description: 'Análisis y estadísticas de ventas',
            path: '/luxe/reports',
            icon: 'bi-graph-up-arrow'
        },
        {
            title: 'Config. Puntos',
            description: 'Reglas de puntos y cupones',
            path: '/luxe/loyalty-config',
            icon: 'bi-star-fill'
        },
        {
            title: 'Gestión Puntos',
            description: 'Ver clientes y saldos',
            path: '/luxe/loyalty-management',
            icon: 'bi-people-fill'
        },
        {
            title: 'WhatsApp',
            description: 'Automatización de mensajes',
            path: '/luxe/whatsapp-config',
            icon: 'bi-whatsapp'
        }
    ];


    const infoCards = [
        {
            icon: 'bi-lightning-charge-fill',
            title: 'Acceso Rápido',
            description: 'Navega fácilmente entre módulos'
        },
        {
            icon: 'bi-shield-check',
            title: 'Sistema Seguro',
            description: 'Datos protegidos y encriptados'
        },
        {
            icon: 'bi-clock-history',
            title: 'Tiempo Real',
            description: 'Información actualizada al instante'
        }
    ];

    return (
        <div className="panel-container">
            {/* Header Section */}
            <div className="ff-welcome-header">
                <div className="ff-welcome-icon">
                    <i className="bi bi-shop"></i>
                </div>
                <h1>Panel de ventas </h1>
                <p>Accede rápidamente a las funciones principales del sistema Luxe</p>
            </div>

            {/* Quick Access Cards */}
            <div className="ff-card-grid">
                {quickAccess.map((item, index) => (
                    <div
                        key={index}
                        onClick={() => navigate(item.path)}
                        className="ff-card"
                    >
                        <div className="ff-card-icon-wrapper">
                            <i className={`${item.icon} ff-card-icon`}></i>
                        </div>
                        <h5>{item.title}</h5>
                        <p>{item.description}</p>
                    </div>
                ))}
            </div>

            {/* Info Cards */}
            <div className="ff-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                {infoCards.map((card, index) => (
                    <div key={index} className="ff-info-card">
                        <i className={card.icon}></i>
                        <h6>{card.title}</h6>
                        <p>{card.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PanelLuxe;