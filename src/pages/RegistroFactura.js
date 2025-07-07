import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc } from "firebase/firestore";

// Función para obtener la fecha actual en formato yyyy-MM-dd.
const getTodayDateString = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0'); // Enero es 0
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

function RegistroFactura() {
  // Estados para la lista de proveedores
  const [proveedores, setProveedores] = useState([]);
  
  // Estados para los campos del formulario
  const [idProveedor, setIdProveedor] = useState('');
  const [nombreProveedor, setNombreProveedor] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [estatus, setEstatus] = useState('');
  const [fechaFactura, setFechaFactura] = useState(getTodayDateString());

  // Estados para la retroalimentación al usuario
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensajeExito, setMensajeExito] = useState('');

  // Se obtienen los proveedores cuando el componente se monta.
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

  // Función para sincronizar la selección de ID y Nombre del proveedor.
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

  // Constantes y funciones para el campo de Monto
  const MIN_MONTO = 1;
  const MAX_MONTO = 5000000;

  const ajustarMonto = (ajuste) => {
    const montoActual = parseFloat(monto) || 0;
    let nuevoMonto = montoActual + ajuste;
    nuevoMonto = Math.max(MIN_MONTO, Math.min(nuevoMonto, MAX_MONTO));
    setMonto(String(nuevoMonto));
  };

  const handleMontoChange = (e) => {
    const valor = e.target.value;
    if (valor === '') {
        setMonto('');
        return;
    }
    const numero = parseFloat(valor);
    if (numero > MAX_MONTO) {
        setMonto(String(MAX_MONTO));
    } else {
        setMonto(valor);
    }
  };

  // Función para manejar el envío del formulario.
  const handleSubmit = async (e) => {
    e.preventDefault();
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

      // Se limpian todos los campos del formulario.
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
    <div>
      <h2>Registrar Nueva Factura</h2>
      <form onSubmit={handleSubmit}>
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
          <label>Descripción (Opcional):</label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows="3"
            style={{width: '95%'}}
          ></textarea>
        </div>
        <div>
          <label>Monto:</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <button type="button" onClick={() => ajustarMonto(-1000)}>-1000</button>
            <button type="button" onClick={() => ajustarMonto(-100)}>-100</button>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#333',
                pointerEvents: 'none'
              }}>
                $
              </span>
              <input
                type="number"
                value={monto}
                onChange={handleMontoChange}
                min={MIN_MONTO}
                max={MAX_MONTO}
                required
                style={{ textAlign: 'center', paddingLeft: '20px' }}
              />
            </div>
            <button type="button" onClick={() => ajustarMonto(100)}>+100</button>
            <button type="button" onClick={() => ajustarMonto(1000)}>+1000</button>
          </div>
        </div>
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
        <button type="submit" style={{ marginTop: '20px' }}>Registrar Factura</button>
      </form>
      
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      {mensajeExito && <p style={{ color: 'green', marginTop: '10px' }}>{mensajeExito}</p>}
    </div>
  );
}

export default RegistroFactura;