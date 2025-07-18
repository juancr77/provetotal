import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { collection, getDocs, addDoc, doc, getDoc } from "firebase/firestore";
import { useAuth } from '../auth/AuthContext';
import { recalcularTotalProveedor, recalcularTotalMes } from '../totals.js';
import './css/Formulario.css';

const getTodayDateString = () => {
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    const localDate = new Date(today.getTime() - offset);
    return localDate.toISOString().split('T')[0];
};

function RegistroFactura() {
    const { currentUser } = useAuth();
    const [proveedores, setProveedores] = useState([]);
    const [idProveedor, setIdProveedor] = useState('');
    const [nombreProveedor, setNombreProveedor] = useState('');
    const [numeroFactura, setNumeroFactura] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [monto, setMonto] = useState('');
    const [estatus, setEstatus] = useState('');
    const [fechaFactura, setFechaFactura] = useState(getTodayDateString());
    // --- NUEVOS ESTADOS ---
    const [dependencia, setDependencia] = useState('');
    const [formaDePago, setFormaDePago] = useState('');
    const [fechaDePago, setFechaDePago] = useState('');

    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [mensajeExito, setMensajeExito] = useState('');

    const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    useEffect(() => {
        const fetchProveedores = async () => {
            if (!currentUser) { setCargando(false); return; }
            try {
                const querySnapshot = await getDocs(collection(db, "proveedores"));
                const lista = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    const nombreCompleto = `${data.nombre} ${data.apellidoPaterno} ${data.apellidoMaterno || ''}`.trim();
                    return { ...data, nombreCompleto, id: doc.id };
                });
                setProveedores(lista);
            } catch (err) {
                console.error("Error al obtener proveedores: ", err);
                setError("No se pudieron cargar los proveedores.");
            } finally {
                setCargando(false);
            }
        };
        fetchProveedores();
    }, [currentUser]);

    const handleProviderSelection = (selectedId) => {
        setIdProveedor(selectedId);
        if (selectedId) {
            const proveedorSeleccionado = proveedores.find(p => p.idProveedor === selectedId);
            if (proveedorSeleccionado) { setNombreProveedor(proveedorSeleccionado.nombreCompleto); }
        } else {
            setNombreProveedor('');
        }
    };

    const ajustarMonto = (ajuste) => {
        const montoActual = parseFloat(monto) || 0;
        let nuevoMonto = Math.max(0, montoActual + ajuste);
        setMonto(nuevoMonto.toString());
    };

    const handleMontoChange = (e) => {
        const valor = e.target.value;
        if (valor === '') {
            setMonto('');
            return;
        }
        setMonto(valor);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!currentUser) return alert("Necesitas autenticarte.");
        
        setError(null);
        setMensajeExito('');

        if (!idProveedor || !numeroFactura || !monto || !estatus || !fechaFactura || !dependencia || !formaDePago) {
            setError("Todos los campos, excepto descripción y fecha de pago, son obligatorios.");
            return;
        }
        
        const montoNumerico = parseFloat(monto);
        const [year, month, day] = fechaFactura.split('-').map(Number);
        const fechaFacturaDate = new Date(year, month - 1, day);

        try {
            const proveedorSeleccionado = proveedores.find(p => p.idProveedor === idProveedor);
            const limiteProveedor = proveedorSeleccionado?.limiteGasto || 0;
            const totalProveedorSnap = await getDoc(doc(db, "totalProveedor", idProveedor));
            const totalProveedorActual = totalProveedorSnap.exists() ? totalProveedorSnap.data().totaldeprovedor : 0;
            const nuevoTotalProveedor = totalProveedorActual + montoNumerico;

            const mesIndex = fechaFacturaDate.getMonth();
            const anio = fechaFacturaDate.getFullYear();
            const limiteMesSnap = await getDoc(doc(db, "limiteMes", String(mesIndex)));
            const limiteMes = limiteMesSnap.exists() ? limiteMesSnap.data().monto : 0;
            const totalMesDocId = `${anio}-${String(mesIndex + 1).padStart(2, '0')}`;
            const totalMesSnap = await getDoc(doc(db, "totalMes", totalMesDocId));
            const totalMesActual = totalMesSnap.exists() ? totalMesSnap.data().totaldeMes : 0;
            const nuevoTotalMes = totalMesActual + montoNumerico;

            if (limiteProveedor > 0 && nuevoTotalProveedor > limiteProveedor) {
                setError(`Límite de gasto para el proveedor "${nombreProveedor}" excedido.`);
                return;
            }
            if (limiteMes > 0 && nuevoTotalMes > limiteMes) {
                setError(`Límite de gasto para ${nombresMeses[mesIndex]} excedido.`);
                return;
            }

            const advertencias = [];
            if (limiteProveedor > 0 && nuevoTotalProveedor >= (limiteProveedor * 0.95)) {
                advertencias.push(`- Se está acercando al límite de gasto del proveedor "${nombreProveedor}".`);
            }
            if (limiteMes > 0 && nuevoTotalMes >= (limiteMes * 0.95)) {
                advertencias.push(`- Se está acercando al límite de gasto para ${nombresMeses[mesIndex]}.`);
            }
            
            if (advertencias.length > 0) {
                const continuar = window.confirm("ADVERTENCIA:\n\n" + advertencias.join('\n') + "\n\n¿Desea continuar?");
                if (!continuar) return;
            }
            
            const nuevaFactura = {
                idProveedor, nombreProveedor, numeroFactura, estatus, dependencia, formaDePago,
                descripcion: descripcion.trim(),
                monto: montoNumerico,
                fechaFactura: fechaFacturaDate,
                fechaDePago: fechaDePago ? new Date(fechaDePago + 'T00:00:00') : null,
                fechaRegistro: new Date()
            };

            await addDoc(collection(db, "facturas"), nuevaFactura);
            await recalcularTotalProveedor(nuevaFactura.idProveedor);
            await recalcularTotalMes(nuevaFactura.fechaFactura);
            
            setMensajeExito("Factura registrada con éxito.");
            setIdProveedor(''); setNombreProveedor(''); setNumeroFactura(''); setDescripcion(''); setMonto('');
            setEstatus(''); setDependencia(''); setFormaDePago(''); setFechaDePago('');
            setFechaFactura(getTodayDateString());

        } catch (err) {
            console.error(err);
            setError("No se pudo registrar la factura.");
        }
    };

    if (cargando) return <p className="loading-message">Cargando...</p>;
    if (!currentUser) return <div className="registro-factura-container"><p>Necesitas autenticarte.</p></div>;

    return (
        <div className="registro-factura-container">
            <h2>Registrar Nueva Factura</h2>
            <form onSubmit={handleSubmit} className="registro-form">
                <div className="form-group"><label>ID del Proveedor:</label><select value={idProveedor} onChange={(e) => handleProviderSelection(e.target.value)} required><option value="">-- Seleccione por ID --</option>{proveedores.map(p => (<option key={p.id} value={p.idProveedor}>{p.idProveedor}</option>))}</select></div>
                <div className="form-group"><label>Nombre del Proveedor:</label><select value={idProveedor} onChange={(e) => handleProviderSelection(e.target.value)} required><option value="">-- Seleccione por Nombre --</option>{[...proveedores].sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto)).map(p => (<option key={p.id} value={p.idProveedor}>{p.nombreCompleto}</option>))}</select></div>
                <div className="form-group"><label>Número de Factura:</label><input type="text" value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} required /></div>
                
                <div className="form-group"><label htmlFor="dependencia">Dependencia:</label><input id="dependencia" type="text" value={dependencia} onChange={(e) => setDependencia(e.target.value)} required /></div>
                <div className="form-group"><label htmlFor="formaDePago">Forma de Pago:</label><select id="formaDePago" value={formaDePago} onChange={(e) => setFormaDePago(e.target.value)} required><option value="">-- Seleccione --</option><option value="Transferencia">Transferencia</option><option value="Efectivo">Efectivo</option><option value="Tarjeta de Crédito">Tarjeta de Crédito</option><option value="Tarjeta de Débito">Tarjeta de Débito</option><option value="Cheque">Cheque</option></select></div>
                <div className="form-group"><label htmlFor="fechaDePago">Fecha de Pago (Opcional):</label><input id="fechaDePago" type="date" value={fechaDePago} onChange={(e) => setFechaDePago(e.target.value)} /></div>

                <div className="form-group"><label>Fecha de Factura:</label><input type="date" value={fechaFactura} onChange={(e) => setFechaFactura(e.target.value)} required /></div>
                <div className="form-group"><label>Estatus:</label><select value={estatus} onChange={(e) => setEstatus(e.target.value)} required><option value="">-- Seleccione --</option><option value="Pendiente">Pendiente</option><option value="Recibida">Recibida</option><option value="Con solventación">Con solventación</option><option value="En contabilidad">En contabilidad</option><option value="Pagada">Pagada</option></select></div>
                
                <div className="monto-group full-width">
                    <label>Monto:</label>
                    <div className="monto-controls">
                        <button type="button" onClick={() => ajustarMonto(-1000)}>-1000</button>
                        <button type="button" onClick={() => ajustarMonto(-100)}>-100</button>
                        <div className="monto-input-container"><span>$</span><input type="number" value={monto} onChange={handleMontoChange} step="0.01" required /></div>
                        <button type="button" onClick={() => ajustarMonto(100)}>+100</button>
                        <button type="button" onClick={() => ajustarMonto(1000)}>+1000</button>
                    </div>
                </div>
                <div className="form-group full-width"><label>Descripción (Opcional):</label><textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows="3" /></div>
                
                <div className="submit-button-container"><button type="submit" className="submit-button">Registrar Factura</button></div>
                {error && <p className="mensaje mensaje-error">{error}</p>}
                {mensajeExito && <p className="mensaje mensaje-exito">{mensajeExito}</p>}
            </form>
        </div>
    );
}
export default RegistroFactura;