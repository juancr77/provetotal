import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from "firebase/firestore";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

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

  const generateExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Gastos por Mes');

      const response = await fetch('https://i.imgur.com/5mavo8r.png');
      const imageBuffer = await response.arrayBuffer();
      
      const imageId = workbook.addImage({
        buffer: imageBuffer,
        extension: 'png',
      });
      worksheet.addImage(imageId, 'A1:D4');

      worksheet.mergeCells('A5:D5');
      const titleCell = worksheet.getCell('A5');
      titleCell.value = 'Totales por Mes';
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.font = { bold: true, size: 16 };
      worksheet.getRow(5).height = 30;

      worksheet.getRow(6).values = ['Mes', 'Año', 'Nº de Facturas', 'Monto Total'];
      worksheet.getRow(6).font = { bold: true };

      gastos.forEach(gasto => {
        worksheet.addRow([
          nombresMeses[gasto.mes],
          gasto.anio,
          gasto.conteo,
          gasto.total
        ]);
      });

      worksheet.getColumn(4).numFmt = '$#,##0.00';
      worksheet.columns.forEach(column => { column.width = 20; });
      
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), 'Reporte_Gastos_por_Mes.xlsx');

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
      <button onClick={generateExcel} disabled={gastos.length === 0}>
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