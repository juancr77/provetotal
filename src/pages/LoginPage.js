import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import './css/LoginPage.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth(); // Asumiendo que signup y login con email existen en tu context
  const navigate = useNavigate();
  const location = useLocation();

  // Se determina la página a la que se debe redirigir al usuario.
  // Si no hay una ubicación previa, se usa la página principal.
  const from = location.state?.from?.pathname || "/";

  async function handleLogin(e) {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      // Se usa `replace: true` para que el usuario no pueda volver a la página de login con el botón de "atrás".
      navigate(from, { replace: true }); 
    } catch {
      setError('No se pudo iniciar sesión. Verifica tus credenciales.');
    }
    setLoading(false);
  }
  
  async function handleSignup(e) {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await signup(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError('No se pudo crear la cuenta. La contraseña debe tener al menos 6 caracteres.');
    }
    setLoading(false);
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Iniciar Sesión o Registrarse</h2>
        {error && <p className="login-error">{error}</p>}
        <form className="login-form">
          <div className="form-group">
            <label htmlFor="email">Correo Electrónico</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="button-group">
            <button disabled={loading} onClick={handleLogin}>Iniciar Sesión</button>
            <button disabled={loading} onClick={handleSignup} className="signup-button">Registrarse</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;