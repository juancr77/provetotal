// src/pages/PoblarDatos.js
import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from "firebase/firestore";
import { useAuth } from '../auth/AuthContext';
import './css/Formulario.css'; // Reutilizamos estilos existentes

function PoblarDatos() {
    const { currentUser } = useAuth();
    const [cargando, setCargando] = useState(false);
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');

    const poblarDependencias = async () => {
        setCargando(true);
        setError('');
        setMensaje('');

        const dependenciasNombres = [
            "Comunicación social", "Tesorería Municipal", "Regidores", "Archivo Municipal",
            "Contraloría", "Oficialía mayor", "Dif Municipal", "Desarrollo Social",
            "Obras Publicas", "SIMAS ARTEAGA", "SERVICIOS PRIMARIOS", "Protección civil",
            "Seguridad Publica", "Salud", "Fomento económico", "Secretaria del Ayuntamiento",
            "Presidencia"
        ];

        const dependenciasRef = collection(db, "dependencias");
        let contador = 0;

        try {
            for (const nombre of dependenciasNombres) {
                await addDoc(dependenciasRef, { nombre: nombre });
                contador++;
            }
            setMensaje(`${contador} dependencias han sido agregadas a la base de datos.`);
        } catch (err) {
            console.error("Error al poblar dependencias:", err);
            setError("Ocurrió un error. Revisa la consola para más detalles.");
        } finally {
            setCargando(false);
        }
    };

    if (!currentUser) {
        return (
            <div className="registro-factura-container" style={{ textAlign: 'center' }}>
                <h2>Poblar Base de Datos</h2>
                <p className="auth-message">Necesitas autenticarte para realizar esta acción.</p>
            </div>
        );
    }

    return (
        <div className="registro-factura-container" style={{ maxWidth: '700px', textAlign: 'center' }}>
            <h2>Poblar Base de Datos</h2>
            <p style={{ margin: '1.5rem 0' }}>
                Usa este botón para cargar la lista inicial de dependencias en la base de datos.
                Esta acción solo debe realizarse una vez.
            </p>
            
            <div className="submit-button-container">
                <button 
                    onClick={poblarDependencias} 
                    disabled={cargando} 
                    className="submit-button"
                    style={{ backgroundColor: '#dc3545', minWidth: '250px' }}
                >
                    {cargando ? 'Poblando...' : 'Poblar Colección de Dependencias'}
                </button>
            </div>

            {error && <p className="mensaje mensaje-error">{error}</p>}
            {mensaje && <p className="mensaje mensaje-exito">{mensaje}</p>}
        </div>
    );
}

export default PoblarDatos;