import React from 'react';
import BarraLateralLuxe from './BarraLateralLuxe';
import { SidebarProvider } from '../../context/SidebarContext';
import './Luxe.css';

const DisenoLuxe = ({ children }) => {
    return (
        <SidebarProvider>
            <div className="luxe-layout">
                <div className="layout-body">
                    <BarraLateralLuxe />
                    <main className="main-content">
                        {children}
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
};

export default DisenoLuxe;
