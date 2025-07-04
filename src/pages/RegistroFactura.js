import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc } from "firebase/firestore";

// Función para obtener la fecha actual en formato YYYY-MM-DD.
const getTodayDateString = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0'); // Enero es 0
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

function RegistroFactura() {
  const [proveedores, setProveedores] = useState([]);
  
  const [idProveedor, setIdProveedor] = useState('');
  const [nombreProveedor, setNombreProveedor] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [monto, setMonto] = useState('');
  const [estatus, setEstatus] = useState('');
  // Se añade el estado para la fecha de la factura, inicializado con la fecha actual.
  const [fechaFactura, setFechaFactura] = useState(getTodayDateString());

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensajeExito, setMensajeExito] = useState('');

  // ... (el useEffect para cargar proveedores se mantiene igual)
  useEffect(() => {
    const fetchProveedores = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "proveedores"));
        const lista = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const nombreCompleto = `${data.nombre} ${data.apellidoPaterno} ${data.apellidoMaterno || ''}`.trim();
          return { ...data, nombreCompleto };
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
  }, []);

  // ... (la función handleProviderSelection se mantiene igual)
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMensajeExito('');

    // Se añade la validación para la fecha.
    if (!idProveedor || !numeroFactura || !monto || !estatus || !fechaFactura) {
      setError("Todos los campos son obligatorios.");
      return;
    }

    const nuevaFactura = {
      idProveedor,
      nombreProveedor,
      numeroFactura,
      monto: parseFloat(monto),
      estatus,
      // Se guarda la fecha seleccionada como un objeto Date de JavaScript.
      fechaFactura: new Date(fechaFactura),
      fechaRegistro: new Date() // Se mantiene la fecha de registro del sistema.
    };

    try {
      await addDoc(collection(db, "facturas"), nuevaFactura);
      setMensajeExito("Factura registrada con éxito.");

      // Se limpian todos los campos.
      setIdProveedor('');
      setNombreProveedor('');
      setNumeroFactura('');
      setMonto('');
      setEstatus('');
      setFechaFactura(getTodayDateString()); // Se resetea la fecha a la actual.
    } catch (err) {
      console.error("Error al registrar la factura: ", err);
      setError("No se pudo registrar la factura. Inténtalo de nuevo.");
    }
  };

  return (
    <div>
      <h2>Registrar Nueva Factura</h2>
      {/* El formulario ahora incluye el campo de fecha */}
      <form onSubmit={handleSubmit}>
        {/* ... (los select de ID y Nombre de Proveedor se mantienen igual) ... */}
        <div>
          <label>ID del Proveedor:</label>
          <select value={idProveedor} onChange={(e) => handleProviderSelection(e.target.value)} required>
            <option value="">-- Seleccione por ID --</option>
            {cargando ? (<option disabled>Cargando...</option>) : (proveedores.map(p => (<option key={p.idProveedor} value={p.idProveedor}>{p.idProveedor}</option>)))}
          </select>
        </div>
        <div>
          <label>Nombre del Proveedor:</label>
          <select value={idProveedor} onChange={(e) => handleProviderSelection(e.target.value)} required>
            <option value="">-- Seleccione por Nombre --</option>
            {cargando ? (<option disabled>Cargando...</option>) : ([...proveedores].sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto)).map(p => (<option key={p.idProveedor} value={p.idProveedor}>{p.nombreCompleto}</option>)))}
          </select>
        </div>
        <div>
          <label>Número de Factura:</label>
          <input type="text" value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} required />
        </div>
        <div>
          <label>Monto:</label>
          <input type="number" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} required />
        </div>
        {/* Se añade el nuevo campo de fecha */}
        <div>
          <label>Fecha de la Factura:</label>
          <input type="date" value={fechaFactura} onChange={(e) => setFechaFactura(e.target.value)} required />
        </div>
        <div>
          <label>Estatus:</label>
          <select value={estatus} onChange={(e) => setEstatus(e.target.value)} required>
            <option value="">-- Seleccione un estatus --</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Recibida">Recibida</option>
            <option value="Con solventación">Con solventación</option>
            <option value="En contabilidad">En contabilidad</option>
            <option value="Pagada">Pagada</option>
          </select>
        </div>
        <button type="submit">Registrar Factura</button>
      </form>
      
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {mensajeExito && <p style={{ color: 'green' }}>{mensajeExito}</p>}
    </div>
  );
}

export default RegistroFactura;