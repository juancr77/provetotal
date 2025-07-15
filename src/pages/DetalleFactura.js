import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase.js';
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
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
    
    // --- NUEVO ESTADO PARA GUARDAR EL MONTO ORIGINAL ---
    const [montoOriginalParaValidacion, setMontoOriginalParaValidacion] = useState(0);

    const formatDateForInput = (date) => {
        if (!date) return '';
        const d = new Date(date);
        const year = d.getFullYear();
        const month = (`0${d.getMonth() + 1}`).slice(-2);
        const day = (`0${d.getDate()}`).slice(-2);
        return `${year}-${month}-${day}`;
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

    const handleEditClick = () => {
        // Al hacer clic en editar, se guarda el monto original.
        setMontoOriginalParaValidacion(factura.monto);
        setError('');
        setIsEditing(true);
    };

    // ... (otras funciones como handleChange, ajustarMonto, etc. no cambian)
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const MIN_MONTO = 1;
    const MAX_MONTO = 50000000;

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
        if (!currentUser) {
            return alert("Necesitas autenticarte para actualizar una factura.");
        }
        setError('');

        const oldFecha = factura.fechaFactura.toDate ? factura.fechaFactura.toDate() : factura.fechaFactura;
        const proveedorId = factura.idProveedor;
        const nuevoMonto = parseFloat(formData.monto);
        
        const [year, month, day] = formData.fechaFactura.split('-').map(Number);
        const newFecha = new Date(year, month - 1, day);

        try {
            // --- VALIDACIÓN DEL LÍMITE DEL PROVEEDOR (LÓGICA CORREGIDA) ---
            const proveedorSnap = await getDoc(doc(db, "proveedores", proveedorId));
            const limiteProveedor = proveedorSnap.exists() ? proveedorSnap.data().limiteGasto : 0;
            
            if (limiteProveedor > 0) {
                const totalProveedorSnap = await getDoc(doc(db, "totalProveedor", proveedorId));
                const totalProveedorActual = totalProveedorSnap.exists() ? totalProveedorSnap.data().totaldeprovedor : 0;
                
                // Se resta el monto original y se suma el nuevo para la validación.
                const totalBaseProveedor = totalProveedorActual - montoOriginalParaValidacion;
                const nuevoTotalProyectado = totalBaseProveedor + nuevoMonto;

                if (nuevoTotalProyectado > limiteProveedor) {
                    setError(`Límite de gasto para el proveedor excedido. Límite: ${limiteProveedor.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}.`);
                    return;
                }
            }

            // --- VALIDACIÓN DEL LÍMITE DEL MES (LÓGICA CORREGIDA) ---
            const seCambioDeMes = oldFecha.getMonth() !== newFecha.getMonth() || oldFecha.getFullYear() !== newFecha.getFullYear();

            if (seCambioDeMes) {
                // Si la factura se movió a un mes diferente.
                const nuevoMesIndex = newFecha.getMonth();
                const limiteNuevoMesSnap = await getDoc(doc(db, "limiteMes", String(nuevoMesIndex)));
                const limiteNuevoMes = limiteNuevoMesSnap.exists() ? limiteNuevoMesSnap.data().monto : 0;

                if (limiteNuevoMes > 0) {
                    const totalNuevoMesDocId = `${newFecha.getFullYear()}-${String(nuevoMesIndex + 1).padStart(2, '0')}`;
                    const totalNuevoMesSnap = await getDoc(doc(db, "totalMes", totalNuevoMesDocId));
                    const totalActualNuevoMes = totalNuevoMesSnap.exists() ? totalNuevoMesSnap.data().totaldeMes : 0;
                    
                    // Se suma el nuevo monto completo al total del nuevo mes.
                    const nuevoTotalProyectado = totalActualNuevoMes + nuevoMonto;

                    if (nuevoTotalProyectado > limiteNuevoMes) {
                        setError(`Límite de gasto para ${nombresMeses[nuevoMesIndex]} excedido. Límite: ${limiteNuevoMes.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}.`);
                        return;
                    }
                }
            } else {
                // Si la factura permanece en el mismo mes.
                const mesIndex = newFecha.getMonth();
                const limiteMesSnap = await getDoc(doc(db, "limiteMes", String(mesIndex)));
                const limiteMes = limiteMesSnap.exists() ? limiteMesSnap.data().monto : 0;

                if (limiteMes > 0) {
                    const totalMesDocId = `${newFecha.getFullYear()}-${String(mesIndex + 1).padStart(2, '0')}`;
                    const totalMesSnap = await getDoc(doc(db, "totalMes", totalMesDocId));
                    const totalMesActual = totalMesSnap.exists() ? totalMesSnap.data().totaldeMes : 0;

                    // Se resta el monto original y se suma el nuevo para la validación.
                    const totalBaseMes = totalMesActual - montoOriginalParaValidacion;
                    const nuevoTotalProyectado = totalBaseMes + nuevoMonto;

                    if (nuevoTotalProyectado > limiteMes) {
                        setError(`Límite de gasto para ${nombresMeses[mesIndex]} excedido. Límite: ${limiteMes.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}.`);
                        return;
                    }
                }
            }

            // --- SI PASA LA VALIDACIÓN, SE ACTUALIZA ---
            const docRef = doc(db, "facturas", facturaId);
            const dataToUpdate = { ...formData, monto: nuevoMonto, fechaFactura: newFecha };
            await updateDoc(docRef, dataToUpdate);

            await recalcularTotalProveedor(proveedorId);
            await recalcularTotalMes(newFecha);
            if (seCambioDeMes) {
                await recalcularTotalMes(oldFecha);
            }
            
            setFactura({ ...factura, ...dataToUpdate });
            setIsEditing(false);

        } catch (err) {
            console.error("Error al actualizar: ", err);
            setError("Error al actualizar la factura. Revisa la consola.");
        }
    };

    // ... (handleDelete y generarPDF no cambian)
     const handleDelete = async () => {
        if (!currentUser) return alert("Necesitas autenticarte para eliminar una factura.");
        
        if (window.confirm("¿Estás seguro de que quieres eliminar esta factura?")) {
            try {
                const proveedorIdParaActualizar = factura.idProveedor;
                const fechaParaActualizar = factura.fechaFactura.toDate ? factura.fechaFactura.toDate() : factura.fechaFactura;
                await deleteDoc(doc(db, "facturas", facturaId));
                await recalcularTotalProveedor(proveedorIdParaActualizar);
                await recalcularTotalMes(fechaParaActualizar);
                navigate('/ver-facturas');
            } catch (err) {
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
    
        const contentY = 40 + 88 + 40;
        docPDF.setFontSize(18);
        docPDF.setTextColor('#2A4B7C');
        docPDF.text("Detalles de la Factura", pdfWidth / 2, contentY, { align: 'center' });
    
        const fecha = factura.fechaFactura.toDate ? factura.fechaFactura.toDate() : factura.fechaFactura;

        const tableData = [
            ['Proveedor', factura.nombreProveedor],
            ['Número de Factura', factura.numeroFactura],
            ['Fecha', fecha.toLocaleDateString()],
            ['Descripción', factura.descripcion || 'N/A'],
            ['Monto', factura.monto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })],
            ['Estatus', factura.estatus]
        ];
        
        const statusColors = {
            'Pendiente': [255, 199, 206], 'Recibida': [255, 242, 204], 'Con solventación': [252, 221, 173],
            'En contabilidad': [221, 235, 247], 'Pagada': [198, 239, 206]
        };
    
        autoTable(docPDF, {
            startY: contentY + 20,
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 10, cellPadding: 8, valign: 'middle' },
            columnStyles: { 0: { fontStyle: 'bold', fillColor: [240, 248, 255] } },
            didDrawCell: (data) => {
                if (data.section === 'body' && data.column.index === 1 && data.row.index === 5) {
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
                        {/* Se actualiza el botón para llamar a handleEditClick */}
                        <button className="btn btn-editar" onClick={handleEditClick}>✏️ Editar</button>
                        <button className="btn btn-eliminar" onClick={handleDelete}>🗑️ Eliminar</button>
                        <button className="btn btn-secundario" onClick={generarPDF}>📄 Imprimir Detalles</button>
                    </div>
                </>
            ) : (
                <form className="detalle-form" onSubmit={handleUpdate}>
                    <div className="form-group">
                        <label>Proveedor:</label>
                        <input type="text" value={formData.nombreProveedor || ''} disabled readOnly />
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
                        <label htmlFor="descripcion">Descripción:</label>
                        <textarea id="descripcion" name="descripcion" value={formData.descripcion || ''} onChange={handleChange} rows="3"></textarea>
                    </div>
                    <div className="form-group">
                        <label>Monto:</label>
                        <div className="monto-controls">
                            <button type="button" onClick={() => ajustarMonto(-1000)}>-1000</button>
                            <button type="button" onClick={() => ajustarMonto(-100)}>-100</button>
                            <div className="monto-input-container">
                                <span>$</span>
                                <input type="number" name="monto" value={formData.monto} onChange={handleMontoChange} min={MIN_MONTO} max={MAX_MONTO} required />
                            </div>
                            <button type="button" onClick={() => ajustarMonto(100)}>+100</button>
                            <button type="button" onClick={() => ajustarMonto(1000)}>+1000</button>
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="estatus">Estatus:</label>
                        <select id="estatus" name="estatus" value={formData.estatus} onChange={handleChange} required>
                            <option value="Pendiente">Pendiente</option>
                            <option value="Recibida">Recibida</option>
                            <option value="Con solventación">Con solventación</option>
                            <option value="En contabilidad">En contabilidad</option>
                            <option value="Pagada">Pagada</option>
                        </select>
                    </div>
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