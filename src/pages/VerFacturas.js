import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { Link } from 'react-router-dom';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

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
      worksheet.mergeCells(`A${contentStartRow}:F${contentStartRow}`); // Se expande a 6 columnas
      const titleCell = worksheet.getCell(`A${contentStartRow}`);
      titleCell.value = "Listado de Facturas";
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.font = { bold: true, size: 16, color: { argb: 'FF2A4B7C' } };
      worksheet.getRow(contentStartRow).height = 30;

      // --- Encabezados ---
      const headerRow = worksheet.getRow(contentStartRow + 1);
      headerRow.height = 25;
      headerRow.values = ['Fecha', 'Número de Factura', 'Proveedor', 'Descripción', 'Monto', 'Estatus'];
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A4B7C' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      // --- Datos y Formato Condicional ---
      facturas.forEach(factura => {
        const row = worksheet.addRow([
          factura.fechaFactura.toDate(),
          factura.numeroFactura,
          factura.nombreProveedor,
          factura.descripcion || '',
          factura.monto,
          factura.estatus
        ]);
      });

      // Se definen los colores para cada estatus
      const statusColors = {
        'Pendiente': 'FFFFC7CE', // Rojo claro
        'Recibida': 'FFFFFF00',   // Amarillo
        'Con solventación': 'FFFFC0CB', // Rosa pastel
        'En contabilidad': 'FFADD8E6', // Azul celeste
        'Pagada': 'FFC6EFCE'    // Verde claro
      };

      const columnCount = headerRow.cellCount;
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber > contentStartRow + 1) {
          for (let i = 1; i <= columnCount; i++) {
            const cell = row.getCell(i);
            // Bordes para todas las celdas
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
              left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
              bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
              right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
            };
            // Se aplica color de fondo a filas pares, excepto a la de estatus
            if (rowNumber % 2 === 0 && i !== 6) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' }};
            }
          }
          // Se aplica el color condicional a la celda de Estatus (columna 6)
          const statusCell = row.getCell(6);
          const statusColor = statusColors[statusCell.value];
          if (statusColor) {
            statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColor }};
          }
        }
      });
      
      // --- Formato Final y Descarga ---
      worksheet.getColumn(1).numFmt = 'dd/mm/yyyy';
      worksheet.getColumn(5).numFmt = '$#,##0.00';
      worksheet.columns.forEach(column => { column.width = 25; });
      
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), 'Listado_de_Facturas.xlsx');

    } catch (error) {
      console.error("Error al generar el archivo Excel:", error);
      alert("No se pudo generar el archivo de Excel. Revisa la consola para más detalles.");
    }
  };

  if (cargando) {
    return <p>Cargando facturas...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  return (
    <div>
      <h2>Lista de Facturas Registradas</h2>
      <button onClick={generateExcel} disabled={facturas.length === 0} style={{marginBottom: '10px'}}>
        Generar Excel
      </button>
      <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Número de Factura</th>
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
              <td colSpan="7">No hay facturas registradas.</td>
            </tr>
          ) : (
            facturas.map(factura => (
              <tr key={factura.id}>
                <td>{factura.fechaFactura.toDate().toLocaleDateString()}</td>
                <td>{factura.numeroFactura}</td>
                <td>{factura.nombreProveedor}</td>
                <td>{factura.descripcion || 'N/A'}</td>
                <td>{factura.monto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</td>
                <td>{factura.estatus}</td>
                <td>
                  <Link to={`/factura/${factura.id}`}>
                    <button>Ver Detalle</button>
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default VerFacturas;