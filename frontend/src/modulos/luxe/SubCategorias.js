import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../../comun/Modal';

const SubCategorias = () => {
    const [subcategories, setSubCategories] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Estado del formulario
    const [newSubCategory, setNewSubCategory] = useState({
        name: '',
        description: '',
        category: ''
    });
    const [editingSubCategory, setEditingSubCategory] = useState(null);

    const fetchCategories = async () => {
        try {
            const response = await api.get('/api/menu/categories/', {
                baseURL: process.env.REACT_APP_LUXE_SERVICE
            });
            setCategories(response.data.results || response.data || []);
        } catch (err) {
            console.error('Error fetching categories:', err);
        }
    };

    const fetchSubCategories = async () => {
        try {
            const response = await api.get('/api/menu/subcategories/', {
                baseURL: process.env.REACT_APP_LUXE_SERVICE
            });
            setSubCategories(response.data.results || response.data || []);
        } catch (err) {
            console.error('Error fetching subcategories:', err);
            setError('Error al cargar las subcategorías');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubCategories();
        fetchCategories();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewSubCategory(prev => ({ ...prev, [name]: value }));
    };

    const handleEditSubCategory = (sub) => {
        setEditingSubCategory(sub);
        setNewSubCategory({
            name: sub.name,
            description: sub.description,
            category: sub.category // ID de la categoría
        });
        setIsModalOpen(true);
    };

    const handleDeleteSubCategory = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar esta subcategoría?')) {
            try {
                await api.delete(`/api/menu/subcategories/${id}/`, {
                    baseURL: process.env.REACT_APP_LUXE_SERVICE
                });
                fetchSubCategories();
            } catch (err) {
                console.error('Error deleting subcategory:', err);
                alert('Error al eliminar');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const slug = newSubCategory.name.toLowerCase()
            .replace(/ /g, '-')
            .replace(/[^\w-]+/g, '') + '-' + Math.floor(Math.random() * 1000);

        const data = {
            ...newSubCategory,
            slug: slug // Simple slug generation, backend handles unique if collision? Check backend. 
            // Actually backend model has unique=True for slug. 
            // Frontend generating slug is risky if collision. 
            // Ideally backend should handle slug if not provided, or frontend should make it unique. 
            // I'll append random number to be safe or rely on user to be distinct.
            // My previous logic for products used random if not present, but for categories/subcategories user manually creates.
        };

        // Remove slug if editing (don't change slug usually) or handle properly.
        if (editingSubCategory) {
            delete data.slug;
        }

        try {
            if (editingSubCategory) {
                await api.patch(`/api/menu/subcategories/${editingSubCategory.id}/`, data, {
                    baseURL: process.env.REACT_APP_LUXE_SERVICE
                });
            } else {
                await api.post('/api/menu/subcategories/', data, {
                    baseURL: process.env.REACT_APP_LUXE_SERVICE
                });
            }
            setIsModalOpen(false);
            setNewSubCategory({ name: '', description: '', category: '' });
            setEditingSubCategory(null);
            fetchSubCategories();
        } catch (err) {
            console.error('Error saving subcategory:', err);
            alert('Error al guardar. ' + (err.response?.data?.slug ? 'El slug ya existe.' : ''));
        }
    };

    if (loading) return <div>Cargando subcategorías...</div>;

    // Helper to get category name
    const getCatName = (id) => {
        const cat = categories.find(c => c.id === id);
        return cat ? cat.name : 'Desconocida';
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', marginTop: '1rem' }}>
                <h3 style={{ fontFamily: 'var(--font-serif)', margin: 0, fontSize: '1.5rem' }}>Gestión de Sub-Categorías</h3>
                <button className="ff-button ff-button-primary" onClick={() => {
                    setEditingSubCategory(null);
                    setNewSubCategory({ name: '', description: '', category: '' });
                    setIsModalOpen(true);
                }}>
                    + Nueva Subcategoría
                </button>
            </div>

            <div className="ff-table-container">
                <table className="ff-table">
                    <thead>
                        <tr>
                            <th>Categoría Padre</th>
                            <th>Subcategoría</th>
                            <th>Descripción</th>
                            <th>Productos</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {subcategories.length === 0 ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No hay subcategorías registradas</td></tr>
                        ) : (
                            subcategories.map(sub => (
                                <tr key={sub.id}>
                                    <td>
                                        <span className="status-tag" style={{ background: '#F3F4F6', color: '#4B5563' }}>
                                            {getCatName(sub.category)}
                                        </span>
                                    </td>
                                    <td><strong>{sub.name}</strong></td>
                                    <td>{sub.description}</td>
                                    <td>{sub.products_count || 0}</td>
                                    <td>
                                        <button
                                            className="ff-button ff-button-secondary"
                                            onClick={() => handleEditSubCategory(sub)}
                                            style={{ marginRight: '8px', padding: '0.4rem 0.6rem', fontSize: '1rem' }}
                                        >
                                            <i className="bi bi-pencil"></i>
                                        </button>
                                        <button
                                            className="ff-button ff-button-danger"
                                            onClick={() => handleDeleteSubCategory(sub.id)}
                                            style={{ padding: '0.4rem 0.6rem', fontSize: '1rem' }}
                                        >
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSubCategory ? "Editar Subcategoría" : "Nueva Subcategoría"}>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Categoría Padre</label>
                        <select
                            name="category"
                            className="ff-search-input"
                            value={newSubCategory.category}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="">Seleccione una categoría...</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Nombre</label>
                        <input
                            type="text"
                            name="name"
                            className="ff-search-input"
                            value={newSubCategory.name}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Descripción</label>
                        <textarea
                            name="description"
                            className="ff-search-input"
                            value={newSubCategory.description}
                            onChange={handleInputChange}
                            style={{ minHeight: '80px' }}
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

export default SubCategorias;
