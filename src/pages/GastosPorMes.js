import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from "firebase/firestore";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import './css/vistasTablas.css'; // Correctamente importado

function GastosPorMes() {
  const [gastos, setGastos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  useEffect(() => {
    const calcularGastos = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "facturas"));
        const facturas = querySnapshot.docs.map(doc => doc.data());

        const gastosAgrupados = facturas.reduce((acc, factura) => {
          const fecha = factura.fechaFactura.toDate();
          const anio = fecha.getFullYear();
          const mes = fecha.getMonth();
          const clave = `${anio}-${mes}`;

          if (!acc[clave]) {
            acc[clave] = { anio, mes, total: 0, conteo: 0 };
          }
          acc[clave].total += factura.monto;
          acc[clave].conteo += 1;
          return acc;
        }, {});

        const resultado = Object.values(gastosAgrupados).sort((a, b) => b.anio - a.anio || b.mes - a.mes);
        setGastos(resultado);
      } catch (err) {
        console.error("Error calculando gastos: ", err);
      } finally {
        setCargando(false);
      }
    };

    calcularGastos();
  }, []);

  const generateExcel = async (reportType) => {
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
      
      if (reportType === 'Mes') {
        headerRow.values = ['Mes', 'Año', 'Nº de Facturas', 'Monto Total'];
      } else { 
        headerRow.values = ['ID Proveedor', 'Nombre', 'Nº de Facturas', 'Monto Total'];
      }

      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2A4B7C' }
        };
        cell.font = {
          bold: true,
          color: { argb: 'FFFFFFFF' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
      
      if (reportType === 'Mes') {
        gastos.forEach(gasto => {
          worksheet.addRow([
            nombresMeses[gasto.mes], gasto.anio, gasto.conteo, gasto.total
          ]);
        });
      } else { 
        gastos.forEach(gasto => {
          worksheet.addRow([
            gasto.idProveedor, gasto.nombre, gasto.conteo, gasto.total
          ]);
        });
      }

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
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF2F2F2' }
              };
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
    return <p>Calculando gastos por mes...</p>;
  }

  return (
    <div>
      <h2>Reporte de Gastos por Mes</h2>
      <button onClick={() => generateExcel('Mes')} disabled={gastos.length === 0}>
        Generar Excel
      </button>
      <table border="1" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
        <thead>
          <tr>
            <th>Mes</th>
            <th>Año</th>
            <th>Nº de Facturas</th>
            <th>Monto Total</th>
          </tr>
        </thead>
        <tbody>
          {gastos.length === 0 ? (
            <tr><td colSpan="4">No hay facturas registradas.</td></tr>
          ) : (
            gastos.map(gasto => (
              <tr key={`${gasto.anio}-${gasto.mes}`}>
                <td>{nombresMeses[gasto.mes]}</td>
                <td>{gasto.anio}</td>
                <td>{gasto.conteo}</td>
                <td>{gasto.total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default GastosPorMes;