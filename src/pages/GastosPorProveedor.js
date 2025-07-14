import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from "firebase/firestore";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useAuth } from '../auth/AuthContext';
import './css/vistasTablas.css';

function GastosPorProveedor() {
  const { currentUser } = useAuth();
  const [gastos, setGastos] = useState([]);
  const [cargando, setCargando] = useState(true);

  const getMontoClass = (monto, limite) => {
    if (!limite || limite <= 0) return 'cell-numeric';
    const porcentaje = (monto / limite) * 100;
    if (porcentaje > 90) return 'status-red cell-numeric';
    if (porcentaje > 75) return 'status-amber cell-numeric';
    return 'status-green cell-numeric';
  };
  
  useEffect(() => {
    const calcularGastos = async () => {
      if (!currentUser) {
        setCargando(false);
        return;
      }
      try {
        const facturasSnapshot = await getDocs(collection(db, "facturas"));
        const proveedoresSnapshot = await getDocs(collection(db, "proveedores"));
        const facturas = facturasSnapshot.docs.map(doc => doc.data());

        const limitesProveedor = {};
        proveedoresSnapshot.forEach(doc => {
            const data = doc.data();
            limitesProveedor[data.idProveedor] = data.limiteGasto || 0;
        });

        const gastosAgrupados = facturas.reduce((acc, factura) => {
          const { idProveedor, nombreProveedor, monto } = factura;
          
          if (!acc[idProveedor]) {
            acc[idProveedor] = { 
                nombre: nombreProveedor, 
                total: 0, 
                conteo: 0, 
                limite: limitesProveedor[idProveedor] || 0
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
          conteo: gastosAgrupados[id].conteo,
          limite: gastosAgrupados[id].limite
        })).sort((a, b) => b.total - a.total);

        setGastos(resultado);
      } catch (err) {
        console.error("Error calculando gastos: ", err);
      } finally {
        setCargando(false);
      }
    };

    calcularGastos();
  }, [currentUser]);

  const generateExcel = async (reportType) => {
    if (!currentUser) return alert("Necesitas autenticarte para generar reportes.");
    
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(reportType, {
        views: [{ state: 'frozen', ySplit: 2 }]
      });
      const colors = {
        green: 'FFD4EDDA',
        amber: 'FFFFF3CD',
        red: 'FFF8D7DA',
        header: 'FF2A4B7C',
        headerText: 'FFFFFFFF',
        limitCell: 'FFFFF4E6',
        limitText: 'FF721C24' // --- Color de texto solicitado
      };

      worksheet.addRow([`Totales por ${reportType}`]).font = { size: 16, bold: true };
      worksheet.mergeCells('A1:E1');
      worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };

      const headerRow = worksheet.addRow(['ID Proveedor', 'Nombre', 'Nº de Facturas', 'Monto Total', 'Límite de Gasto']);
      headerRow.eachCell((cell, colNumber) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.header } };
        cell.font = { bold: true, color: { argb: colors.headerText } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

        if (colNumber === 5) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.limitHeader } };
          cell.font = { bold: true, color: { argb: 'FF000000' } };
        }
      });
      
      gastos.forEach(gasto => {
        const row = worksheet.addRow([gasto.idProveedor, gasto.nombre, gasto.conteo, gasto.total, gasto.limite]);
        
        const montoCell = row.getCell(4);
        const limiteCell = row.getCell(5);

        montoCell.numFmt = '$#,##0.00';
        limiteCell.numFmt = '$#,##0.00';
        
        // --- INICIO DE MODIFICACIÓN EXCEL ---
        // Estilo para la celda de límite
        limiteCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.limitCell } };
        limiteCell.font = { bold: true, color: { argb: colors.limitText } }; // Aplicar color y negrita
        // --- FIN DE MODIFICACIÓN EXCEL ---

        // Lógica de color condicional para Monto Total
        if (gasto.limite && gasto.limite > 0) {
          const porcentaje = (gasto.total / gasto.limite) * 100;
          let color = '';
          if (porcentaje > 90) color = colors.red;
          else if (porcentaje > 75) color = colors.amber;
          else color = colors.green;
          if (color) {
            montoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color }};
          }
        }
      });
      
      worksheet.columns.forEach(column => { column.width = 25; });
      
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Reporte_Gastos_por_${reportType}.xlsx`);
    } catch (error) {
      console.error("Error al generar el archivo Excel:", error);
      alert("No se pudo generar el archivo de Excel.");
    }
  };

  if (cargando) return <p className="loading-message">Calculando gastos por proveedor...</p>;

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
      <button onClick={() => generateExcel('Proveedor')} disabled={gastos.length === 0} className="excel-button">
        Generar Excel
      </button>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID Proveedor</th>
              <th>Nombre del Proveedor</th>
              <th className="cell-numeric">Nº de Facturas</th>
              <th className="cell-numeric">Monto Total</th>
              {/* Se añade clase para el estilo de la cabecera del límite */}
              <th className="cell-numeric limit-column-header">Límite de Gasto</th>
            </tr>
          </thead>
          <tbody>
            {gastos.length === 0 ? (
              <tr><td colSpan="5" className="empty-message">No hay facturas registradas.</td></tr>
            ) : (
              gastos.map(gasto => (
                <tr key={gasto.idProveedor}>
                  <td>{gasto.idProveedor}</td>
                  <td>{gasto.nombre}</td>
                  <td className="cell-numeric">{gasto.conteo}</td>
                  <td className={getMontoClass(gasto.total, gasto.limite)}>
                    {gasto.total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                  </td>
                  {/* Se añade la clase para el estilo de la celda del límite */}
                  <td className="limit-column-cell cell-numeric">
                    {gasto.limite.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
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

export default GastosPorProveedor;