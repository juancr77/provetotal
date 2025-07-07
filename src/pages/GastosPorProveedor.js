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
      const querySnapshot = await getDocs(collection(db, "facturas"));
      const facturas = querySnapshot.docs.map(doc => doc.data());

      const gastosAgrupados = facturas.reduce((acc, factura) => {
        const { idProveedor, nombreProveedor, monto } = factura;
        
        // Si el proveedor no está en el acumulador, se inicializa
        if (!acc[idProveedor]) {
          acc[idProveedor] = {
            nombre: nombreProveedor,
            total: 0,
            conteo: 0
          };
        }
        // Se acumulan los montos y conteos
        acc[idProveedor].total += monto;
        acc[idProveedor].conteo += 1;
        return acc;
      }, {});

      // Se convierte el objeto a un array
      const resultado = Object.keys(gastosAgrupados).map(id => ({
        idProveedor: id,
        nombre: gastosAgrupados[id].nombre,
        total: gastosAgrupados[id].total,
        conteo: gastosAgrupados[id].conteo
      }));

      setGastos(resultado);
      setCargando(false);
    };

    calcularGastos();
  }, []);

  const generateExcel = async () => {
    // La lógica para generar el Excel se mantiene igual...
    // ... (puedes usar la misma función generateExcel de la respuesta anterior)
  };

  if (cargando) {
    return <p>Calculando gastos por proveedor...</p>;
  }

  return (
    <div>
      <h2>Reporte de Gastos por Proveedor</h2>
      <button onClick={generateExcel}>Generar Excel</button>
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
            <tr>
              <td colSpan="4">No hay facturas registradas.</td>
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
  );
}

export default GastosPorProveedor;