import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, updateDoc } from "firebase/firestore";
import { useAuth } from '../auth/AuthContext';
import './css/LimiteMes.css';

function LimiteMes() {
  const { currentUser } = useAuth();
  const [limites, setLimites] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  const nombresMeses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const fetchLimites = useCallback(async () => {
    if (!currentUser) {
      setCargando(false);
      return;
    }
    try {
      const querySnapshot = await getDocs(collection(db, "limiteMes"));
      const limitesExistentes = {};
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        limitesExistentes[data.mesIndex] = { id: doc.id, monto: data.monto };
      });
      
      const limitesIniciales = {};
      for (let i = 0; i < 12; i++) {
        limitesIniciales[i] = {
          id: limitesExistentes[i]?.id || null,
          monto: limitesExistentes[i]?.monto || ''
        };
      }
      setLimites(limitesIniciales);

    } catch (err) {
      console.error("Error al obtener los límites: ", err);
      setError("No se pudieron cargar los límites de gasto.");
    } finally {
      setCargando(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchLimites();
  }, [fetchLimites]);

  const handleMontoChange = (mesIndex, valor) => {
    const numero = parseFloat(valor);
    if (valor === '' || (!isNaN(numero) && numero >= 0)) {
      setLimites(prev => ({
        ...prev,
        [mesIndex]: { ...prev[mesIndex], monto: valor }
      }));
    }
  };

  const ajustarMonto = (mesIndex, ajuste) => {
    const montoActual = parseFloat(limites[mesIndex]?.monto) || 0;
    let nuevoMonto = montoActual + ajuste;
    if (nuevoMonto < 0) nuevoMonto = 0;
    
    setLimites(prev => ({
      ...prev,
      [mesIndex]: { ...prev[mesIndex], monto: String(nuevoMonto) }
    }));
  };

  const handleSave = async (mesIndex) => {
    if (!currentUser) return alert("Necesitas autenticarte.");
    setError('');
    setMensajeExito('');

    const limiteActual = limites[mesIndex];
    const montoFinal = parseFloat(limiteActual.monto) || 0;

    try {
      // Si el límite ya tiene un ID, se actualiza.
      if (limiteActual.id) {
        const docRef = doc(db, "limiteMes", limiteActual.id);
        await updateDoc(docRef, { monto: montoFinal });
      } else {
        // Si no tiene ID, se crea un nuevo documento con un ID predecible (el nombre del mes).
        const docRef = doc(db, "limiteMes", String(mesIndex));
        await setDoc(docRef, { mesIndex: mesIndex, monto: montoFinal });
        // Actualizamos el estado local con el nuevo ID.
        setLimites(prev => ({
          ...prev,
          [mesIndex]: { ...prev[mesIndex], id: String(mesIndex) }
        }));
      }
      setMensajeExito(`Límite para ${nombresMeses[mesIndex]} guardado con éxito.`);
      setTimeout(() => setMensajeExito(''), 3000); // El mensaje desaparece después de 3 segundos
    } catch (err) {
      console.error("Error al guardar el límite: ", err);
      setError("No se pudo guardar el límite. Inténtalo de nuevo.");
    }
  };

  if (cargando) return <p className="loading-message">Cargando...</p>;

  if (!currentUser) {
    return (
      <div className="vista-container">
        <h2>Límites de Gasto por Mes</h2>
        <p className="auth-message">Necesitas autenticarte para gestionar los límites de gasto.</p>
      </div>
    );
  }

  return (
    <div className="vista-container">
      <h2>Límites de Gasto por Mes</h2>
      {mensajeExito && <p className="mensaje mensaje-exito">{mensajeExito}</p>}
      {error && <p className="mensaje mensaje-error">{error}</p>}
      <div className="limite-mes-container">
        {nombresMeses.map((nombre, index) => (
          <div key={index} className="mes-card">
            <h3>{nombre}</h3>
            <div className="monto-group">
              <div className="monto-controls">
                <button onClick={() => ajustarMonto(index, -1000)}>-1000</button>
                <button onClick={() => ajustarMonto(index, -100)}>-100</button>
                <div className="monto-input-container">
                  <span>$</span>
                  <input
                    type="number"
                    value={limites[index]?.monto || ''}
                    onChange={(e) => handleMontoChange(index, e.target.value)}
                    placeholder="Sin límite"
                  />
                </div>
                <button onClick={() => ajustarMonto(index, 100)}>+100</button>
                <button onClick={() => ajustarMonto(index, 1000)}>+1000</button>
              </div>
              <button className="save-button" onClick={() => handleSave(index)}>
                Guardar Límite
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LimiteMes;