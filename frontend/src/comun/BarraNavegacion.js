import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import logo from '../assets/logo_luxury.png';
import '../modulos/pagina-web/BoutiqueLanding.css';

const BarraNavegacion = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showLoyaltyModal, setShowLoyaltyModal] = useState(false);
    const [loyaltyData, setLoyaltyData] = useState(null);
    const [loyaltyCedula, setLoyaltyCedula] = useState('');
    const [loyaltyLoading, setLoyaltyLoading] = useState(false);
    const [loyaltyError, setLoyaltyError] = useState('');
    const [redeemingReward, setRedeemingReward] = useState(null);
    const [redeemedCoupon, setRedeemedCoupon] = useState(null);

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

    const checkLoyaltyBalance = async (e) => {
        e.preventDefault();
        if (!loyaltyCedula) return;
        setLoyaltyLoading(true); setLoyaltyError(''); setLoyaltyData(null); setRedeemedCoupon(null);
        try {
            const res = await api.post('/api/loyalty/accounts/check_balance_public/', { cedula: loyaltyCedula }, { baseURL: '/api/luxe' });
            setLoyaltyData(res.data);
        } catch (err) {
            setLoyaltyError(err.response?.data?.error || 'No se encontró cuenta de puntos.');
            setLoyaltyData(null);
        } finally {
            setLoyaltyLoading(false);
        }
    };

    const redeemReward = async (rewardId) => {
        setRedeemingReward(rewardId);
        setRedeemedCoupon(null);
        try {
            const res = await api.post('/api/loyalty/accounts/redeem_reward_public/',
                { cedula: loyaltyCedula, reward_rule_id: rewardId },
                { baseURL: '/api/luxe' }
            );
            if (res.data.success) {
                setRedeemedCoupon(res.data.coupon);
                setLoyaltyData(prev => ({
                    ...prev,
                    points_balance: res.data.new_balance,
                    coupons: [...(prev.coupons || []), res.data.coupon],
                    available_rewards: prev.available_rewards?.filter(r =>
                        r.points_cost <= res.data.new_balance
                    )
                }));
            }
        } catch (err) {
            setLoyaltyError(err.response?.data?.error || 'Error al canjear recompensa');
        } finally {
            setRedeemingReward(null);
        }
    };

    return (
        <>
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
                        <Link to="/" className="nav-link" onClick={() => setIsMenuOpen(false)}>INICIO</Link>
                        {/* Botón de Puntos integrado en el menú */}
                        <button
                            className="nav-link"
                            onClick={() => { setShowLoyaltyModal(true); setIsMenuOpen(false); }}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                fontSize: 'inherit',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            CONSULTA TUS PUNTOS
                        </button>
                        <Link to="/coleccion" className="nav-link" onClick={() => setIsMenuOpen(false)}>COLECCIÓN</Link>
                        <Link to="/nosotros" className="nav-link" onClick={() => setIsMenuOpen(false)}>NOSOTROS</Link>
                        <Link to="/contacto" className="nav-link" onClick={() => setIsMenuOpen(false)}>CONTACTO</Link>

                        {isAuthenticated ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginLeft: '20px' }}>
                                <Link to="/perfil" className="nav-link" onClick={() => setIsMenuOpen(false)}>MI PERFIL</Link>
                                <button onClick={handleLogout} className="btn-logout">SALIR</button>
                            </div>
                        ) : (
                            <Link to="/login" className="nav-link" onClick={() => setIsMenuOpen(false)} style={{ marginLeft: '10px' }}>LOGIN</Link>
                        )}
                    </nav>
                </div>
            </header>

            {/* LOYALTY MODAL - REDESIGNED (Glassmorphism) */}
            {showLoyaltyModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 10000,
                    animation: 'fadeIn 0.3s ease-out'
                }} onClick={() => setShowLoyaltyModal(false)}>

                    <div onClick={e => e.stopPropagation()} style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        padding: '40px',
                        borderRadius: '20px',
                        width: '90%',
                        maxWidth: '850px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        position: 'relative',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.2)'
                    }}>
                        <button
                            onClick={() => setShowLoyaltyModal(false)}
                            style={{
                                position: 'absolute',
                                top: '20px',
                                right: '25px',
                                background: 'transparent',
                                border: 'none',
                                fontSize: '24px',
                                cursor: 'pointer',
                                color: '#999',
                                transition: 'color 0.2s',
                                zIndex: 10001
                            }}
                            onMouseOver={e => e.target.style.color = '#333'}
                            onMouseOut={e => e.target.style.color = '#999'}
                        >
                            ✕
                        </button>

                        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                            <h2 style={{
                                margin: 0,
                                fontSize: '32px',
                                fontFamily: "'Playfair Display', serif",
                                color: '#2C2C2C',
                                letterSpacing: '1px'
                            }}>
                                Luxury Club
                            </h2>
                            <p style={{ color: '#888', marginTop: '10px', fontSize: '15px' }}>
                                Programa de Fidelidad Exclusivo
                            </p>
                        </div>

                        {!loyaltyData ? (
                            <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                                <form onSubmit={checkLoyaltyBalance} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                                        <p style={{ color: '#666', lineHeight: '1.6' }}>
                                            Ingresa tu número de identificación para consultar tus puntos y canjear recompensas.
                                        </p>
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="Cédula o RUC"
                                        value={loyaltyCedula}
                                        onChange={e => setLoyaltyCedula(e.target.value)}
                                        style={{
                                            padding: '16px',
                                            fontSize: '16px',
                                            border: '1px solid #e0e0e0',
                                            borderRadius: '10px',
                                            textAlign: 'center',
                                            backgroundColor: '#f9f9f9',
                                            outline: 'none',
                                            transition: 'border-color 0.3s'
                                        }}
                                        required
                                    />

                                    {loyaltyError && (
                                        <div style={{ padding: '10px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '14px', textAlign: 'center' }}>
                                            {loyaltyError}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loyaltyLoading}
                                        style={{
                                            padding: '16px',
                                            backgroundColor: '#2C2C2C',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '30px',
                                            fontSize: '15px',
                                            fontWeight: '600',
                                            letterSpacing: '1px',
                                            cursor: loyaltyLoading ? 'wait' : 'pointer'
                                        }}
                                    >
                                        {loyaltyLoading ? 'VERIFICANDO...' : 'CONSULTAR MIS PUNTOS'}
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="loyalty-dashboard fade-in">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '25px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                                    <div>
                                        <p style={{ fontSize: '12px', textTransform: 'uppercase', color: '#999', letterSpacing: '2px', margin: 0 }}>Bienvenido de nuevo</p>
                                        <h3 style={{ margin: '5px 0 0', fontSize: '24px', color: '#2C2C2C' }}>{loyaltyData.customer_name}</h3>
                                    </div>
                                    <button
                                        onClick={() => { setLoyaltyData(null); setLoyaltyCedula(''); }}
                                        style={{ background: 'none', border: 'none', color: '#CFB3A9', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}
                                    >
                                        Salir
                                    </button>
                                </div>

                                {loyaltyError && (
                                    <div style={{ padding: '15px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', border: '1px solid #fecaca' }}>
                                        <strong>Error:</strong> {loyaltyError}
                                    </div>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
                                    <div>
                                        <div style={{
                                            background: 'linear-gradient(135deg, #CFB3A9 0%, #A09086 100%)',
                                            color: 'white',
                                            borderRadius: '16px',
                                            padding: '30px',
                                            marginBottom: '30px',
                                            boxShadow: '0 15px 30px rgba(160, 144, 134, 0.4)',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{ position: 'relative', zIndex: 1 }}>
                                                <div style={{ opacity: 0.8, fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase' }}>Saldo Actual</div>
                                                <div style={{ fontSize: '56px', fontWeight: 'bold', margin: '10px 0', lineHeight: 1 }}>
                                                    {loyaltyData.points_balance}
                                                    <span style={{ fontSize: '20px', fontWeight: '400', marginLeft: '5px' }}>pts</span>
                                                </div>
                                                <div style={{ fontSize: '14px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.2)', marginTop: '15px', display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>Nivel: {loyaltyData.tier?.name || 'Miembro'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Coupons */}
                                        <h4 style={{ fontSize: '16px', color: '#2C2C2C', marginBottom: '15px' }}>Mis Cupones</h4>
                                        {redeemedCoupon && (
                                            <div style={{ background: '#ecfdf5', border: '1px dashed #10b981', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                                                <span style={{ color: '#047857', fontWeight: 'bold', display: 'block' }}>¡Nuevo cupón!</span>
                                                <span style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 'bold', color: '#065f46' }}>{redeemedCoupon.code}</span>
                                            </div>
                                        )}
                                        <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                            {loyaltyData.coupons?.filter(c => !c.is_used).map(coupon => (
                                                <div key={coupon.id} style={{ padding: '15px', background: 'white', border: '1px solid #eee', borderRadius: '12px', marginBottom: '10px' }}>
                                                    <div style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{coupon.code}</div>
                                                    <div style={{ fontSize: '12px', color: '#888' }}>{coupon.reward_name}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 style={{ fontSize: '16px', color: '#2C2C2C', marginBottom: '20px' }}>Canjear Puntos</h4>
                                        <div style={{ display: 'grid', gap: '15px', maxHeight: '500px', overflowY: 'auto' }}>
                                            {loyaltyData.available_rewards?.map(reward => {
                                                const canAfford = loyaltyData.points_balance >= reward.points_cost;
                                                return (
                                                    <div key={reward.id} style={{
                                                        backgroundColor: 'white',
                                                        border: `1px solid ${canAfford ? '#e5e5e5' : '#f0f0f0'}`,
                                                        borderRadius: '12px',
                                                        padding: '16px',
                                                        opacity: canAfford ? 1 : 0.7,
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center'
                                                    }}>
                                                        <div>
                                                            <div style={{ fontWeight: '600', color: '#333' }}>{reward.name}</div>
                                                            <div style={{ fontSize: '13px', color: '#888' }}>{reward.points_cost} Pts</div>
                                                        </div>
                                                        <button
                                                            onClick={() => redeemReward(reward.id)}
                                                            disabled={!canAfford || redeemingReward === reward.id}
                                                            style={{
                                                                padding: '8px 16px',
                                                                borderRadius: '20px',
                                                                border: 'none',
                                                                backgroundColor: canAfford ? '#2C2C2C' : '#f3f4f6',
                                                                color: canAfford ? 'white' : '#9ca3af',
                                                                cursor: canAfford ? 'pointer' : 'not-allowed'
                                                            }}
                                                        >
                                                            Canjear
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default BarraNavegacion;


