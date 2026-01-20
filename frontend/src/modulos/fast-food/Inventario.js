import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../../comun/Modal';
import Categorias from './Categorias';
import Extras from './Extras';
import Combos from './Combos';
import Tamanos from './Tamanos';

const Inventario = () => {
    const [activeTab, setActiveTab] = useState('products'); // products, categories, extras, combos, sizes

    // Estado para Productos
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Estado del formulario de producto
    const [newProduct, setNewProduct] = useState({
        name: '',
        description: '',
        price: '',
        category: '',
        image: null,
        is_active: true,
        is_available: true
    });
    const [editingProduct, setEditingProduct] = useState(null);

    const fetchProducts = async () => {
        try {
            const response = await api.get('/api/menu/products/', {
                baseURL: process.env.REACT_APP_LUXE_SERVICE
            });
            setProducts(response.data.results || response.data || []);
        } catch (err) {
            console.error('Error fetching products:', err);
            setError('Error al cargar el inventario');
        } finally {
            setLoading(false);
        }
    };

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

    useEffect(() => {
        if (activeTab === 'products') {
            fetchProducts();
            fetchCategories();
        }
    }, [activeTab]);


    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;
        setNewProduct(prev => ({ ...prev, [name]: newValue }));
    };

    const handleImageChange = (e) => {
        setNewProduct(prev => ({ ...prev, image: e.target.files[0] }));
    };

    const handleEditProduct = (product) => {
        setEditingProduct(product);
        setNewProduct({
            name: product.name,
            description: product.description,
            price: product.price,
            category: product.category,
            image: null,
            is_active: product.is_active !== undefined ? product.is_active : true,
            is_available: product.is_available !== undefined ? product.is_available : true
        });
        setIsModalOpen(true);
    };

    const handleDeleteProduct = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar este producto? (Se archivará para no afectar reportes históricos)')) {
            try {
                const formData = new FormData();
                formData.append('is_active', 'false');
                formData.append('is_available', 'false');

                await api.patch(`/api/menu/products/${id}/`, formData, {
                    baseURL: process.env.REACT_APP_LUXE_SERVICE,
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                fetchProducts();
            } catch (err) {
                console.error('Error deleting product:', err);
                const msg = err.response?.data?.detail || 'Error al eliminar el producto';
                alert(`Error: ${msg}`);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('name', newProduct.name);
        formData.append('description', newProduct.description);
        formData.append('price', newProduct.price);
        formData.append('category', newProduct.category);
        formData.append('is_active', newProduct.is_active ? 'true' : 'false');
        formData.append('is_available', newProduct.is_available ? 'true' : 'false');
        if (newProduct.image instanceof File) {
            formData.append('image', newProduct.image);
        }

        if (!editingProduct) {
            const slug = newProduct.name.toLowerCase()
                .replace(/ /g, '-')
                .replace(/[^\w-]+/g, '');
            formData.append('slug', slug);
        }

        try {
            if (editingProduct) {
                await api.patch(`/api/menu/products/${editingProduct.id}/`, formData, {
                    baseURL: process.env.REACT_APP_LUXE_SERVICE,
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else {
                await api.post('/api/menu/products/', formData, {
                    baseURL: process.env.REACT_APP_LUXE_SERVICE,
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }
            setIsModalOpen(false);
            setNewProduct({ name: '', description: '', price: '', category: '', image: null, is_active: true, is_available: true });
            setEditingProduct(null);
            fetchProducts();
        } catch (err) {
            console.error('Error saving product:', err);
            const msg = err.response?.data?.detail || err.response?.data?.name || 'Error al guardar el producto. Verifique los datos.';
            alert(`Error: ${msg}`);
        }
    };

    return (
        <div>
            <div className="ff-welcome-header" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem', margin: 0 }}>Inventario (Menú)</h2>
            </div>

            {/* Tabs */}
            <div className="ff-tabs-container">
                <button
                    className={`ff-tab ${activeTab === 'products' ? 'active' : ''}`}
                    onClick={() => setActiveTab('products')}
                >
                    Productos
                </button>
                <button
                    className={`ff-tab ${activeTab === 'categories' ? 'active' : ''}`}
                    onClick={() => setActiveTab('categories')}
                >
                    Categorías
                </button>
                <button
                    className={`ff-tab ${activeTab === 'combos' ? 'active' : ''}`}
                    onClick={() => setActiveTab('combos')}
                >
                    Combos
                </button>
                <button
                    className={`ff-tab ${activeTab === 'extras' ? 'active' : ''}`}
                    onClick={() => setActiveTab('extras')}
                >
                    Extras
                </button>
                <button
                    className={`ff-tab ${activeTab === 'sizes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sizes')}
                >
                    Tamaños
                </button>
            </div>

            {/* Content Cache */}
            {activeTab === 'categories' && <Categorias />}
            {activeTab === 'extras' && <Extras />}
            {activeTab === 'combos' && <Combos />}
            {activeTab === 'sizes' && <Tamanos />}

            {/* Products Content */}
            {activeTab === 'products' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                        <button className="ff-button ff-button-primary" onClick={() => {
                            setEditingProduct(null);
                            setNewProduct({ name: '', description: '', price: '', category: '', image: null });
                            setIsModalOpen(true);
                        }}>
                            Nuevo Producto
                        </button>
                    </div>

                    {loading ? <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando inventario...</div> :
                        error ? <div style={{ color: 'red', textAlign: 'center' }}>{error}</div> : (
                            <div className="ff-table-container">
                                <table className="ff-table">
                                    <thead>
                                        <tr>
                                            <th>Imagen</th>
                                            <th>Nombre</th>
                                            <th>Categoría</th>
                                            <th>Precio</th>
                                            <th>Disponible</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.length === 0 ? (
                                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No hay productos registrados</td></tr>
                                        ) : (
                                            products.map(product => (
                                                <tr key={product.id}>
                                                    <td>
                                                        {product.image ? (
                                                            <img
                                                                src={product.image.startsWith('http') ? product.image : `${process.env.REACT_APP_LUXE_SERVICE}${product.image}`}
                                                                alt={product.name}
                                                                style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                                                            />
                                                        ) : (
                                                            <span style={{ color: '#ccc', fontStyle: 'italic' }}>Sin img</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <strong>{product.name}</strong>
                                                    </td>
                                                    <td>{product.category_name || product.category}</td>
                                                    <td>${product.price}</td>
                                                    <td>
                                                        <span className={`status-badge ${product.is_available ? 'completed' : 'pending'}`}>
                                                            {product.is_available ? 'Sí' : 'No'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button
                                                            className="ff-button ff-button-secondary"
                                                            onClick={() => handleEditProduct(product)}
                                                            style={{ marginRight: '8px', padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                                                        >
                                                            Editar
                                                        </button>
                                                        <button
                                                            className="ff-button ff-button-danger"
                                                            onClick={() => handleDeleteProduct(product.id)}
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
                        )}

                    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProduct ? "Editar Producto" : "Nuevo Producto"}>
                        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Nombre</label>
                                <input
                                    type="text"
                                    name="name"
                                    className="ff-search-input"
                                    value={newProduct.name}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Descripción</label>
                                <textarea
                                    name="description"
                                    className="ff-search-input"
                                    value={newProduct.description}
                                    onChange={handleInputChange}
                                    required
                                    style={{ minHeight: '100px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Precio</label>
                                <input
                                    type="number"
                                    name="price"
                                    className="ff-search-input"
                                    value={newProduct.price}
                                    onChange={handleInputChange}
                                    step="0.01"
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Categoría</label>
                                <select
                                    className="ff-search-input"
                                    name="category"
                                    value={newProduct.category}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">Seleccione una categoría</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '2rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        name="is_active"
                                        checked={newProduct.is_active}
                                        onChange={handleInputChange}
                                        style={{ marginRight: '8px' }}
                                    />
                                    Activo
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        name="is_available"
                                        checked={newProduct.is_available}
                                        onChange={handleInputChange}
                                        style={{ marginRight: '8px' }}
                                    />
                                    Disponible
                                </label>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Imagen</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    style={{ fontFamily: 'var(--font-sans)' }}
                                    required={!editingProduct}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="ff-button ff-button-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="ff-button ff-button-primary">Guardar</button>
                            </div>
                        </form>
                    </Modal>
                </>
            )}
        </div>
    );
};

export default Inventario;
