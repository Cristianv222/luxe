import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import BarraNavegacion from '../../comun/BarraNavegacion';
import PiePagina from '../../comun/PiePagina';
import './BoutiqueLanding.css'; // Use Boutique Styles

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
            await api.post('/api/authentication/register/', formData);
            setMsg("Registro exitoso. Redirigiendo al inicio de sesión...");
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (err) {
            if (err.response && err.response.data) {
                const errorData = err.response.data;
                let errorMsg = "Error en el registro: ";
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
        <div className="boutique-container">
            <BarraNavegacion />

            {/* MAIN CONTENT CENTERED */}
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: '80px', // Reduced top padding
                paddingBottom: '20px',
                backgroundColor: '#E8C4C4' // Solid Rose
            }}>
                <div className="hover-float" style={{
                    backgroundColor: '#FFFFFF',
                    padding: '25px', // Reduced padding
                    borderRadius: '4px',
                    boxShadow: '0 15px 35px rgba(160, 144, 134, 0.1)',
                    maxWidth: '400px', // Smaller width
                    width: '95%',
                    borderTop: '4px solid #CFB3A9' // Cinna accent
                }}>
                    <h2 style={{
                        textAlign: 'center',
                        marginBottom: '20px',
                        fontFamily: "'Cinzel', serif",
                        color: '#2C2C2C',
                        fontSize: '22px' // Smaller title
                    }}>Crear Cuenta</h2>

                    {error && <div style={{
                        backgroundColor: '#FFF0F0', color: '#D32F2F', padding: '15px', borderRadius: '4px', marginBottom: '20px', fontSize: '0.9rem'
                    }}>{error}</div>}

                    {msg && <div style={{
                        backgroundColor: '#F0F9F0', color: '#2E7D32', padding: '15px', borderRadius: '4px', marginBottom: '20px', fontSize: '0.9rem'
                    }}>{msg}</div>}

                    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '8px' }}> {/* Tight gap */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '2px', color: '#A09086', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nombre</label>
                                <input type="text" name="first_name" required onChange={handleChange} value={formData.first_name}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #E4D8CB', borderRadius: '0', backgroundColor: '#FAFAFA', fontSize: '0.85rem' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '2px', color: '#A09086', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Apellido</label>
                                <input type="text" name="last_name" required onChange={handleChange} value={formData.last_name}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #E4D8CB', borderRadius: '0', backgroundColor: '#FAFAFA', fontSize: '0.85rem' }} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '2px', color: '#A09086', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cédula</label>
                                <input type="text" name="identification_number" required onChange={handleChange} value={formData.identification_number}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #E4D8CB', borderRadius: '0', backgroundColor: '#FAFAFA', fontSize: '0.85rem' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '2px', color: '#A09086', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>F. Nacimiento</label>
                                <input type="date" name="date_of_birth" required onChange={handleChange} value={formData.date_of_birth}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #E4D8CB', borderRadius: '0', backgroundColor: '#FAFAFA', fontSize: '0.85rem' }} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '2px', color: '#A09086', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</label>
                                <input type="email" name="email" required onChange={handleChange} value={formData.email}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #E4D8CB', borderRadius: '0', backgroundColor: '#FAFAFA', fontSize: '0.85rem' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '2px', color: '#A09086', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Usuario</label>
                                <input type="text" name="username" required onChange={handleChange} value={formData.username}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #E4D8CB', borderRadius: '0', backgroundColor: '#FAFAFA', fontSize: '0.85rem' }} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '2px', color: '#A09086', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contraseña</label>
                                <input type="password" name="password" required onChange={handleChange} value={formData.password}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #E4D8CB', borderRadius: '0', backgroundColor: '#FAFAFA', fontSize: '0.85rem' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '2px', color: '#A09086', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Confirmar</label>
                                <input type="password" name="password_confirm" required onChange={handleChange} value={formData.password_confirm}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #E4D8CB', borderRadius: '0', backgroundColor: '#FAFAFA', fontSize: '0.85rem' }} />
                            </div>
                        </div>

                        <button type="submit" disabled={loading} style={{
                            background: '#CFB3A9', // Cinna
                            color: '#FFFFFF',
                            padding: '15px',
                            border: 'none',
                            cursor: 'pointer',
                            marginTop: '10px',
                            fontSize: '14px',
                            textTransform: 'uppercase',
                            letterSpacing: '2px',
                            fontWeight: '600',
                            transition: 'all 0.3s'
                        }} className="hover-float">
                            {loading ? 'REGISTRANDO...' : 'CREAR CUENTA'}
                        </button>
                    </form>

                    <div style={{ textAlign: 'center', marginTop: '25px', borderTop: '1px solid #F1EEEB', paddingTop: '20px' }}>
                        <Link to="/login" style={{ color: '#A09086', textDecoration: 'none', fontSize: '0.9rem' }}>
                            ¿Ya tienes cuenta? <span style={{ color: '#CFB3A9', fontWeight: 'bold' }}>INICIA SESIÓN</span>
                        </Link>
                    </div>
                </div>
            </div>
            <PiePagina />
        </div>
    );
};

export default Registro;
