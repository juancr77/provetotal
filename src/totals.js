// src/totals.js
import { db } from './firebase.js'; // Asegúrate que la ruta sea correcta
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";

/**
 * Recalcula el gasto total para un proveedor específico y lo guarda/actualiza en la colección 'totalProveedor'.
 */
export const recalcularTotalProveedor = async (proveedorId) => {
  if (!proveedorId) {
    console.error("ID de proveedor no válido para recalcular.");
    return;
  }

  const facturasRef = collection(db, "facturas");
  const q = query(facturasRef, where("idProveedor", "==", proveedorId));
  
  const querySnapshot = await getDocs(q);
  let totalAcumulado = 0;
  querySnapshot.forEach(doc => {
    totalAcumulado += doc.data().monto;
  });

  const docRef = doc(db, "totalProveedor", proveedorId);
  // Usa el nombre de campo que definiste en la petición original
  await setDoc(docRef, { totaldeprovedor: totalAcumulado }, { merge: true });

  console.log(`Total para proveedor ${proveedorId} actualizado a: ${totalAcumulado}`);
};

/**
 * Recalcula el gasto total para un mes y año específicos y lo guarda/actualiza en la colección 'totalMes'.
 */
export const recalcularTotalMes = async (fecha) => {
  if (!fecha || !(fecha instanceof Date) || isNaN(fecha)) {
    console.error("Fecha inválida para recalcular el total del mes.", fecha);
    return;
  }

  // --- LÓGICA DE FECHAS ESTANDARIZADA EN UTC ---
  const anio = fecha.getUTCFullYear();
  const mesIndex = fecha.getUTCMonth(); // 0 para Enero, 11 para Diciembre

  const inicioDeMes = new Date(Date.UTC(anio, mesIndex, 1));
  const finDeMes = new Date(Date.UTC(anio, mesIndex + 1, 1)); // Primer día del siguiente mes

  const facturasRef = collection(db, "facturas");
  // La consulta ahora es >= inicio de mes Y < inicio del siguiente mes. Es más preciso.
  const q = query(
    facturasRef, 
    where("fechaFactura", ">=", inicioDeMes), 
    where("fechaFactura", "<", finDeMes)
  );

  const querySnapshot = await getDocs(q);
  let totalAcumulado = 0;
  querySnapshot.forEach(doc => {
    totalAcumulado += doc.data().monto;
  });

  // El ID del documento será 'AÑO-INDICE_MES' (ej: "2024-06" para Julio) para consistencia.
  const docId = `${anio}-${String(mesIndex).padStart(2, '0')}`;
  const docRef = doc(db, "totalMes", docId);
  
  await setDoc(docRef, { 
    totaldeMes: totalAcumulado,
    mesIndex: mesIndex,
    anio: anio
  }, { merge: true });

  console.log(`Total actualizado para el mes ${docId}: ${totalAcumulado}`);
};