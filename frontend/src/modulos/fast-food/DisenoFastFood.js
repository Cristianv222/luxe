import React from 'react';
import BarraLateralFastFood from './BarraLateralFastFood';
import './FastFood.css';

const DisenoFastFood = ({ children }) => {
    return (
        <div className="fast-food-layout">
            <div className="layout-body">
                <BarraLateralFastFood />
                <main className="main-content">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DisenoFastFood;
