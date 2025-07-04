import React, { useState, useEffect } from 'react';
// Se importan los hooks y funciones necesarias.
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from '../firebase';

function DetalleProveedor() {
  const { proveedorId } = useParams();
  const navigate = useNavigate(); // Hook para la navegación programática.
  
  const [proveedor, setProveedor] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Se añade un estado para controlar el "modo edición".
  const [isEditing, setIsEditing] = useState(false);
  // Se añade un estado para manejar los datos del formulario de edición.
  const [formData, setFormData] = useState({});
  // Se añade un estado para deshabilitar botones durante el envío.
  const [isSubmitting, setIsSubmitting] = useState(false);

  // El efecto se sigue ejecutando para obtener los datos iniciales.
  useEffect(() => {
    const obtenerProveedor = async () => {
      setCargando(true);
      try {
        const docRef = doc(db, "proveedores", proveedorId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setProveedor(data);
          // Se inicializa el estado del formulario con los datos obtenidos.
          setFormData(data);
        } else {
          setError("No se encontró el proveedor especificado.");
        }
      } catch (err) {
        console.error("Error al obtener el documento:", err);
        setError("Ocurrió un error al cargar los datos del proveedor.");
      } finally {
        setCargando(false);
      }
    };

    obtenerProveedor();
  }, [proveedorId]);

  // Función para manejar los cambios en los inputs del modo edición.
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Función para guardar los cambios (Update).
  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    // Se crea una referencia al documento que se va a actualizar.
    const docRef = doc(db, "proveedores", proveedorId);
    try {
      // Se actualiza el documento en Firestore.
      await updateDoc(docRef, formData);
      // Se actualiza el estado local para reflejar los cambios inmediatamente.
      setProveedor(formData);
      // Se sale del modo edición.
      setIsEditing(false);
    } catch (err) {
      console.error("Error al actualizar el proveedor: ", err);
      setError("No se pudo actualizar el proveedor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para eliminar el proveedor (Delete).
  const handleDelete = async () => {
    // Se pide confirmación antes de una acción destructiva.
    if (window.confirm("¿Estás seguro de que quieres eliminar este proveedor? Esta acción no se puede deshacer.")) {
      setIsSubmitting(true);
      setError(null);
      const docRef = doc(db, "proveedores", proveedorId);
      try {
        // Se elimina el documento de Firestore.
        await deleteDoc(docRef);
        // Se redirige al usuario a la lista de proveedores.
        navigate("/ver-proveedores");
      } catch (err) {
        console.error("Error al eliminar el proveedor: ", err);
        setError("No se pudo eliminar el proveedor.");
        setIsSubmitting(false);
      }
    }
  };

  if (cargando) return <p>Cargando detalle del proveedor...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h2>Detalle del Proveedor</h2>

      {/* Si no se está editando, se muestran los datos. */}
      {!isEditing ? (
        <div>
          {proveedor && (
            <div>
              <p><strong>ID de Proveedor:</strong> {proveedor.idProveedor}</p>
              <p><strong>Nombre(s):</strong> {proveedor.nombre}</p>
              <p><strong>Apellido Paterno:</strong> {proveedor.apellidoPaterno}</p>
              <p><strong>Apellido Materno:</strong> {proveedor.apellidoMaterno || 'No especificado'}</p>
              <p><strong>Fecha de Registro:</strong> {new Date(proveedor.fechaRegistro.seconds * 1000).toLocaleString()}</p>
            </div>
          )}
          <button onClick={() => setIsEditing(true)} disabled={isSubmitting}>✏️ Editar</button>
          <button onClick={handleDelete} disabled={isSubmitting} style={{ marginLeft: '10px', backgroundColor: '#dc3545' }}>🗑️ Eliminar</button>
        </div>
      ) : (
        // Si se está editando, se muestra un formulario.
        <form onSubmit={handleUpdate}>
          <div>
            <label>ID de Proveedor:</label>
            {/* El ID de proveedor no debería ser editable usualmente, por lo que se muestra como texto. */}
            <p>{formData.idProveedor}</p>
          </div>
          <div>
            <label>Nombre(s):</label>
            <input type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} required />
          </div>
          <div>
            <label>Apellido Paterno:</label>
            <input type="text" name="apellidoPaterno" value={formData.apellidoPaterno} onChange={handleInputChange} required />
          </div>
          <div>
            <label>Apellido Materno:</label>
            <input type="text" name="apellidoMaterno" value={formData.apellidoMaterno || ''} onChange={handleInputChange} />
          </div>
          <button type="submit" disabled={isSubmitting}>✅ Guardar Cambios</button>
          <button type="button" onClick={() => setIsEditing(false)} disabled={isSubmitting} style={{ marginLeft: '10px' }}>❌ Cancelar</button>
        </form>
      )}

      <br />
      <br />
      <Link to="/ver-proveedores">Volver a la lista</Link>
    </div>
  );
}

export default DetalleProveedor;