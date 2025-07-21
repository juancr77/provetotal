import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
// Se añaden getDocs, query y where para la nueva validación
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { useAuth } from '../auth/AuthContext';
import './css/Formulario.css';

function RegistroProveedor() {
    const { currentUser } = useAuth();
    const [idProveedor, setIdProveedor] = useState('');
    const [nombre, setNombre] = useState('');
    const [apellidoPaterno, setApellidoPaterno] = useState('');
    const [apellidoMaterno, setApellidoMaterno] = useState('');
    const [limiteGasto, setLimiteGasto] = useState('');
    const [error, setError] = useState(null);
    const [mensajeExito, setMensajeExito] = useState('');
    const [cargandoAuth, setCargandoAuth] = useState(true);

    useEffect(() => {
        if (currentUser !== undefined) {
            setCargandoAuth(false);
        }
    }, [currentUser]);

    const MIN_LIMITE = 0;

    const ajustarMonto = (ajuste) => {
        const montoActual = parseFloat(limiteGasto) || 0;
        let nuevoMonto = montoActual + ajuste;
        nuevoMonto = Math.max(MIN_LIMITE, nuevoMonto);
        setLimiteGasto(nuevoMonto.toString());
    };

    const handleMontoChange = (e) => {
        const valor = e.target.value;
        if (valor === '') {
            setLimiteGasto('');
            return;
        }
        const numero = parseFloat(valor);
        if (!isNaN(numero) && numero >= MIN_LIMITE) {
            setLimiteGasto(valor);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!currentUser) {
            return alert("Necesitas autenticarte para registrar un proveedor.");
        }
        
        setError(null);
        setMensajeExito('');

        if (!idProveedor.trim() || !nombre.trim() || !apellidoPaterno.trim()) {
            setError('Los campos ID, Nombre(s) y Apellido Paterno son obligatorios.');
            return;
        }

        try {
            // --- INICIO: VALIDACIÓN DE ID DE PROVEEDOR DUPLICADO ---
            const proveedoresRef = collection(db, "proveedores");
            const q = query(proveedoresRef, where("idProveedor", "==", idProveedor.trim()));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                alert('Error: El ID de Proveedor ya existe. Por favor, utiliza uno diferente.');
                return; // Detiene el proceso si el ID ya existe
            }
            // --- FIN: VALIDACIÓN ---

            const nuevoProveedor = {
                idProveedor: idProveedor.trim(),
                nombre: nombre.trim(),
                apellidoPaterno: apellidoPaterno.trim(),
                ...(apellidoMaterno.trim() && { apellidoMaterno: apellidoMaterno.trim() }),
                limiteGasto: parseFloat(limiteGasto) || 0,
                fechaRegistro: new Date()
            };

            await addDoc(collection(db, "proveedores"), nuevoProveedor);
            setMensajeExito(`Proveedor registrado con éxito.`);
            
            setIdProveedor('');
            setNombre('');
            setApellidoPaterno('');
            setApellidoMaterno('');
            setLimiteGasto('');
        } catch (err) {
            console.error("Error al registrar el proveedor: ", err);
            setError('No se pudo registrar el proveedor. Inténtalo de nuevo.');
        }
    };

    if (cargandoAuth) {
        return <p className="loading-message">Cargando...</p>;
    }

    if (!currentUser) {
        return (
            <div className="registro-factura-container">
                <h2>Formulario de Registro de Proveedor</h2>
                <p className="auth-message">Necesitas autenticarte para registrar un nuevo proveedor.</p>
            </div>
        );
    }

    return (
        <div className="registro-factura-container">
            <h2>Formulario de Registro de Proveedor</h2>
            <form onSubmit={handleSubmit} className="registro-form">
                <div className="form-group">
                    <label htmlFor="idProveedor">ID de Proveedor:</label>
                    <input
                        id="idProveedor"
                        type="text"
                        value={idProveedor}
                        onChange={(e) => setIdProveedor(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="nombre">Nombre(s):</label>
                    <input
                        id="nombre"
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="apellidoPaterno">Apellido Paterno:</label>
                    <input
                        id="apellidoPaterno"
                        type="text"
                        value={apellidoPaterno}
                        onChange={(e) => setApellidoPaterno(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="apellidoMaterno">Apellido Materno (Opcional):</label>
                    <input
                        id="apellidoMaterno"
                        type="text"
                        value={apellidoMaterno}
                        onChange={(e) => setApellidoMaterno(e.target.value)}
                    />
                </div>
                <div className="monto-group full-width">
                    <label htmlFor="limiteGasto">Límite de Gasto (Opcional):</label>
                    <div className="monto-controls">
                        <button type="button" onClick={() => ajustarMonto(-1000)}>-1000</button>
                        <button type="button" onClick={() => ajustarMonto(-100)}>-100</button>
                        <div className="monto-input-container">
                            <span>$</span>
                            <input 
                                id="limiteGasto" 
                                type="number" 
                                value={limiteGasto} 
                                onChange={handleMontoChange} 
                                min={MIN_LIMITE} 
                                step="0.01" 
                                placeholder="0.00" 
                            />
                        </div>
                        <button type="button" onClick={() => ajustarMonto(100)}>+100</button>
                        <button type="button" onClick={() => ajustarMonto(1000)}>+1000</button>
                    </div>
                </div>
                <div className="submit-button-container">
                    <button type="submit" className="submit-button">
                        Registrar Proveedor
                    </button>
                </div>
                {error && <p className="mensaje mensaje-error">{error}</p>}
                {mensajeExito && <p className="mensaje mensaje-exito">{mensajeExito}</p>}
            </form>
        </div>
    );
}

export default RegistroProveedor;