import React from 'react';
import { useNavigate } from 'react-router-dom';

const PanelLuxe = () => {
    const navigate = useNavigate();

    return (
        <div className="panel-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
            <div style={{ marginBottom: '2rem', color: '#CFB3A9', fontSize: '4rem' }}>
                <i className="bi bi-gem"></i>
            </div>
            <h1 style={{ fontSize: '3rem', fontWeight: '300', letterSpacing: '2px', color: '#2C2C2C', marginBottom: '1rem' }}>
                Luxury Boutique
            </h1>
            <p style={{ fontSize: '1.2rem', color: '#666', fontWeight: '300', maxWidth: '600px' }}>
                Bienvenido al sistema de gestión integral. Seleccione una opción del menú lateral para administrar su negocio.
            </p>
        </div>
    );
};

export default PanelLuxe;

