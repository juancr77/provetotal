import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { collection, getDocs, addDoc, doc, getDoc } from "firebase/firestore";
import { useAuth } from '../auth/AuthContext';
import { recalcularTotalProveedor, recalcularTotalMes } from '../totals.js';
import './css/Formulario.css';

const getTodayDateString = () => {
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60000;
  const localDate = new Date(today.getTime() - offset);
  return localDate.toISOString().split('T')[0];
};

function RegistroFactura() {
  const { currentUser } = useAuth();
  const [proveedores, setProveedores] = useState([]);
  const [idProveedor, setIdProveedor] = useState('');
  const [nombreProveedor, setNombreProveedor] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [estatus, setEstatus] = useState('');
  const [fechaFactura, setFechaFactura] = useState(getTodayDateString());
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensajeExito, setMensajeExito] = useState('');

  const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  useEffect(() => {
    const fetchProveedores = async () => {
      if (!currentUser) { setCargando(false); return; }
      try {
        const querySnapshot = await getDocs(collection(db, "proveedores"));
        const lista = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const nombreCompleto = `${data.nombre} ${data.apellidoPaterno} ${data.apellidoMaterno || ''}`.trim();
          return { ...data, nombreCompleto, id: doc.id };
        });
        setProveedores(lista);
      } catch (err) {
        console.error("Error al obtener proveedores: ", err);
        setError("No se pudieron cargar los proveedores.");
      } finally {
        setCargando(false);
      }
    };
    fetchProveedores();
  }, [currentUser]);

  const handleProviderSelection = (selectedId) => {
    setIdProveedor(selectedId);
    if (selectedId) {
      const proveedorSeleccionado = proveedores.find(p => p.idProveedor === selectedId);
      if (proveedorSeleccionado) {
        setNombreProveedor(proveedorSeleccionado.nombreCompleto);
      }
    } else {
      setNombreProveedor('');
    }
  };

  const MIN_MONTO = 1;
  const MAX_MONTO = 5000000;

  const ajustarMonto = (ajuste) => {
    const montoActual = parseFloat(monto) || 0;
    let nuevoMonto = montoActual + ajuste;
    nuevoMonto = Math.max(MIN_MONTO, Math.min(nuevoMonto, MAX_MONTO));
    setMonto(nuevoMonto.toString());
  };

  const handleMontoChange = (e) => {
    const valor = e.target.value;
    if (valor === '' || /^\d*\.?\d*$/.test(valor)) {
        setMonto(valor);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return alert("Necesitas autenticarte para registrar una factura.");
    
    setError(null);
    setMensajeExito('');

    if (!idProveedor || !numeroFactura || !monto || !estatus || !fechaFactura) {
      setError("Todos los campos, excepto descripción, son obligatorios.");
      return;
    }
    
    const montoNumerico = parseFloat(monto);
    
    // --- LÓGICA DE FECHA CONSISTENTE (UTC) ---
    const [year, month, day] = fechaFactura.split('-').map(Number);
    const fechaFacturaDate = new Date(Date.UTC(year, month - 1, day));

    try {
      // --- INICIO DE LA LÓGICA DE VALIDACIÓN ---
      const proveedorSeleccionado = proveedores.find(p => p.idProveedor === idProveedor);
      const limiteProveedor = proveedorSeleccionado?.limiteGasto || 0;
      
      const totalProveedorDocRef = doc(db, "totalProveedor", idProveedor);
      const totalProveedorSnap = await getDoc(totalProveedorDocRef);
      const totalProveedorActual = totalProveedorSnap.exists() ? totalProveedorSnap.data().totaldeprovedor : 0;
      const nuevoTotalProveedor = totalProveedorActual + montoNumerico;

      const mesIndex = fechaFacturaDate.getUTCMonth();
      const anio = fechaFacturaDate.getUTCFullYear();
      
      const limiteMesDocRef = doc(db, "limiteMes", String(mesIndex));
      const limiteMesSnap = await getDoc(limiteMesDocRef);
      const limiteMes = limiteMesSnap.exists() ? limiteMesSnap.data().monto : 0;
      
      const totalMesDocId = `${anio}-${String(mesIndex).padStart(2, '0')}`;
      const totalMesDocRef = doc(db, "totalMes", totalMesDocId);
      const totalMesSnap = await getDoc(totalMesDocRef);
      const totalMesActual = totalMesSnap.exists() ? totalMesSnap.data().totaldeMes : 0;
      const nuevoTotalMes = totalMesActual + montoNumerico;

      if (limiteProveedor > 0 && nuevoTotalProveedor > limiteProveedor) {
        setError(`Límite de gasto para el proveedor "${nombreProveedor}" excedido. Límite: ${limiteProveedor.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}. Gasto actual: ${totalProveedorActual.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}.`);
        return;
      }
      
      if (limiteMes > 0 && nuevoTotalMes > limiteMes) {
        setError(`Límite de gasto para ${nombresMeses[mesIndex]} excedido. Límite: ${limiteMes.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}. Gasto actual: ${totalMesActual.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}.`);
        return;
      }

      const advertencias = [];
      if (limiteProveedor > 0 && nuevoTotalProveedor >= (limiteProveedor * 0.95) && nuevoTotalProveedor <= limiteProveedor) {
        advertencias.push(`- Se está acercando al límite de gasto del proveedor "${nombreProveedor}".`);
      }
      if (limiteMes > 0 && nuevoTotalMes >= (limiteMes * 0.95) && nuevoTotalMes <= limiteMes) {
        advertencias.push(`- Se está acercando al límite de gasto para el mes de ${nombresMeses[mesIndex]}.`);
      }
      
      if (advertencias.length > 0) {
        const continuar = window.confirm("ADVERTENCIA:\n\n" + advertencias.join('\n') + "\n\n¿Desea continuar de todos modos?");
        if (!continuar) return;
      }
      // --- FIN DE LA LÓGICA DE VALIDACIÓN ---

      const nuevaFactura = {
        idProveedor, nombreProveedor, numeroFactura,
        descripcion: descripcion.trim(),
        monto: montoNumerico, estatus,
        fechaFactura: fechaFacturaDate,
        fechaRegistro: new Date()
      };

      await addDoc(collection(db, "facturas"), nuevaFactura);
      
      await recalcularTotalProveedor(nuevaFactura.idProveedor);
      await recalcularTotalMes(nuevaFactura.fechaFactura);
      
      setMensajeExito("Factura registrada con éxito.");
      setIdProveedor(''); setNombreProveedor(''); setNumeroFactura('');
      setDescripcion(''); setMonto(''); setEstatus('');
      setFechaFactura(getTodayDateString());

    } catch (err) {
      console.error("Error al registrar la factura: ", err);
      setError("No se pudo registrar la factura. Inténtalo de nuevo.");
    }
  };

  // El JSX no cambia, se deja como estaba.
  return (
    <div className="registro-factura-container">
      <h2>Registrar Nueva Factura</h2>
      <form onSubmit={handleSubmit} className="registro-form">
        {/* ... todos los form-group y botones ... */}
        <div className="form-group">
          <label htmlFor="idProveedor">ID del Proveedor:</label>
          <select id="idProveedor" value={idProveedor} onChange={(e) => handleProviderSelection(e.target.value)} required>
            <option value="">-- Seleccione por ID --</option>
            {proveedores.map(p => (<option key={p.id} value={p.idProveedor}>{p.idProveedor}</option>))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="nombreProveedor">Nombre del Proveedor:</label>
          <select id="nombreProveedor" value={idProveedor} onChange={(e) => handleProviderSelection(e.target.value)} required>
            <option value="">-- Seleccione por Nombre --</option>
            {[...proveedores].sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto)).map(p => (<option key={p.id} value={p.idProveedor}>{p.nombreCompleto}</option>))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="numeroFactura">Número de Factura:</label>
          <input id="numeroFactura" type="text" value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="fechaFactura">Fecha de la Factura:</label>
          <input id="fechaFactura" type="date" value={fechaFactura} onChange={(e) => setFechaFactura(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="estatus">Estatus:</label>
          <select id="estatus" value={estatus} onChange={(e) => setEstatus(e.target.value)} required>
            <option value="">-- Seleccione un estatus --</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Recibida">Recibida</option>
            <option value="Con solventación">Con solventación</option>
            <option value="En contabilidad">En contabilidad</option>
            <option value="Pagada">Pagada</option>
          </select>
        </div>
        <div className="monto-group full-width">
          <label htmlFor="monto">Monto:</label>
          <div className="monto-controls">
            <button type="button" onClick={() => ajustarMonto(-1000)}>-1000</button>
            <button type="button" onClick={() => ajustarMonto(-100)}>-100</button>
            <div className="monto-input-container">
              <span>$</span>
              <input id="monto" type="number" value={monto} onChange={handleMontoChange} min={MIN_MONTO} max={MAX_MONTO} step="0.01" required />
            </div>
            <button type="button" onClick={() => ajustarMonto(100)}>+100</button>
            <button type="button" onClick={() => ajustarMonto(1000)}>+1000</button>
          </div>
        </div>
        <div className="form-group full-width">
          <label htmlFor="descripcion">Descripción (Opcional):</label>
          <textarea id="descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows="3" />
        </div>
        <div className="submit-button-container">
          <button type="submit" className="submit-button">Registrar Factura</button>
        </div>
        {error && <p className="mensaje mensaje-error">{error}</p>}
        {mensajeExito && <p className="mensaje mensaje-exito">{mensajeExito}</p>}
      </form>
    </div>
  );
}

export default RegistroFactura;