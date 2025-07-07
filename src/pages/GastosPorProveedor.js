import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from "firebase/firestore";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

function GastosPorProveedor() {
  const [gastos, setGastos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const calcularGastos = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "facturas"));
        const facturas = querySnapshot.docs.map(doc => doc.data());

        const gastosAgrupados = facturas.reduce((acc, factura) => {
          const { idProveedor, nombreProveedor, monto } = factura;
          
          if (!acc[idProveedor]) {
            acc[idProveedor] = {
              nombre: nombreProveedor,
              total: 0,
              conteo: 0
            };
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
  }, []);

  const generateExcel = async (reportType) => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(reportType);

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
      titleCell.font = { bold: true, size: 16 };
      worksheet.getRow(contentStartRow).height = 30;

      const headerRow = worksheet.getRow(contentStartRow + 1);
      headerRow.font = { bold: true };

      if (reportType === 'Mes') {
        const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        headerRow.values = ['Mes', 'Año', 'Nº de Facturas', 'Monto Total'];
        gastos.forEach(gasto => {
          worksheet.addRow([
            nombresMeses[gasto.mes], gasto.anio, gasto.conteo, gasto.total
          ]);
        });
      } else { 
        headerRow.values = ['ID Proveedor', 'Nombre', 'Nº de Facturas', 'Monto Total'];
        gastos.forEach(gasto => {
          worksheet.addRow([
            gasto.idProveedor, gasto.nombre, gasto.conteo, gasto.total
          ]);
        });
      }
      
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
    return <p>Calculando gastos por proveedor...</p>;
  }

  return (
    <div>
      <h2>Reporte de Gastos por Proveedor</h2>
      <button onClick={() => generateExcel('Proveedor')} disabled={gastos.length === 0}>
        Generar Excel
      </button>
      <table border="1" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
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
            <tr><td colSpan="4">No hay facturas registradas.</td></tr>
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
  );
}

export default GastosPorProveedor;