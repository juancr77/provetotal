import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../auth/AuthContext';
import './css/DetalleVista.css';
import './css/Formulario.css'; // Importamos el CSS del formulario para el modo de edición

function DetalleProveedor() {
  const { currentUser } = useAuth();
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
          // --- MODIFICACIÓN: Aseguramos que el estado del formulario incluya el límite ---
          setFormData({ ...data, limiteGasto: String(data.limiteGasto || '0') });
        } else {
          setError("No se encontró el proveedor.");
        }
      } catch (err) {
        setError("Error al cargar los datos del proveedor.");
        console.error(err);
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

  // --- INICIO: FUNCIONES PARA EL CAMPO DE MONTO ---
  const MIN_LIMITE = 0;
  const ajustarMonto = (ajuste) => {
    const montoActual = parseFloat(formData.limiteGasto) || 0;
    let nuevoMonto = montoActual + ajuste;
    nuevoMonto = Math.max(MIN_LIMITE, nuevoMonto);
    setFormData(prev => ({ ...prev, limiteGasto: String(nuevoMonto) }));
  };

  const handleMontoChange = (e) => {
    const valor = e.target.value;
    if (valor === '' || (!isNaN(parseFloat(valor)) && parseFloat(valor) >= MIN_LIMITE)) {
        setFormData(prev => ({ ...prev, limiteGasto: valor }));
    }
  };
  // --- FIN: FUNCIONES PARA EL CAMPO DE MONTO ---

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!currentUser) return alert("Necesitas autenticarte para actualizar.");
    
    try {
      const docRef = doc(db, "proveedores", proveedorId);
      // --- MODIFICACIÓN: Se asegura que el límite se guarde como número ---
      const dataToUpdate = { 
        ...formData, 
        limiteGasto: parseFloat(formData.limiteGasto) || 0
      };
      await updateDoc(docRef, dataToUpdate);
      setProveedor(dataToUpdate);
      setIsEditing(false);
    } catch (err) {
      setError("Error al actualizar los datos del proveedor.");
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!currentUser) return alert("Necesitas autenticarte para eliminar.");
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
    if (!currentUser) return alert("Necesitas autenticarte para imprimir detalles.");
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
    
    // --- MODIFICACIÓN: Se añade 'Límite de Gasto' a los datos del PDF ---
    const tableData = [
      ['ID Proveedor', proveedor.idProveedor],
      ['Nombre(s)', proveedor.nombre],
      ['Apellido Paterno', proveedor.apellidoPaterno],
      ['Apellido Materno', proveedor.apellidoMaterno || 'N/A'],
      ['Límite de Gasto', (proveedor.limiteGasto || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })],
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
                {/* --- MODIFICACIÓN: Se muestra el Límite de Gasto en la vista --- */}
                <dt>Límite de Gasto:</dt>
                <dd>{(proveedor.limiteGasto || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</dd>
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
        <form className="detalle-form registro-form" onSubmit={handleUpdate}>
          {/* Los campos existentes se mantienen */}
          <div className="form-group">
            <label htmlFor="idProveedor">ID Proveedor:</label>
            <input id="idProveedor" type="text" value={formData.idProveedor || ''} disabled readOnly />
          </div>
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

          {/* --- MODIFICACIÓN: Se añade el campo para editar el Límite de Gasto --- */}
          <div className="monto-group full-width">
            <label htmlFor="limiteGasto">Límite de Gasto:</label>
            <div className="monto-controls">
              <button type="button" onClick={() => ajustarMonto(-1000)}>-1000</button>
              <button type="button" onClick={() => ajustarMonto(-100)}>-100</button>
              <div className="monto-input-container">
                <span>$</span>
                <input 
                  type="number"
                  id="limiteGasto"
                  name="limiteGasto"
                  value={formData.limiteGasto || ''}
                  onChange={handleMontoChange}
                  min={MIN_LIMITE}
                  step="0.01"
                />
              </div>
              <button type="button" onClick={() => ajustarMonto(100)}>+100</button>
              <button type="button" onClick={() => ajustarMonto(1000)}>+1000</button>
            </div>
          </div>
          {/* --- FIN DE LA MODIFICACIÓN --- */}

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