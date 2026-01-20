import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../../comun/Modal';

const Categorias = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Estado del formulario
    const [newCategory, setNewCategory] = useState({
        name: '',
        description: '',
        image: null
    });
    const [editingCategory, setEditingCategory] = useState(null);

    const fetchCategories = async () => {
        try {
            const response = await api.get('/api/menu/categories/', {
                baseURL: process.env.REACT_APP_LUXE_SERVICE
            });
            setCategories(response.data.results || response.data || []);
        } catch (err) {
            console.error('Error fetching categories:', err);
            setError('Error al cargar las categorías');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewCategory(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => {
        setNewCategory(prev => ({ ...prev, image: e.target.files[0] }));
    };

    const handleEditCategory = (category) => {
        setEditingCategory(category);
        setNewCategory({
            name: category.name,
            description: category.description,
            image: null
        });
        setIsModalOpen(true);
    };

    const handleDeleteCategory = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar esta categoría?')) {
            try {
                await api.delete(`/api/menu/categories/${id}/`, {
                    baseURL: process.env.REACT_APP_LUXE_SERVICE
                });
                fetchCategories();
            } catch (err) {
                console.error('Error deleting category:', err);
                alert('Error al eliminar la categoría');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const slug = newCategory.name.toLowerCase()
            .replace(/ /g, '-')
            .replace(/[^\w-]+/g, '');

        const formData = new FormData();
        formData.append('name', newCategory.name);
        formData.append('slug', slug);
        formData.append('description', newCategory.description);
        if (newCategory.image instanceof File) {
            formData.append('image', newCategory.image);
        }

        try {
            if (editingCategory) {
                await api.patch(`/api/menu/categories/${editingCategory.id}/`, formData, {
                    baseURL: process.env.REACT_APP_LUXE_SERVICE,
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else {
                await api.post('/api/menu/categories/', formData, {
                    baseURL: process.env.REACT_APP_LUXE_SERVICE,
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }
            setIsModalOpen(false);
            setNewCategory({ name: '', description: '', image: null });
            setEditingCategory(null);
            fetchCategories();
        } catch (err) {
            console.error('Error saving category:', err);
            alert('Error al guardar la categoría. Verifique los datos.');
        }
    };

    if (loading) return <div>Cargando categorías...</div>;
    if (error) return <div style={{ color: 'red' }}>{error}</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', marginTop: '1rem' }}>
                <h3 style={{ fontFamily: 'var(--font-serif)', margin: 0, fontSize: '1.5rem' }}>Gestión de Categorías</h3>
                <button className="ff-button ff-button-primary" onClick={() => {
                    setEditingCategory(null);
                    setNewCategory({ name: '', description: '', image: null });
                    setIsModalOpen(true);
                }}>
                    + Nueva Categoría
                </button>
            </div>

            <div className="ff-table-container">
                <table className="ff-table">
                    <thead>
                        <tr>
                            <th>Imagen</th>
                            <th>Nombre</th>
                            <th>Descripción</th>
                            <th>Productos Activos</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.length === 0 ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No hay categorías registradas</td></tr>
                        ) : (
                            categories.map(cat => (
                                <tr key={cat.id}>
                                    <td>
                                        {cat.image ? (
                                            <img
                                                src={cat.image.startsWith('http') ? cat.image : `${process.env.REACT_APP_LUXE_SERVICE}${cat.image}`}
                                                alt={cat.name}
                                                style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                                            />
                                        ) : (
                                            <span style={{ color: '#ccc', fontStyle: 'italic' }}>Sin img</span>
                                        )}
                                    </td>
                                    <td><strong>{cat.name}</strong></td>
                                    <td>{cat.description}</td>
                                    <td>{cat.products_count || 0}</td>
                                    <td>
                                        <button
                                            className="ff-button ff-button-secondary"
                                            onClick={() => handleEditCategory(cat)}
                                            style={{ marginRight: '8px', padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                                        >
                                            Editar
                                        </button>
                                        <button
                                            className="ff-button ff-button-danger"
                                            onClick={() => handleDeleteCategory(cat.id)}
                                            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCategory ? "Editar Categoría" : "Nueva Categoría"}>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Nombre</label>
                        <input
                            type="text"
                            name="name"
                            className="ff-search-input"
                            value={newCategory.name}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Descripción</label>
                        <textarea
                            name="description"
                            className="ff-search-input"
                            value={newCategory.description}
                            onChange={handleInputChange}
                            style={{ minHeight: '80px' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Imagen</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            required={!editingCategory}
                            style={{ fontFamily: 'var(--font-sans)' }}
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <button type="button" className="ff-button ff-button-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                        <button type="submit" className="ff-button ff-button-primary">Guardar</button>
                    </div>
                </form>
            </Modal>
        </div >
    );
};

export default Categorias;
