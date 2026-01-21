import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';

const BarraNavegacion = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showLoyaltyModal, setShowLoyaltyModal] = useState(false);
    const [loyaltyData, setLoyaltyData] = useState(null);
    const [loadingLoyalty, setLoadingLoyalty] = useState(false);

    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        setIsAuthenticated(!!token);
    }, []);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        navigate('/login');
    };

    const fetchLoyaltyData = async () => {
        setLoadingLoyalty(true);
        try {
            // Asumiendo que existe un endpoint para obtener datos de fidelidad del usuario actual
            const response = await api.get('/api/luxe/api/loyalty/account/me/');
            setLoyaltyData(response.data);
        } catch (error) {
            console.error("Error fetching loyalty data", error);
        } finally {
            setLoadingLoyalty(false);
        }
    };

    const openLoyaltyModal = () => {
        setShowLoyaltyModal(true);
        if (isAuthenticated) {
            fetchLoyaltyData();
        }
    };

    const handleRedeem = async (rewardId) => {
        try {
            await api.post(`/api/luxe/api/loyalty/rewards/${rewardId}/redeem/`);
            alert('¡Recompensa canjeada con éxito!');
            fetchLoyaltyData(); // Refrescar datos
        } catch (error) {
            alert('Error al canjear recompensa: ' + (error.response?.data?.error || error.message));
        }
    };

    // Estilos inline para el modal mejorado
    const modalOverlayStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)', // Más transparente
        backdropFilter: 'blur(8px)', // Efecto glassmorphism
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000,
        animation: 'fadeIn 0.3s ease-out'
    };

    const modalContentStyle = {
        backgroundColor: 'rgba(255, 255, 255, 0.95)', // Casi opaco pero con toque glass
        padding: '40px',
        borderRadius: '20px', // Bordes más redondeados
        width: '90%',
        maxWidth: '800px', // Más grande
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative',
        boxShadow: '0 20px 50px rgba(0,0,0,0.2)', // Sombra elegante
        border: '1px solid rgba(255,255,255,0.5)'
    };

    const closeButtonStyle = {
        position: 'absolute',
        top: '20px',
        right: '25px',
        background: 'transparent',
        border: 'none',
        fontSize: '24px',
        cursor: 'pointer',
        color: '#666',
        transition: 'color 0.2s'
    };

    return (
        <>
            <style>
                {`
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    .loyalty-card-gradient {
                        background: linear-gradient(135deg, #CFB3A9 0%, #A09086 100%);
                        color: white;
                        border-radius: 15px;
                        padding: 25px;
                        margin-bottom: 30px;
                        box-shadow: 0 10px 20px rgba(160, 144, 134, 0.3);
                    }
                    .reward-item {
                        background: white;
                        border: 1px solid #eee;
                        border-radius: 12px;
                        padding: 15px;
                        margin-bottom: 10px;
                        transition: transform 0.2s, box-shadow 0.2s;
                    }
                    .reward-item:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 5px 15px rgba(0,0,0,0.05);
                    }
                `}
            </style>

            <header className="header">
                <div className="menu-icon" onClick={toggleMenu}>
                    &#9776;
                </div>
                <div className="logo">
                    <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                        LUXE BOUTIQUE
                    </Link>
                </div>
                <nav className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
                    <Link to="/" onClick={toggleMenu}>INICIO</Link>
                    <Link to="/coleccion" onClick={toggleMenu}>COLECCIÓN</Link>
                    <Link to="/nosotros" onClick={toggleMenu}>NOSOTROS</Link>
                    <Link to="/contacto" onClick={toggleMenu}>CONTACTO</Link>

                    {isAuthenticated ? (
                        <>
                            <span onClick={openLoyaltyModal} style={{ cursor: 'pointer', fontWeight: 'bold', color: '#CFB3A9' }}>
                                MIS PUNTOS
                            </span>
                            <span onClick={handleLogout} style={{ cursor: 'pointer' }}>CS</span>
                        </>
                    ) : (
                        <Link to="/login" onClick={toggleMenu}>LOGIN</Link>
                    )}
                </nav>
            </header>

            {/* MODAL DE FIDELIDAD REIMAGINADO */}
            {showLoyaltyModal && (
                <div style={modalOverlayStyle} onClick={() => setShowLoyaltyModal(false)}>
                    <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
                        <button
                            style={closeButtonStyle}
                            onClick={() => setShowLoyaltyModal(false)}
                            onMouseOver={e => e.target.style.color = '#000'}
                            onMouseOut={e => e.target.style.color = '#666'}
                        >
                            ✕
                        </button>

                        <h2 style={{
                            textAlign: 'center',
                            fontSize: '28px',
                            color: '#2C2C2C',
                            marginBottom: '30px',
                            fontFamily: "'Playfair Display', serif", // Fuente elegante si está disponible
                            letterSpacing: '1px'
                        }}>
                            Mi Club Luxe
                        </h2>

                        {loadingLoyalty ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}>Cargando información...</div>
                        ) : loyaltyData ? (
                            <div>
                                {/* Tarjeta de Puntos */}
                                <div className="loyalty-card-gradient">
                                    <div style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.8 }}>
                                        Saldo Actual
                                    </div>
                                    <div style={{ fontSize: '48px', fontWeight: 'bold', margin: '10px 0' }}>
                                        {loyaltyData.points_balance} <span style={{ fontSize: '20px' }}>Pts</span>
                                    </div>
                                    <div style={{ fontSize: '14px', opacity: 0.9 }}>
                                        Nivel: {loyaltyData.tier?.name || 'Miembro'}
                                    </div>
                                </div>

                                {/* Sección de Cupones Activos */}
                                <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#555' }}>Mis Cupones Disponibles</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px', marginBottom: '30px' }}>
                                    {loyaltyData.coupons?.filter(c => !c.is_used).length > 0 ? (
                                        loyaltyData.coupons.filter(c => !c.is_used).map(coupon => (
                                            <div key={coupon.id} style={{
                                                border: '1px dashed #CFB3A9',
                                                padding: '20px',
                                                borderRadius: '10px',
                                                backgroundColor: '#FAF8F6',
                                                textAlign: 'center'
                                            }}>
                                                <div style={{ color: '#A09086', fontWeight: 'bold', fontSize: '18px', marginBottom: '5px' }}>
                                                    {coupon.code}
                                                </div>
                                                <div style={{ fontSize: '13px', color: '#666' }}>
                                                    {coupon.reward_description}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p style={{ color: '#999', fontStyle: 'italic' }}>No tienes cupones activos.</p>
                                    )}
                                </div>

                                {/* Sección de Recompensas Disponibles */}
                                <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#555' }}>Canjear Puntos</h3>
                                <div style={{ display: 'grid', gap: '15px' }}>
                                    {loyaltyData.available_rewards?.map(reward => (
                                        <div key={reward.id} className="reward-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: '600', color: '#333' }}>{reward.name}</div>
                                                <div style={{ fontSize: '13px', color: '#888' }}>{reward.description}</div>
                                            </div>
                                            <button
                                                onClick={() => handleRedeem(reward.id)}
                                                disabled={loyaltyData.points_balance < reward.points_cost}
                                                style={{
                                                    padding: '8px 20px',
                                                    borderRadius: '20px',
                                                    border: 'none',
                                                    backgroundColor: loyaltyData.points_balance >= reward.points_cost ? '#2C2C2C' : '#eee',
                                                    color: loyaltyData.points_balance >= reward.points_cost ? 'white' : '#aaa',
                                                    cursor: loyaltyData.points_balance >= reward.points_cost ? 'pointer' : 'not-allowed',
                                                    fontWeight: '600',
                                                    fontSize: '13px'
                                                }}
                                            >
                                                {reward.points_cost} Pts
                                            </button>
                                        </div>
                                    ))}
                                </div>

                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', color: '#666' }}>
                                <p>Por favor inicia sesión para ver tus puntos.</p>
                                <Link to="/login" style={{ color: '#CFB3A9', fontWeight: 'bold' }}>Ir al Login</Link>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default BarraNavegacion;
