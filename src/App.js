import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import RegistroProveedor from './pages/RegistroProveedor';
import VerProveedores from './pages/VerProveedores';
// Se importa el nuevo componente para el detalle del proveedor.
import DetalleProveedor from './pages/DetalleProveedor';

function App() {
  return (
    <BrowserRouter>
      <div>
        <nav>
          <h1>Gestión de Proveedores</h1>
          <Link to="/registrar-proveedor">Registrar Nuevo Proveedor</Link>
          {' | '}
          <Link to="/ver-proveedores">Ver Proveedores</Link>
        </nav>

        <hr />

        <Routes>
          <Route path="/registrar-proveedor" element={<RegistroProveedor />} />
          <Route path="/ver-proveedores" element={<VerProveedores />} />
          {/* Se define la ruta dinámica. ':proveedorId' será el parámetro. */}
          <Route path="/proveedor/:proveedorId" element={<DetalleProveedor />} />
          <Route path="/" element={<h2>Bienvenido al sistema</h2>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;