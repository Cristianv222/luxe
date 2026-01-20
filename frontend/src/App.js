import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './modulos/login/Login';
import Diseno from './comun/Diseno';
import ListaUsuarios from './modulos/usuarios/ListaUsuarios';
import ServicePlaceholder from './components/ServicePlaceholder';
import PanelLuxe from './modulos/fast-food/PanelFastFood';
import Inventario from './modulos/fast-food/Inventario';
import Ordenes from './modulos/fast-food/Ordenes';
import Clientes from './modulos/fast-food/Clientes';
import Reportes from './modulos/fast-food/Reportes';
import PuntosVenta from './modulos/fast-food/PuntosVenta';
import ShiftManager from './modulos/fast-food/ShiftManager';
import Impresoras from './modulos/fast-food/Impresoras';
import DisenoLuxe from './modulos/fast-food/DisenoFastFood';
import LandingPage from './modulos/pagina-web/LandingPage'; // Keeping as backup for now or remove? User wanted switch.
import BoutiqueLanding from './modulos/pagina-web/BoutiqueLanding';
import Registro from './modulos/pagina-web/Registro';
import MiPerfil from './modulos/pagina-web/MiPerfil';
import Nosotros from './modulos/pagina-web/Nosotros';
import Contacto from './modulos/pagina-web/Contacto';
import Coleccion from './modulos/pagina-web/Coleccion';
import './App.css';

// Componente para proteger rutas
const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Si es cliente, no puede acceder a rutas privadas y se redirige al home
  if (user.role_details?.name === 'CLIENTE') {
    return <Navigate to="/" />;
  }

  return <Diseno>{children}</Diseno>;
};

// Componente para proteger rutas de Luxe con su propio diseño
const LuxeRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div>Cargando...</div>;
  if (!user) return <Navigate to="/login" />;

  // Si es Super Admin (por rol o por flag de superusuario), mantener el diseño general
  if (user.role_details?.name === 'SUPER_ADMIN' || user.is_superuser) {
    return <Diseno>{children}</Diseno>;
  }

  // Si es otro rol (ej. Admin Luxe), usar el diseño específico
  return <DisenoLuxe>{children}</DisenoLuxe>;
};

// Componente para proteger rutas de clientes (redirige al home si no hay usuario)
const ClientRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div>Cargando...</div>;
  if (!user) return <Navigate to="/" />;
  return children;
};

// Dashboard simple
const Dashboard = () => (
  <div className="page-container">
    <h2>Bienvenido al Panel de Control</h2>
    <p>Seleccione una opción del menú lateral para comenzar.</p>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<BoutiqueLanding />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/coleccion" element={<Coleccion />} />
          <Route path="/nosotros" element={<Nosotros />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="/perfil" element={
            <ClientRoute>
              <MiPerfil />
            </ClientRoute>
          } />

          <Route path="/dashboard" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />

          <Route path="/users" element={
            <PrivateRoute>
              <ListaUsuarios />
            </PrivateRoute>
          } />

          {/* Rutas de creación/edición eliminadas porque ahora son Modales */}

          <Route path="/luxe" element={
            <LuxeRoute>
              <PanelLuxe />
            </LuxeRoute>
          } />
          <Route path="/luxe/inventory" element={
            <LuxeRoute>
              <Inventario />
            </LuxeRoute>
          } />
          <Route path="/luxe/orders" element={
            <LuxeRoute>
              <Ordenes />
            </LuxeRoute>
          } />
          <Route path="/luxe/customers" element={
            <LuxeRoute>
              <Clientes />
            </LuxeRoute>
          } />
          <Route path="/luxe/reports" element={
            <LuxeRoute>
              <Reportes />
            </LuxeRoute>
          } />
          <Route path="/luxe/pos" element={
            <LuxeRoute>
              <PuntosVenta />
            </LuxeRoute>
          } />
          <Route path="/luxe/shift" element={
            <LuxeRoute>
              <ShiftManager onShiftActive={() => { }} />
            </LuxeRoute>
          } />
          <Route path="/luxe/printers" element={
            <LuxeRoute>
              <Impresoras />
            </LuxeRoute>
          } />

          <Route path="/hotel" element={
            <PrivateRoute>
              <ServicePlaceholder title="Hotel" />
            </PrivateRoute>
          } />

          <Route path="/pool" element={
            <PrivateRoute>
              <ServicePlaceholder title="Piscinas" />
            </PrivateRoute>
          } />

          <Route path="/restaurant" element={
            <PrivateRoute>
              <ServicePlaceholder title="Restaurante" />
            </PrivateRoute>
          } />

          {/* Redirigir cualquier otra ruta al inicio */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
