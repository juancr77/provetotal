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

  // --- INICIO: CÓDIGO AÑADIDO PARA LÍMITES Y COLORES ---
  const getMontoClass = (monto, limite) => {
    if (!limite || limite <= 0) {
      return ''; // No hay límite, no se aplica color.
    }
    const porcentaje = (monto / limite) * 100;
    if (porcentaje > 90) {
      return 'status-red'; // Peligro
    }
    if (porcentaje > 75) {
      return 'status-amber'; // Advertencia
    }
    return 'status-green'; // Seguro
  };
  // --- FIN: CÓDIGO AÑADIDO ---
  
  useEffect(() => {
    const calcularGastos = async () => {
      if (!currentUser) {
        setCargando(false);
        return;
      }
      try {
        // --- INICIO: OBTENER DATOS DE FACTURAS Y PROVEEDORES ---
        const facturasSnapshot = await getDocs(collection(db, "facturas"));
        const proveedoresSnapshot = await getDocs(collection(db, "proveedores"));

        const facturas = facturasSnapshot.docs.map(doc => doc.data());

        const limitesProveedor = {};
        proveedoresSnapshot.forEach(doc => {
            const data = doc.data();
            // Asumimos que el ID único del proveedor está en 'idProveedor'
            limitesProveedor[data.idProveedor] = data.limiteGasto || 0;
        });

        const gastosAgrupados = facturas.reduce((acc, factura) => {
          const { idProveedor, nombreProveedor, monto } = factura;
          
          if (!acc[idProveedor]) {
            acc[idProveedor] = { 
                nombre: nombreProveedor, 
                total: 0, 
                conteo: 0, 
                limite: limitesProveedor[idProveedor] || 0 // Añadir límite al objeto
            };
          }
          acc[idProveedor].total += monto;
          acc[idProveedor].conteo += 1;
          return acc;
        }, {});
        // --- FIN: OBTENER DATOS DE FACTURAS Y PROVEEDORES ---

        const resultado = Object.keys(gastosAgrupados).map(id => ({
          idProveedor: id,
          nombre: gastosAgrupados[id].nombre,
          total: gastosAgrupados[id].total,
          conteo: gastosAgrupados[id].conteo,
          limite: gastosAgrupados[id].limite // Añadir límite al resultado final
        })).sort((a, b) => b.total - a.total); // Ordenar por monto total

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
    if (!currentUser) {
      return alert("Necesitas autenticarte para generar reportes.");
    }
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(reportType, {
        views: [{ state: 'frozen', ySplit: 2 }]
      });

      // --- INICIO: CAMBIOS PARA EXCEL ---
      const colors = {
        green: 'FFD4EDDA',
        amber: 'FFFFF3CD',
        red: 'FFF8D7DA',
        header: 'FF2A4B7C',
        headerText: 'FFFFFFFF',
      };

      worksheet.addRow([`Totales por ${reportType}`]).font = { size: 16, bold: true };
      worksheet.mergeCells('A1:E1'); // Ajustado para 5 columnas
      worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };

      const headerRow = worksheet.addRow(['ID Proveedor', 'Nombre', 'Nº de Facturas', 'Monto Total', 'Límite de Gasto']);
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.header } };
        cell.font = { bold: true, color: { argb: colors.headerText } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      
      gastos.forEach(gasto => {
        const row = worksheet.addRow([
          gasto.idProveedor,
          gasto.nombre,
          gasto.conteo,
          gasto.total,
          gasto.limite
        ]);

        const montoCell = row.getCell(4);
        montoCell.numFmt = '$#,##0.00';
        const limiteCell = row.getCell(5);
        limiteCell.numFmt = '$#,##0.00';

        // Lógica de color para la celda de Monto
        const monto = gasto.total;
        const limite = gasto.limite;

        if (limite && limite > 0) {
          const porcentaje = (monto / limite) * 100;
          let color = '';
          if (porcentaje > 90) {
            color = colors.red;
          } else if (porcentaje > 75) {
            color = colors.amber;
          } else {
            color = colors.green;
          }
          montoCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: color }
          };
        }
      });
      
      worksheet.columns.forEach(column => { column.width = 25; });
      // --- FIN: CAMBIOS PARA EXCEL ---
      
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
              <th>Nº de Facturas</th>
              <th>Monto Total</th>
              <th>Límite de Gasto</th>
            </tr>
          </thead>
          <tbody>
            {gastos.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-message">No hay facturas registradas.</td>
              </tr>
            ) : (
              gastos.map(gasto => (
                <tr key={gasto.idProveedor}>
                  <td>{gasto.idProveedor}</td>
                  <td>{gasto.nombre}</td>
                  <td>{gasto.conteo}</td>
                  <td className={getMontoClass(gasto.total, gasto.limite)}>
                    {gasto.total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                  </td>
                  <td>{gasto.limite.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</td>
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