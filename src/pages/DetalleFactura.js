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
        const offset = d.getTimezoneOffset() * 60000;
        const localDate = new Date(d.getTime() - offset);
        return localDate.toISOString().split('T')[0];
    };

    useEffect(() => {
        const fetchFactura = async () => {
            if (!facturaId) return;
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
                    setMontoOriginalParaValidacion(data.monto);
                } else {
                    setError("No se encontró la factura.");
                }
            } catch (err) {
                console.error(err);
                setError("Error al cargar los datos de la factura.");
            } finally {
                setCargando(false);
            }
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
        setError('');

        const oldFecha = factura.fechaFactura.toDate ? factura.fechaFactura.toDate() : factura.fechaFactura;
        const proveedorId = factura.idProveedor;
        const nuevoMonto = parseFloat(formData.monto);
        
        const [year, month, day] = formData.fechaFactura.split('-').map(Number);
        const newFecha = new Date(year, month - 1, day);

        try {
            const proveedoresRef = collection(db, "proveedores");
            const q = query(proveedoresRef, where("idProveedor", "==", proveedorId));
            const querySnapshot = await getDocs(q);
            
            let limiteProveedor = 0;
            if (!querySnapshot.empty) {
                limiteProveedor = querySnapshot.docs[0].data().limiteGasto || 0;
            }
            
            if (limiteProveedor > 0) {
                const totalProveedorSnap = await getDoc(doc(db, "totalProveedor", proveedorId));
                const totalProveedorActual = totalProveedorSnap.exists() ? totalProveedorSnap.data().totaldeprovedor : 0;
                const totalBaseProveedor = totalProveedorActual - montoOriginalParaValidacion;
                const nuevoTotalProyectado = totalBaseProveedor + nuevoMonto;

                if (nuevoTotalProyectado > limiteProveedor) {
                    setError(`Límite de gasto para el proveedor excedido.`);
                    return;
                }
            }

            const seCambioDeMes = oldFecha.getMonth() !== newFecha.getMonth() || oldFecha.getFullYear() !== newFecha.getFullYear();

            if (seCambioDeMes) {
                const nuevoMesIndex = newFecha.getMonth();
                const limiteNuevoMesSnap = await getDoc(doc(db, "limiteMes", String(nuevoMesIndex)));
                const limiteNuevoMes = limiteNuevoMesSnap.exists() ? limiteNuevoMesSnap.data().monto : 0;

                if (limiteNuevoMes > 0) {
                    const totalNuevoMesDocId = `${newFecha.getFullYear()}-${String(nuevoMesIndex + 1).padStart(2, '0')}`;
                    const totalNuevoMesSnap = await getDoc(doc(db, "totalMes", totalNuevoMesDocId));
                    const totalActualNuevoMes = totalNuevoMesSnap.exists() ? totalNuevoMesSnap.data().totaldeMes : 0;
                    const nuevoTotalProyectado = totalActualNuevoMes + nuevoMonto;

                    if (nuevoTotalProyectado > limiteNuevoMes) {
                        setError(`Límite de gasto para ${nombresMeses[nuevoMesIndex]} excedido.`);
                        return;
                    }
                }
            } else {
                const mesIndex = newFecha.getMonth();
                const limiteMesSnap = await getDoc(doc(db, "limiteMes", String(mesIndex)));
                const limiteMes = limiteMesSnap.exists() ? limiteMesSnap.data().monto : 0;

                if (limiteMes > 0) {
                    const totalMesDocId = `${newFecha.getFullYear()}-${String(mesIndex + 1).padStart(2, '0')}`;
                    const totalMesSnap = await getDoc(doc(db, "totalMes", totalMesDocId));
                    const totalMesActual = totalMesSnap.exists() ? totalMesSnap.data().totaldeMes : 0;
                    const totalBaseMes = totalMesActual - montoOriginalParaValidacion;
                    const nuevoTotalProyectado = totalBaseMes + nuevoMonto;

                    if (nuevoTotalProyectado > limiteMes) {
                        setError(`Límite de gasto para ${nombresMeses[mesIndex]} excedido.`);
                        return;
                    }
                }
            }

            const docRef = doc(db, "facturas", facturaId);
            const dataToUpdate = { 
                ...formData, 
                monto: nuevoMonto, 
                fechaFactura: newFecha,
                fechaDePago: formData.fechaDePago ? new Date(formData.fechaDePago + 'T00:00:00') : null
            };

            await updateDoc(docRef, dataToUpdate);
            await recalcularTotalProveedor(factura.idProveedor);
            await recalcularTotalMes(newFecha);
            if (seCambioDeMes) {
                await recalcularTotalMes(oldFecha);
            }

            setFactura({ ...dataToUpdate, id: facturaId });
            setIsEditing(false);

        } catch (err) {
            console.error(err);
            setError("Error al actualizar la factura.");
        }
    };

    const handleDelete = async () => {
        if (window.confirm("¿Estás seguro de que deseas eliminar esta factura?")) {
            try {
                const fechaParaRecalcular = factura.fechaFactura.toDate ? factura.fechaFactura.toDate() : factura.fechaFactura;
                await deleteDoc(doc(db, "facturas", facturaId));
                await recalcularTotalProveedor(factura.idProveedor);
                await recalcularTotalMes(fechaParaRecalcular);
                navigate('/ver-facturas');
            } catch (err) {
                console.error(err);
                setError("No se pudo eliminar la factura.");
            }
        }
    };

    const generarPDF = async () => {
        if (!currentUser || !factura) return alert("No se puede generar el PDF.");
        
        const docPDF = new jsPDF('p', 'pt', 'letter');
        const pdfWidth = docPDF.internal.pageSize.getWidth();
    
        try {
            const response = await fetch('https://i.imgur.com/5mavo8r.png');
            const imageBlob = await response.blob();
            const imageUrl = URL.createObjectURL(imageBlob);
            docPDF.addImage(imageUrl, 'PNG', (pdfWidth - 350) / 2, 40, 350, 88);
            URL.revokeObjectURL(imageUrl);
        } catch (error) { console.error("Error al cargar la imagen de cabecera:", error); }
    
        const contentY = 150;
        docPDF.setFontSize(18);
        docPDF.setTextColor('#2A4B7C');
        docPDF.text("Detalles de la Factura", pdfWidth / 2, contentY, { align: 'center' });
    
        const fechaFactura = factura.fechaFactura.toDate ? factura.fechaFactura.toDate() : factura.fechaFactura;
        const fechaPago = factura.fechaDePago ? (factura.fechaDePago.toDate ? factura.fechaDePago.toDate() : factura.fechaDePago) : null;

        const tableData = [
            ['Proveedor', factura.nombreProveedor],
            ['Número de Factura', factura.numeroFactura],
            ['Fecha de Factura', fechaFactura.toLocaleDateString()],
            ['Dependencia', factura.dependencia || 'N/A'],
            ['Forma de Pago', factura.formaDePago || 'N/A'],
            ['Fecha de Pago', fechaPago ? fechaPago.toLocaleDateString() : 'Pendiente'],
            ['Descripción', factura.descripcion || 'N/A'],
            ['Monto', factura.monto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })],
            ['Estatus', factura.estatus]
        ];
        
        const statusColors = { 'Pendiente': [255, 199, 206], 'Recibida': [255, 242, 204], 'Con solventación': [252, 221, 173], 'En contabilidad': [221, 235, 247], 'Pagada': [198, 239, 206] };
    
        autoTable(docPDF, {
            startY: contentY + 20,
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 10, cellPadding: 8, valign: 'middle' },
            columnStyles: { 0: { fontStyle: 'bold', fillColor: [240, 248, 255] } },
            didDrawCell: (data) => {
                if (data.section === 'body' && data.column.index === 1 && data.row.index === 8) {
                    const status = String(data.cell.raw);
                    const color = statusColors[status];
                    if (color) {
                        docPDF.setFillColor(...color);
                        docPDF.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                        docPDF.setTextColor(50, 50, 50);
                        docPDF.text(status, data.cell.x + data.cell.padding('left'), data.cell.y + data.cell.height / 2, { baseline: 'middle' });
                    }
                }
            }
        });
        docPDF.save(`Detalle_Factura_${factura.numeroFactura}.pdf`);
    };

    if (cargando) return <p className="loading-message">Cargando...</p>;
    if (error && !isEditing) return <p className="mensaje mensaje-error">{error}</p>;
    if (!factura) return <p>No se encontró la factura.</p>;

    return (
        <div className="detalle-container">
            <h2>Detalle de Factura</h2>
            {!isEditing ? (
                <>
                    <div className="info-card">
                        <dl className="info-grid">
                            <dt>Proveedor:</dt><dd>{factura.nombreProveedor}</dd>
                            <dt>Número de Factura:</dt><dd>{factura.numeroFactura}</dd>
                            <dt>Fecha de Factura:</dt><dd>{(factura.fechaFactura.toDate ? factura.fechaFactura.toDate() : factura.fechaFactura).toLocaleDateString()}</dd>
                            <dt>Dependencia:</dt><dd>{factura.dependencia || 'N/A'}</dd>
                            <dt>Forma de Pago:</dt><dd>{factura.formaDePago || 'N/A'}</dd>
                            <dt>Fecha de Pago:</dt><dd>{factura.fechaDePago ? (factura.fechaDePago.toDate ? factura.fechaDePago.toDate() : factura.fechaDePago).toLocaleDateString() : 'Pendiente'}</dd>
                            <dt>Descripción:</dt><dd>{factura.descripcion || 'N/A'}</dd>
                            <dt>Monto:</dt><dd>{factura.monto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</dd>
                            <dt>Estatus:</dt><dd><span className="status-badge" data-status={factura.estatus}>{factura.estatus}</span></dd>
                        </dl>
                    </div>
                    <div className="detalle-acciones">
                        <button className="btn btn-editar" onClick={handleEditClick}>✏️ Editar</button>
                        <button className="btn btn-eliminar" onClick={handleDelete}>🗑️ Eliminar</button>
                        <button className="btn btn-secundario" onClick={generarPDF}>📄 Imprimir Detalles</button>
                    </div>
                </>
            ) : (
                <form className="detalle-form" onSubmit={handleUpdate}>
                    <div className="form-group"><label>Proveedor:</label><input type="text" value={formData.nombreProveedor || ''} disabled readOnly /></div>
                    <div className="form-group"><label>Número de Factura:</label><input name="numeroFactura" type="text" value={formData.numeroFactura || ''} onChange={handleChange} required /></div>
                    <div className="form-group"><label>Fecha de Factura:</label><input name="fechaFactura" type="date" value={formData.fechaFactura || ''} onChange={handleChange} required /></div>
                    <div className="form-group"><label>Dependencia:</label><input name="dependencia" type="text" value={formData.dependencia || ''} onChange={handleChange} required /></div>
                    <div className="form-group"><label>Forma de Pago:</label><select name="formaDePago" value={formData.formaDePago || ''} onChange={handleChange} required><option value="">-- Seleccione --</option><option value="Transferencia">Transferencia</option><option value="Efectivo">Efectivo</option><option value="Cheque">Cheque</option><option value="Otro">Otro</option></select></div>
                    <div className="form-group"><label>Fecha de Pago (Opcional):</label><input name="fechaDePago" type="date" value={formData.fechaDePago || ''} onChange={handleChange} /></div>
                    <div className="form-group"><label>Descripción:</label><textarea name="descripcion" value={formData.descripcion || ''} onChange={handleChange} rows="3"></textarea></div>
                    <div className="form-group"><label>Monto:</label><input name="monto" type="number" value={formData.monto || ''} onChange={handleChange} step="0.01" required /></div>
                    <div className="form-group"><label>Estatus:</label><select name="estatus" value={formData.estatus || ''} onChange={handleChange} required><option value="">-- Seleccione --</option><option value="Pendiente">Pendiente</option><option value="Recibida">Recibida</option><option value="Con solventación">Con solventación</option><option value="En contabilidad">En contabilidad</option><option value="Pagada">Pagada</option></select></div>
                    
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