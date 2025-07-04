import React, { useState, useEffect } from 'react';
// Se importa useParams para leer los parámetros de la URL.
import { useParams, Link } from 'react-router-dom';
// Se importan las funciones de Firestore para obtener un documento específico.
import { doc, getDoc } from "firebase/firestore";
import { db } from '../firebase';

function DetalleProveedor() {
  // Se obtiene el parámetro 'proveedorId' de la URL.
  const { proveedorId } = useParams();
  
  // Se definen los estados para el proveedor, la carga y los errores.
  const [proveedor, setProveedor] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // El efecto se ejecuta cuando el componente se monta o cuando 'proveedorId' cambia.
  useEffect(() => {
    // Se define la función asíncrona para obtener el documento.
    const obtenerProveedor = async () => {
      setCargando(true);
      try {
        // Se crea una referencia directa al documento del proveedor en Firestore.
        const docRef = doc(db, "proveedores", proveedorId);
        // Se solicita el documento.
        const docSnap = await getDoc(docRef);

        // Se comprueba si el documento existe.
        if (docSnap.exists()) {
          // Si existe, se guardan sus datos en el estado.
          setProveedor(docSnap.data());
        } else {
          // Si no existe, se establece un error.
          setError("No se encontró el proveedor especificado.");
        }
      } catch (err) {
        console.error("Error al obtener el documento:", err);
        setError("Ocurrió un error al cargar los datos del proveedor.");
      } finally {
        // Se finaliza el estado de carga.
        setCargando(false);
      }
    };

    obtenerProveedor();
  }, [proveedorId]); // El efecto depende del ID del proveedor.

  // Se muestran los mensajes de estado.
  if (cargando) {
    return <p>Cargando detalle del proveedor...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  return (
    <div>
      {/* Se comprueba que el proveedor no sea nulo antes de mostrar los datos. */}
      {proveedor ? (
        <div>
          <h2>Detalle del Proveedor</h2>
          <p><strong>ID de Proveedor:</strong> {proveedor.idProveedor}</p>
          <p><strong>Nombre(s):</strong> {proveedor.nombre}</p>
          <p><strong>Apellido Paterno:</strong> {proveedor.apellidoPaterno}</p>
          <p><strong>Apellido Materno:</strong> {proveedor.apellidoMaterno || 'No especificado'}</p>
          {/* Se puede formatear la fecha para que sea más legible. */}
          <p><strong>Fecha de Registro:</strong> {new Date(proveedor.fechaRegistro.seconds * 1000).toLocaleString()}</p>
        </div>
      ) : (
        // Este mensaje no debería aparecer si la lógica de error funciona bien, pero es una salvaguarda.
        <p>No hay datos para mostrar.</p>
      )}
      <br />
      {/* Un enlace para regresar a la lista principal. */}
      <Link to="/ver-proveedores">Volver a la lista</Link>
    </div>
  );
}

export default DetalleProveedor;