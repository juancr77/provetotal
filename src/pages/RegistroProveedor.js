import React, { useState } from 'react';
// Se importa la instancia de la base de datos de Firebase.
import { db } from '../firebase';
// Se importan las funciones de Firestore para agregar un nuevo documento.
import { collection, addDoc } from "firebase/firestore";

function RegistroProveedor() {
  // Se utiliza el hook useState para manejar el estado de cada campo del formulario.
  const [idProveedor, setIdProveedor] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');
  const [error, setError] = useState(null);
  const [mensajeExito, setMensajeExito] = useState('');

  // Esta función se ejecuta al enviar el formulario.
  const handleSubmit = async (e) => {
    // Se previene el comportamiento de recarga de página por defecto del formulario.
    e.preventDefault();
    setError(null);
    setMensajeExito('');

    // Se realiza una validación simple para los campos requeridos.
    if (!idProveedor.trim() || !nombre.trim() || !apellidoPaterno.trim()) {
      setError('Los campos ID, Nombre(s) y Apellido Paterno son obligatorios.');
      return;
    }

    // Se crea un objeto con los datos del proveedor.
    const nuevoProveedor = {
      idProveedor: idProveedor.trim(),
      nombre: nombre.trim(),
      apellidoPaterno: apellidoPaterno.trim(),
      // Se añade el apellido materno solo si el campo no está vacío.
      ...(apellidoMaterno.trim() && { apellidoMaterno: apellidoMaterno.trim() }),
      fechaRegistro: new Date()
    };

    try {
      // Se intenta agregar el nuevo documento a la colección 'proveedores' en Firestore.
      const docRef = await addDoc(collection(db, "proveedores"), nuevoProveedor);
      setMensajeExito(`Proveedor registrado con éxito. ID: ${docRef.id}`);

      // Se limpian los campos del formulario después de un registro exitoso.
      setIdProveedor('');
      setNombre('');
      setApellidoPaterno('');
      setApellidoMaterno('');

    } catch (err) {
      // Se maneja cualquier error que ocurra durante el proceso de guardado.
      console.error("Error al registrar el proveedor: ", err);
      setError('No se pudo registrar el proveedor. Inténtalo de nuevo.');
    }
  };

  return (
    <div>
      <h2>Formulario de Registro de Proveedor</h2>
      {/* El formulario llama a la función handleSubmit al ser enviado. */}
      <form onSubmit={handleSubmit}>
        <div>
          <label>ID de Proveedor:</label>
          <input
            type="text"
            value={idProveedor}
            onChange={(e) => setIdProveedor(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Nombre(s):</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Apellido Paterno:</label>
          <input
            type="text"
            value={apellidoPaterno}
            onChange={(e) => setApellidoPaterno(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Apellido Materno:</label>
          <input
            type="text"
            value={apellidoMaterno}
            onChange={(e) => setApellidoMaterno(e.target.value)}
          />
        </div>
        <button type="submit">Registrar Proveedor</button>
      </form>

      {/* Se muestran los mensajes de error o éxito al usuario. */}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {mensajeExito && <p style={{ color: 'green' }}>{mensajeExito}</p>}
    </div>
  );
}

export default RegistroProveedor;