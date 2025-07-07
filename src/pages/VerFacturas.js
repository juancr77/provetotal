// src/pages/VerFacturas.js

import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { Link } from 'react-router-dom';

function VerFacturas() {
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const obtenerFacturas = async () => {
      try {
        const facturasRef = collection(db, "facturas");
        const q = query(facturasRef, orderBy("fechaFactura", "desc"));
        const querySnapshot = await getDocs(q);
        
        const listaFacturas = querySnapshot.docs.map(doc => ({
          ...doc.data(), 
          id: doc.id 
        }));

        setFacturas(listaFacturas);
      } catch (err) {
        console.error("Error al obtener las facturas: ", err);
        setError("No se pudieron cargar los datos de las facturas.");
      } finally {
        setCargando(false);
      }
    };

    obtenerFacturas();
  }, []);

  if (cargando) {
    return <p>Cargando facturas...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  return (
    <div>
      <h2>Lista de Facturas Registradas</h2>
      <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Número de Factura</th>
            <th>Proveedor</th>
            <th>Descripción</th>
            <th>Monto</th>
            <th>Estatus</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {facturas.length === 0 ? (
            <tr>
              <td colSpan="7">No hay facturas registradas.</td>
            </tr>
          ) : (
            facturas.map(factura => (
              <tr key={factura.id}>
                <td>{factura.fechaFactura.toDate().toLocaleDateString()}</td>
                <td>{factura.numeroFactura}</td>
                <td>{factura.nombreProveedor}</td>
                <td>{factura.descripcion || 'N/A'}</td>
                <td>{factura.monto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</td>
                <td>{factura.estatus}</td>
                <td>
                  <Link to={`/factura/${factura.id}`}>
                    <button>Ver Detalle</button>
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default VerFacturas;