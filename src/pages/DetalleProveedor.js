import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import './css/DetalleVista.css';

function DetalleProveedor() {
  const { proveedorId } = useParams();
  const navigate = useNavigate();

  const [proveedor, setProveedor] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

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
    if (!proveedor) return;
    const docPDF = new jsPDF('p', 'pt', 'letter');
    const pdfWidth = docPDF.internal.pageSize.getWidth();

    try {
      const response = await fetch('https://i.imgur.com/5mavo8r.png');
      const imageBlob = await response.blob();
      const imageUrl = URL.createObjectURL(imageBlob);
      const imageWidth = 350;
      const imageHeight = 88;
      const x = (pdfWidth - imageWidth) / 2;
      docPDF.addImage(imageUrl, 'PNG', x, 40, imageWidth, imageHeight);
      URL.revokeObjectURL(imageUrl);
    } catch (error) { console.error("Error al cargar la imagen de cabecera:", error); }

    const contentY = 40 + 88 + 40;
    docPDF.setFontSize(18);
    docPDF.setTextColor('#2A4B7C');
    docPDF.text("Información del Proveedor", pdfWidth / 2, contentY, { align: 'center' });

    const tableData = [
      ['ID Proveedor', proveedor.idProveedor],
      ['Nombre(s)', proveedor.nombre],
      ['Apellido Paterno', proveedor.apellidoPaterno],
      ['Apellido Materno', proveedor.apellidoMaterno || 'N/A'],
      ['Fecha de Registro', proveedor.fechaRegistro.toDate().toLocaleDateString()]
    ];

    autoTable(docPDF, {
      startY: contentY + 20,
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 8, valign: 'middle' },
      columnStyles: { 0: { fontStyle: 'bold', fillColor: [240, 248, 255] } }
    });
    docPDF.save(`Detalle_Proveedor_${proveedor.idProveedor}.pdf`);
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
          {/* ... (el resto del formulario de edición) ... */}
        </form>
      )}
      <Link className="link-volver" to="/ver-proveedores">← Volver a la lista</Link>
    </div>
  );
}

export default DetalleProveedor;