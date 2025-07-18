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
    const [facturas, setFacturas] = useState([]);
    const [facturasFiltradas, setFacturasFiltradas] = useState([]);
    const [filtroFecha, setFiltroFecha] = useState('');
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const obtenerFacturas = async () => {
            if (!currentUser) { setCargando(false); return; }
            try {
                const facturasRef = collection(db, "facturas");
                const q = query(facturasRef, orderBy("fechaFactura", "desc"));
                const querySnapshot = await getDocs(q);
                const listaFacturas = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                setFacturas(listaFacturas);
                setFacturasFiltradas(listaFacturas);
            } catch (err) {
                setError("No se pudieron cargar los datos de las facturas.");
                console.error("Error al obtener las facturas: ", err);
            } finally {
                setCargando(false);
            }
        };
        obtenerFacturas();
    }, [currentUser]);

    useEffect(() => {
        if (filtroFecha) {
            const fechaSeleccionada = new Date(filtroFecha + 'T00:00:00');
            const inicioDia = new Date(fechaSeleccionada.getFullYear(), fechaSeleccionada.getMonth(), fechaSeleccionada.getDate());
            const finDia = new Date(inicioDia.getTime() + (24 * 60 * 60 * 1000 - 1));

            const filtradas = facturas.filter(factura => {
                const fechaFactura = factura.fechaFactura.toDate();
                return fechaFactura >= inicioDia && fechaFactura <= finDia;
            });
            setFacturasFiltradas(filtradas);
        } else {
            setFacturasFiltradas(facturas);
        }
    }, [filtroFecha, facturas]);

    // --- FUNCIÓN MODIFICADA: Ignora los encabezados para el cálculo ---
    const autoFitColumns = (worksheet, headerRowNumber) => {
        worksheet.columns.forEach(column => {
            let maxLength = 0;
            // Solo se itera sobre las celdas que están DESPUÉS de la cabecera
            column.eachCell({ includeEmpty: true }, (cell, rowNum) => {
                if (rowNum > headerRowNumber) {
                    const cellLength = cell.value ? cell.value.toString().length : 0;
                    if (cellLength > maxLength) {
                        maxLength = cellLength;
                    }
                }
            });
            column.width = maxLength < 10 ? 10 : maxLength + 2;
            if (column.width > 50) column.width = 50;
        });
    };

    const generateExcel = async () => {
        if (!currentUser) return alert("Necesitas autenticarte.");
        
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Listado de Facturas", {
            views: [{ state: 'frozen', ySplit: 7 }]
        });

        worksheet.pageSetup = {
            paperSize: 9,
            orientation: 'landscape',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 1
        };

        const response = await fetch('https://i.imgur.com/5mavo8r.png');
        const imageBuffer = await response.arrayBuffer();
        const imageId = workbook.addImage({ buffer: imageBuffer, extension: 'png' });
        worksheet.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 350, height: 88 }});
        
        const contentStartRow = 6;
        worksheet.mergeCells(`A${contentStartRow}:J${contentStartRow}`);
        const titleCell = worksheet.getCell(`A${contentStartRow}`);
        titleCell.value = "Listado General de Facturas";
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.font = { bold: true, size: 16, color: { argb: 'FF2A4B7C' } };
        worksheet.getRow(contentStartRow).height = 30;

        const headerRow = worksheet.getRow(contentStartRow + 1);
        headerRow.height = 40; // Se aumenta un poco la altura para el texto ajustado
        headerRow.values = ['Fecha', 'Número de Factura', 'Dependencia', 'ID Proveedor', 'Proveedor', 'Descripción', 'Monto', 'Estatus', 'Forma de Pago', 'Fecha de Pago'];
        headerRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A4B7C' } };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            // --- CAMBIO CLAVE: Se añade el ajuste de texto ---
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });

        facturas.forEach(factura => {
            worksheet.addRow([
                factura.fechaFactura.toDate(),
                factura.numeroFactura,
                factura.dependencia || 'N/A',
                factura.idProveedor,
                factura.nombreProveedor,
                factura.descripcion || '',
                factura.monto,
                factura.estatus,
                factura.formaDePago || 'N/A',
                factura.fechaDePago ? factura.fechaDePago.toDate() : 'Pendiente'
            ]);
        });
        
        const statusColors = { 'Pendiente': 'FFFFC7CE', 'Recibida': 'FFFFFF00', 'Con solventación': 'FFFFC0CB', 'En contabilidad': 'FFADD8E6', 'Pagada': 'FFC6EFCE' };
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber > headerRow.rowNumber) {
                row.eachCell({ includeEmpty: true }, cell => { cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
                if (rowNumber % 2 === 0) {
                    row.eachCell({ includeEmpty: true }, (cell, colNumber) => { if (colNumber !== 8) { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' }}; }});
                }
                const statusCell = row.getCell(8);
                const statusColor = statusColors[statusCell.value];
                if (statusColor) { statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColor }}; }
            }
        });
        
        worksheet.getColumn(1).numFmt = 'dd/mm/yyyy';
        worksheet.getColumn(7).numFmt = '$#,##0.00';
        worksheet.getColumn(10).numFmt = 'dd/mm/yyyy';

        autoFitColumns(worksheet, headerRow.rowNumber);
        
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), 'Listado_General_Facturas.xlsx');
    };

    const generateExcelDelDia = async () => {
        if (!currentUser) return alert("Necesitas autenticarte.");
        if (!filtroFecha || facturasFiltradas.length === 0) {
            return alert("Selecciona una fecha con facturas para generar el reporte.");
        }

        const folioRef = doc(db, "numeroFolio", "folioActual");

        try {
            const folioParaReporte = await runTransaction(db, async (transaction) => {
                const folioDoc = await transaction.get(folioRef);
                if (!folioDoc.exists()) throw new Error("Folio no asignado. Ve a 'Asignar Folio Inicial'.");
                const folioActual = folioDoc.data().valor;
                transaction.update(folioRef, { valor: folioActual + 1 });
                return folioActual;
            });

            const formattedFolio = String(folioParaReporte).padStart(5, '0');

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Reporte del Día", {
                views: [{ state: 'frozen', ySplit: 9 }]
            });
            
            worksheet.pageSetup = {
                paperSize: 9,
                orientation: 'landscape',
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 1
            };

            const response = await fetch('https://i.imgur.com/5mavo8r.png');
            const imageBuffer = await response.arrayBuffer();
            const imageId = workbook.addImage({ buffer: imageBuffer, extension: 'png' });
            worksheet.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 350, height: 88 }});

            worksheet.getRow(6).height = 20;
            worksheet.mergeCells('A7:C7');
            worksheet.getCell('A7').value = `Fecha del Reporte: ${new Date(filtroFecha + 'T00:00:00').toLocaleDateString()}`;
            worksheet.getCell('A7').font = { bold: true, size: 12 };
            worksheet.mergeCells('H7:J7');
            worksheet.getCell('H7').alignment = { horizontal: 'right' };
            worksheet.getCell('H7').value = `Folio: ${formattedFolio}`;
            worksheet.getCell('H7').font = { bold: true, size: 14, color: { argb: 'FFC00000' } };

            const titleRow = worksheet.getRow(8);
            titleRow.height = 30;
            worksheet.mergeCells('A8:J8');
            const titleCell = worksheet.getCell('A8');
            titleCell.value = `Listado de Facturas - ${new Date(filtroFecha + 'T00:00:00').toLocaleDateString()}`;
            titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
            titleCell.font = { bold: true, size: 16, color: { argb: 'FF2A4B7C' } };

            const headerRow = worksheet.getRow(9);
            headerRow.height = 40; // Se aumenta un poco la altura para el texto ajustado
            headerRow.values = ['Fecha', 'Número de Factura', 'Dependencia', 'ID Proveedor', 'Proveedor', 'Descripción', 'Monto', 'Estatus', 'Forma de Pago', 'Fecha de Pago'];
            headerRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A4B7C' } };
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                // --- CAMBIO CLAVE: Se añade el ajuste de texto ---
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            });

            facturasFiltradas.forEach(factura => {
                worksheet.addRow([
                    factura.fechaFactura.toDate(),
                    factura.numeroFactura,
                    factura.dependencia || 'N/A',
                    factura.idProveedor,
                    factura.nombreProveedor,
                    factura.descripcion || '',
                    factura.monto,
                    factura.estatus,
                    factura.formaDePago || 'N/A',
                    factura.fechaDePago ? factura.fechaDePago.toDate() : 'Pendiente'
                ]);
            });

            const statusColors = { 'Pendiente': 'FFFFC7CE', 'Recibida': 'FFFFFF00', 'Con solventación': 'FFFFC0CB', 'En contabilidad': 'FFADD8E6', 'Pagada': 'FFC6EFCE' };
            worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                if (rowNumber > headerRow.rowNumber) {
                    row.eachCell({ includeEmpty: true }, cell => { cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
                    if (rowNumber % 2 !== 0) {
                        row.eachCell({ includeEmpty: true }, (cell, colNumber) => { if (colNumber !== 8) { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' }}; }});
                    }
                    const statusCell = row.getCell(8);
                    const statusColor = statusColors[statusCell.value];
                    if (statusColor) { statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColor }}; }
                }
            });

            worksheet.getColumn(1).numFmt = 'dd/mm/yyyy';
            worksheet.getColumn(7).numFmt = '$#,##0.00';
            worksheet.getColumn(10).numFmt = 'dd/mm/yyyy';
            
            autoFitColumns(worksheet, headerRow.rowNumber);

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Reporte_Facturas_${filtroFecha}_Folio_${formattedFolio}.xlsx`);

        } catch (error) {
            console.error("Error al generar el archivo Excel del día:", error);
            alert("No se pudo generar el archivo: " + error.message);
        }
    };
    
    if (cargando) return <p className="loading-message">Cargando...</p>;
    if (!currentUser) return <div className="vista-container"><p className="auth-message">Necesitas autenticarte.</p></div>;

    return (
        <div className="vista-container">
            <h2>Lista de Facturas Registradas</h2>
            <div className="acciones-container">
                <div className="filtros">
                    <label htmlFor="filtroFecha">Filtrar por fecha:</label>
                    <input type="date" id="filtroFecha" value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)} />
                </div>
                <div className="botones-accion">
                    <Link to="/asignar-folio"><button className="folio-button">Asignar Folio Inicial</button></Link>
                    <button onClick={generateExcelDelDia} disabled={!filtroFecha || facturasFiltradas.length === 0} className="excel-button">Excel del Día</button>
                    <button onClick={generateExcel} disabled={facturas.length === 0} className="excel-button" style={{backgroundColor: '#007bff'}}>Excel General</button>
                </div>
            </div>
            
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Número de Factura</th>
                            <th>Dependencia</th>
                            <th>ID Proveedor</th>
                            <th>Proveedor</th>
                            <th>Descripción</th>
                            <th>Monto</th>
                            <th>Estatus</th>
                            <th>Forma de Pago</th>
                            <th>Fecha de Pago</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {error ? (
                            <tr><td colSpan="11" className="error-message">{error}</td></tr>
                        ) : facturasFiltradas.length === 0 ? (
                            <tr><td colSpan="11" className="empty-message">No hay facturas para mostrar.</td></tr>
                        ) : (
                            facturasFiltradas.map(factura => (
                                <tr key={factura.id}>
                                    <td>{factura.fechaFactura.toDate().toLocaleDateString()}</td>
                                    <td>{factura.numeroFactura}</td>
                                    <td>{factura.dependencia || 'N/A'}</td>
                                    <td>{factura.idProveedor}</td>
                                    <td>{factura.nombreProveedor}</td>
                                    <td>{factura.descripcion || 'N/A'}</td>
                                    <td>{factura.monto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</td>
                                    <td><span data-status={factura.estatus}>{factura.estatus}</span></td>
                                    <td>{factura.formaDePago || 'N/A'}</td>
                                    <td>{factura.fechaDePago ? factura.fechaDePago.toDate().toLocaleDateString() : 'Pendiente'}</td>
                                    <td>
                                        <Link to={`/factura/${factura.id}`}><button className="detail-button">Ver Detalle</button></Link>
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
//si tu lo deseeas puede svolar
export default VerFacturas;