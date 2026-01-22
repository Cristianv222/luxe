import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const FormularioUsuario = ({ userToEdit, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        password_confirm: '',
        first_name: '',
        last_name: '',
        phone: '',
        identification_number: '',
        date_of_birth: '',
        role: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [roles, setRoles] = useState([]);

    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const response = await api.get('/api/roles/choices/');
                setRoles(response.data);
            } catch (err) {
                console.error('Error cargando roles', err);
            }
        };
        fetchRoles();
    }, []);

    useEffect(() => {
        if (userToEdit) {
            const { password, ...userData } = userToEdit;
            setFormData({ ...userData, password: '' });
        } else {
            setFormData({
                username: '',
                email: '',
                password: '',
                password_confirm: '',
                first_name: '',
                last_name: '',
                phone: '',
                identification_number: '',
                date_of_birth: '',
                role: ''
            });
        }
    }, [userToEdit]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            let response;
            if (userToEdit) {
                const dataToSend = { ...formData };
                if (!dataToSend.password) delete dataToSend.password;
                response = await api.patch(`/api/users/${userToEdit.id}/`, dataToSend);
            } else {
                response = await api.post('/api/users/', formData);
            }

            // SINCRONIZACIÓN SILENCIOSA CON LUXE SERVICE
            try {
                const user = response.data;
                console.log("Sincronizando con Luxe Service...");
                const customerPayload = {
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                    phone: user.phone || '0000000000',
                    cedula: user.identification_number || null,
                    identification_number: user.identification_number || null,
                    date_of_birth: user.date_of_birth || null,
                    address: user.address || '',
                    city: user.city || ''
                };

                // Intentamos registrar/actualizar en Luxe
                await api.post('api/customers/register/', customerPayload, { baseURL: '/api/luxe' });
                console.log("Sincronización con Luxe exitosa");
            } catch (syncErr) {
                console.warn("Fallo la sincronización opcional con Luxe:", syncErr.message);
                // No detenemos el flujo principal si falla la sincronización de perfil
            }

            onSave(); // Notificar al padre que se guardó
        } catch (err) {
            console.error(err);
            if (err.response?.data) {
                // Si es un objeto de errores (validación), mostrar todos
                const errorData = err.response.data;
                if (typeof errorData === 'object' && !errorData.detail) {
                    const messages = Object.entries(errorData).map(([key, value]) => {
                        return `${key}: ${Array.isArray(value) ? value.join(' ') : value}`;
                    }).join(' | ');
                    setError(messages);
                } else {
                    setError(errorData.detail || 'Error al guardar usuario');
                }
            } else {
                setError('Error al guardar usuario');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit} className="form-card" style={{ boxShadow: 'none', padding: 0 }}>
                <div className="form-group">
                    <label>Nombre de Usuario</label>
                    <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Email</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Contraseña {userToEdit && '(Dejar en blanco para mantener actual)'}</label>
                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required={!userToEdit}
                    />
                </div>

                {!userToEdit && (
                    <div className="form-group">
                        <label>Confirmar Contraseña</label>
                        <input
                            type="password"
                            name="password_confirm"
                            value={formData.password_confirm}
                            onChange={handleChange}
                            required
                        />
                    </div>
                )}

                <div className="form-row">
                    <div className="form-group">
                        <label>Nombre</label>
                        <input
                            type="text"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="form-group">
                        <label>Apellido</label>
                        <input
                            type="text"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Cédula / RUC</label>
                        <input
                            type="text"
                            name="identification_number"
                            value={formData.identification_number}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="form-group">
                        <label>Fecha de Nacimiento</label>
                        <input
                            type="date"
                            name="date_of_birth"
                            value={formData.date_of_birth}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Teléfono</label>
                    <input
                        type="text"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                    />
                </div>

                <div className="form-group">
                    <label>Rol</label>
                    <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                    >
                        <option value="">Seleccione un rol</option>
                        {roles.map(role => (
                            <option key={role.value} value={role.value}>
                                {role.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-actions">
                    <button type="button" onClick={onCancel} className="btn btn-secondary">
                        Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default FormularioUsuario;
