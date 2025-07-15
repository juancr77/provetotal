import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase.js';
import { collection, doc, getDoc, getDocs, query, where, updateDoc, deleteDoc } from "firebase/firestore";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../auth/AuthContext';
import { recalcularTotalProveedor, recalcularTotalMes } from '../totals.js';
import './css/DetalleVista.css';
import './css/Formulario.css';

function DetalleFactura() {
  const { currentUser } = useAuth();
  const { facturaId } = useParams();
  const navigate = useNavigate();

  const [factura, setFactura] = useState(null);
  const [proveedor, setProveedor] = useState(null); // Estado para guardar datos del proveedor
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  
  const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const offset = d.getTimezoneOffset() * 60000;
    const localDate = new Date(d.getTime() - offset);
    return localDate.toISOString().split('T')[0];
  };

  useEffect(() => {
    const fetchFacturaYProveedor = async () => {
      setCargando(true);
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
          
          // --- Se obtiene la información del proveedor para tener acceso a su límite de gasto ---
          if (data.idProveedor) {
            const q = query(collection(db, "proveedores"), where("idProveedor", "==", data.idProveedor));
            const proveedorSnapshot = await getDocs(q);
            if (!proveedorSnapshot.empty) {
              setProveedor(proveedorSnapshot.docs[0].data());
            } else {
              console.warn(`Proveedor con ID ${data.idProveedor} no encontrado.`);
            }
          }
        } else {
          setError("No se encontró la factura.");
        }
      } catch (err) {
        console.error(err);
        setError("Error al cargar los datos.");
      } finally {
        setCargando(false);
      }
    };
    fetchFacturaYProveedor();
  }, [facturaId]);

  const handleShare = async () => {
    if (!factura) return;
    const shareData = {
      title: `Factura: ${factura.numeroFactura}`,
      text: `Detalles de la factura de ${factura.nombreProveedor}.`,
      url: window.location.href,
    };
    if (navigator.share) {
      await navigator.share(shareData).catch(err => console.error('Error al compartir:', err));
    } else {
      navigator.clipboard.writeText(shareData.url);
      alert('¡Enlace de la factura copiado al portapapeles!');
    }
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const MIN_MONTO = 1;
  const MAX_MONTO = 50000000;

  const ajustarMonto = (ajuste) => {
    const montoActual = parseFloat(formData.monto) || 0;
    let nuevoMonto = montoActual + ajuste;
    nuevoMonto = Math.max(MIN_MONTO, Math.min(nuevoMonto, MAX_MONTO));
    setFormData(prev => ({ ...prev, monto: String(nuevoMonto) }));
  };

  const handleMontoChange = (e) => {
    const valor = e.target.value;
    if (valor === '' || /^\d*\.?\d*$/.test(valor)) {
        setFormData(prev => ({ ...prev, monto: valor }));
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!currentUser || !factura || !proveedor) {
      return alert("Datos no disponibles. Por favor, recargue la página.");
    }
    setError('');

    const newMonto = parseFloat(formData.monto);
    if (isNaN(newMonto)) {
        setError("El monto debe ser un número válido.");
        return;
    }

    const oldMonto = factura.monto;
    const montoDifference = newMonto - oldMonto;

    // Convertir la fecha del formulario a objeto Date (ajustando zona horaria)
    const [year, month, day] = formData.fechaFactura.split('-').map(Number);
    const newFechaFactura = new Date(Date.UTC(year, month - 1, day));
    
    // Validar que no se cambie de mes, ya que complica el recálculo de totales
    if (factura.fechaFactura.toDate().getMonth() !== newFechaFactura.getMonth() ||
        factura.fechaFactura.toDate().getFullYear() !== newFechaFactura.getFullYear()) {
        setError("No se puede cambiar el mes de una factura. Por favor, elimine esta y cree una nueva en el mes correcto.");
        return;
    }

    try {
      // --- INICIO DE LA LÓGICA DE VALIDACIÓN ---

      // 1. OBTENER DATOS Y LÍMITE DEL PROVEEDOR
      const limiteProveedor = proveedor.limiteGasto || 0;
      const totalProveedorDocRef = doc(db, "totalProveedor", factura.idProveedor);
      const totalProveedorSnap = await getDoc(totalProveedorDocRef);
      const totalProveedorActual = totalProveedorSnap.exists() ? totalProveedorSnap.data().totaldeprovedor : 0;
      const nuevoTotalProveedor = totalProveedorActual + montoDifference;

      // 2. OBTENER DATOS Y LÍMITE DEL MES
      const mesIndex = newFechaFactura.getMonth();
      const anio = newFechaFactura.getFullYear();
      const limiteMesDocRef = doc(db, "limiteMes", String(mesIndex));
      const limiteMesSnap = await getDoc(limiteMesDocRef);
      const limiteMes = limiteMesSnap.exists() ? limiteMesSnap.data().monto : 0;
      
      const totalMesDocId = `${anio}-${String(mesIndex).padStart(2, '0')}`;
      const totalMesDocRef = doc(db, "totalMes", totalMesDocId);
      const totalMesSnap = await getDoc(totalMesDocRef);
      const totalMesActual = totalMesSnap.exists() ? totalMesSnap.data().totaldeMes : 0;
      const nuevoTotalMes = totalMesActual + montoDifference;

      // 3. VERIFICACIÓN DE LÍMITES (BLOQUEO)
      if (limiteProveedor > 0 && nuevoTotalProveedor > limiteProveedor) {
        setError(`Límite de gasto para el proveedor "${factura.nombreProveedor}" excedido. No se puede guardar.`);
        return;
      }
      if (limiteMes > 0 && nuevoTotalMes > limiteMes) {
        setError(`Límite de gasto para ${nombresMeses[mesIndex]} excedido. No se puede guardar.`);
        return;
      }
      
      // 4. VERIFICACIÓN DE ADVERTENCIAS (95%)
      const advertencias = [];
      if (limiteProveedor > 0 && nuevoTotalProveedor >= (limiteProveedor * 0.95) && nuevoTotalProveedor <= limiteProveedor) {
        advertencias.push(`- Se está acercando al límite de gasto del proveedor "${factura.nombreProveedor}".`);
      }
      if (limiteMes > 0 && nuevoTotalMes >= (limiteMes * 0.95) && nuevoTotalMes <= limiteMes) {
        advertencias.push(`- Se está acercando al límite de gasto para el mes de ${nombresMeses[mesIndex]}.`);
      }
      
      if (advertencias.length > 0) {
        const continuar = window.confirm("ADVERTENCIA:\n\n" + advertencias.join('\n') + "\n\n¿Desea guardar los cambios de todos modos?");
        if (!continuar) {
          return; // El usuario canceló la actualización
        }
      }
      // --- FIN DE LA LÓGICA DE VALIDACIÓN ---

      // Si todo está bien, se procede a la actualización
      const docRef = doc(db, "facturas", facturaId);
      const dataToUpdate = { ...formData, monto: newMonto, fechaFactura: newFechaFactura };
      
      await updateDoc(docRef, dataToUpdate);
      
      // Se recalcula el total para el proveedor y el mes afectado
      await recalcularTotalProveedor(factura.idProveedor);
      await recalcularTotalMes(newFechaFactura);

      setIsEditing(false); // Vuelve a la vista de solo lectura

    } catch (err) {
      console.error("Error al actualizar: ", err);
      setError("Error al actualizar la factura.");
    }
  };

  const handleDelete = async () => {
    if (!currentUser) return alert("Necesitas autenticarte para eliminar una factura.");
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
    if (!currentUser || !factura) return;
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
    autoTable(docPDF, {
      startY: contentY + 20,
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 8, valign: 'middle' },
      columnStyles: { 0: { fontStyle: 'bold', fillColor: [240, 248, 255] } },
    });
    docPDF.save(`Detalle_Factura_${factura.numeroFactura}.pdf`);
  };

  if (cargando) return <p className="loading-message">Cargando...</p>;
  if (error && !isEditing) return <p className="error-message">{error}</p>;

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
            <button className="btn btn-editar" onClick={() => {setError(''); setIsEditing(true);}}>✏️ Editar</button>
            <button className="btn btn-eliminar" onClick={handleDelete}>🗑️ Eliminar</button>
            <button className="btn btn-secundario" onClick={generarPDF}>📄 Imprimir</button>
            <button className="btn btn-compartir" onClick={handleShare}>🔗 Compartir</button>
          </div>
        </>
      ) : (
        <form className="detalle-form registro-form" onSubmit={handleUpdate}>
          {error && <p className="mensaje mensaje-error">{error}</p>}
          <div className="form-group">
            <label>Proveedor:</label>
            <input type="text" name="nombreProveedor" value={formData.nombreProveedor || ''} disabled />
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
            <label htmlFor="estatus">Estatus:</label>
            <select id="estatus" name="estatus" value={formData.estatus || ''} onChange={handleChange} required>
              <option value="Pendiente">Pendiente</option>
              <option value="Recibida">Recibida</option>
              <option value="Con solventación">Con solventación</option>
              <option value="En contabilidad">En contabilidad</option>
              <option value="Pagada">Pagada</option>
            </select>
          </div>
          <div className="form-group full-width">
            <label htmlFor="descripcion">Descripción:</label>
            <textarea id="descripcion" name="descripcion" value={formData.descripcion || ''} onChange={handleChange} rows="3"></textarea>
          </div>
          <div className="monto-group full-width">
            <label>Monto:</label>
            <div className="monto-controls">
              <button type="button" onClick={() => ajustarMonto(-1000)}>-1000</button>
              <button type="button" onClick={() => ajustarMonto(-100)}>-100</button>
              <div className="monto-input-container">
                <span>$</span>
                <input type="number" name="monto" value={formData.monto || ''} onChange={handleMontoChange} min={MIN_MONTO} max={MAX_MONTO} required />
              </div>
              <button type="button" onClick={() => ajustarMonto(100)}>+100</button>
              <button type="button" onClick={() => ajustarMonto(1000)}>+1000</button>
            </div>
          </div>
          <div className="detalle-acciones full-width">
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