import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase.js';
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../auth/AuthContext';
import { recalcularTotalProveedor, recalcularTotalMes } from '../totals.js';
import './css/DetalleVista.css';

function DetalleFactura() {
  const { currentUser } = useAuth();
  const { facturaId } = useParams();
  const navigate = useNavigate();

  const [factura, setFactura] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (`0${d.getMonth() + 1}`).slice(-2);
    const day = (`0${d.getDate()}`).slice(-2);
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const fetchFactura = async () => {
      try {
        const docRef = doc(db, "facturas", facturaId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFactura({ ...data, id: docSnap.id });
          setFormData({
            ...data,
            fechaFactura: formatDateForInput(data.fechaFactura.toDate()),
            monto: String(data.monto)
          });
        } else {
          setError("No se encontró la factura.");
        }
      } catch (err) {
        setError("Error al cargar los datos.");
      } finally {
        setCargando(false);
      }
    };
    fetchFactura();
  }, [facturaId]);

  // --- INICIO: NUEVA FUNCIÓN PARA COMPARTIR ---
  const handleShare = async () => {
    const shareData = {
      title: `Factura: ${factura.numeroFactura}`,
      text: `Detalles de la factura de ${factura.nombreProveedor}`,
      url: window.location.href // URL de la página actual
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        console.log('Factura compartida con éxito.');
      } catch (err) {
        console.error('Error al compartir:', err);
      }
    } else {
      // Fallback para navegadores que no soportan la API de compartir (ej. escritorio)
      navigator.clipboard.writeText(shareData.url);
      alert('Enlace copiado al portapapeles.');
    }
  };
  // --- FIN: NUEVA FUNCIÓN PARA COMPARTIR ---


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const MIN_MONTO = 1;
  const MAX_MONTO = 5000000;

  const ajustarMonto = (ajuste) => {
    const montoActual = parseFloat(formData.monto) || 0;
    let nuevoMonto = montoActual + ajuste;
    nuevoMonto = Math.max(MIN_MONTO, Math.min(nuevoMonto, MAX_MONTO));
    setFormData(prev => ({ ...prev, monto: String(nuevoMonto) }));
  };

  const handleMontoChange = (e) => {
    const valor = e.target.value;
    if (valor === '') {
        setFormData(prev => ({ ...prev, monto: '' }));
        return;
    }
    const numero = parseFloat(valor);
    if (numero > MAX_MONTO) {
        setFormData(prev => ({ ...prev, monto: String(MAX_MONTO) }));
    } else {
        setFormData(prev => ({ ...prev, monto: valor }));
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      return alert("Necesitas autenticarte para actualizar una factura.");
    }
    
    const oldProveedorId = factura.idProveedor;
    const oldFecha = factura.fechaFactura.toDate();
    
    try {
      const docRef = doc(db, "facturas", facturaId);
      
      const [year, month, day] = formData.fechaFactura.split('-').map(Number);
      const newFechaFactura = new Date(year, month - 1, day);
      
      const dataToUpdate = { 
        ...formData, 
        monto: parseFloat(formData.monto), 
        fechaFactura: newFechaFactura
      };
      
      await updateDoc(docRef, dataToUpdate);

      await recalcularTotalProveedor(dataToUpdate.idProveedor);
      if (oldProveedorId !== dataToUpdate.idProveedor) {
          await recalcularTotalProveedor(oldProveedorId);
      }
      
      await recalcularTotalMes(dataToUpdate.fechaFactura);
      const newFecha = dataToUpdate.fechaFactura;
      if (oldFecha.getMonth() !== newFecha.getMonth() || oldFecha.getFullYear() !== newFecha.getFullYear()) {
          await recalcularTotalMes(oldFecha);
      }
      
      const updatedFactura = { 
        ...dataToUpdate, 
        fechaFactura: { toDate: () => dataToUpdate.fechaFactura } 
      };
      setFactura(updatedFactura);
      setIsEditing(false);

    } catch (err) {
      console.error("Error al actualizar: ", err);
      setError("Error al actualizar la factura.");
    }
  };

  const handleDelete = async () => {
    if (!currentUser) {
      return alert("Necesitas autenticarte para eliminar una factura.");
    }
    if (window.confirm("¿Estás seguro de que quieres eliminar esta factura?")) {
      try {
        const proveedorIdParaActualizar = factura.idProveedor;
        const fechaParaActualizar = factura.fechaFactura.toDate();

        await deleteDoc(doc(db, "facturas", facturaId));
        
        await recalcularTotalProveedor(proveedorIdParaActualizar);
        await recalcularTotalMes(fechaParaActualizar);

        navigate('/ver-facturas');
      } catch (err) {
        setError("No se pudo eliminar la factura.");
      }
    }
  };

  const generarPDF = async () => {
    if (!currentUser || !factura) {
        return alert("No se puede generar el PDF.");
    }
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
    docPDF.text("Detalles de la Factura", pdfWidth / 2, contentY, { align: 'center' });
  
    const fecha = factura.fechaFactura.toDate ? factura.fechaFactura.toDate() : new Date(factura.fechaFactura);

    const tableData = [
      ['Proveedor', factura.nombreProveedor],
      ['Número de Factura', factura.numeroFactura],
      ['Fecha', fecha.toLocaleDateString()],
      ['Descripción', factura.descripcion || 'N/A'],
      ['Monto', factura.monto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })],
      ['Estatus', factura.estatus]
    ];
    
    const statusColors = {
      'Pendiente': [255, 199, 206], 'Recibida': [255, 242, 204], 'Con solventación': [252, 221, 173],
      'En contabilidad': [221, 235, 247], 'Pagada': [198, 239, 206]
    };
  
    autoTable(docPDF, {
      startY: contentY + 20,
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 8, valign: 'middle' },
      columnStyles: { 0: { fontStyle: 'bold', fillColor: [240, 248, 255] } },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 1 && data.row.index === 5) {
          const status = String(data.cell.raw);
          const color = statusColors[status];
          if (color) {
            docPDF.setFillColor(...color);
            docPDF.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
            docPDF.setTextColor(50, 50, 50);
            docPDF.text(status, data.cell.x + data.cell.padding('left'), data.cell.y + data.cell.height / 2, { baseline: 'middle' });
          }
        }
      }
    });
    docPDF.save(`Detalle_Factura_${factura.numeroFactura}.pdf`);
  };

  if (cargando) return <p className="loading-message">Cargando...</p>;
  if (error) return <p className="error-message">{error}</p>;

  return (
    <div className="detalle-container">
      <h2>Detalle de Factura</h2>
      {!isEditing ? (
        <>
          <div className="info-card">
            {factura && (
              <dl className="info-grid">
                <dt>Proveedor:</dt>
                <dd>{factura.nombreProveedor}</dd>
                <dt>Número de Factura:</dt>
                <dd>{factura.numeroFactura}</dd>
                <dt>Fecha:</dt>
                <dd>{factura.fechaFactura.toDate ? factura.fechaFactura.toDate().toLocaleDateString() : new Date(factura.fechaFactura).toLocaleDateString()}</dd>
                <dt>Descripción:</dt>
                <dd>{factura.descripcion || 'N/A'}</dd>
                <dt>Monto:</dt>
                <dd>{typeof factura.monto === 'number' ? factura.monto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }) : ''}</dd>
                <dt>Estatus:</dt>
                <dd>
                  <span className="status-badge" data-status={factura.estatus}>
                    {factura.estatus}
                  </span>
                </dd>
              </dl>
            )}
          </div>
          <div className="detalle-acciones">
            <button className="btn btn-editar" onClick={() => setIsEditing(true)}>✏️ Editar</button>
            <button className="btn btn-eliminar" onClick={handleDelete}>🗑️ Eliminar</button>
            <button className="btn btn-secundario" onClick={generarPDF}>📄 Imprimir</button>
            {/* --- INICIO: NUEVO BOTÓN DE COMPARTIR --- */}
            <button className="btn btn-compartir" onClick={handleShare}>🔗 Compartir</button>
            {/* --- FIN: NUEVO BOTÓN DE COMPARTIR --- */}
          </div>
        </>
      ) : (
        <form className="detalle-form" onSubmit={handleUpdate}>
          {/* El formulario de edición no necesita el botón de compartir, así que no se añade aquí */}
          <div className="form-group">
            <label>Proveedor:</label>
            <input type="text" value={formData.nombreProveedor || ''} disabled readOnly />
          </div>
          <div className="form-group">
            <label htmlFor="numeroFactura">Número de Factura:</label>
            <input id="numeroFactura" type="text" name="numeroFactura" value={formData.numeroFactura || ''} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="fechaFactura">Fecha:</label>
            <input id="fechaFactura" type="date" name="fechaFactura" value={formData.fechaFactura || ''} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="descripcion">Descripción:</label>
            <textarea id="descripcion" name="descripcion" value={formData.descripcion || ''} onChange={handleChange} rows="3"></textarea>
          </div>
          <div className="form-group">
            <label>Monto:</label>
            <div className="monto-controls">
              <button type="button" onClick={() => ajustarMonto(-1000)}>-1000</button>
              <button type="button" onClick={() => ajustarMonto(-100)}>-100</button>
              <div className="monto-input-container">
                <span>$</span>
                <input type="number" name="monto" value={formData.monto} onChange={handleMontoChange} min={MIN_MONTO} max={MAX_MONTO} required />
              </div>
              <button type="button" onClick={() => ajustarMonto(100)}>+100</button>
              <button type="button" onClick={() => ajustarMonto(1000)}>+1000</button>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="estatus">Estatus:</label>
            <select id="estatus" name="estatus" value={formData.estatus} onChange={handleChange} required>
              <option value="Pendiente">Pendiente</option>
              <option value="Recibida">Recibida</option>
              <option value="Con solventación">Con solventación</option>
              <option value="En contabilidad">En contabilidad</option>
              <option value="Pagada">Pagada</option>
            </select>
          </div>
          <div className="detalle-acciones">
            <button className="btn btn-editar" type="submit">✅ Guardar Cambios</button>
            <button className="btn btn-secundario" type="button" onClick={() => setIsEditing(false)}>❌ Cancelar</button>
          </div>
        </form>
      )}
      <Link className="link-volver" to="/ver-facturas">← Volver a la lista</Link>
    </div>
  );
}

export default DetalleFactura;