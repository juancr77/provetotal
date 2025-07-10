import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs } from "firebase/firestore";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useAuth } from '../auth/AuthContext'; // Se importa el hook de autenticación
import './css/vistasTablas.css';

function VerProveedores() {
  const { currentUser } = useAuth(); // Se obtiene el estado del usuario
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // La función para obtener datos solo se ejecuta si hay un usuario autenticado.
    const obtenerProveedores = async () => {
      if (!currentUser) {
        setCargando(false);
        return;
      }
      try {
        const querySnapshot = await getDocs(collection(db, "proveedores"));
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
  }, [currentUser]); // Se añade currentUser como dependencia

  const generateExcel = async () => {
    // Se añade la protección a la función
    if (!currentUser) {
      return alert("Necesitas autenticarte para generar reportes.");
    }
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Listado de Proveedores", {
        views: [{ state: 'frozen', ySplit: 7 }]
      });

      const response = await fetch('https://i.imgur.com/5mavo8r.png');
      const imageBuffer = await response.arrayBuffer();
      const imageId = workbook.addImage({ buffer: imageBuffer, extension: 'png' });
      worksheet.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 350, height: 88 }
      });
      
      const contentStartRow = 6;
      worksheet.mergeCells(`A${contentStartRow}:E${contentStartRow}`);
      const titleCell = worksheet.getCell(`A${contentStartRow}`);
      titleCell.value = "Listado de Proveedores";
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.font = { bold: true, size: 16, color: { argb: 'FF2A4B7C' } };
      worksheet.getRow(contentStartRow).height = 30;

      const headerRow = worksheet.getRow(contentStartRow + 1);
      headerRow.height = 25;
      headerRow.values = ['ID de Proveedor', 'Nombre(s)', 'Apellido Paterno', 'Apellido Materno', 'Fecha de Registro'];
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A4B7C' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      proveedores.forEach(p => {
        worksheet.addRow([
          p.idProveedor,
          p.nombre,
          p.apellidoPaterno,
          p.apellidoMaterno || 'N/A',
          p.fechaRegistro.toDate()
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
      
      worksheet.getColumn(5).numFmt = 'dd/mm/yyyy';
      worksheet.columns.forEach(column => { column.width = 25; });
      
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), 'Listado_de_Proveedores.xlsx');

    } catch (error) {
      console.error("Error al generar el archivo Excel:", error);
      alert("No se pudo generar el archivo de Excel. Revisa la consola para más detalles.");
    }
  };

  if (cargando) return <p className="loading-message">Cargando...</p>;
  
  // --- LÓGICA DE VISUALIZACIÓN CONDICIONAL ---
  if (!currentUser) {
    return (
      <div className="vista-container">
        <h2>Lista de Proveedores Registrados</h2>
        <p className="auth-message">Necesitas autenticarte para ver los proveedores.</p>
      </div>
    );
  }

  // Este contenido solo se muestra si hay un usuario autenticado.
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
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr><td colSpan="5" className="error-message">{error}</td></tr>
            ) : proveedores.length === 0 ? (
              <tr><td colSpan="5" className="empty-message">No hay proveedores registrados.</td></tr>
            ) : (
              proveedores.map(proveedor => (
                <tr key={proveedor.id}>
                  <td>{proveedor.idProveedor}</td>
                  <td>{proveedor.nombre}</td>
                  <td>{proveedor.apellidoPaterno}</td>
                  <td>{proveedor.apellidoMaterno || 'No especificado'}</td>
                  <td>
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