import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
// SE AGREGA 'query' y 'orderBy' para ordenar la lista
import { collection, getDocs, query, orderBy } from "firebase/firestore"; 
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useAuth } from '../auth/AuthContext';
import './css/vistasTablas.css';
// Se agregaron estas importaciones que antes no estaban en este archivo específico
import './css/main.css';
import './css/pages.css';
import './css/components.css';

function VerProveedores() {
  const { currentUser } = useAuth();
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const obtenerProveedores = async () => {
      if (!currentUser) {
        setCargando(false);
        return;
      }
      try {
        const proveedoresRef = collection(db, "proveedores");
        // SE AÑADIÓ ORDENAMIENTO para que la lista aparezca alfabéticamente por nombre
        const q = query(proveedoresRef, orderBy("nombre")); 
        const querySnapshot = await getDocs(q);
        const listaProveedores = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        }));
        setProveedores(listaProveedores);
      } catch (err) {
        console.error("Error al obtener los proveedores: ", err);
        setError("No se pudieron cargar los datos de los proveedores.");
      } finally {
        setCargando(false);
      }
    };

    obtenerProveedores();
  }, [currentUser]);

  const generateExcel = async () => {
    if (!currentUser) {
      return alert("Necesitas autenticarte para generar reportes.");
    }
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Listado de Proveedores", {
        views: [{ state: 'frozen', ySplit: 6 }]
      });

      const response = await fetch('https://i.imgur.com/5mavo8r.png');
      const imageBuffer = await response.arrayBuffer();
      const imageId = workbook.addImage({ buffer: imageBuffer, extension: 'png' });
      worksheet.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 350, height: 88 }
      });
      
      const contentStartRow = 6;
      // SE AJUSTÓ EL RANGO PARA LA NUEVA COLUMNA
      worksheet.mergeCells(`A${contentStartRow}:F${contentStartRow}`);
      const titleCell = worksheet.getCell(`A${contentStartRow}`);
      titleCell.value = "Listado de Proveedores";
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.font = { bold: true, size: 16, color: { argb: 'FF2A4B7C' } };
      worksheet.getRow(contentStartRow).height = 30;

      const headerRow = worksheet.getRow(contentStartRow + 1);
      headerRow.height = 25;
      // SE AÑADIÓ LA NUEVA COLUMNA "LÍMITE DE GASTO"
      headerRow.values = ['ID de Proveedor', 'Nombre(s)', 'Apellido Paterno', 'Apellido Materno', 'Límite de Gasto', 'Fecha de Registro'];
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A4B7C' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });

      proveedores.forEach(p => {
        // SE AÑADIÓ EL DATO DEL LÍMITE DE GASTO EN LA FILA
        worksheet.addRow([
          p.idProveedor,
          p.nombre,
          p.apellidoPaterno,
          p.apellidoMaterno || 'N/A',
          p.limiteGasto || 0,
          p.fechaRegistro.toDate()
        ]);
      });

      // SE AÑADIÓ FORMATO DE MONEDA A LA NUEVA COLUMNA
      worksheet.getColumn(5).numFmt = '$#,##0.00';
      worksheet.getColumn(6).numFmt = 'dd/mm/yyyy';
      worksheet.columns.forEach(column => { column.width = 25; });
      
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), 'Listado_de_Proveedores.xlsx');

    } catch (error) {
      console.error("Error al generar el archivo Excel:", error);
      alert("No se pudo generar el archivo de Excel. Revisa la consola para más detalles.");
    }
  };

  if (cargando) return <p className="loading-message">Cargando...</p>;
  
  if (!currentUser) {
    return (
      <div className="vista-container">
        <h2>Lista de Proveedores Registrados</h2>
        <p className="auth-message">Necesitas autenticarte para ver los proveedores.</p>
      </div>
    );
  }

  return (
    <div className="vista-container">
      <h2>Lista de Proveedores Registrados</h2>
      <button 
        onClick={generateExcel} 
        disabled={proveedores.length === 0} 
        className="excel-button"
      >
        Generar Excel
      </button>
      
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID de Proveedor</th>
              <th>Nombre(s)</th>
              <th>Apellido Paterno</th>
              <th>Apellido Materno</th>
              {/* SE AÑADIÓ LA CABECERA DE LA NUEVA COLUMNA */}
              <th className="cell-numeric limit-column-header">Límite de Gasto</th>
              <th className="cell-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr><td colSpan="6" className="error-message">{error}</td></tr>
            ) : proveedores.length === 0 ? (
              <tr><td colSpan="6" className="empty-message">No hay proveedores registrados.</td></tr>
            ) : (
              proveedores.map(proveedor => (
                <tr key={proveedor.id}>
                  <td>{proveedor.idProveedor}</td>
                  <td>{proveedor.nombre}</td>
                  <td>{proveedor.apellidoPaterno}</td>
                  <td>{proveedor.apellidoMaterno || 'No especificado'}</td>
                  {/* SE AÑADIÓ LA CELDA PARA MOSTRAR EL LÍMITE */}
                  <td className="limit-column-cell cell-numeric">
                    {(proveedor.limiteGasto || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                  </td>
                  <td className="cell-actions">
                    <Link to={`/proveedor/${proveedor.id}`}>
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

export default VerProveedores;