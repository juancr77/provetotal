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
  const [proveedor, setProveedor] = useState(null);
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
    // Se ejecuta al cambiar de factura o al salir/entrar del modo de edición para recargar los datos originales
  }, [facturaId, isEditing]);

  const handleShare = async () => { /* ...código sin cambios... */ };
  const handleChange = (e) => { /* ...código sin cambios... */ };
  const MIN_MONTO = 1;
  const MAX_MONTO = 50000000;
  const ajustarMonto = (ajuste) => { /* ...código sin cambios... */ };
  const handleMontoChange = (e) => { /* ...código sin cambios... */ };
  const handleDelete = async () => { /* ...código sin cambios... */ };
  const generarPDF = async () => { /* ...código sin cambios... */ };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!currentUser || !factura || !proveedor) {
      return alert("Datos no disponibles para actualizar.");
    }
    setError('');

    const newMonto = parseFloat(formData.monto);
    if (isNaN(newMonto)) {
      setError("El monto debe ser un número válido.");
      return;
    }

    const oldMonto = factura.monto;
    const montoDifference = newMonto - oldMonto;

    // --- LÓGICA DE FECHA CONSISTENTE (UTC) ---
    const oldFecha = factura.fechaFactura.toDate();
    const [year, month, day] = formData.fechaFactura.split('-').map(Number);
    const newFechaFactura = new Date(Date.UTC(year, month - 1, day));
    
    const mesCambio = oldFecha.getUTCMonth() !== newFechaFactura.getUTCMonth() || oldFecha.getUTCFullYear() !== newFechaFactura.getUTCFullYear();

    try {
      // --- INICIO DE LA LÓGICA DE VALIDACIÓN ---
      
      // 1. VALIDACIÓN DEL LÍMITE DEL PROVEEDOR
      const limiteProveedor = proveedor.limiteGasto || 0;
      if (limiteProveedor > 0) {
        const totalProveedorDoc = await getDoc(doc(db, "totalProveedor", factura.idProveedor));
        const totalProveedorActual = totalProveedorDoc.exists() ? totalProveedorDoc.data().totaldeprovedor : 0;
        const nuevoTotalProveedor = totalProveedorActual + montoDifference; // Se usa la diferencia del monto

        if (nuevoTotalProveedor > limiteProveedor) {
          setError(`Límite de gasto para "${factura.nombreProveedor}" excedido. No se puede guardar.`);
          return;
        }
        if (nuevoTotalProveedor >= (limiteProveedor * 0.95)) {
          if (!window.confirm(`ADVERTENCIA: Con esta modificación, el gasto para "${factura.nombreProveedor}" superará el 95% de su límite.\n\n¿Desea continuar?`)) {
            return;
          }
        }
      }

      // 2. VALIDACIÓN DEL LÍMITE DEL MES
      const mesIndex = newFechaFactura.getUTCMonth();
      const anio = newFechaFactura.getUTCFullYear();
      const limiteMesDocRef = doc(db, "limiteMes", String(mesIndex));
      const limiteMesSnap = await getDoc(limiteMesDocRef);
      const limiteMes = limiteMesSnap.exists() ? limiteMesSnap.data().monto : 0;
      
      if (limiteMes > 0) {
        const totalMesDocId = `${anio}-${String(mesIndex).padStart(2, '0')}`;
        const totalMesDocRef = doc(db, "totalMes", totalMesDocId);
        const totalMesSnap = await getDoc(totalMesDocRef);
        let totalMesActual = totalMesSnap.exists() ? totalMesSnap.data().totaldeMes : 0;
        
        let nuevoTotalMes;
        if(mesCambio){
          // Si el mes cambió, el cálculo es el total del nuevo mes más el nuevo monto de la factura
          nuevoTotalMes = totalMesActual + newMonto;
        } else {
          // Si el mes no cambió, solo se aplica la diferencia al total existente
          nuevoTotalMes = totalMesActual + montoDifference;
        }

        if (nuevoTotalMes > limiteMes) {
          setError(`Límite de gasto para ${nombresMeses[mesIndex]} excedido. No se puede guardar.`);
          return;
        }
        if (nuevoTotalMes >= (limiteMes * 0.95)) {
          if (!window.confirm(`ADVERTENCIA: Con esta modificación, el gasto para ${nombresMeses[mesIndex]} superará el 95% de su límite.\n\n¿Desea continuar?`)) {
            return;
          }
        }
      }

      // 3. SI TODAS LAS VALIDACIONES PASAN, ACTUALIZAR
      const docRef = doc(db, "facturas", facturaId);
      const dataToUpdate = { ...formData, monto: newMonto, fechaFactura: newFechaFactura };
      await updateDoc(docRef, dataToUpdate);
      
      // Se recalcula el total del proveedor
      await recalcularTotalProveedor(factura.idProveedor);
      
      // Se recalcula el total del mes nuevo
      await recalcularTotalMes(newFechaFactura);

      // Si la fecha cambió de mes, también se recalcula el mes original
      if (mesCambio) {
        await recalcularTotalMes(oldFecha);
      }
      
      setIsEditing(false);
      alert("Factura actualizada correctamente.");

    } catch (err) {
      console.error("Error al actualizar: ", err);
      setError("Error al actualizar la factura. Por favor, intente de nuevo.");
    }
  };

  // ... (el resto del componente, incluyendo el JSX, se mantiene igual)
  // ...
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