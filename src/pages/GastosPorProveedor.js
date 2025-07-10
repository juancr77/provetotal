import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from "firebase/firestore";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useAuth } from '../auth/AuthContext'; // Se importa el hook de autenticación
import './css/vistasTablas.css'; 

function GastosPorProveedor() {
  const { currentUser } = useAuth(); // Se obtiene el estado del usuario
  const [gastos, setGastos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const calcularGastos = async () => {
      // Si no hay usuario, no se intenta cargar nada.
      if (!currentUser) {
        setCargando(false);
        return;
      }
      try {
        const querySnapshot = await getDocs(collection(db, "facturas"));
        const facturas = querySnapshot.docs.map(doc => doc.data());

        const gastosAgrupados = facturas.reduce((acc, factura) => {
          const { idProveedor, nombreProveedor, monto } = factura;
          
          if (!acc[idProveedor]) {
            acc[idProveedor] = { nombre: nombreProveedor, total: 0, conteo: 0 };
          }
          acc[idProveedor].total += monto;
          acc[idProveedor].conteo += 1;
          return acc;
        }, {});

        const resultado = Object.keys(gastosAgrupados).map(id => ({
          idProveedor: id,
          nombre: gastosAgrupados[id].nombre,
          total: gastosAgrupados[id].total,
          conteo: gastosAgrupados[id].conteo
        }));

        setGastos(resultado);
      } catch (err) {
        console.error("Error calculando gastos: ", err);
      } finally {
        setCargando(false);
      }
    };

    calcularGastos();
  }, [currentUser]); // Se añade currentUser como dependencia

  const generateExcel = async (reportType) => {
    // Se protege la función
    if (!currentUser) {
      return alert("Necesitas autenticarte para generar reportes.");
    }
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(reportType, {
        views: [{ state: 'frozen', ySplit: 7 }]
      });

      const response = await fetch('https://i.imgur.com/5mavo8r.png');
      const imageBuffer = await response.arrayBuffer();
      const imageId = workbook.addImage({
        buffer: imageBuffer,
        extension: 'png',
      });
      worksheet.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 350, height: 88 }
      });
      
      const contentStartRow = 6;

      worksheet.mergeCells(`A${contentStartRow}:D${contentStartRow}`);
      const titleCell = worksheet.getCell(`A${contentStartRow}`);
      titleCell.value = `Totales por ${reportType}`;
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.font = { bold: true, size: 16, color: { argb: 'FF2A4B7C' } };
      worksheet.getRow(contentStartRow).height = 30;

      const headerRow = worksheet.getRow(contentStartRow + 1);
      headerRow.height = 25;
      
      headerRow.values = ['ID Proveedor', 'Nombre', 'Nº de Facturas', 'Monto Total'];

      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A4B7C' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
      
      gastos.forEach(gasto => {
        worksheet.addRow([
          gasto.idProveedor, gasto.nombre, gasto.conteo, gasto.total
        ]);
      });

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
            if (rowNumber % 2 === 0) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
            }
          }
        }
      });
      
      worksheet.getColumn(4).numFmt = '$#,##0.00';
      worksheet.columns.forEach(column => { column.width = 25; });
      
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Reporte_Gastos_por_${reportType}.xlsx`);

    } catch (error) {
      console.error("Error al generar el archivo Excel:", error);
      alert("No se pudo generar el archivo de Excel. Revisa la consola para más detalles.");
    }
  };

  if (cargando) {
    return <p className="loading-message">Calculando gastos por proveedor...</p>;
  }

  // Si no hay usuario, se muestra el mensaje de autenticación.
  if (!currentUser) {
    return (
      <div className="vista-container">
        <h2>Reporte de Gastos por Proveedor</h2>
        <p className="auth-message">Necesitas autenticarte para ver este reporte.</p>
      </div>
    );
  }

  return (
    <div className="vista-container">
      <h2>Reporte de Gastos por Proveedor</h2>
      <button 
        onClick={() => generateExcel('Proveedor')} 
        disabled={gastos.length === 0}
        className="excel-button"
      >
        Generar Excel
      </button>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID Proveedor</th>
              <th>Nombre del Proveedor</th>
              <th>Nº de Facturas</th>
              <th>Monto Total</th>
            </tr>
          </thead>
          <tbody>
            {gastos.length === 0 ? (
              <tr>
                <td colSpan="4" className="empty-message">No hay facturas registradas.</td>
              </tr>
            ) : (
              gastos.map(gasto => (
                <tr key={gasto.idProveedor}>
                  <td>{gasto.idProveedor}</td>
                  <td>{gasto.nombre}</td>
                  <td>{gasto.conteo}</td>
                  <td>{gasto.total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default GastosPorProveedor;