import React from 'react';
import BarraLateralLuxe from './BarraLateralLuxe';
import './Luxe.css';

const DisenoLuxe = ({ children }) => {
    return (
        <div className="luxe-layout">
            <div className="layout-body">
                <BarraLateralLuxe />
                <main className="main-content">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DisenoLuxe;


