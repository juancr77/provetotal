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

    // --- FUNCIÓN RESTAURADA PARA EL REPORTE GENERAL ---
    const generateExcel = async () => {
        if (!currentUser) return alert("Necesitas autenticarte.");
        
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Listado de Facturas", {
            views: [{ state: 'frozen', ySplit: 7 }]
        });

        const response = await fetch('https://i.imgur.com/5mavo8r.png');
        const imageBuffer = await response.arrayBuffer();
        const imageId = workbook.addImage({ buffer: imageBuffer, extension: 'png' });
        worksheet.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 350, height: 88 }});
        
        const contentStartRow = 6;
        worksheet.mergeCells(`A${contentStartRow}:G${contentStartRow}`);
        const titleCell = worksheet.getCell(`A${contentStartRow}`);
        titleCell.value = "Listado General de Facturas";
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.font = { bold: true, size: 16, color: { argb: 'FF2A4B7C' } };
        worksheet.getRow(contentStartRow).height = 30;

        const headerRow = worksheet.getRow(contentStartRow + 1);
        headerRow.height = 25;
        headerRow.values = ['Fecha', 'Número de Factura', 'ID Proveedor', 'Proveedor', 'Descripción', 'Monto', 'Estatus'];
        headerRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A4B7C' } };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        facturas.forEach(factura => {
            worksheet.addRow([
                factura.fechaFactura.toDate(),
                factura.numeroFactura,
                factura.idProveedor,
                factura.nombreProveedor,
                factura.descripcion || '',
                factura.monto,
                factura.estatus
            ]);
        });
        
        // El resto del código de formato y guardado para el Excel general...
        const statusColors = { 'Pendiente': 'FFFFC7CE', 'Recibida': 'FFFFFF00', 'Con solventación': 'FFFFC0CB', 'En contabilidad': 'FFADD8E6', 'Pagada': 'FFC6EFCE' };
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber > contentStartRow + 1) {
                row.eachCell({ includeEmpty: true }, cell => { cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
                if (rowNumber % 2 === 0) {
                    row.eachCell({ includeEmpty: true }, (cell, colNumber) => { if (colNumber !== 7) { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' }}; }});
                }
                const statusCell = row.getCell(7);
                const statusColor = statusColors[statusCell.value];
                if (statusColor) { statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColor }}; }
            }
        });
        
        worksheet.getColumn(1).numFmt = 'dd/mm/yyyy';
        worksheet.getColumn(6).numFmt = '$#,##0.00';
        worksheet.columns.forEach(column => { column.width = 25; });
        
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), 'Listado_General_Facturas.xlsx');
    };

    // --- FUNCIÓN CORREGIDA PARA EL REPORTE DEL DÍA ---
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

            const response = await fetch('https://i.imgur.com/5mavo8r.png');
            const imageBuffer = await response.arrayBuffer();
            const imageId = workbook.addImage({ buffer: imageBuffer, extension: 'png' });
            worksheet.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 350, height: 88 }});

            worksheet.getRow(6).height = 20; // Espacio entre imagen y datos
            
            worksheet.mergeCells('A7:C7');
            worksheet.getCell('A7').value = `Fecha del Reporte: ${new Date(filtroFecha + 'T00:00:00').toLocaleDateString()}`;
            worksheet.getCell('A7').font = { bold: true, size: 12 };

            worksheet.mergeCells('E7:G7');
            worksheet.getCell('E7').alignment = { horizontal: 'right' };
            worksheet.getCell('E7').value = `Folio: ${formattedFolio}`;
            worksheet.getCell('E7').font = { bold: true, size: 14, color: { argb: 'FFC00000' } };

            const titleRow = worksheet.getRow(8);
            titleRow.height = 30;
            worksheet.mergeCells('A8:G8');
            const titleCell = worksheet.getCell('A8');
            titleCell.value = `Listado de Facturas - ${new Date(filtroFecha + 'T00:00:00').toLocaleDateString()}`;
            titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
            titleCell.font = { bold: true, size: 16, color: { argb: 'FF2A4B7C' } };

            const headerRow = worksheet.getRow(9);
            headerRow.height = 25;
            headerRow.values = ['Fecha', 'Número de Factura', 'ID Proveedor', 'Proveedor', 'Descripción', 'Monto', 'Estatus'];
            headerRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A4B7C' } };
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            });

            facturasFiltradas.forEach(factura => {
                worksheet.addRow([
                    factura.fechaFactura.toDate(),
                    factura.numeroFactura,
                    factura.idProveedor,
                    factura.nombreProveedor,
                    factura.descripcion || '',
                    factura.monto,
                    factura.estatus
                ]);
            });

            const statusColors = { 'Pendiente': 'FFFFC7CE', 'Recibida': 'FFFFFF00', 'Con solventación': 'FFFFC0CB', 'En contabilidad': 'FFADD8E6', 'Pagada': 'FFC6EFCE' };
            worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                if (rowNumber > 9) { // Empezar a estilizar después de la cabecera
                    row.eachCell({ includeEmpty: true }, cell => { cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
                    if (rowNumber % 2 !== 0) { // Filas impares (11, 13...) para el estilo cebra
                        row.eachCell({ includeEmpty: true }, (cell, colNumber) => { if (colNumber !== 7) { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' }}; }});
                    }
                    const statusCell = row.getCell(7);
                    const statusColor = statusColors[statusCell.value];
                    if (statusColor) { statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColor }}; }
                }
            });

            worksheet.getColumn(1).numFmt = 'dd/mm/yyyy';
            worksheet.getColumn(6).numFmt = '$#,##0.00';
            worksheet.columns.forEach(column => { column.width = 25; });

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
                    <button 
                        onClick={generateExcel} 
                        disabled={facturas.length === 0} 
                        className="excel-button"
                        style={{backgroundColor: '#007bff'}} // Color diferente para distinguirlo
                    >
                        Excel General
                    </button>
                </div>
            </div>
            
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Número de Factura</th>
                            <th>ID Proveedor</th>
                            <th>Proveedor</th>
                            <th>Descripción</th>
                            <th>Monto</th>
                            <th>Estatus</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {error ? (
                            <tr><td colSpan="8" className="error-message">{error}</td></tr>
                        ) : facturasFiltradas.length === 0 ? (
                            <tr><td colSpan="8" className="empty-message">No hay facturas para mostrar.</td></tr>
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