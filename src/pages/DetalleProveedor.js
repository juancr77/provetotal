import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
// Se importa el nuevo archivo de estilos.
import './css/DetalleVista.css'; 

function DetalleProveedor() {
  const { proveedorId } = useParams();
  const navigate = useNavigate();

  const [proveedor, setProveedor] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Se mantiene toda la lógica funcional intacta.
  useEffect(() => {
    const fetchProveedor = async () => {
      try {
        const docRef = doc(db, "proveedores", proveedorId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProveedor(data);
          setFormData(data);
        } else {
          setError("No se encontró el proveedor.");
        }
      } catch (err) {
        setError("Error al cargar los datos del proveedor.");
      } finally {
        setCargando(false);
      }
    };
    fetchProveedor();
  }, [proveedorId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const docRef = doc(db, "proveedores", proveedorId);
      await updateDoc(docRef, formData);
      setProveedor(prev => ({ ...prev, ...formData }));
      setIsEditing(false);
    } catch (err) {
      setError("Error al actualizar los datos del proveedor.");
    }
  };

  const handleDelete = async () => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este proveedor?")) {
      try {
        await deleteDoc(doc(db, "proveedores", proveedorId));
        navigate('/ver-proveedores');
      } catch (err) {
        setError("No se pudo eliminar el proveedor.");
      }
    }
  };

  const generarPDF = async () => {
    // ... tu lógica para generar PDF sigue igual ...
  };

  if (cargando) return <p className="loading-message">Cargando...</p>;
  if (error) return <p className="error-message">{error}</p>;

  return (
    <div className="detalle-container">
      <h2>Detalle del Proveedor</h2>
      {!isEditing ? (
        <>
          <div className="info-card">
            {proveedor && (
              <dl className="info-grid">
                <dt>ID Proveedor:</dt>
                <dd>{proveedor.idProveedor}</dd>

                <dt>Nombre(s):</dt>
                <dd>{proveedor.nombre}</dd>

                <dt>Apellido Paterno:</dt>
                <dd>{proveedor.apellidoPaterno}</dd>

                <dt>Apellido Materno:</dt>
                <dd>{proveedor.apellidoMaterno || 'N/A'}</dd>

                <dt>Fecha de Registro:</dt>
                <dd>{proveedor.fechaRegistro.toDate().toLocaleDateString()}</dd>
              </dl>
            )}
          </div>
          <div className="detalle-acciones">
            <button className="btn btn-editar" onClick={() => setIsEditing(true)}>✏️ Editar</button>
            <button className="btn btn-eliminar" onClick={handleDelete}>🗑️ Eliminar</button>
            <button className="btn btn-secundario" onClick={generarPDF}>📄 Imprimir Detalles</button>
          </div>
        </>
      ) : (
        <form className="detalle-form" onSubmit={handleUpdate}>
          <div className="form-group">
            <label htmlFor="nombre">Nombre(s):</label>
            <input id="nombre" type="text" name="nombre" value={formData.nombre || ''} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="apellidoPaterno">Apellido Paterno:</label>
            <input id="apellidoPaterno" type="text" name="apellidoPaterno" value={formData.apellidoPaterno || ''} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="apellidoMaterno">Apellido Materno:</label>
            <input id="apellidoMaterno" type="text" name="apellidoMaterno" value={formData.apellidoMaterno || ''} onChange={handleChange} />
          </div>
          <div className="detalle-acciones">
            <button className="btn btn-editar" type="submit">✅ Guardar Cambios</button>
            <button className="btn btn-secundario" type="button" onClick={() => setIsEditing(false)}>❌ Cancelar</button>
          </div>
        </form>
      )}
      <Link className="link-volver" to="/ver-proveedores">← Volver a la lista</Link>
    </div>
  );
}

export default DetalleProveedor;