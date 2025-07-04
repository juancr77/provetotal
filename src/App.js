import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import RegistroProveedor from './pages/RegistroProveedor';
// Se importa el nuevo componente para visualizar proveedores.
import VerProveedores from './pages/VerProveedores'; 

function App() {
  return (
    <BrowserRouter>
      <div>
        <nav>
          <h1>Gestión de Proveedores</h1>
          <Link to="/registrar-proveedor">Registrar Nuevo Proveedor</Link>
          {' | '} {/* Se añade un separador visual */}
          <Link to="/ver-proveedores">Ver Proveedores</Link>
        </nav>

        <hr />

        <Routes>
          <Route path="/registrar-proveedor" element={<RegistroProveedor />} />
          {/* Se define la nueva ruta para la lista de proveedores. */}
          <Route path="/ver-proveedores" element={<VerProveedores />} />
          <Route path="/" element={<h2>Bienvenido al sistema</h2>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;