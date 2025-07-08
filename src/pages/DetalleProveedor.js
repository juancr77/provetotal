import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

function DetalleProveedor() {
  const { proveedorId } = useParams();
  const navigate = useNavigate();
  const detalleRef = useRef();

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
          setProveedor(docSnap.data());
          setFormData(docSnap.data());
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
      setProveedor(formData);
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
    const input = detalleRef.current;
    if (!input) return;

    try {
        const response = await fetch('https://i.imgur.com/5mavo8r.png');
        const imageBlob = await response.blob();
        const imageUrl = URL.createObjectURL(imageBlob);

        const canvas = await html2canvas(input, { scale: 3 });
        const imgData = canvas.toDataURL('image/png');

        const pdf = new jsPDF('p', 'pt', 'letter');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        
        const imageWidth = 350;
        const imageHeight = 88;
        const x = (pdfWidth - imageWidth) / 2;
        pdf.addImage(imageUrl, 'PNG', x, 40, imageWidth, imageHeight);

        const contentWidth = pdfWidth - 80;
        const contentHeight = (canvas.height * contentWidth) / canvas.width;
        const contentY = 40 + imageHeight + 30;
        pdf.addImage(imgData, 'PNG', 40, contentY, contentWidth, contentHeight);

        pdf.save(`Detalle_Proveedor_${proveedor?.idProveedor}.pdf`);
        URL.revokeObjectURL(imageUrl);

    } catch (error) {
        console.error("Error al generar PDF: ", error);
        alert("No se pudo generar el PDF.");
    }
  };

  if (cargando) return <p>Cargando...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h2>Detalle del Proveedor</h2>
      
      {!isEditing ? (
        <>
          <div ref={detalleRef} style={{ padding: '20px', background: 'white', width: '600px' }}>
            <h3 style={{ color: '#2A4B7C', textAlign: 'center' }}>Información del Proveedor</h3>
            {proveedor && (
              <div style={{ fontSize: '12pt', color: 'black' }}>
                <p><strong>ID Proveedor:</strong> {proveedor.idProveedor}</p>
                <p><strong>Nombre(s):</strong> {proveedor.nombre}</p>
                <p><strong>Apellido Paterno:</strong> {proveedor.apellidoPaterno}</p>
                <p><strong>Apellido Materno:</strong> {proveedor.apellidoMaterno || 'N/A'}</p>
                <p><strong>Fecha de Registro:</strong> {proveedor.fechaRegistro.toDate().toLocaleDateString()}</p>
              </div>
            )}
          </div>
          <div style={{ marginTop: '20px' }}>
            <button onClick={() => setIsEditing(true)}>✏️ Editar</button>
            <button onClick={handleDelete} style={{ marginLeft: '10px' }}>🗑️ Eliminar</button>
            <button onClick={generarPDF} style={{ marginLeft: '10px' }}>📄 Imprimir Detalles</button>
          </div>
        </>
      ) : (
        <form onSubmit={handleUpdate}>
          <div>
            <label>Nombre(s):</label>
            <input type="text" name="nombre" value={formData.nombre || ''} onChange={handleChange} required />
          </div>
          <div>
            <label>Apellido Paterno:</label>
            <input type="text" name="apellidoPaterno" value={formData.apellidoPaterno || ''} onChange={handleChange} required />
          </div>
          <div>
            <label>Apellido Materno:</label>
            <input type="text" name="apellidoMaterno" value={formData.apellidoMaterno || ''} onChange={handleChange} />
          </div>
          <button type="submit">✅ Guardar Cambios</button>
          <button type="button" onClick={() => setIsEditing(false)} style={{ marginLeft: '10px' }}>❌ Cancelar</button>
        </form>
      )}
      <br />
      <Link to="/ver-proveedores">Volver a la lista</Link>
    </div>
  );
}

export default DetalleProveedor;