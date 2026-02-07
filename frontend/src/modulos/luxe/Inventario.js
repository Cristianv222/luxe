import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../../comun/Modal';
import Categorias from './Categorias';
import SubCategorias from './SubCategorias';
import './Luxe.css';
import './Loyalty.css';


const Inventario = () => {
    const [activeTab, setActiveTab] = useState('products'); // products, categories, extras, combos, sizes, config

    // Estado para Productos
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubCategories] = useState([]); // All subcategories
    const [filteredSubcategories, setFilteredSubcategories] = useState([]); // For dropdown based on selected category
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Estado para Paginación
    const [pagination, setPagination] = useState({
        page: 1,
        totalPages: 1,
        totalItems: 0,
        pageSize: 20 // Default backend PAGE_SIZE
    });

    const [isModalOpen, setIsModalOpen] = useState(false);

    // Estado del formulario de producto
    const [newProduct, setNewProduct] = useState({
        name: '',
        code: '',
        barcode: '',
        description: '',
        price: '',
        cost_price: '',
        last_purchase_cost: '',
        tax_rate: '0',
        unit_measure: 'Unidad',
        category: '',
        subcategory: '',
        line: '',
        subgroup: '',
        accounting_sales_account: '',
        accounting_cost_account: '',
        accounting_inventory_account: '',
        image: null,
        is_active: true,
        is_available: true,
        track_stock: false,
        stock_quantity: 0,
        min_stock_alert: 5
    });
    const [editingProduct, setEditingProduct] = useState(null);

    // Configuración Global
    const [configAccounts, setConfigAccounts] = useState({
        sales_account: '',
        cost_account: '',
        inventory_account: ''
    });

    const fetchProducts = async (query = '', page = 1, showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const params = { page };
            if (query) params.search = query;

            const response = await api.get('/api/menu/products/', {
                baseURL: process.env.REACT_APP_LUXE_SERVICE,
                params
            });

            // Verificar si es respuesta paginada (DRF)
            if (response.data.results) {
                setProducts(response.data.results);
                setPagination({
                    page: page,
                    totalItems: response.data.count,
                    totalPages: Math.ceil(response.data.count / 20),
                    pageSize: 20
                });
            } else {
                // Fallback respuesta plana
                setProducts(response.data || []);
                setPagination({
                    page: 1,
                    totalItems: (response.data || []).length,
                    totalPages: 1,
                    pageSize: (response.data || []).length
                });
            }
        } catch (err) {
            console.error('Error fetching products:', err);
            setError('Error al cargar el inventario');
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await api.get('/api/menu/menu/summary/', {
                baseURL: process.env.REACT_APP_LUXE_SERVICE
            });
            setCategories(response.data || []);
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
        }
    };

    useEffect(() => {
        if (activeTab === 'products') {
            fetchProducts(searchQuery, 1);
            fetchCategories();
            fetchSubCategories();
        }
    }, [activeTab]);

    // Búsqueda con debounce simple
    useEffect(() => {
        if (activeTab === 'products') {
            const delayDebounceFn = setTimeout(() => {
                fetchProducts(searchQuery, 1);
            }, 500);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [searchQuery]);


    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;

        if (name === 'category') {
            // Filter subcategories when category changes
            // If filteredSubcategories state is used, update it.
            // But actually, we can derive it in render or effect.
            // Let's settle on: filtering subcategories for the dropdown.
        }

        setNewProduct(prev => ({ ...prev, [name]: newValue }));
    };

    // Update filtered subcategories whenever selected category changes
    useEffect(() => {
        if (newProduct.category) {
            // Use loose equality (==) because state might be string (from select) and ID is number
            const filtered = subcategories.filter(s => s.category == newProduct.category);
            setFilteredSubcategories(filtered);
        } else {
            setFilteredSubcategories([]);
        }
    }, [newProduct.category, subcategories]);

    const handleImageChange = (e) => {
        setNewProduct(prev => ({ ...prev, image: e.target.files[0] }));
    };

    const handleEditProduct = (product) => {
        setEditingProduct(product);
        setNewProduct({
            name: product.name,
            code: product.code || '',
            barcode: product.barcode || '', // Nuevo
            description: product.description,
            price: product.price,
            cost_price: product.cost_price || 0, // Nuevo
            last_purchase_cost: product.last_purchase_cost || 0, // Nuevo
            tax_rate: product.tax_rate || 0,
            unit_measure: product.unit_measure || 'Unidad', // Nuevo
            line: product.line || '', // Nuevo
            subgroup: product.subgroup || '',
            category: (product.category && typeof product.category === 'object') ? product.category.id : product.category,
            subcategory: (product.subcategory && typeof product.subcategory === 'object') ? product.subcategory.id : (product.subcategory || ''),
            accounting_sales_account: product.accounting_sales_account || '',
            accounting_cost_account: product.accounting_cost_account || '',
            accounting_inventory_account: product.accounting_inventory_account || '',
            image: null,
            is_active: product.is_active !== undefined ? product.is_active : true,
            is_available: product.is_available !== undefined ? product.is_available : true,
            track_stock: product.track_stock || false,
            stock_quantity: product.stock_quantity || 0,
            min_stock_alert: product.min_stock_alert || 5
        });
        // Asegurar que las categorías y subcategorías estén cargadas
        fetchCategories();
        if (subcategories.length === 0) fetchSubCategories();
        setIsModalOpen(true);
    };

    const handleToggleFeatured = async (product) => {
        try {
            const formData = new FormData();
            formData.append('is_featured', !product.is_featured);
            await api.patch(`/api/menu/products/${product.id}/`, formData, {
                baseURL: process.env.REACT_APP_LUXE_SERVICE,
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            fetchProducts(searchQuery, pagination.page, false);
        } catch (err) {
            console.error(err);
            alert('Error al actualizar destacado');
        }
    };

    const handleToggleActive = async (product) => {
        // Si está activo, lo vamos a desactivar (Corazón Roto)

        const confirmMsg = product.is_active
            ? "¿Romper corazón? (El producto se ocultará de la tienda)"
            : "¿Restaurar producto?";

        if (!window.confirm(confirmMsg)) return;

        try {
            const formData = new FormData();
            formData.append('is_active', !product.is_active);

            await api.patch(`/api/menu/products/${product.id}/`, formData, {
                baseURL: process.env.REACT_APP_LUXE_SERVICE,
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            fetchProducts(searchQuery, pagination.page, false);
        } catch (err) {
            console.error('Error toggling active:', err);
            alert('Error al actualizar estado');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const formData = new FormData();
        // Campos básicos
        formData.append('name', newProduct.name);
        formData.append('code', newProduct.code);
        formData.append('barcode', newProduct.barcode);
        formData.append('description', newProduct.description);
        formData.append('category', newProduct.category);
        if (newProduct.subcategory) formData.append('subcategory', newProduct.subcategory);

        // Precios y Costos
        formData.append('price', newProduct.price);
        formData.append('cost_price', newProduct.cost_price);
        formData.append('last_purchase_cost', newProduct.last_purchase_cost);
        formData.append('tax_rate', newProduct.tax_rate); // Guardar como porcentaje (Ej: 15)

        // Detalles
        formData.append('unit_measure', newProduct.unit_measure);
        formData.append('line', newProduct.line);
        formData.append('subgroup', newProduct.subgroup);

        // Contabilidad
        formData.append('accounting_sales_account', newProduct.accounting_sales_account);
        formData.append('accounting_cost_account', newProduct.accounting_cost_account);
        formData.append('accounting_inventory_account', newProduct.accounting_inventory_account);

        // Estados
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
            setEditingProduct(null);
            fetchProducts(searchQuery, editingProduct ? pagination.page : 1); // Si edita, mantiene página. Si crea, va a la 1 (o podría ir a la última...)
        } catch (err) {
            console.error('Error saving product:', err);
            // Mejorar mensaje de error
            let msg = 'Error al guardar el producto.';
            if (err.response?.data) {
                if (typeof err.response.data === 'object') {
                    // Concatenar errores de campos
                    const details = Object.entries(err.response.data)
                        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(' ') : value}`)
                        .join('\n');
                    if (details) msg += `\n${details}`;
                } else {
                    msg += ` ${err.response.data}`;
                }
            }
            alert(msg);
        }
    };

    // Handler para Configuración Global
    const handleGlobalConfigSubmit = async (e) => {
        e.preventDefault();
        if (!window.confirm("¿Está seguro? Esto actualizará las cuentas contables de TODOS los productos en el inventario.")) return;

        try {
            await api.post('/api/menu/config/accounts/bulk-update/', configAccounts, {
                baseURL: process.env.REACT_APP_LUXE_SERVICE
            });
            alert('Configuración aplicada exitosamente a todos los productos.');
            fetchProducts(searchQuery, 1); // Refrescar tabla
            // Limpiar o redirigir
            setConfigAccounts({ sales_account: '', cost_account: '', inventory_account: '' });
        } catch (err) {
            console.error(err);
            alert('Error al aplicar configuración');
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage < 1 || newPage > pagination.totalPages) return;
        fetchProducts(searchQuery, newPage);
    };

    const renderPagination = () => {
        const { page, totalPages } = pagination;
        if (totalPages <= 1) return null;

        let pages = [];
        pages.push(1);

        // Rango dinámico
        let start = Math.max(2, page - 2);
        let end = Math.min(totalPages - 1, page + 2);

        if (start > 2) pages.push('...');
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        if (end < totalPages - 1) pages.push('...');
        if (totalPages > 1) pages.push(totalPages);

        return (
            <div className="pagination-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', marginTop: '2rem' }}>
                <button
                    className="btn-boutique outline"
                    disabled={page === 1}
                    onClick={() => handlePageChange(page - 1)}
                    style={{ padding: '0.4rem 0.8rem' }}
                >
                    <i className="bi bi-chevron-left"></i>
                </button>

                {pages.map((p, idx) => (
                    p === '...' ? (
                        <span key={`dots-${idx}`} style={{ padding: '0 0.5rem', color: '#A09086' }}>...</span>
                    ) : (
                        <button
                            key={p}
                            className={`btn-boutique ${p === page ? 'primary' : 'outline'}`}
                            onClick={() => handlePageChange(p)}
                            style={{
                                padding: '0.4rem 0.8rem',
                                minWidth: '35px',
                                background: p === page ? '#8B7E74' : 'transparent',
                                color: p === page ? 'white' : '#8B7E74',
                                borderColor: '#8B7E74'
                            }}
                        >
                            {p}
                        </button>
                    )
                ))}

                <button
                    className="btn-boutique outline"
                    disabled={page === totalPages}
                    onClick={() => handlePageChange(page + 1)}
                    style={{ padding: '0.4rem 0.8rem' }}
                >
                    <i className="bi bi-chevron-right"></i>
                </button>

                <div style={{ marginLeft: '1rem', color: '#666', fontSize: '0.9rem' }}>
                    Página {page} de {totalPages} ({pagination.totalItems} items)
                </div>
            </div>
        );
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
                    {/* Search Bar */}
                    {activeTab === 'products' && (
                        <div style={{ position: 'relative', marginRight: '1rem' }}>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Buscar SKU, Nombre, Barras..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    padding: '0.6rem 1rem 0.6rem 2.5rem',
                                    borderRadius: '50px',
                                    border: '1px solid #E4D8CB',
                                    width: '300px',
                                    outline: 'none'
                                }}
                            />
                            <i className="bi bi-search" style={{
                                position: 'absolute',
                                left: '15px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#A09086'
                            }}></i>
                        </div>
                    )}

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
                                let msg = res.data.message;
                                if (res.data.errors && res.data.errors.length > 0) {
                                    msg += '\n\nErrores detectados:\n' + res.data.errors.join('\n');
                                }
                                alert(msg);
                                fetchProducts(searchQuery, 1);
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
                <button
                    className={`ff-tab ${activeTab === 'subcategories' ? 'active' : ''}`}
                    onClick={() => setActiveTab('subcategories')}
                >
                    <i className="bi bi-diagram-2" style={{ marginRight: '8px' }}></i> Subcategorías
                </button>
                <button
                    className={`ff-tab ${activeTab === 'config' ? 'active' : ''}`}
                    onClick={() => setActiveTab('config')}
                >
                    <i className="bi bi-gear" style={{ marginRight: '8px' }}></i> Configuración
                </button>
            </div>

            {/* Content Categories */}
            {activeTab === 'categories' && <Categorias />}
            {activeTab === 'subcategories' && <SubCategorias />}

            {/* Config Content */}
            {activeTab === 'config' && (
                <div className="boutique-card" style={{ maxWidth: '800px', margin: '2rem auto' }}>
                    <h2 style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Configuración Contable Global</h2>
                    <p style={{ color: '#666', marginBottom: '2rem' }}>
                        Establezca las cuentas contables por defecto. Al hacer clic en "Aplicar a Todos", se actualizarán
                        estos valores en <strong>todos</strong> los productos existentes en el inventario.
                    </p>

                    <form onSubmit={handleGlobalConfigSubmit}>
                        <div className="form-group-boutique">
                            <label>Cuenta de Ventas (Ingreso)</label>
                            <input
                                type="text"
                                placeholder="Ej: 4.1.01.01"
                                value={configAccounts.sales_account}
                                onChange={e => setConfigAccounts({ ...configAccounts, sales_account: e.target.value })}
                            />
                        </div>
                        <div className="form-group-boutique">
                            <label>Cuenta de Costos (Venta)</label>
                            <input
                                type="text"
                                placeholder="Ej: 5.1.01.01"
                                value={configAccounts.cost_account}
                                onChange={e => setConfigAccounts({ ...configAccounts, cost_account: e.target.value })}
                            />
                        </div>
                        <div className="form-group-boutique">
                            <label>Cuenta de Inventario (Activo)</label>
                            <input
                                type="text"
                                placeholder="Ej: 1.1.05.01"
                                value={configAccounts.inventory_account}
                                onChange={e => setConfigAccounts({ ...configAccounts, inventory_account: e.target.value })}
                            />
                        </div>

                        <div style={{ marginTop: '2rem', textAlign: 'right' }}>
                            <button type="submit" className="btn-boutique primary">
                                <i className="bi bi-check-all"></i> Guardar y Aplicar a Todos
                            </button>
                        </div>
                        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '2px dashed #fecaca' }}>
                            <h3 style={{ color: '#dc2626', fontSize: '1.1rem', marginBottom: '1rem' }}>Zona de Peligro (Desarrollo)</h3>
                            <p style={{ color: '#7f1d1d', marginBottom: '1rem', fontSize: '0.9rem' }}>
                                Estas acciones son irreversibles. Úselas con precaución.
                            </p>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!window.confirm("⚠️ ¿ESTÁS SIGURO?\n\nEsto borrará TODOS los productos del inventario y eliminará los productos de las órdenes existentes.\n\nEsta acción NO se puede deshacer.")) return;
                                    if (!window.confirm("Confirmación Final: ¿Realmente deseas VACIAR todo el inventario?")) return;

                                    try {
                                        const res = await api.post('/api/menu/config/inventory/clear/', {}, {
                                            baseURL: process.env.REACT_APP_LUXE_SERVICE
                                        });
                                        alert(res.data.message);
                                        fetchProducts(searchQuery, 1);
                                    } catch (err) {
                                        console.error(err);
                                        alert('Error al vaciar inventario.');
                                    }
                                }}
                                className="btn-boutique"
                                style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}
                            >
                                <i className="bi bi-trash"></i> VACIAR TODO EL INVENTARIO
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Products Content */}
            {activeTab === 'products' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                        <button className="btn-boutique success" onClick={() => {
                            setEditingProduct(null);
                            setNewProduct({
                                name: '', code: '', barcode: '', description: '', price: '', cost_price: '', last_purchase_cost: '', tax_rate: '15',
                                category: '', line: '', subgroup: '', image: null, is_active: true, is_available: true,
                                track_stock: false, stock_quantity: 0, min_stock_alert: 5,
                                unit_measure: 'Unidad', accounting_sales_account: '', accounting_cost_account: '', accounting_inventory_account: ''
                            });
                            // Asegurar que las categorías estén cargadas
                            fetchCategories();
                            fetchSubCategories();
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
                            <div className="boutique-table-wrapper" style={{ overflowX: 'auto' }}>
                                <table className="boutique-table" style={{ minWidth: '1500px' }}>
                                    <thead>
                                        <tr>
                                            <th>Acciones</th>
                                            <th>Imagen</th>
                                            <th>Código (SKU)</th>
                                            <th>Cód. Barras</th>
                                            <th>Nombre</th>
                                            <th>Descripción (Web)</th>
                                            <th>Categoría</th>
                                            <th>Stock (Existencias)</th>
                                            <th>Precio Venta</th>
                                            <th>Costo Actual</th>
                                            <th>IVA %</th>
                                            <th>Cta. Ventas</th>
                                            <th>Cta. Costos</th>
                                            <th>Cta. Inv.</th>
                                            <th>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.length === 0 ? (
                                            <tr><td colSpan="18" style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>No se encontraron productos.</td></tr>
                                        ) : (
                                            products.map(product => (
                                                <tr key={product.id}>
                                                    <td style={{ position: 'sticky', left: 0, background: 'white', zIndex: 1, boxShadow: '2px 0 5px rgba(0,0,0,0.05)' }}>
                                                        <div style={{ display: 'flex', gap: '5px' }}>
                                                            {/* FEATURED HEART */}
                                                            <button
                                                                className="btn-boutique outline"
                                                                onClick={() => handleToggleFeatured(product)}
                                                                style={{
                                                                    padding: '0.3rem 0.6rem',
                                                                    fontSize: '0.9rem',
                                                                    color: product.is_featured ? '#dc2626' : '#A09086',
                                                                    borderColor: product.is_featured ? '#dc2626' : '#E4D8CB'
                                                                }}
                                                                title={product.is_featured ? "Quitar destacado" : "Destacar"}
                                                            >
                                                                <i className={`bi ${product.is_featured ? 'bi-heart-fill' : 'bi-heart'}`}></i>
                                                            </button>

                                                            {/* EDIT PENCIL */}
                                                            <button
                                                                className="btn-boutique outline"
                                                                onClick={() => handleEditProduct(product)}
                                                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                                                                title="Editar"
                                                            >
                                                                <i className="bi bi-pencil-square"></i>
                                                            </button>

                                                            {/* BROKEN HEART (HIDE) */}
                                                            <button
                                                                className="btn-boutique outline"
                                                                onClick={() => handleToggleActive(product)}
                                                                style={{
                                                                    padding: '0.3rem 0.6rem',
                                                                    fontSize: '0.8rem',
                                                                    borderColor: product.is_active ? '#E4D8CB' : '#dc2626',
                                                                    color: product.is_active ? '#666' : '#dc2626',
                                                                    background: product.is_active ? 'transparent' : '#fee2e2'
                                                                }}
                                                                title={product.is_active ? "Ocultar (Romper corazón)" : "Restaurar (Curar corazón)"}
                                                            >
                                                                <i className={`bi ${product.is_active ? 'bi-heartbreak' : 'bi-heart-pulse-fill'}`}></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td style={{ width: '60px' }}>
                                                        <div className="product-img-wrapper" style={{
                                                            width: '50px',
                                                            height: '50px',
                                                            borderRadius: '8px',
                                                            overflow: 'hidden',
                                                            border: '1px solid #E4D8CB',
                                                            background: '#F5F5F0'
                                                        }}>
                                                            {product.image ? (
                                                                <img
                                                                    src={product.image.startsWith('http') ? product.image : `${process.env.REACT_APP_LUXE_SERVICE}${product.image}`}
                                                                    alt={product.name}
                                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                />
                                                            ) : (
                                                                <i className="bi bi-image" style={{ color: '#A09086', fontSize: '1.2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}></i>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{product.code || '-'}</td>
                                                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{product.barcode || '-'}</td>
                                                    <td style={{ fontWeight: 600 }}>{product.name}</td>
                                                    <td>
                                                        <div style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#666', fontSize: '0.9rem' }} title={product.description}>
                                                            {product.description || '-'}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="status-tag" style={{ background: '#F1EEEB', color: '#A09086' }}>
                                                            {product.category_name || product.category || '-'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {product.track_stock ? (
                                                            <span style={{
                                                                color: product.stock_quantity <= product.min_stock_alert ? '#DC2626' : '#16A34A',
                                                                fontWeight: 'bold'
                                                            }}>
                                                                {product.stock_quantity}
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: '#E4D8CB' }}>∞</span>
                                                        )}
                                                    </td>
                                                    <td style={{ fontWeight: 700 }}>${Number(product.price).toFixed(2)}</td>
                                                    <td>${Number(product.cost_price || 0).toFixed(2)}</td>
                                                    <td>{product.tax_rate ? `${parseFloat(product.tax_rate)}%` : '0%'}</td>
                                                    <td style={{ fontSize: '0.8rem' }}>{product.accounting_sales_account || '-'}</td>
                                                    <td style={{ fontSize: '0.8rem' }}>{product.accounting_cost_account || '-'}</td>
                                                    <td style={{ fontSize: '0.8rem' }}>{product.accounting_inventory_account || '-'}</td>
                                                    <td>
                                                        <span className={`status-tag ${product.is_available ? 'active' : 'inactive'}`} style={{
                                                            fontSize: '0.75rem',
                                                            background: product.is_available ? '#f0fdf4' : '#f8fafc',
                                                            color: product.is_available ? '#16a34a' : '#64748b'
                                                        }}>
                                                            {product.is_available ? 'Disp' : 'Agot'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Pagination */}
                    {activeTab === 'products' && !loading && !error && renderPagination()}

                    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProduct ? "Editar Producto" : "Nuevo Producto"}>
                        <form onSubmit={handleSubmit} className="boutique-form">
                            {/* Información Básica */}
                            <h4 style={{ marginBottom: '10px', color: '#8b7e74' }}>Información Básica</h4>
                            <div className="form-group-boutique">
                                <label>Nombre del Producto</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={newProduct.name}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="form-grid-3">
                                <div className="form-group-boutique">
                                    <label>Código SKU</label>
                                    <input
                                        type="text"
                                        name="code"
                                        value={newProduct.code}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="form-group-boutique">
                                    <label>Código Barras</label>
                                    <input
                                        type="text"
                                        name="barcode"
                                        value={newProduct.barcode}
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
                                <div className="form-group-boutique">
                                    <label>Subcategoría</label>
                                    <select
                                        name="subcategory"
                                        value={newProduct.subcategory}
                                        onChange={handleInputChange}
                                        disabled={!newProduct.category}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {filteredSubcategories.map(sub => (
                                            <option key={sub.id} value={sub.id}>{sub.name}</option>
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
                                    style={{ minHeight: '60px' }}
                                />
                            </div>

                            <div className="form-grid-3">
                                <div className="form-group-boutique">
                                    <label>Línea</label>
                                    <input type="text" name="line" value={newProduct.line} onChange={handleInputChange} />
                                </div>
                                <div className="form-group-boutique">
                                    <label>Subgrupo</label>
                                    <input type="text" name="subgroup" value={newProduct.subgroup} onChange={handleInputChange} />
                                </div>
                                <div className="form-group-boutique">
                                    <label>Unidad Medida</label>
                                    <input type="text" name="unit_measure" value={newProduct.unit_measure} onChange={handleInputChange} />
                                </div>
                            </div>

                            {/* Precios y Costos */}
                            <h4 style={{ margin: '15px 0 10px', color: '#8b7e74' }}>Precios y Costos</h4>
                            <div className="form-grid-2">
                                <div className="form-group-boutique">
                                    <label>Precio Venta ($)</label>
                                    <input
                                        type="number"
                                        name="price"
                                        value={newProduct.price}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        required
                                        style={{ fontWeight: 'bold' }}
                                    />
                                </div>
                                <div className="form-group-boutique">
                                    <label>IVA % (Ej: 15)</label>
                                    <input
                                        type="number"
                                        name="tax_rate"
                                        value={newProduct.tax_rate}
                                        onChange={handleInputChange}
                                        step="0.01"
                                    />
                                </div>
                            </div>
                            <div className="form-grid-2">
                                <div className="form-group-boutique">
                                    <label>Costo Actual ($)</label>
                                    <input
                                        type="number"
                                        name="cost_price"
                                        value={newProduct.cost_price}
                                        onChange={handleInputChange}
                                        step="0.01"
                                    />
                                </div>
                                <div className="form-group-boutique">
                                    <label>Costo Última Compra ($)</label>
                                    <input
                                        type="number"
                                        name="last_purchase_cost"
                                        value={newProduct.last_purchase_cost}
                                        onChange={handleInputChange}
                                        step="0.01"
                                    />
                                </div>
                            </div>

                            {/* Stock */}
                            <div className="inventory-control-section" style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', margin: '10px 0' }}>
                                <label className="boutique-checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="track_stock"
                                        checked={newProduct.track_stock}
                                        onChange={handleInputChange}
                                    />
                                    <strong>Controlar Stock</strong>
                                </label>
                                {newProduct.track_stock && (
                                    <div className="form-grid-2" style={{ marginTop: '10px' }}>
                                        <div className="form-group-boutique">
                                            <label>Stock Actual</label>
                                            <input
                                                type="number"
                                                name="stock_quantity"
                                                value={newProduct.stock_quantity}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div className="form-group-boutique">
                                            <label>Mínimo</label>
                                            <input
                                                type="number"
                                                name="min_stock_alert"
                                                value={newProduct.min_stock_alert}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="form-group-boutique" style={{ marginTop: '10px' }}>
                                <label>Imagen</label>
                                <input type="file" onChange={handleImageChange} />
                            </div>

                            <div className="modal-footer-boutique" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid #E4D8CB', paddingTop: '1.5rem' }}>
                                <button type="button" className="btn-boutique dark" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn-boutique primary" style={{ minWidth: '120px' }}><i className="bi bi-save"></i> Guardar Cambios</button>
                            </div>
                        </form>
                    </Modal>
                </>
            )}
        </div >
    );
};

export default Inventario;


