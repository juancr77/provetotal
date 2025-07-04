import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import RegistroProveedor from './pages/RegistroProveedor';
import VerProveedores from './pages/VerProveedores';
import DetalleProveedor from './pages/DetalleProveedor';
// Se importa el nuevo componente para el registro de facturas.
import RegistroFactura from './pages/RegistroFactura';

function App() {
  return (
    <BrowserRouter>
      <div>
        <nav>
          <h1>Gestión</h1>
          <Link to="/ver-proveedores">Proveedores</Link>
          {' | '}
          {/* Se añade el nuevo enlace. */}
          <Link to="/registrar-factura">Registrar Factura</Link>
          {/* Se pueden añadir más enlaces, por ejemplo, para ver las facturas. */}
        </nav>

        <hr />

        <Routes>
          <Route path="/registrar-proveedor" element={<RegistroProveedor />} />
          <Route path="/ver-proveedores" element={<VerProveedores />} />
          <Route path="/proveedor/:proveedorId" element={<DetalleProveedor />} />
          {/* Se define la nueva ruta para el formulario de facturas. */}
          <Route path="/registrar-factura" element={<RegistroFactura />} />
          <Route path="/" element={<h2>Bienvenido al sistema</h2>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

// Nota: Se ha simplificado un poco la navegación para dar espacio a los nuevos módulos.
// Se puede revertir o adaptar según se necesite.

export default App;