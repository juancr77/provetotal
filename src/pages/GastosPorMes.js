import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from "firebase/firestore";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useAuth } from '../auth/AuthContext';
import './css/vistasTablas.css'; 

function GastosPorMes() {
  const { currentUser } = useAuth();
  const [gastos, setGastos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  useEffect(() => {
    const calcularGastos = async () => {
      if (!currentUser) {
        setCargando(false);
        return;
      }
      try {
        const facturasSnapshot = await getDocs(collection(db, "facturas"));
        const limitesSnapshot = await getDocs(collection(db, "limiteMes"));

        const facturas = facturasSnapshot.docs.map(doc => doc.data());

        const limitesData = {};
        limitesSnapshot.forEach(doc => {
          const data = doc.data();
          limitesData[data.mesIndex] = data.monto;
        });

        const gastosAgrupados = facturas.reduce((acc, factura) => {
          const fecha = factura.fechaFactura.toDate();
          const anio = fecha.getFullYear();
          const mes = fecha.getMonth();
          const clave = `${anio}-${mes}`;

          if (!acc[clave]) {
            acc[clave] = { anio, mes, total: 0, conteo: 0, limite: limitesData[mes] || 0 };
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
  }, [currentUser]);
  
  const getMontoClass = (monto, limite) => {
    if (!limite || limite <= 0) {
      return '';
    }
    const porcentaje = (monto / limite) * 100;
    if (porcentaje > 90) {
      return 'status-red';
    }
    if (porcentaje > 75) {
      return 'status-amber';
    }
    return 'status-green';
  };

  const generateExcel = async (reportType) => {
    if (!currentUser) {
      return alert("Necesitas autenticarte para generar reportes.");
    }
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(reportType, {
        views: [{ state: 'frozen', ySplit: 2 }] // Ajustado para congelar solo el encabezado
      });

      // --- INICIO DE CAMBIOS PARA EXCEL ---

      // Colores (ARGB - Alpha, Red, Green, Blue)
      const colors = {
        green: 'FFD4EDDA',
        amber: 'FFFFF3CD',
        red: 'FFF8D7DA',
        header: 'FF2A4B7C',
        headerText: 'FFFFFFFF',
        rowEven: 'FFF2F2F2',
        border: 'FFD9D9D9'
      };

      // Título y encabezado
      worksheet.addRow([`Reporte de Gastos por ${reportType}`]).font = { size: 16, bold: true };
      worksheet.mergeCells('A1:E1');
      worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };

      const headerRow = worksheet.addRow(['Mes', 'Año', 'Nº de Facturas', 'Monto Total', 'Límite del Mes']);
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.header } };
        cell.font = { bold: true, color: { argb: colors.headerText } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });

      // Añadir datos y aplicar estilos condicionales
      gastos.forEach(gasto => {
        const row = worksheet.addRow([
          nombresMeses[gasto.mes],
          gasto.anio,
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
      
      // Ajustar ancho de columnas
      worksheet.columns.forEach(column => {
        column.width = 20;
      });

      // --- FIN DE CAMBIOS PARA EXCEL ---
      
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Reporte_Gastos_por_${reportType}.xlsx`);

    } catch (error) {
      console.error("Error al generar el archivo Excel:", error);
      alert("No se pudo generar el archivo de Excel.");
    }
  };

  if (cargando) return <p className="loading-message">Cargando...</p>;

  if (!currentUser) {
    return (
      <div className="vista-container">
        <h2>Reporte de Gastos por Mes</h2>
        <p className="auth-message">Necesitas autenticarte para ver este reporte.</p>
      </div>
    );
  }

  return (
    <div className="vista-container reporte-mes-page"> 
      <h2>Reporte de Gastos por Mes</h2>
      <button onClick={() => generateExcel('Mes')} disabled={gastos.length === 0} className="excel-button">
        Generar Excel
      </button>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Mes</th>
              <th>Año</th>
              <th>Nº de Facturas</th>
              <th>Monto Total</th>
              <th>Límite del Mes</th>
            </tr>
          </thead>
          <tbody>
            {gastos.length === 0 ? (
              <tr><td colSpan="5" className="empty-message">No hay facturas registradas.</td></tr>
            ) : (
              gastos.map(gasto => (
                <tr key={`${gasto.anio}-${gasto.mes}`}>
                  <td>{nombresMeses[gasto.mes]}</td>
                  <td>{gasto.anio}</td>
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

export default GastosPorMes;