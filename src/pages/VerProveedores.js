import React, { useState, useEffect } from 'react';
// Se importa Link para la navegación.
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs } from "firebase/firestore";

function VerProveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const obtenerProveedores = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "proveedores"));
        const listaProveedores = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        }));
        setProveedores(listaProveedores);
      } catch (err) {
        console.error("Error al obtener los proveedores: ", err);
        setError("No se pudieron cargar los datos de los proveedores.");
      } finally {
        setCargando(false);
      }
    };

    obtenerProveedores();
  }, []);

  if (cargando) {
    return <p>Cargando proveedores...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  return (
    <div>
      <h2>Lista de Proveedores Registrados</h2>
      <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>ID de Proveedor</th>
            <th>Nombre(s)</th>
            <th>Apellido Paterno</th>
            <th>Apellido Materno</th>
            {/* Se añade la nueva columna para las acciones. */}
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {proveedores.length === 0 ? (
            <tr>
              {/* Se ajusta el colSpan para abarcar la nueva columna. */}
              <td colSpan="5">No hay proveedores registrados.</td>
            </tr>
          ) : (
            proveedores.map(proveedor => (
              <tr key={proveedor.id}>
                <td>{proveedor.idProveedor}</td>
                <td>{proveedor.nombre}</td>
                <td>{proveedor.apellidoPaterno}</td>
                <td>{proveedor.apellidoMaterno || 'No especificado'}</td>
                <td>
                  {/* Se crea un enlace a la ruta dinámica del proveedor. */}
                  {/* El ID del documento de Firestore se usa en la URL. */}
                  <Link to={`/proveedor/${proveedor.id}`}>
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

export default VerProveedores;