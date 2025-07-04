import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from "firebase/firestore";

function GastosPorMes() {
  const [gastos, setGastos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const calcularGastos = async () => {
      const querySnapshot = await getDocs(collection(db, "facturas"));
      const facturas = querySnapshot.docs.map(doc => doc.data());

      const gastosAgrupados = facturas.reduce((acc, factura) => {
        // Se convierte la fecha de Firestore (timestamp) a un objeto Date.
        const fecha = factura.fechaFactura.toDate();
        const anio = fecha.getFullYear();
        const mes = fecha.getMonth(); // 0 = Enero, 1 = Febrero, etc.
        
        // Se crea una clave única para cada mes/año.
        const clave = `${anio}-${mes}`;

        if (!acc[clave]) {
          acc[clave] = {
            anio,
            mes,
            total: 0,
            conteo: 0
          };
        }
        acc[clave].total += factura.monto;
        acc[clave].conteo += 1;
        return acc;
      }, {});

      // Se convierte el objeto a un array y se ordena por fecha.
      const resultado = Object.values(gastosAgrupados).sort((a, b) => b.anio - a.anio || b.mes - a.mes);
      
      setGastos(resultado);
      setCargando(false);
    };

    calcularGastos();
  }, []);

  // Array para convertir el número del mes a su nombre en español.
  const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  if (cargando) {
    return <p>Calculando gastos por mes...</p>;
  }

  return (
    <div>
      <h2>Reporte de Gastos por Mes</h2>
      <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
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
            <tr>
              <td colSpan="4">No hay facturas registradas.</td>
            </tr>
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