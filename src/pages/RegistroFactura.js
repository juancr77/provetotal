import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc } from "firebase/firestore";

function RegistroFactura() {
  // Se define el estado para la lista de proveedores que se obtendrá de Firestore.
  const [proveedores, setProveedores] = useState([]);
  
  // Se definen los estados para cada campo del formulario.
  const [idProveedor, setIdProveedor] = useState('');
  const [nombreProveedor, setNombreProveedor] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [monto, setMonto] = useState('');
  const [estatus, setEstatus] = useState('');

  // Estados para la retroalimentación al usuario.
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensajeExito, setMensajeExito] = useState('');

  // Se obtienen los proveedores cuando el componente se monta.
  useEffect(() => {
    const fetchProveedores = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "proveedores"));
        const lista = querySnapshot.docs.map(doc => doc.data());
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

  // Esta función se activa cuando se selecciona un proveedor del menú desplegable.
  const handleProviderChange = (e) => {
    const selectedId = e.target.value;
    setIdProveedor(selectedId);

    if (selectedId) {
      // Se busca el proveedor seleccionado en la lista.
      const proveedorSeleccionado = proveedores.find(p => p.idProveedor === selectedId);
      if (proveedorSeleccionado) {
        // Se construye el nombre completo y se actualiza el estado.
        const nombreCompleto = `${proveedorSeleccionado.nombre} ${proveedorSeleccionado.apellidoPaterno} ${proveedorSeleccionado.apellidoMaterno || ''}`.trim();
        setNombreProveedor(nombreCompleto);
      }
    } else {
      // Si se deselecciona, se limpia el campo de nombre.
      setNombreProveedor('');
    }
  };

  // Se ejecuta al enviar el formulario.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMensajeExito('');

    // Se valida que todos los campos requeridos estén llenos.
    if (!idProveedor || !numeroFactura || !monto || !estatus) {
      setError("Todos los campos son obligatorios.");
      return;
    }

    // Se crea el objeto de la nueva factura.
    const nuevaFactura = {
      idProveedor,
      nombreProveedor,
      numeroFactura,
      monto: parseFloat(monto), // Se convierte el monto a número.
      estatus,
      fechaRegistro: new Date()
    };

    try {
      // Se intenta guardar el documento en la nueva colección 'facturas'.
      await addDoc(collection(db, "facturas"), nuevaFactura);
      setMensajeExito("Factura registrada con éxito.");

      // Se limpian los campos del formulario.
      setIdProveedor('');
      setNombreProveedor('');
      setNumeroFactura('');
      setMonto('');
      setEstatus('');
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
          {/* Menú desplegable con los IDs de los proveedores */}
          <select value={idProveedor} onChange={handleProviderChange} required>
            <option value="">-- Seleccione un proveedor --</option>
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
        <div>
          <label>Nombre del Proveedor:</label>
          {/* Este campo se llena automáticamente y no es editable */}
          <input
            type="text"
            value={nombreProveedor}
            readOnly
            placeholder="Se llenará automáticamente"
          />
        </div>
        <div>
          <label>Número de Factura:</label>
          <input
            type="text"
            value={numeroFactura}
            onChange={(e) => setNumeroFactura(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Monto:</label>
          <input
            type="number"
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            required
          />
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
      
      {/* Se muestran los mensajes de retroalimentación */}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {mensajeExito && <p style={{ color: 'green' }}>{mensajeExito}</p>}
    </div>
  );
}

export default RegistroFactura;