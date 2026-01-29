import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './modulos/login/Login';
import Diseno from './comun/Diseno';
import ListaUsuarios from './modulos/usuarios/ListaUsuarios';
import ServicePlaceholder from './components/ServicePlaceholder';
import PanelLuxe from './modulos/luxe/PanelLuxe';
import Inventario from './modulos/luxe/Inventario';
import Ordenes from './modulos/luxe/Ordenes';
import Clientes from './modulos/luxe/Clientes';
import Reportes from './modulos/luxe/Reportes';
import PuntosVenta from './modulos/luxe/PuntosVenta';
import ShiftManager from './modulos/luxe/ShiftManager';
import Etiquetas from './modulos/luxe/Etiquetas';
import SistemaMaquinas from './modulos/luxe/SistemaMaquinas';
import LoyaltyConfig from './modulos/luxe/LoyaltyConfig';
import GestionPuntos from './modulos/luxe/GestionPuntos';
import WhatsAppConfig from './modulos/luxe/WhatsAppConfig';
import DisenoLuxe from './modulos/luxe/DisenoLuxe';
import ConfiguracionSRI from './modulos/luxe/ConfiguracionSRI';
import { CartProvider } from './context/CartContext';
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

// ... imports ...

function App() {
  return (
    <AuthProvider>
      <CartProvider>
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
            <Route path="/luxe/labels" element={
              <LuxeRoute>
                <Etiquetas />
              </LuxeRoute>
            } />
            <Route path="/luxe/machines" element={
              <LuxeRoute>
                <SistemaMaquinas />
              </LuxeRoute>
            } />
            <Route path="/luxe/loyalty-config" element={
              <LuxeRoute>
                <LoyaltyConfig />
              </LuxeRoute>
            } />
            <Route path="/luxe/loyalty-management" element={
              <LuxeRoute>
                <GestionPuntos />
              </LuxeRoute>
            } />

            <Route path="/luxe/whatsapp-config" element={
              <LuxeRoute>
                <WhatsAppConfig />
              </LuxeRoute>
            } />
            <Route path="/luxe/sri-config" element={
              <LuxeRoute>
                <ConfiguracionSRI />
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
      </CartProvider>
    </AuthProvider>
  );
}

export default App;


