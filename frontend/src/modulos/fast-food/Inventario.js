import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../../comun/Modal';
import Categorias from './Categorias';


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
        code: '',
        description: '',
        price: '',
        category: '',
        image: null,
        is_active: true,
        is_available: true,
        track_stock: false,
        stock_quantity: 0,
        min_stock_alert: 5
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
            code: product.code || '',
            description: product.description,
            price: product.price,
            category: product.category,
            image: null,
            is_active: product.is_active !== undefined ? product.is_active : true,
            is_available: product.is_available !== undefined ? product.is_available : true,
            track_stock: product.track_stock || false,
            stock_quantity: product.stock_quantity || 0,
            min_stock_alert: product.min_stock_alert || 5
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
        formData.append('code', newProduct.code);
        formData.append('description', newProduct.description);
        formData.append('price', newProduct.price);
        formData.append('category', newProduct.category);
        formData.append('is_active', newProduct.is_active ? 'true' : 'false');
        formData.append('is_available', newProduct.is_available ? 'true' : 'false');
        formData.append('track_stock', newProduct.track_stock ? 'true' : 'false');
        if (newProduct.track_stock) {
            formData.append('stock_quantity', newProduct.stock_quantity);
            formData.append('min_stock_alert', newProduct.min_stock_alert);
        }
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
            setIsModalOpen(false);
            setNewProduct({ name: '', code: '', description: '', price: '', category: '', image: null, is_active: true, is_available: true, track_stock: false, stock_quantity: 0, min_stock_alert: 5 });
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '2rem', margin: 0 }}>Inventario (Menú)</h2>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            className="ff-button ff-button-secondary"
                            onClick={async () => {
                                try {
                                    const res = await api.get('/api/menu/inventory/export/excel/', {
                                        responseType: 'blob',
                                        baseURL: process.env.REACT_APP_LUXE_SERVICE
                                    });
                                    const url = window.URL.createObjectURL(new Blob([res.data]));
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.setAttribute('download', 'inventario_luxe.xlsx');
                                    document.body.appendChild(link);
                                    link.click();
                                } catch (e) { alert('Error exportando Excel'); }
                            }}
                        >
                            <i className="bi bi-file-earmark-spreadsheet" style={{ marginRight: '8px' }}></i>
                            Exportar Excel
                        </button>
                        <button
                            className="ff-button ff-button-secondary"
                            onClick={async () => {
                                try {
                                    const res = await api.get('/api/menu/inventory/export/pdf/', {
                                        responseType: 'blob',
                                        baseURL: process.env.REACT_APP_LUXE_SERVICE
                                    });
                                    const url = window.URL.createObjectURL(new Blob([res.data]));
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.setAttribute('download', 'inventario_luxe.pdf');
                                    document.body.appendChild(link);
                                    link.click();
                                } catch (e) { alert('Error exportando PDF'); }
                            }}
                        >
                            <i className="bi bi-file-earmark-pdf" style={{ marginRight: '8px' }}></i>
                            Exportar PDF
                        </button>
                        <button
                            className="ff-button ff-button-primary"
                            onClick={() => document.getElementById('importInput').click()}
                        >
                            <i className="bi bi-upload" style={{ marginRight: '8px' }}></i>
                            Importar Excel
                        </button>
                        <input
                            id="importInput"
                            type="file"
                            accept=".xlsx"
                            style={{ display: 'none' }}
                            onChange={async (e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                const formData = new FormData();
                                formData.append('file', file);
                                try {
                                    const res = await api.post('/api/menu/inventory/import/excel/', formData, {
                                        headers: { 'Content-Type': 'multipart/form-data' },
                                        baseURL: process.env.REACT_APP_LUXE_SERVICE
                                    });
                                    alert(res.data.message);
                                    fetchProducts();
                                } catch (err) {
                                    alert('Error importando: ' + (err.response?.data?.error || err.message));
                                }
                                e.target.value = null; // Reset
                            }}
                        />
                    </div>
                </div>
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

            </div>

            {/* Content Cache */}
            {activeTab === 'categories' && <Categorias />}


            {/* Products Content */}
            {activeTab === 'products' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                        <button className="ff-button ff-button-primary" onClick={() => {
                            setEditingProduct(null);
                            setNewProduct({ name: '', code: '', description: '', price: '', category: '', image: null });
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
                                            <th>Código</th>
                                            <th>Nombre</th>
                                            <th>Categoría</th>
                                            <th>Precio</th>
                                            <th>Stock</th>
                                            <th>Disponible</th>
                                            <th>Destacado</th>
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
                                                        <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#555' }}>
                                                            {product.code || '-'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <strong>{product.name}</strong>
                                                    </td>
                                                    <td>{product.category_name || product.category}</td>
                                                    <td>${product.price}</td>
                                                    <td>
                                                        {product.track_stock ? (
                                                            <span style={{
                                                                color: product.stock_quantity <= product.min_stock_alert ? '#d62728' : 'inherit',
                                                                fontWeight: product.stock_quantity <= product.min_stock_alert ? 'bold' : 'normal'
                                                            }}>
                                                                {product.stock_quantity}
                                                            </span>
                                                        ) : (
                                                            <span style={{ fontSize: '1.2rem', color: '#aaa' }}>∞</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className={`status-badge ${product.is_available ? 'completed' : 'pending'}`}>
                                                            {product.is_available ? 'Sí' : 'No'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    const formData = new FormData();
                                                                    formData.append('is_featured', !product.is_featured);
                                                                    await api.patch(`/api/menu/products/${product.id}/`, formData, {
                                                                        baseURL: process.env.REACT_APP_LUXE_SERVICE,
                                                                        headers: { 'Content-Type': 'multipart/form-data' },
                                                                    });
                                                                    fetchProducts();
                                                                } catch (err) {
                                                                    console.error('Error toggling featured:', err);
                                                                    alert('Error al actualizar destacado');
                                                                }
                                                            }}
                                                            style={{
                                                                background: 'transparent',
                                                                border: `2px solid ${product.is_featured ? '#E8C4C4' : '#E4D8CB'}`,
                                                                borderRadius: '50%',
                                                                cursor: 'pointer',
                                                                width: '40px',
                                                                height: '40px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                padding: 0,
                                                                transition: 'all 0.3s ease',
                                                                backgroundColor: product.is_featured ? '#FAE4E4' : 'transparent'
                                                            }}
                                                            title={product.is_featured ? 'Quitar de destacados' : 'Marcar como destacado'}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.transform = 'scale(1.1)';
                                                                e.currentTarget.style.borderColor = '#E8C4C4';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.transform = 'scale(1)';
                                                                e.currentTarget.style.borderColor = product.is_featured ? '#E8C4C4' : '#E4D8CB';
                                                            }}
                                                        >
                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill={product.is_featured ? '#E8C4C4' : 'none'} stroke={product.is_featured ? '#CFB3A9' : '#A09086'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                                            </svg>
                                                        </button>
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
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Código / SKU</label>
                                <input
                                    type="text"
                                    name="code"
                                    className="ff-search-input"
                                    value={newProduct.code}
                                    onChange={handleInputChange}
                                    placeholder="Dejar vacío para autogenerar"
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

                            <div style={{ marginTop: '0.5rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '1rem' }}>
                                    <input
                                        type="checkbox"
                                        name="track_stock"
                                        checked={newProduct.track_stock}
                                        onChange={handleInputChange}
                                        style={{ marginRight: '8px' }}
                                    />
                                    <strong>Controlar Inventario</strong>
                                </label>

                                {newProduct.track_stock && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Cantidad Actual</label>
                                            <input
                                                type="number"
                                                name="stock_quantity"
                                                className="ff-search-input"
                                                value={newProduct.stock_quantity}
                                                onChange={handleInputChange}
                                                min="0"
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Alerta Mínima</label>
                                            <input
                                                type="number"
                                                name="min_stock_alert"
                                                className="ff-search-input"
                                                value={newProduct.min_stock_alert}
                                                onChange={handleInputChange}
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                )}
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
