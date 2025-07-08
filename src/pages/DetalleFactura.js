import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

function DetalleFactura() {
  const { facturaId } = useParams();
  const navigate = useNavigate();
  const detalleRef = useRef();

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

  const generarPDF = async () => {
    const input = detalleRef.current;
    if (!input) return;

    try {
        const response = await fetch('https://i.imgur.com/5mavo8r.png');
        const imageBlob = await response.blob();
        const imageUrl = URL.createObjectURL(imageBlob);

        const canvas = await html2canvas(input, { scale: 3 });
        const imgData = canvas.toDataURL('image/png');

        const pdf = new jsPDF('p', 'pt', 'letter');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        
        const imageWidth = 350;
        const imageHeight = 88;
        const x = (pdfWidth - imageWidth) / 2;
        pdf.addImage(imageUrl, 'PNG', x, 40, imageWidth, imageHeight);

        const contentWidth = pdfWidth - 80;
        const contentHeight = (canvas.height * contentWidth) / canvas.width;
        const contentY = 40 + imageHeight + 30;
        pdf.addImage(imgData, 'PNG', 40, contentY, contentWidth, contentHeight);

        pdf.save(`Detalle_Factura_${factura?.numeroFactura}.pdf`);
        URL.revokeObjectURL(imageUrl);

    } catch (error) {
        console.error("Error al generar PDF: ", error);
        alert("No se pudo generar el PDF.");
    }
  };

  if (cargando) return <p>Cargando...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h2>Detalle de Factura</h2>
      
      {!isEditing ? (
        <>
          <div ref={detalleRef} style={{ padding: '20px', background: 'white', width: '600px' }}>
            <h3 style={{ color: '#2A4B7C', textAlign: 'center' }}>Detalles de la Factura</h3>
            {factura && (
              <div style={{ fontSize: '12pt', color: 'black' }}>
                <p><strong>Proveedor:</strong> {factura.nombreProveedor}</p>
                <p><strong>Número de Factura:</strong> {factura.numeroFactura}</p>
                <p><strong>Fecha:</strong> {factura.fechaFactura.toDate().toLocaleDateString()}</p>
                <p><strong>Descripción:</strong> {factura.descripcion || 'N/A'}</p>
                <p><strong>Monto:</strong> {factura.monto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</p>
                <p><strong>Estatus:</strong> 
                  <span style={{ 
                    backgroundColor: {
                      'Pendiente': '#FFC7CE', 'Recibida': '#FFF2CC', 'Con solventación': '#f8cbad', 
                      'En contabilidad': '#DDEBF7', 'Pagada': '#C6EFCE'
                    }[factura.estatus],
                    color: '#3b3b3b',
                    padding: '3px 8px',
                    borderRadius: '5px',
                    marginLeft: '10px'
                  }}>
                    {factura.estatus}
                  </span>
                </p>
              </div>
            )}
          </div>
          <div style={{ marginTop: '20px' }}>
            <button onClick={() => setIsEditing(true)}>✏️ Editar</button>
            <button onClick={handleDelete} style={{ marginLeft: '10px' }}>🗑️ Eliminar</button>
            <button onClick={generarPDF} style={{ marginLeft: '10px' }}>📄 Imprimir Detalles</button>
          </div>
        </>
      ) : (
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