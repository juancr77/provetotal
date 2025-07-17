// src/pages/VerFacturas.js
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, doc, runTransaction } from "firebase/firestore";
import { Link } from 'react-router-dom';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useAuth } from '../auth/AuthContext';
import './css/vistasTablas.css';

function VerFacturas() {
    const { currentUser } = useAuth();
    const [facturas, setFacturas] = useState([]); // Lista completa de facturas
    const [facturasFiltradas, setFacturasFiltradas] = useState([]); // Lista para mostrar en la tabla
    const [filtroFecha, setFiltroFecha] = useState(''); // Estado para el input de fecha
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    // Efecto para cargar todas las facturas una vez
    useEffect(() => {
        const obtenerFacturas = async () => {
            if (!currentUser) {
                setCargando(false);
                return;
            }
            try {
                const facturasRef = collection(db, "facturas");
                const q = query(facturasRef, orderBy("fechaFactura", "desc"));
                const querySnapshot = await getDocs(q);
                const listaFacturas = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                setFacturas(listaFacturas);
                setFacturasFiltradas(listaFacturas); // Inicialmente, mostrar todas
            } catch (err) {
                setError("No se pudieron cargar los datos de las facturas.");
                console.error("Error al obtener las facturas: ", err);
            } finally {
                setCargando(false);
            }
        };
        obtenerFacturas();
    }, [currentUser]);

    // Efecto para aplicar el filtro cuando la fecha cambie
    useEffect(() => {
        if (filtroFecha) {
            const fechaSeleccionada = new Date(filtroFecha + 'T00:00:00'); // Ajuste para zona horaria
            const inicioDia = fechaSeleccionada.getTime();
            const finDia = inicioDia + (24 * 60 * 60 * 1000 - 1);

            const filtradas = facturas.filter(factura => {
                const fechaFactura = factura.fechaFactura.toDate().getTime();
                return fechaFactura >= inicioDia && fechaFactura <= finDia;
            });
            setFacturasFiltradas(filtradas);
        } else {
            setFacturasFiltradas(facturas); // Si no hay filtro, mostrar todas
        }
    }, [filtroFecha, facturas]);

    const generateExcelDelDia = async () => {
        if (!currentUser) return alert("Necesitas autenticarte.");
        if (!filtroFecha || facturasFiltradas.length === 0) {
            return alert("Selecciona una fecha con facturas para generar el reporte.");
        }

        const folioRef = doc(db, "numeroFolio", "folioActual");

        try {
            // Transacción para obtener e incrementar el folio de forma segura
            const folioParaReporte = await runTransaction(db, async (transaction) => {
                const folioDoc = await transaction.get(folioRef);
                if (!folioDoc.exists()) {
                    throw new Error("Folio no asignado. Ve a 'Asignar Folio Inicial' para configurarlo.");
                }
                const folioActual = folioDoc.data().valor;
                transaction.update(folioRef, { valor: folioActual + 1 });
                return folioActual;
            });

            // Generación del Excel
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Reporte del Día", {
                views: [{ state: 'frozen', ySplit: 8 }]
            });

            const response = await fetch('https://i.imgur.com/5mavo8r.png');
            const imageBuffer = await response.arrayBuffer();
            const imageId = workbook.addImage({ buffer: imageBuffer, extension: 'png' });
            worksheet.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 350, height: 88 } });

            // Añadir fecha y folio al encabezado
            worksheet.mergeCells('F1:G1');
            worksheet.getCell('F1').value = `Fecha del Reporte: ${new Date(filtroFecha + 'T00:00:00').toLocaleDateString()}`;
            worksheet.getCell('F1').font = { bold: true };
            worksheet.mergeCells('F2:G2');
            worksheet.getCell('F2').value = `Folio: ${folioParaReporte}`;
            worksheet.getCell('F2').font = { bold: true, color: { argb: 'FFC00000' } }; // Rojo

            const contentStartRow = 7;
            worksheet.mergeCells(`A${contentStartRow}:G${contentStartRow}`);
            worksheet.getCell(`A${contentStartRow}`).value = `Listado de Facturas - ${new Date(filtroFecha + 'T00:00:00').toLocaleDateString()}`;
            // ... (resto del código de estilos y datos del Excel es similar al anterior)
            const headerRow = worksheet.getRow(contentStartRow + 1);
            headerRow.height = 25;
            headerRow.values = ['Fecha', 'Número de Factura', 'ID Proveedor', 'Proveedor', 'Descripción', 'Monto', 'Estatus'];
            // ... (estilos de cabecera)

            facturasFiltradas.forEach(factura => {
                worksheet.addRow([
                    factura.fechaFactura.toDate(),
                    factura.numeroFactura,
                    // ... (resto de los datos)
                ]);
            });
            // ... (resto de los estilos de celda)

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Reporte_Facturas_${filtroFecha}_Folio_${folioParaReporte}.xlsx`);

        } catch (error) {
            console.error("Error al generar el archivo Excel del día:", error);
            alert("No se pudo generar el archivo: " + error.message);
        }
    };
    
    // La función 'generateExcel' general se mantiene sin cambios si la necesitas
    const generateExcel = async () => { /* ... tu código de Excel general ... */ };

    if (cargando) return <p className="loading-message">Cargando...</p>;
    if (!currentUser) return <div className="vista-container"><p className="auth-message">Necesitas autenticarte.</p></div>;

    return (
        <div className="vista-container">
            <h2>Lista de Facturas Registradas</h2>
            <div className="acciones-container">
                <div className="filtros">
                    <label htmlFor="filtroFecha">Filtrar por fecha:</label>
                    <input
                        type="date"
                        id="filtroFecha"
                        value={filtroFecha}
                        onChange={(e) => setFiltroFecha(e.target.value)}
                    />
                </div>
                <div className="botones-accion">
                    <Link to="/asignar-folio">
                        <button className="folio-button">Asignar Folio Inicial</button>
                    </Link>
                    <button 
                        onClick={generateExcelDelDia} 
                        disabled={!filtroFecha || facturasFiltradas.length === 0}
                        className="excel-button"
                    >
                        Excel del Día
                    </button>
                </div>
            </div>
            
            <div className="table-container">
                <table>
                    <thead>
                       {/* ... tu cabecera de tabla ... */}
                    </thead>
                    <tbody>
                        {error ? (
                            <tr><td colSpan="8" className="error-message">{error}</td></tr>
                        ) : facturasFiltradas.length === 0 ? (
                            <tr><td colSpan="8" className="empty-message">No hay facturas para la fecha seleccionada.</td></tr>
                        ) : (
                            facturasFiltradas.map(factura => (
                                <tr key={factura.id}>
                                    <td>{factura.fechaFactura.toDate().toLocaleDateString()}</td>
                                    <td>{factura.numeroFactura}</td>
                                    <td>{factura.idProveedor}</td>
                                    <td>{factura.nombreProveedor}</td>
                                    <td>{factura.descripcion || 'N/A'}</td>
                                    <td>{factura.monto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</td>
                                    <td className="status-cell" data-status={factura.estatus}>{factura.estatus}</td>
                                    <td>
                                        <Link to={`/factura/${factura.id}`}>
                                            <button className="detail-button">Ver Detalle</button>
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default VerFacturas;