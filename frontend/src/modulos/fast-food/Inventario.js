import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../../comun/Modal';
import Categorias from './Categorias';
import './FastFood.css';
import './Loyalty.css';


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
        <div className="loyalty-container">
            <div className="compact-header-row">
                <div className="title-group">
                    <i className="bi bi-box-seam-fill"></i>
                    <div>
                        <h1>Gestión de Inventario</h1>
                        <p className="subtitle">Administra productos, categorías y existencias</p>
                    </div>
                </div>
                <div className="header-actions" style={{ display: 'flex', gap: '10px' }}>
                    <button
                        className="btn-boutique outline"
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
                        <i className="bi bi-file-earmark-spreadsheet"></i> Excel
                    </button>
                    <button
                        className="btn-boutique outline"
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
                        <i className="bi bi-file-earmark-pdf"></i> PDF
                    </button>
                    <button
                        className="btn-boutique primary"
                        onClick={() => document.getElementById('importInput').click()}
                    >
                        <i className="bi bi-upload"></i> Importar
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

            {/* Tabs */}
            <div className="ff-tabs-container">
                <button
                    className={`ff-tab ${activeTab === 'products' ? 'active' : ''}`}
                    onClick={() => setActiveTab('products')}
                >
                    <i className="bi bi-bag-check" style={{ marginRight: '8px' }}></i> Productos
                </button>
                <button
                    className={`ff-tab ${activeTab === 'categories' ? 'active' : ''}`}
                    onClick={() => setActiveTab('categories')}
                >
                    <i className="bi bi-tags" style={{ marginRight: '8px' }}></i> Categorías
                </button>
            </div>

            {/* Content Categories */}
            {activeTab === 'categories' && <Categorias />}

            {/* Products Content */}
            {activeTab === 'products' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                        <button className="btn-boutique success" onClick={() => {
                            setEditingProduct(null);
                            setNewProduct({ name: '', code: '', description: '', price: '', category: '', image: null, is_active: true, is_available: true, track_stock: false, stock_quantity: 0, min_stock_alert: 0 });
                            setIsModalOpen(true);
                        }}>
                            <i className="bi bi-plus-circle"></i> Nuevo Producto
                        </button>
                    </div>

                    {loading ? (
                        <div className="boutique-spinner-container">
                            <div className="boutique-spinner"></div>
                            <p>Cargando catálogo...</p>
                        </div>
                    ) : error ? (
                        <div className="boutique-card" style={{ textAlign: 'center', color: '#dc2626' }}>
                            <i className="bi bi-exclamation-triangle" style={{ fontSize: '2rem' }}></i>
                            <p>{error}</p>
                        </div>
                    ) : (
                        <div className="boutique-card" style={{ padding: '0' }}>
                            <div className="boutique-table-wrapper">
                                <table className="boutique-table">
                                    <thead>
                                        <tr>
                                            <th>Imagen</th>
                                            <th>Ref / Nombre</th>
                                            <th>Categoría</th>
                                            <th>Precio</th>
                                            <th>Existencias</th>
                                            <th>Estados</th>
                                            <th style={{ textAlign: 'right' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.length === 0 ? (
                                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>No hay productos registrados en el catálogo.</td></tr>
                                        ) : (
                                            products.map(product => (
                                                <tr key={product.id}>
                                                    <td style={{ width: '70px' }}>
                                                        <div className="product-img-wrapper" style={{
                                                            width: '60px',
                                                            height: '60px',
                                                            borderRadius: '12px',
                                                            overflow: 'hidden',
                                                            border: '1px solid #E4D8CB',
                                                            background: '#F5F5F0',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}>
                                                            {product.image ? (
                                                                <img
                                                                    src={product.image.startsWith('http') ? product.image : `${process.env.REACT_APP_LUXE_SERVICE}${product.image}`}
                                                                    alt={product.name}
                                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                />
                                                            ) : (
                                                                <i className="bi bi-image" style={{ color: '#A09086', fontSize: '1.4rem' }}></i>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{product.name}</div>
                                                        <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', opacity: 0.6, letterSpacing: '1px' }}>SKU: {product.code || 'N/A'}</div>
                                                    </td>
                                                    <td>
                                                        <span className="status-tag" style={{ background: '#F1EEEB', color: '#A09086', fontWeight: 600 }}>
                                                            {product.category_name || product.category || 'Sin Cat.'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span style={{ fontWeight: 800, color: '#2C2C2C' }}>${Number(product.price).toFixed(2)}</span>
                                                    </td>
                                                    <td>
                                                        {product.track_stock ? (
                                                            <div className="points-badge" style={{
                                                                background: product.stock_quantity <= product.min_stock_alert ? '#FEF2F2' : '#F0FDF4',
                                                                color: product.stock_quantity <= product.min_stock_alert ? '#DC2626' : '#16A34A',
                                                                borderColor: product.stock_quantity <= product.min_stock_alert ? '#FEE2E2' : '#DCFCE7'
                                                            }}>
                                                                {product.stock_quantity} <small>unid.</small>
                                                                {product.stock_quantity <= product.min_stock_alert && <i className="bi bi-exclamation-circle" style={{ marginLeft: '4px' }}></i>}
                                                            </div>
                                                        ) : (
                                                            <span style={{ fontSize: '1.2rem', color: '#E4D8CB' }}>∞</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '5px' }}>
                                                            <span className={`status-tag ${product.is_available ? 'active' : 'inactive'}`} style={{
                                                                background: product.is_available ? '#f0fdf4' : '#f8fafc',
                                                                color: product.is_available ? '#16a34a' : '#64748b'
                                                            }}>
                                                                {product.is_available ? 'Disponible' : 'Agotado'}
                                                            </span>
                                                            {product.is_featured && (
                                                                <span className="status-tag" style={{ background: '#FFF7ED', color: '#EA580C' }}><i className="bi bi-star-fill"></i></span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                            <button
                                                                className="btn-boutique outline"
                                                                onClick={() => handleEditProduct(product)}
                                                                style={{ padding: '0.4rem 0.8rem' }}
                                                            >
                                                                <i className="bi bi-pencil-square"></i>
                                                            </button>
                                                            <button
                                                                className="btn-boutique outline"
                                                                style={{
                                                                    padding: '0.4rem 0.8rem',
                                                                    borderColor: product.is_featured ? '#CFB3A9' : '#E4D8CB',
                                                                    background: product.is_featured ? '#F5F5F0' : 'transparent'
                                                                }}
                                                                onClick={async () => {
                                                                    try {
                                                                        const formData = new FormData();
                                                                        formData.append('is_featured', !product.is_featured);
                                                                        await api.patch(`/api/menu/products/${product.id}/`, formData, {
                                                                            baseURL: process.env.REACT_APP_LUXE_SERVICE,
                                                                            headers: { 'Content-Type': 'multipart/form-data' },
                                                                        });
                                                                        fetchProducts();
                                                                    } catch (err) { console.error(err); }
                                                                }}
                                                            >
                                                                <i className={`bi bi-star${product.is_featured ? '-fill' : ''}`} style={{ color: product.is_featured ? '#CFB3A9' : 'inherit' }}></i>
                                                            </button>
                                                            <button
                                                                className="btn-boutique outline"
                                                                onClick={() => handleDeleteProduct(product.id)}
                                                                style={{ padding: '0.4rem 0.8rem', borderColor: '#FEE2E2', color: '#DC2626' }}
                                                            >
                                                                <i className="bi bi-trash"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProduct ? "Editar Producto" : "Nuevo Producto"}>
                        <form onSubmit={handleSubmit} className="boutique-form">
                            <div className="form-group-boutique">
                                <label>Nombre del Producto</label>
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Ej: Hamburguesa Suprema"
                                    value={newProduct.name}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="form-grid-2">
                                <div className="form-group-boutique">
                                    <label>Código / SKU</label>
                                    <input
                                        type="text"
                                        name="code"
                                        placeholder="Autogenerar"
                                        value={newProduct.code}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="form-group-boutique">
                                    <label>Categoría</label>
                                    <select
                                        name="category"
                                        value={newProduct.category}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">Seleccionar...</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group-boutique">
                                <label>Descripción del Producto</label>
                                <textarea
                                    name="description"
                                    placeholder="Describa los ingredientes o detalles..."
                                    value={newProduct.description}
                                    onChange={handleInputChange}
                                    required
                                    style={{ minHeight: '80px' }}
                                />
                            </div>

                            <div className="form-grid-2">
                                <div className="form-group-boutique">
                                    <label>Precio de Venta ($)</label>
                                    <input
                                        type="number"
                                        name="price"
                                        value={newProduct.price}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        required
                                    />
                                </div>
                                <div className="form-group-boutique">
                                    <label>Imagen del Producto</label>
                                    <div className="custom-file-upload" style={{
                                        border: '1px dashed #E4D8CB',
                                        padding: '5px',
                                        borderRadius: '8px',
                                        background: '#F5F5F0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px'
                                    }}>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            style={{ fontSize: '0.8rem', width: '100%' }}
                                            required={!editingProduct}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '2rem', padding: '0.5rem 0' }}>
                                <label className="boutique-checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="is_active"
                                        checked={newProduct.is_active}
                                        onChange={handleInputChange}
                                    />
                                    <span>Activo</span>
                                </label>
                                <label className="boutique-checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="is_available"
                                        checked={newProduct.is_available}
                                        onChange={handleInputChange}
                                    />
                                    <span>Disponible</span>
                                </label>
                            </div>

                            <div className="inventory-control-section" style={{
                                background: '#F1EEEB',
                                padding: '1.2rem',
                                borderRadius: '1rem',
                                marginTop: '0.5rem'
                            }}>
                                <label className="boutique-checkbox-label" style={{ marginBottom: newProduct.track_stock ? '1rem' : '0' }}>
                                    <input
                                        type="checkbox"
                                        name="track_stock"
                                        checked={newProduct.track_stock}
                                        onChange={handleInputChange}
                                    />
                                    <strong style={{ color: '#2C2C2C' }}>Controlar Inventario de este producto</strong>
                                </label>

                                {newProduct.track_stock && (
                                    <div className="form-grid-2">
                                        <div className="form-group-boutique">
                                            <label>Cantidad Actual</label>
                                            <input
                                                type="number"
                                                name="stock_quantity"
                                                value={newProduct.stock_quantity}
                                                onChange={handleInputChange}
                                                min="0"
                                                style={{ background: 'white' }}
                                            />
                                        </div>
                                        <div className="form-group-boutique">
                                            <label>Alerta Stock Mínimo</label>
                                            <input
                                                type="number"
                                                name="min_stock_alert"
                                                value={newProduct.min_stock_alert}
                                                onChange={handleInputChange}
                                                min="0"
                                                style={{ background: 'white' }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer-boutique" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid #E4D8CB', paddingTop: '1.5rem' }}>
                                <button type="button" className="btn-boutique dark" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn-boutique primary" style={{ minWidth: '120px' }}><i className="bi bi-save"></i> Guardar</button>
                            </div>
                        </form>
                    </Modal>
                </>
            )}
        </div>
    );
};

export default Inventario;
