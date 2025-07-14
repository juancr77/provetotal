import { db } from './firebase'; // Se asume que firebase.js está en la misma carpeta src/
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";

/**
 * Recalcula el gasto total para un proveedor específico y lo guarda/actualiza en la colección 'totalProveedor'.
 * @param {string} proveedorId El ID del proveedor que se va a actualizar.
 */
export const recalcularTotalProveedor = async (proveedorId) => {
  if (!proveedorId) {
    console.error("No se proporcionó un ID de proveedor para recalcular.");
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
  await setDoc(docRef, { 
    totaldeprovedor: totalAcumulado 
  });

  console.log(`Total actualizado para proveedor ${proveedorId}: ${totalAcumulado}`);
};


/**
 * Recalcula el gasto total para un mes y año específicos y lo guarda/actualiza en la colección 'totalMes'.
 * @param {Date} fecha Un objeto Date que pertenece al mes que se va a recalcular.
 */
export const recalcularTotalMes = async (fecha) => {
  if (!fecha || !(fecha instanceof Date) || isNaN(fecha)) {
    console.error("Fecha inválida para recalcular el total del mes.");
    return;
  }

  const anio = fecha.getFullYear();
  const mesIndex = fecha.getMonth(); // 0 = Enero, 11 = Diciembre

  const inicioDeMes = new Date(anio, mesIndex, 1);
  const finDeMes = new Date(anio, mesIndex + 1, 0); // Ajustado para incluir el último día del mes
  
  const facturasRef = collection(db, "facturas");
  const q = query(
    facturasRef, 
    where("fechaFactura", ">=", inicioDeMes), 
    where("fechaFactura", "<=", finDeMes)
  );

  const querySnapshot = await getDocs(q);
  let totalAcumulado = 0;
  querySnapshot.forEach(doc => {
    totalAcumulado += doc.data().monto;
  });

  const docId = `${anio}-${String(mesIndex + 1).padStart(2, '0')}`; // Formato AÑO-MES (ej: 2024-07)
  const docRef = doc(db, "totalMes", docId);
  await setDoc(docRef, { 
    totaldeMes: totalAcumulado,
    mesIndex: mesIndex,
    anio: anio
  }, { merge: true });

  console.log(`Total actualizado para el mes ${docId}: ${totalAcumulado}`);
};