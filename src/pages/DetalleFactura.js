import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";

function DetalleFactura() {
  const { facturaId } = useParams();
  const navigate = useNavigate();

  const [factura, setFactura] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const formatDateForInput = (date) => date.toISOString().split('T')[0];

  useEffect(() => {
    const fetchFactura = async () => {
      try {
        const docRef = doc(db, "facturas", facturaId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setFactura(data);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // --- SE AÑADEN LAS FUNCIONES Y CONSTANTES PARA EL MONTO ---
  const MIN_MONTO = 1;
  const MAX_MONTO = 5000000;

  const ajustarMonto = (ajuste) => {
    const montoActual = parseFloat(formData.monto) || 0;
    let nuevoMonto = montoActual + ajuste;
    nuevoMonto = Math.max(MIN_MONTO, Math.min(nuevoMonto, MAX_MONTO));
    // Se actualiza el campo 'monto' dentro del estado 'formData'
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
  // --- FIN DE LAS NUEVAS FUNCIONES ---

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const docRef = doc(db, "facturas", facturaId);
      const dataToUpdate = {
        ...formData,
        monto: parseFloat(formData.monto),
        fechaFactura: new Date(formData.fechaFactura)
      };
      await updateDoc(docRef, dataToUpdate);
      setFactura(dataToUpdate);
      setIsEditing(false);
    } catch (err) {
      setError("Error al actualizar la factura.");
    }
  };

  const handleDelete = async () => {
    if (window.confirm("¿Estás seguro de que quieres eliminar esta factura?")) {
      try {
        await deleteDoc(doc(db, "facturas", facturaId));
        navigate('/ver-facturas');
      } catch (err) {
        setError("No se pudo eliminar la factura.");
      }
    }
  };

  if (cargando) return <p>Cargando...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h2>Detalle de Factura</h2>
      {!isEditing ? (
        // MODO VISTA
        <div>
          {factura && (
            <div>
              <p><strong>Proveedor:</strong> {factura.nombreProveedor}</p>
              <p><strong>Número de Factura:</strong> {factura.numeroFactura}</p>
              <p><strong>Fecha:</strong> {factura.fechaFactura.toDate().toLocaleDateString()}</p>
              <p><strong>Descripción:</strong> {factura.descripcion || 'N/A'}</p>
              <p><strong>Monto:</strong> {factura.monto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</p>
              <p><strong>Estatus:</strong> {factura.estatus}</p>
            </div>
          )}
          <button onClick={() => setIsEditing(true)}>✏️ Editar</button>
          <button onClick={handleDelete} style={{ marginLeft: '10px' }}>🗑️ Eliminar</button>
        </div>
      ) : (
        // MODO EDICIÓN
        <form onSubmit={handleUpdate}>
          <p><strong>Proveedor:</strong> {formData.nombreProveedor}</p>
          <div>
            <label>Número de Factura:</label>
            <input type="text" name="numeroFactura" value={formData.numeroFactura} onChange={handleChange} required />
          </div>
          <div>
            <label>Fecha:</label>
            <input type="date" name="fechaFactura" value={formData.fechaFactura} onChange={handleChange} required />
          </div>
          <div>
            <label>Descripción:</label>
            <textarea name="descripcion" value={formData.descripcion || ''} onChange={handleChange} rows="3"></textarea>
          </div>

          {/* --- SECCIÓN DEL MONTO ACTUALIZADA --- */}
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
                    name="monto"
                    value={formData.monto}
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
          {/* --- FIN DE LA SECCIÓN DEL MONTO --- */}

          <div>
            <label>Estatus:</label>
            <select name="estatus" value={formData.estatus} onChange={handleChange} required>
              <option value="Pendiente">Pendiente</option>
              <option value="Recibida">Recibida</option>
              <option value="Con solventación">Con solventación</option>
              <option value="En contabilidad">En contabilidad</option>
              <option value="Pagada">Pagada</option>
            </select>
          </div>
          <button type="submit">✅ Guardar Cambios</button>
          <button type="button" onClick={() => setIsEditing(false)} style={{ marginLeft: '10px' }}>❌ Cancelar</button>
        </form>
      )}
      <br />
      <Link to="/ver-facturas">Volver a la lista</Link>
    </div>
  );
}

export default DetalleFactura;