import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import RegistroProveedor from './pages/RegistroProveedor';
import VerProveedores from './pages/VerProveedores';
import DetalleProveedor from './pages/DetalleProveedor';
import RegistroFactura from './pages/RegistroFactura';
// Se importan los nuevos componentes de reportes.
import GastosPorProveedor from './pages/GastosPorProveedor';
import GastosPorMes from './pages/GastosPorMes';

function App() {
  return (
    <BrowserRouter>
      <div>
        <nav>
          <h1>Gestión</h1>
          <Link to="/ver-proveedores">Proveedores</Link>
          {' | '}
          <Link to="/registrar-factura">Registrar Factura</Link>
          {' | '}
          {/* Se añaden los nuevos enlaces de reportes */}
          <Link to="/gastos-proveedor">Gastos por Proveedor</Link>
          {' | '}
          <Link to="/gastos-mes">Gastos por Mes</Link>
        </nav>

        <hr />

        <Routes>
          <Route path="/registrar-proveedor" element={<RegistroProveedor />} />
          <Route path="/ver-proveedores" element={<VerProveedores />} />
          <Route path="/proveedor/:proveedorId" element={<DetalleProveedor />} />
          <Route path="/registrar-factura" element={<RegistroFactura />} />
          {/* Se definen las nuevas rutas */}
          <Route path="/gastos-proveedor" element={<GastosPorProveedor />} />
          <Route path="/gastos-mes" element={<GastosPorMes />} />
          <Route path="/" element={<h2>Bienvenido al sistema</h2>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;