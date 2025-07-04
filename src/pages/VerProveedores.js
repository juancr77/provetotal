import React, { useState, useEffect } from 'react';
// Se importa la instancia de la base de datos de Firebase.
import { db } from '../firebase';
// Se importan las funciones para obtener documentos de una colección.
import { collection, getDocs } from "firebase/firestore";

function VerProveedores() {
  // Se define un estado para almacenar la lista de proveedores.
  const [proveedores, setProveedores] = useState([]);
  // Se define un estado para manejar los mensajes de carga.
  const [cargando, setCargando] = useState(true);
  // Se define un estado para manejar posibles errores.
  const [error, setError] = useState(null);

  // useEffect se ejecuta cuando el componente se monta por primera vez.
  useEffect(() => {
    // Se define una función asíncrona para obtener los datos.
    const obtenerProveedores = async () => {
      try {
        // Se obtiene una referencia a la colección 'proveedores'.
        const querySnapshot = await getDocs(collection(db, "proveedores"));
        
        // Se mapean los documentos obtenidos a un formato más manejable.
        const listaProveedores = querySnapshot.docs.map(doc => ({
          // Se extraen los datos del documento.
          ...doc.data(), 
          // Se añade el ID único del documento, que es útil para futuras operaciones.
          id: doc.id 
        }));

        // Se actualiza el estado con la lista de proveedores.
        setProveedores(listaProveedores);
      } catch (err) {
        // Se maneja cualquier error durante la obtención de datos.
        console.error("Error al obtener los proveedores: ", err);
        setError("No se pudieron cargar los datos de los proveedores.");
      } finally {
        // Se indica que la carga ha finalizado, independientemente del resultado.
        setCargando(false);
      }
    };

    // Se llama a la función para que se ejecute.
    obtenerProveedores();
  }, []); // El array vacío asegura que el efecto se ejecute solo una vez.

  // Se muestra un mensaje mientras los datos se están cargando.
  if (cargando) {
    return <p>Cargando proveedores...</p>;
  }

  // Se muestra un mensaje de error si algo falló.
  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  return (
    <div>
      <h2>Lista de Proveedores Registrados</h2>
      {/* Se renderiza una tabla para mostrar los datos. */}
      <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>ID de Proveedor</th>
            <th>Nombre(s)</th>
            <th>Apellido Paterno</th>
            <th>Apellido Materno</th>
          </tr>
        </thead>
        <tbody>
          {/* Si no hay proveedores, se muestra una fila indicándolo. */}
          {proveedores.length === 0 ? (
            <tr>
              <td colSpan="4">No hay proveedores registrados.</td>
            </tr>
          ) : (
            // Se itera sobre la lista de proveedores para crear una fila por cada uno.
            proveedores.map(proveedor => (
              <tr key={proveedor.id}>
                <td>{proveedor.idProveedor}</td>
                <td>{proveedor.nombre}</td>
                <td>{proveedor.apellidoPaterno}</td>
                {/* Se muestra el apellido materno solo si existe. */}
                <td>{proveedor.apellidoMaterno || 'No especificado'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default VerProveedores;