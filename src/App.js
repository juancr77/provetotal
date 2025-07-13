import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';

// Importación de páginas
import VerProveedores from './pages/VerProveedores';
import DetalleProveedor from './pages/DetalleProveedor';
import RegistroFactura from './pages/RegistroFactura';
import VerFacturas from './pages/VerFacturas';
import DetalleFactura from './pages/DetalleFactura';
import GastosPorProveedor from './pages/GastosPorProveedor';
import GastosPorMes from './pages/GastosPorMes';
import RegistroProveedor from './pages/RegistroProveedor';
import LoginPage from './pages/LoginPage';
import LimiteMes from './pages/LimiteMes';

// Importación de CSS
import './App.css';

function Navigation() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch {
      alert("Error al cerrar sesión");
    }
  };

  return (
    <nav className="app-nav">
      <Link to="/" className="nav-branding">Gestión</Link>

      <div className="nav-links">
        <NavLink to="/ver-proveedores">Proveedores</NavLink>
        <NavLink to="/registrar-proveedor">Registrar Proveedor</NavLink>
        <NavLink to="/ver-facturas">Facturas</NavLink>
        <NavLink to="/registrar-factura">Registrar Factura</NavLink>
        <NavLink to="/gastos-proveedor">Reporte Proveedor</NavLink>
        <NavLink to="/gastos-mes">Reporte Mes</NavLink>
        <NavLink to="/limite-mes">Límites Mensuales</NavLink>
      </div>

      <div className="nav-user-section">
        {currentUser ? (
          <>
            <span className="user-email">{currentUser.displayName || currentUser.email}</span>
            <button onClick={handleLogout} className="auth-button logout">Cerrar Sesión</button>
          </>
        ) : (
          <Link to="/login" state={{ from: location }}>
            <button className="auth-button login">Iniciar Sesión</button>
          </Link>
        )}
      </div>
    </nav>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-container">
          <Navigation />
          <main className="main-content">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/registrar-proveedor" element={<RegistroProveedor />} />
              <Route path="/ver-proveedores" element={<VerProveedores />} />
              <Route path="/proveedor/:proveedorId" element={<DetalleProveedor />} />
              <Route path="/registrar-factura" element={<RegistroFactura />} />
              <Route path="/ver-facturas" element={<VerFacturas />} />
              <Route path="/factura/:facturaId" element={<DetalleFactura />} />
              <Route path="/gastos-proveedor" element={<GastosPorProveedor />} />
              <Route path="/gastos-mes" element={<GastosPorMes />} />
              <Route path="/limite-mes" element={<LimiteMes />} /> 
              <Route path="/" element={<VerFacturas />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;