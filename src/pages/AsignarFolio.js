// src/pages/AsignarFolio.js
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from '../auth/AuthContext';
import './css/Formulario.css'; // Reutilizamos estilos

function AsignarFolio() {
    const { currentUser } = useAuth();
    const [folioInicial, setFolioInicial] = useState('');
    const [folioActual, setFolioActual] = useState('Cargando...');
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');

    const folioRef = doc(db, "numeroFolio", "folioActual");

    useEffect(() => {
        const fetchFolio = async () => {
            if (!currentUser) return;
            try {
                const docSnap = await getDoc(folioRef);
                if (docSnap.exists()) {
                    setFolioActual(docSnap.data().valor);
                } else {
                    setFolioActual('No asignado');
                }
            } catch (err) {
                setError('Error al cargar el folio actual.');
            }
        };
        fetchFolio();
    }, [currentUser, folioRef]);

    const handleGuardar = async (e) => {
        e.preventDefault();
        setError('');
        setMensaje('');

        if (!folioInicial || isNaN(Number(folioInicial))) {
            setError('Por favor, introduce un número válido.');
            return;
        }

        try {
            await setDoc(folioRef, { valor: Number(folioInicial) });
            setFolioActual(Number(folioInicial));
            setMensaje('Folio inicial guardado con éxito.');
            setFolioInicial('');
        } catch (err) {
            setError('No se pudo guardar el folio.');
            console.error(err);
        }
    };
    
    if (!currentUser) {
        return <p className="auth-message">Necesitas autenticarte para gestionar los folios.</p>;
    }

    return (
        <div className="registro-factura-container" style={{ maxWidth: '600px' }}>
            <h2>Asignar Folio para Reportes</h2>
            <div className="info-folio">
                <p>El próximo reporte se generará con el folio:</p>
                <span className="folio-actual">{folioActual}</span>
            </div>
            <form onSubmit={handleGuardar} className="registro-form">
                <div className="form-group">
                    <label htmlFor="folio">Asignar o reiniciar folio inicial:</label>
                    <input
                        id="folio"
                        type="number"
                        value={folioInicial}
                        onChange={(e) => setFolioInicial(e.target.value)}
                        placeholder="Ej: 1001"
                    />
                </div>
                <div className="submit-button-container">
                    <button type="submit" className="submit-button">Guardar Folio</button>
                </div>
                {error && <p className="mensaje mensaje-error">{error}</p>}
                {mensaje && <p className="mensaje mensaje-exito">{mensaje}</p>}
            </form>
        </div>
    );
}

export default AsignarFolio;