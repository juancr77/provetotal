import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { Link } from 'react-router-dom';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import './css/VerFacturas.css';

function VerFacturas() {
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const obtenerFacturas = async () => {
      try {
        const facturasRef = collection(db, "facturas");
        const q = query(facturasRef, orderBy("fechaFactura", "desc"));
        const querySnapshot = await getDocs(q);
        
        const listaFacturas = querySnapshot.docs.map(doc => ({
          ...doc.data(), 
          id: doc.id 
        }));

        setFacturas(listaFacturas);
      } catch (err) {
        setError("No se pudieron cargar los datos de las facturas.");
        console.error("Error al obtener las facturas: ", err);
      } finally {
        setCargando(false);
      }
    };

    obtenerFacturas();
  }, []);

  const generateExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Listado de Facturas", {
        views: [{ state: 'frozen', ySplit: 7 }]
      });

      // --- Imagen y Título ---
      const response = await fetch('https://i.imgur.com/5mavo8r.png');
      const imageBuffer = await response.arrayBuffer();
      const imageId = workbook.addImage({ buffer: imageBuffer, extension: 'png' });
      worksheet.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 350, height: 88 }
      });
      
      const contentStartRow = 6;
      worksheet.mergeCells(`A${contentStartRow}:G${contentStartRow}`);
      const titleCell = worksheet.getCell(`A${contentStartRow}`);
      titleCell.value = "Listado de Facturas";
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.font = { bold: true, size: 16, color: { argb: 'FF2A4B7C' } };
      worksheet.getRow(contentStartRow).height = 30;

      // --- Encabezados ---
      const headerRow = worksheet.getRow(contentStartRow + 1);
      headerRow.height = 25;
      headerRow.values = ['Fecha', 'Número de Factura', 'ID Proveedor', 'Proveedor', 'Descripción', 'Monto', 'Estatus'];
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A4B7C' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      // --- Datos ---
      facturas.forEach(factura => {
        const row = worksheet.addRow([
          factura.fechaFactura.toDate(),
          factura.numeroFactura,
          factura.idProveedor,
          factura.nombreProveedor,
          factura.descripcion || '',
          factura.monto,
          factura.estatus
        ]);
      });

      const statusColors = {
        'Pendiente': 'FFFFC7CE', 'Recibida': 'FFFFFF00', 'Con solventación': 'FFFFC0CB',
        'En contabilidad': 'FFADD8E6', 'Pagada': 'FFC6EFCE'
      };

      const columnCount = headerRow.cellCount;
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber > contentStartRow + 1) {
          for (let i = 1; i <= columnCount; i++) {
            const cell = row.getCell(i);
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFD9D9D9' } }, 
              left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
              bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } }, 
              right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
            };
            if (rowNumber % 2 === 0 && i !== 7) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' }};
            }
          }
          const statusCell = row.getCell(7);
          const statusColor = statusColors[statusCell.value];
          if (statusColor) {
            statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColor }};
          }
        }
      });
      
      worksheet.getColumn(1).numFmt = 'dd/mm/yyyy';
      worksheet.getColumn(6).numFmt = '$#,##0.00';
      worksheet.columns.forEach(column => { column.width = 25; });
      
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), 'Listado_de_Facturas.xlsx');

    } catch (error) {
      console.error("Error al generar el archivo Excel:", error);
      alert("No se pudo generar el archivo de Excel. Revisa la consola para más detalles.");
    }
  };

  if (cargando) {
    return <p className="loading-message">Cargando facturas...</p>;
  }
  if (error) {
    return <p className="error-message">{error}</p>;
  }

  return (
    <div className="facturas-container">
      <h2>Lista de Facturas Registradas</h2>
      <button 
        onClick={generateExcel} 
        disabled={facturas.length === 0} 
        className="excel-button"
      >
        Generar Excel
      </button>
      
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
            {facturas.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-message">No hay facturas registradas.</td>
              </tr>
            ) : (
              facturas.map(factura => (
                <tr key={factura.id}>
                  <td>{factura.fechaFactura.toDate().toLocaleDateString()}</td>
                  <td>{factura.numeroFactura}</td>
                  <td>{factura.idProveedor}</td>
                  <td>{factura.nombreProveedor}</td>
                  <td>{factura.descripcion || 'N/A'}</td>
                  <td>{factura.monto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</td>
                  <td data-status={factura.estatus}>{factura.estatus}</td>
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