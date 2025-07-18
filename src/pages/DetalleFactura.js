import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase.js';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../auth/AuthContext';
import { recalcularTotalProveedor, recalcularTotalMes } from '../totals.js';
import './css/DetalleVista.css';

const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function DetalleFactura() {
    const { currentUser } = useAuth();
    const { facturaId } = useParams();
    const navigate = useNavigate();

    const [factura, setFactura] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [montoOriginalParaValidacion, setMontoOriginalParaValidacion] = useState(0);

    const formatDateForInput = (date) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toISOString().split('T')[0];
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
                        fechaDePago: data.fechaDePago ? formatDateForInput(data.fechaDePago.toDate()) : '',
                        monto: String(data.monto)
                    });
                } else { setError("No se encontró la factura."); }
            } catch (err) { setError("Error al cargar los datos."); } 
            finally { setCargando(false); }
        };
        fetchFactura();
    }, [facturaId]);

    const handleEditClick = () => {
        setMontoOriginalParaValidacion(factura.monto);
        setError('');
        setIsEditing(true);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleUpdate = async (e) => {
        e.preventDefault();
        // ... (La lógica completa de handleUpdate, con sus validaciones, no cambia. Solo se asegura
        //      de que los nuevos campos en `formData` se guarden correctamente)
        const oldFecha = factura.fechaFactura.toDate ? factura.fechaFactura.toDate() : factura.fechaFactura;
        const proveedorId = factura.idProveedor;
        const nuevoMonto = parseFloat(formData.monto);
        const [year, month, day] = formData.fechaFactura.split('-').map(Number);
        const newFecha = new Date(year, month - 1, day);

        try {
            // ... (Toda la lógica de validación de límites que ya funcionaba bien)

            const dataToUpdate = { 
                ...formData, 
                monto: nuevoMonto, 
                fechaFactura: newFecha,
                fechaDePago: formData.fechaDePago ? new Date(formData.fechaDePago + 'T00:00:00') : null
            };
            await updateDoc(doc(db, "facturas", facturaId), dataToUpdate);

            // ... (Recálculos y actualización de estado)
        } catch (err) {
            setError("Error al actualizar la factura.");
        }
    };

    const generarPDF = async () => {
        // ... (código inicial de generarPDF no cambia)
        const fecha = factura.fechaFactura.toDate ? factura.fechaFactura.toDate() : new Date(factura.fechaFactura);
        const tableData = [
            ['Proveedor', factura.nombreProveedor],
            ['Número de Factura', factura.numeroFactura],
            ['Fecha de Factura', fecha.toLocaleDateString()],
            ['Dependencia', factura.dependencia || 'N/A'],
            ['Forma de Pago', factura.formaDePago || 'N/A'],
            ['Fecha de Pago', factura.fechaDePago ? factura.fechaDePago.toDate().toLocaleDateString() : 'Pendiente'],
            ['Descripción', factura.descripcion || 'N/A'],
            ['Monto', factura.monto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })],
            ['Estatus', factura.estatus]
        ];
        
        autoTable(docPDF, {
            // ...
            didDrawCell: (data) => {
                if (data.section === 'body' && data.column.index === 1 && data.row.index === 8) {
                    // ...
                }
            }
        });
        docPDF.save(`Detalle_Factura_${factura.numeroFactura}.pdf`);
    };

    if (cargando) return <p>Cargando...</p>;
    if (error && !isEditing) return <p>{error}</p>;

    return (
        <div className="detalle-container">
            <h2>Detalle de Factura</h2>
            {!isEditing ? (
                <>
                    <div className="info-card">
                        {factura && (
                            <dl className="info-grid">
                                <dt>Proveedor:</dt><dd>{factura.nombreProveedor}</dd>
                                <dt>Número de Factura:</dt><dd>{factura.numeroFactura}</dd>
                                <dt>Fecha de Factura:</dt><dd>{factura.fechaFactura.toDate().toLocaleDateString()}</dd>
                                <dt>Dependencia:</dt><dd>{factura.dependencia || 'N/A'}</dd>
                                <dt>Forma de Pago:</dt><dd>{factura.formaDePago || 'N/A'}</dd>
                                <dt>Fecha de Pago:</dt><dd>{factura.fechaDePago ? factura.fechaDePago.toDate().toLocaleDateString() : 'Pendiente'}</dd>
                                <dt>Descripción:</dt><dd>{factura.descripcion || 'N/A'}</dd>
                                <dt>Monto:</dt><dd>{factura.monto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</dd>
                                <dt>Estatus:</dt><dd><span className="status-badge" data-status={factura.estatus}>{factura.estatus}</span></dd>
                            </dl>
                        )}
                    </div>
                    <div className="detalle-acciones">
                        <button className="btn btn-editar" onClick={handleEditClick}>✏️ Editar</button>
                        {/* ... otros botones */}
                    </div>
                </>
            ) : (
                <form className="detalle-form" onSubmit={handleUpdate}>
                    <div className="form-group"><label>Proveedor:</label><input type="text" value={formData.nombreProveedor || ''} disabled readOnly /></div>
                    <div className="form-group"><label>Número de Factura:</label><input name="numeroFactura" type="text" value={formData.numeroFactura || ''} onChange={handleChange} required /></div>
                    <div className="form-group"><label>Fecha de Factura:</label><input name="fechaFactura" type="date" value={formData.fechaFactura || ''} onChange={handleChange} required /></div>
                    {/* --- NUEVOS CAMPOS --- */}
                    <div className="form-group"><label>Dependencia:</label><input name="dependencia" type="text" value={formData.dependencia || ''} onChange={handleChange} required /></div>
                    <div className="form-group"><label>Forma de Pago:</label><select name="formaDePago" value={formData.formaDePago || ''} onChange={handleChange} required><option value="">-- Seleccione --</option><option value="Transferencia">Transferencia</option><option value="Efectivo">Efectivo</option><option value="Cheque">Cheque</option></select></div>
                    <div className="form-group"><label>Fecha de Pago (Opcional):</label><input name="fechaDePago" type="date" value={formData.fechaDePago || ''} onChange={handleChange} /></div>
                    
                    <div className="form-group"><label>Descripción:</label><textarea name="descripcion" value={formData.descripcion || ''} onChange={handleChange} rows="3"></textarea></div>
                    {/* ... Campo de Monto y Estatus no cambian */}
                    {error && <p className="mensaje mensaje-error">{error}</p>}
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