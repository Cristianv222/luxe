import React from 'react';
import './../modulos/pagina-web/BoutiqueLanding.css'; // Asegurar estilos

const PiePagina = () => {
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
        </footer>
    );
};

export default PiePagina;
