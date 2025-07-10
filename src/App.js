import React from 'react';
import { 
  BrowserRouter, 
  Routes, 
  Route, 
  Link, 
  NavLink, // Se importa NavLink para los estilos de la ruta activa
  useNavigate, 
  useLocation 
} from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';

// Importación de todas las páginas
import VerProveedores from './pages/VerProveedores';
import DetalleProveedor from './pages/DetalleProveedor';
import RegistroFactura from './pages/RegistroFactura';
import VerFacturas from './pages/VerFacturas';
import DetalleFactura from './pages/DetalleFactura';
import GastosPorProveedor from './pages/GastosPorProveedor';
import GastosPorMes from './pages/GastosPorMes';
import RegistroProveedor from './pages/RegistroProveedor';
import LoginPage from './pages/LoginPage';

// Importación de CSS
import './App.css';

// --- Componente de Navegación ---
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
      <h1>Gestión</h1>
      <div className="nav-links">
        {/* Se usa NavLink para que React Router pueda aplicar la clase 'active' */}
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

// --- Componente Principal de la App ---
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-container">
          <Navigation />
          <main className="main-content">
            <Routes>
              {/* Ruta pública para iniciar sesión */}
              <Route path="/login" element={<LoginPage />} />
              
              {/* Rutas de la aplicación */}
              <Route path="/registrar-proveedor" element={<RegistroProveedor />} />
              <Route path="/ver-proveedores" element={<VerProveedores />} />
              <Route path="/proveedor/:proveedorId" element={<DetalleProveedor />} />
              
              <Route path="/registrar-factura" element={<RegistroFactura />} />
              <Route path="/ver-facturas" element={<VerFacturas />} />
              <Route path="/factura/:facturaId" element={<DetalleFactura />} />
              
              <Route path="/gastos-proveedor" element={<GastosPorProveedor />} />
              <Route path="/gastos-mes" element={<GastosPorMes />} />
              
              {/* Ruta por defecto */}
              <Route path="/" element={<VerFacturas />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;