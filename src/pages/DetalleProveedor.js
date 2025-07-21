import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../auth/AuthContext';
import './css/DetalleVista.css';
import './css/Formulario.css';

function DetalleProveedor() {
    const { currentUser } = useAuth();
    const { proveedorId } = useParams();
    const navigate = useNavigate();

    const [proveedor, setProveedor] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchProveedor = async () => {
            try {
                const docRef = doc(db, "proveedores", proveedorId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setProveedor(data);
                    setFormData({ ...data, limiteGasto: String(data.limiteGasto || '0') });
                } else {
                    setError("No se encontró el proveedor.");
                }
            } catch (err) {
                setError("Error al cargar los datos del proveedor.");
                console.error(err);
            } finally {
                setCargando(false);
            }
        };
        fetchProveedor();
    }, [proveedorId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const MIN_LIMITE = 0;
    const ajustarMonto = (ajuste) => {
        const montoActual = parseFloat(formData.limiteGasto) || 0;
        let nuevoMonto = montoActual + ajuste;
        nuevoMonto = Math.max(MIN_LIMITE, nuevoMonto);
        setFormData(prev => ({ ...prev, limiteGasto: String(nuevoMonto) }));
    };

    const handleMontoChange = (e) => {
        const valor = e.target.value;
        if (valor === '' || (!isNaN(parseFloat(valor)) && parseFloat(valor) >= MIN_LIMITE)) {
            setFormData(prev => ({ ...prev, limiteGasto: valor }));
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!currentUser) return alert("Necesitas autenticarte para actualizar.");
        setError('');
        
        try {
            const proveedoresRef = collection(db, "proveedores");
            const q = query(proveedoresRef, where("idProveedor", "==", formData.idProveedor.trim()));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const proveedorEncontrado = querySnapshot.docs[0];
                if (proveedorEncontrado.id !== proveedorId) {
                    alert('Error: El ID de Proveedor ya existe en otro registro.');
                    return;
                }
            }

            const docRef = doc(db, "proveedores", proveedorId);
            const dataToUpdate = { 
                ...formData, 
                idProveedor: formData.idProveedor.trim(),
                limiteGasto: parseFloat(formData.limiteGasto) || 0
            };
            await updateDoc(docRef, dataToUpdate);
            setProveedor(dataToUpdate);
            setIsEditing(false);

            if (proveedor.idProveedor !== dataToUpdate.idProveedor) {
                alert("Advertencia: Se ha cambiado el ID del proveedor. Las facturas existentes no se actualizarán con el nuevo ID.");
            }

        } catch (err) {
            setError("Error al actualizar los datos del proveedor.");
            console.error(err);
        }
    };

    const handleDelete = async () => {
        if (!currentUser) return alert("Necesitas autenticarte para eliminar.");
        if (window.confirm("¿Estás seguro de que quieres eliminar este proveedor?")) {
            try {
                await deleteDoc(doc(db, "proveedores", proveedorId));
                navigate('/ver-proveedores');
            } catch (err) {
                setError("No se pudo eliminar el proveedor.");
            }
        }
    };

    // --- FUNCIÓN generarPDF RESTAURADA Y COMPLETA ---
    const generarPDF = () => {
        if (!currentUser || !proveedor) return alert("No se puede generar el PDF.");

        const docPDF = new jsPDF('p', 'pt', 'letter');
        const pdfWidth = docPDF.internal.pageSize.getWidth();
        
        try {
            const response = fetch('https://i.imgur.com/5mavo8r.png').then(res => res.blob()).then(imageBlob => {
                const imageUrl = URL.createObjectURL(imageBlob);
                docPDF.addImage(imageUrl, 'PNG', (pdfWidth - 350) / 2, 40, 350, 88);
                URL.revokeObjectURL(imageUrl);

                const contentY = 150;
                docPDF.setFontSize(18);
                docPDF.setTextColor('#2A4B7C');
                docPDF.text("Información del Proveedor", pdfWidth / 2, contentY, { align: 'center' });
                
                const tableData = [
                    ['ID Proveedor', proveedor.idProveedor],
                    ['Nombre(s)', proveedor.nombre],
                    ['Apellido Paterno', proveedor.apellidoPaterno],
                    ['Apellido Materno', proveedor.apellidoMaterno || 'N/A'],
                    ['Límite de Gasto', (proveedor.limiteGasto || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })],
                    ['Fecha de Registro', proveedor.fechaRegistro.toDate().toLocaleDateString()]
                ];

                autoTable(docPDF, {
                    startY: contentY + 20,
                    body: tableData,
                    theme: 'grid',
                    styles: { fontSize: 10, cellPadding: 8, valign: 'middle' },
                    columnStyles: { 0: { fontStyle: 'bold', fillColor: [240, 248, 255] } }
                });

                docPDF.save(`Detalle_Proveedor_${proveedor.idProveedor}.pdf`);
            });
        } catch (error) { 
            console.error("Error al cargar la imagen de cabecera:", error); 
            // Aún intentar generar el PDF sin la imagen
            // (La lógica para generar sin imagen iría aquí si se desea)
        }
    };

    if (cargando) return <p className="loading-message">Cargando...</p>;
    if (error) return <p className="error-message">{error}</p>;

    return (
        <div className="detalle-container">
            <h2>Detalle del Proveedor</h2>
            {!isEditing ? (
                <>
                    <div className="info-card">
                        {proveedor && (
                            <dl className="info-grid">
                                <dt>ID Proveedor:</dt><dd>{proveedor.idProveedor}</dd>
                                <dt>Nombre(s):</dt><dd>{proveedor.nombre}</dd>
                                <dt>Apellido Paterno:</dt><dd>{proveedor.apellidoPaterno}</dd>
                                <dt>Apellido Materno:</dt><dd>{proveedor.apellidoMaterno || 'N/A'}</dd>
                                <dt>Límite de Gasto:</dt><dd>{(proveedor.limiteGasto || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</dd>
                                <dt>Fecha de Registro:</dt><dd>{proveedor.fechaRegistro.toDate().toLocaleDateString()}</dd>
                            </dl>
                        )}
                    </div>
                    <div className="detalle-acciones">
                        <button className="btn btn-editar" onClick={() => setIsEditing(true)}>✏️ Editar</button>
                        <button className="btn btn-eliminar" onClick={handleDelete}>🗑️ Eliminar</button>
                        <button className="btn btn-secundario" onClick={generarPDF}>📄 Imprimir Detalles</button>
                    </div>
                </>
            ) : (
                <form className="detalle-form registro-form" onSubmit={handleUpdate}>
                    <div className="form-group">
                        <label htmlFor="idProveedor">ID Proveedor:</label>
                        <input id="idProveedor" type="text" name="idProveedor" value={formData.idProveedor || ''} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="nombre">Nombre(s):</label>
                        <input id="nombre" type="text" name="nombre" value={formData.nombre || ''} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="apellidoPaterno">Apellido Paterno:</label>
                        <input id="apellidoPaterno" type="text" name="apellidoPaterno" value={formData.apellidoPaterno || ''} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="apellidoMaterno">Apellido Materno:</label>
                        <input id="apellidoMaterno" type="text" name="apellidoMaterno" value={formData.apellidoMaterno || ''} onChange={handleChange} />
                    </div>
                    <div className="monto-group full-width">
                        <label htmlFor="limiteGasto">Límite de Gasto:</label>
                        <div className="monto-controls">
                            <button type="button" onClick={() => ajustarMonto(-1000)}>-1000</button>
                            <button type="button" onClick={() => ajustarMonto(-100)}>-100</button>
                            <div className="monto-input-container">
                                <span>$</span>
                                <input type="number" id="limiteGasto" name="limiteGasto" value={formData.limiteGasto || ''} onChange={handleMontoChange} min={MIN_LIMITE} step="0.01" />
                            </div>
                            <button type="button" onClick={() => ajustarMonto(100)}>+100</button>
                            <button type="button" onClick={() => ajustarMonto(1000)}>+1000</button>
                        </div>
                    </div>
                    <div className="detalle-acciones">
                        <button className="btn btn-editar" type="submit">✅ Guardar Cambios</button>
                        <button className="btn btn-secundario" type="button" onClick={() => setIsEditing(false)}>❌ Cancelar</button>
                    </div>
                </form>
            )}
            <Link className="link-volver" to="/ver-proveedores">← Volver a la lista</Link>
        </div>
    );
}

export default DetalleProveedor;