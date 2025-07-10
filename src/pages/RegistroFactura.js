import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc } from "firebase/firestore";
import { useAuth } from '../auth/AuthContext'; // Se importa el hook de autenticación
import './css/Formulario.css';

const getTodayDateString = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

function RegistroFactura() {
  const { currentUser } = useAuth(); // Se obtiene el estado del usuario
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

  useEffect(() => {
    const fetchProveedores = async () => {
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
  }, []);

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
    if (valor === '') {
      setMonto('');
      return;
    }
    const numero = parseFloat(valor);
    if (!isNaN(numero)) {
      if (numero > MAX_MONTO) {
        setMonto(MAX_MONTO.toString());
      } else {
        setMonto(valor);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Se añade la verificación de autenticación
    if (!currentUser) {
      return alert("Necesitas autenticarte para registrar una factura.");
    }
    
    setError(null);
    setMensajeExito('');

    if (!idProveedor || !numeroFactura || !monto || !estatus || !fechaFactura) {
      setError("Todos los campos, excepto descripción, son obligatorios.");
      return;
    }

    const nuevaFactura = {
      idProveedor,
      nombreProveedor,
      numeroFactura,
      descripcion: descripcion.trim(),
      monto: parseFloat(monto),
      estatus,
      fechaFactura: new Date(fechaFactura),
      fechaRegistro: new Date()
    };

    try {
      await addDoc(collection(db, "facturas"), nuevaFactura);
      setMensajeExito("Factura registrada con éxito.");
      setIdProveedor('');
      setNombreProveedor('');
      setNumeroFactura('');
      setDescripcion('');
      setMonto('');
      setEstatus('');
      setFechaFactura(getTodayDateString());
    } catch (err) {
      console.error("Error al registrar la factura: ", err);
      setError("No se pudo registrar la factura. Inténtalo de nuevo.");
    }
  };

  return (
    <div className="registro-factura-container">
      <h2>Registrar Nueva Factura</h2>
      <form onSubmit={handleSubmit} className="registro-form">
        <div className="form-group">
          <label htmlFor="idProveedor">ID del Proveedor:</label>
          <select
            id="idProveedor"
            value={idProveedor}
            onChange={(e) => handleProviderSelection(e.target.value)}
            required
          >
            <option value="">-- Seleccione por ID --</option>
            {cargando ? (
              <option disabled>Cargando...</option>
            ) : (
              proveedores.map(p => (
                <option key={p.idProveedor} value={p.idProveedor}>
                  {p.idProveedor}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="nombreProveedor">Nombre del Proveedor:</label>
          <select
            id="nombreProveedor"
            value={idProveedor}
            onChange={(e) => handleProviderSelection(e.target.value)}
            required
          >
            <option value="">-- Seleccione por Nombre --</option>
            {cargando ? (
              <option disabled>Cargando...</option>
            ) : (
              [...proveedores]
                .sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto))
                .map(p => (
                  <option key={p.idProveedor} value={p.idProveedor}>
                    {p.nombreCompleto}
                  </option>
                ))
            )}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="numeroFactura">Número de Factura:</label>
          <input
            id="numeroFactura"
            type="text"
            value={numeroFactura}
            onChange={(e) => setNumeroFactura(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="fechaFactura">Fecha de la Factura:</label>
          <input
            id="fechaFactura"
            type="date"
            value={fechaFactura}
            onChange={(e) => setFechaFactura(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="estatus">Estatus:</label>
          <select
            id="estatus"
            value={estatus}
            onChange={(e) => setEstatus(e.target.value)}
            required
          >
            <option value="">-- Seleccione un estatus --</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Recibida">Recibida</option>
            <option value="Con solventación">Con solventación</option>
            <option value="En contabilidad">En contabilidad</option>
            <option value="Pagada">Pagada</option>
          </select>
        </div>

        <div className="monto-group">
          <label htmlFor="monto">Monto:</label>
          <div className="monto-controls">
            <button type="button" onClick={() => ajustarMonto(-1000)}>-1000</button>
            <button type="button" onClick={() => ajustarMonto(-100)}>-100</button>
            <div className="monto-input-container">
              <span>$</span>
              <input
                id="monto"
                type="number"
                value={monto}
                onChange={handleMontoChange}
                min={MIN_MONTO}
                max={MAX_MONTO}
                step="0.01"
                required
              />
            </div>
            <button type="button" onClick={() => ajustarMonto(100)}>+100</button>
            <button type="button" onClick={() => ajustarMonto(1000)}>+1000</button>
          </div>
        </div>

        <div className="form-group full-width">
          <label htmlFor="descripcion">Descripción (Opcional):</label>
          <textarea
            id="descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows="3"
          />
        </div>

        <div className="submit-button-container">
          <button type="submit" className="submit-button">
            Registrar Factura
          </button>
        </div>

        {error && <p className="mensaje mensaje-error">{error}</p>}
        {mensajeExito && <p className="mensaje mensaje-exito">{mensajeExito}</p>}
      </form>
    </div>
  );
}

export default RegistroFactura;