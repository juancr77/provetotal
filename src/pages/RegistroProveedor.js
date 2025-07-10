import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from "firebase/firestore";
import { useAuth } from '../auth/AuthContext';
import './css/Formulario.css';

function RegistroProveedor() {
  const { currentUser } = useAuth();
  const [idProveedor, setIdProveedor] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');
  const [error, setError] = useState(null);
  const [mensajeExito, setMensajeExito] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Se verifica si el usuario está autenticado antes de continuar.
    if (!currentUser) {
      return alert("Necesitas autenticarte para registrar un proveedor.");
    }
    
    setError(null);
    setMensajeExito('');

    if (!idProveedor.trim() || !nombre.trim() || !apellidoPaterno.trim()) {
      setError('Los campos ID, Nombre(s) y Apellido Paterno son obligatorios.');
      return;
    }

    const nuevoProveedor = {
      idProveedor: idProveedor.trim(),
      nombre: nombre.trim(),
      apellidoPaterno: apellidoPaterno.trim(),
      ...(apellidoMaterno.trim() && { apellidoMaterno: apellidoMaterno.trim() }),
      fechaRegistro: new Date()
    };

    try {
      const docRef = await addDoc(collection(db, "proveedores"), nuevoProveedor);
      setMensajeExito(`Proveedor registrado con éxito.`);
      setIdProveedor('');
      setNombre('');
      setApellidoPaterno('');
      setApellidoMaterno('');
    } catch (err) {
      console.error("Error al registrar el proveedor: ", err);
      setError('No se pudo registrar el proveedor. Inténtalo de nuevo.');
    }
  };

  return (
    // Se aplican las clases de CSS para el contenedor del formulario.
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