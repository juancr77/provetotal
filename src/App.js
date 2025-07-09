// src/App.js

import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import RegistroProveedor from './pages/RegistroProveedor';
import VerProveedores from './pages/VerProveedores';
import DetalleProveedor from './pages/DetalleProveedor';
import RegistroFactura from './pages/RegistroFactura';
import GastosPorProveedor from './pages/GastosPorProveedor';
import GastosPorMes from './pages/GastosPorMes';
import VerFacturas from './pages/VerFacturas';
import DetalleFactura from './pages/DetalleFactura';
import './pages/css/App.css'; // Asegúrate que la ruta es correcta

// Componente para el separador, para controlarlo mejor con CSS
const LinkSeparator = () => <span className="link-separator">|</span>;

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
         <h1>Gestión</h1>
        <nav className="app-nav">
          <div className="nav-links">
            <NavLink to="/ver-proveedores">Proveedores</NavLink>
            <LinkSeparator />
            <NavLink to="/registrar-factura">Registrar Factura</NavLink>
            <LinkSeparator />
            <NavLink to="/ver-facturas">Ver Facturas</NavLink>
            <LinkSeparator />
            <NavLink to="/gastos-proveedor">Gastos por Proveedor</NavLink>
            <LinkSeparator />
            <NavLink to="/gastos-mes">Gastos por Mes</NavLink>
          </div>
        </nav>
        
        {/* El <hr> ya no es necesario gracias al borde en el nav */}
        
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
            
            <Route path="/" element={<VerProveedores />} /> {/* Redirige a una página útil */}
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;