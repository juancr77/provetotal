import React from 'react';
import { BrowserRouter, Routes, Route, Link, NavLink } from 'react-router-dom';
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

// Importación de CSS
import './App.css';

// Componente de Navegación con lógica de autenticación
function Navigation() {
  const { currentUser, loginWithGoogle, logout } = useAuth();

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      alert("No se pudo iniciar sesión. Inténtalo de nuevo.");
    }
  };

  return (
    <nav className="app-nav">
      <h1>Gestión</h1>
      <div className="nav-links">
        <NavLink to="/ver-proveedores">Proveedores</NavLink>
        <span className="link-separator">|</span>
        <NavLink to="/registrar-proveedor">Registrar Proveedor</NavLink>
        <span className="link-separator">|</span>
        <NavLink to="/ver-facturas">Facturas</NavLink>
        <span className="link-separator">|</span>
        <NavLink to="/registrar-factura">Registrar Factura</NavLink>
        <span className="link-separator">|</span>
        <NavLink to="/gastos-proveedor">Reporte Proveedor</NavLink>
        <span className="link-separator">|</span>
        <NavLink to="/gastos-mes">Reporte Mes</NavLink>
      </div>
      <div className="nav-user-section">
        {currentUser ? (
          <>
            <span className="user-email">{currentUser.displayName || currentUser.email}</span>
            <button onClick={logout} className="auth-button logout">Cerrar Sesión</button>
          </>
        ) : (
          <button onClick={handleLogin} className="auth-button login">Iniciar Sesión</button>
        )}
      </div>
    </nav>
  );
}

// Componente principal de la App
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-container">
          <Navigation />
          <main className="main-content">
            <Routes>
              <Route path="/registrar-proveedor" element={<RegistroProveedor />} />
              <Route path="/ver-proveedores" element={<VerProveedores />} />
              <Route path="/proveedor/:proveedorId" element={<DetalleProveedor />} />
              <Route path="/registrar-factura" element={<RegistroFactura />} />
              <Route path="/ver-facturas" element={<VerFacturas />} />
              <Route path="/factura/:facturaId" element={<DetalleFactura />} />
              <Route path="/gastos-proveedor" element={<GastosPorProveedor />} />
              <Route path="/gastos-mes" element={<GastosPorMes />} />
              <Route path="/" element={<VerFacturas />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;