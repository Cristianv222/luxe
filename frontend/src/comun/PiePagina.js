import React from 'react';
import { useLocation } from 'react-router-dom';
import './../modulos/pagina-web/BoutiqueLanding.css'; // Asegurar estilos

const PiePagina = () => {
    const location = useLocation();
    const isLoginPage = location.pathname === '/login';

    return (
        <footer className="boutique-footer">
            <div className="footer-content">
                <div className="footer-column">
                    <h4>LUXURY BOUTIQUE</h4>
                    <p>Redefiniendo el lujo y la exclusividad desde 2025.</p>
                </div>

                {/* Horarios */}
                <div className="footer-column">
                    <h4>Horario de Atención</h4>
                    <p>Lun - Mar - Jue - Vie: 9:00 AM - 6:45 PM</p>
                    <p>Sábado: 10:00 AM - 6:45 PM</p>
                    <p>Miércoles y Domingo: CERRADO</p>
                </div>

                <div className="footer-column">
                    <h4>Contacto</h4>
                    {/* Correo eliminado como solicitado */}
                    <p>098 612 3920</p>
                    <p>Cuenca, Ecuador</p>
                    <div style={{ marginTop: '15px', display: 'flex', gap: '15px' }}>
                        <a href="https://www.instagram.com/luxury_boutique_ec/" target="_blank" rel="noopener noreferrer" style={{ color: '#2C2C2C', fontSize: '20px' }}>
                            <i className="fab fa-instagram"></i>
                        </a>
                        <a href="https://www.facebook.com/share/18D31cQMZE/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" style={{ color: '#2C2C2C', fontSize: '20px' }}>
                            <i className="fab fa-facebook"></i>
                        </a>
                        <a href="https://www.tiktok.com/@luxury_boutique.ec?_r=1&_t=ZS-93G9DQn5vqZ" target="_blank" rel="noopener noreferrer" style={{ color: '#2C2C2C', fontSize: '20px' }}>
                            <i className="fab fa-tiktok"></i>
                        </a>
                    </div>
                </div>
            </div>
            <div className="footer-bottom">
                <p>&copy; 2026 Luxury Boutique. Todos los derechos reservados.</p>
            </div>

            {/* FLOATING WHATSAPP BUTTON (GLOBAL EXCEPT LOGIN) */}
            {!isLoginPage && (
                <a
                    href="https://wa.me/593986123920?text=Hola%20Luxury%20Boutique,%20quisiera%20m%C3%A1s%20informaci%C3%B3n."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="whatsapp-float hover-float"
                    style={{
                        position: 'fixed',
                        width: '60px',
                        height: '60px',
                        bottom: '40px',
                        left: '40px',
                        backgroundColor: '#CFB3A9', // "Cinna" theme color
                        border: '2px solid #FFF',
                        color: '#FFF',
                        borderRadius: '50px',
                        textAlign: 'center',
                        fontSize: '30px',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                        zIndex: 10000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s ease',
                        textDecoration: 'none'
                    }}
                >
                    <i className="fab fa-whatsapp"></i>

                    {/* TOOLTIP / PESTAÑITA */}
                    <span
                        className="whatsapp-tooltip"
                        style={{
                            position: 'absolute',
                            left: '70px', // Right of the button
                            backgroundColor: '#FFF',
                            color: '#2C2C2C',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                            opacity: 0,
                            transition: 'opacity 0.5s',
                            pointerEvents: 'none',
                            animation: 'fadeInOut 5s infinite',
                            border: '1px solid #F1EEEB'
                        }}
                    >
                        ¡Escríbenos para más info!
                    </span>
                </a>
            )}
        </footer>
    );
};

export default PiePagina;
