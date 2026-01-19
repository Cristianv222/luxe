
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import api from '../../services/api';
import './LandingPage.css'; // Usar estilos de la landing page para consistencia

const Registro = () => {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        identification_number: '',
        date_of_birth: '',
        email: '',
        phone: '',
        username: '',
        password: '',
        password_confirm: ''
    });

    const [msg, setMsg] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        if (formData.password !== formData.password_confirm) {
            setError("Las contraseñas no coinciden");
            setLoading(false);
            return;
        }

        try {
            // Ajustar URL según el entorno
            // const baseURL = process.env.REACT_APP_AUTH_SERVICE || 'http://localhost:8000/api/authentication';
            // Se asume que el proxy o la ruta completa se maneja correctamente
            // Pero dado AuthContext usa /api/authentication/login/, usaremos algo similar
            // NOTA: AuthContext usa `api` con una baseURL configurada. Aquí usaremos direct fetch o la instancia `api` si estuviera exportada.
            // Para simplificar y evitar dependencias circulares, usaremos api si es posible, o axios directo.
            // Usar la instancia api configurada
            await api.post('/api/authentication/register/', formData);

            setMsg("Registro exitoso. Redirigiendo al inicio de sesión...");

            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (err) {
            if (err.response && err.response.data) {
                // Formatear errores del backend
                const errorData = err.response.data;
                let errorMsg = "Error en el registro: ";

                // Si es un objeto con errores de campos
                if (typeof errorData === 'object') {
                    Object.keys(errorData).forEach(key => {
                        const messages = Array.isArray(errorData[key]) ? errorData[key].join(' ') : errorData[key];
                        errorMsg += `\n${key}: ${messages}`;
                    });
                } else {
                    errorMsg += JSON.stringify(errorData);
                }

                setError(errorMsg);
            } else {
                setError("Error de conexión. Por favor intente más tarde.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="landing-page">
            <header className="landing-header">
                <div className="logo-container">
                    <div className="logo">Luxe</div>
                </div>
                <nav className="landing-nav">
                    <Link to="/" className="nav-link">Inicio</Link>
                    <Link to="/login" className="nav-link btn-login">Iniciar Sesión</Link>
                </nav>
            </header>

            <div className="landing-hero" style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="registro-container" style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    padding: '2rem',
                    borderRadius: '12px',
                    maxWidth: '500px',
                    width: '100%',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    color: '#333'
                }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#1a1a1a' }}>Crear Cuenta</h2>

                    {error && <div className="alert alert-danger" style={{ color: 'red', marginBottom: '1rem', whiteSpace: 'pre-line' }}>{error}</div>}
                    {msg && <div className="alert alert-success" style={{ color: 'green', marginBottom: '1rem' }}>{msg}</div>}

                    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Nombre *</label>
                            <input type="text" name="first_name" required className="form-control" onChange={handleChange} value={formData.first_name} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                        </div>

                        <div className="form-group">
                            <label>Apellido *</label>
                            <input type="text" name="last_name" required className="form-control" onChange={handleChange} value={formData.last_name} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                        </div>

                        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label>Cédula/ID *</label>
                                <input type="text" name="identification_number" required className="form-control" onChange={handleChange} value={formData.identification_number} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                            </div>
                            <div className="form-group">
                                <label>Fecha Nacimiento *</label>
                                <input type="date" name="date_of_birth" required className="form-control" onChange={handleChange} value={formData.date_of_birth} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Email *</label>
                            <input type="email" name="email" required className="form-control" onChange={handleChange} value={formData.email} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                        </div>

                        <div className="form-group">
                            <label>Teléfono</label>
                            <input type="tel" name="phone" className="form-control" onChange={handleChange} value={formData.phone} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                        </div>

                        <div className="form-group">
                            <label>Usuario *</label>
                            <input type="text" name="username" required className="form-control" onChange={handleChange} value={formData.username} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                        </div>

                        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label>Contraseña *</label>
                                <input type="password" name="password" required className="form-control" onChange={handleChange} value={formData.password} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                            </div>
                            <div className="form-group">
                                <label>Confirmar Password *</label>
                                <input type="password" name="password_confirm" required className="form-control" onChange={handleChange} value={formData.password_confirm} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                            </div>
                        </div>

                        <button type="submit" disabled={loading} style={{
                            background: '#000',
                            color: '#fff',
                            padding: '10px',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            marginTop: '1rem',
                            fontSize: '1rem'
                        }}>
                            {loading ? 'Registrando...' : 'Registrarse'}
                        </button>
                    </form>
                    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                        <Link to="/login" style={{ color: '#666', textDecoration: 'none' }}>¿Ya tienes cuenta? Inicia Sesión</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Registro;
