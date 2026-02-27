import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BarraNavegacion from '../../comun/BarraNavegacion';
import PiePagina from '../../comun/PiePagina';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import CheckoutFlow from './components/CheckoutFlow';
import './BoutiqueLanding.css';
import './ProductStock.css';
import './ProductBadges.css';

const Coleccion = () => {
    const { user } = useAuth();
    const { cart, addToCart: contextAddToCart, isCartOpen, setIsCartOpen, toggleCart } = useCart();
    const navigate = useNavigate();
    const [categoriesData, setCategoriesData] = useState([]); // Stores full menu data
    const [products, setProducts] = useState([]); // Currently displayed products
    const [activeCategory, setActiveCategory] = useState(null);
    const [subCategories, setSubCategories] = useState([]);
    const [activeSubCategory, setActiveSubCategory] = useState(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    // Search State
    const [searchQuery, setSearchQuery] = useState('');

    // Alert Modal State
    const [alertModal, setAlertModal] = useState({
        show: false,
        type: 'info',
        title: '',
        message: ''
    });

    const showAlert = (type, title, message) => {
        setAlertModal({ show: true, type, title, message });
    };

    const closeAlert = () => {
        setAlertModal({ ...alertModal, show: false });
    };

    // Product detail modal
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [selectedSizeId, setSelectedSizeId] = useState('');
    const [selectedColorId, setSelectedColorId] = useState('');

    const handleNextImage = () => {
        if (!selectedProduct) return;
        const images = [selectedProduct.image, ...(selectedProduct.images ? selectedProduct.images.map(img => img.image) : [])].filter(Boolean);
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const handlePrevImage = () => {
        if (!selectedProduct) return;
        const images = [selectedProduct.image, ...(selectedProduct.images ? selectedProduct.images.map(img => img.image) : [])].filter(Boolean);
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Use FULL endpoint to get hierarchy: categories -> products
                const response = await api.get('api/menu/menu/full/', { baseURL: '/api/luxe' });
                const data = response.data || [];

                setCategoriesData(data);

                if (data.length > 0) {
                    setActiveCategory(data[0].id);
                    setProducts(data[0].products || []);
                    // Subcategories also available in data[0].subcategories
                    setSubCategories(data[0].subcategories || []);
                }
            } catch (err) {
                console.error("Error loading data:", err);
            }
        };
        fetchData();
    }, []);

    // Handle category change
    const handleCategoryChange = (catId) => {
        setActiveCategory(catId);
        setSearchQuery(''); // Clear search when changing category
        const category = categoriesData.find(c => c.id === catId);
        if (category) {
            setProducts(category.products || []);
            setSubCategories(category.subcategories || []);
            setActiveSubCategory(null); // Reset subcategory filter
            setCurrentPage(1); // Reset pagination
        }
    };

    // Handle Search
    const handleSearch = (e) => {
        const query = e.target.value.toLowerCase();
        setSearchQuery(query);
        setCurrentPage(1); // Reset pagination

        if (query.trim() === '') {
            // Restore current category items
            if (activeCategory) {
                const category = categoriesData.find(c => c.id === activeCategory);
                if (category) {
                    setProducts(category.products || []);
                }
            }
        } else {
            // Flatten all products from all categories for global search
            const allProducts = categoriesData.flatMap(c => c.products || []);
            // Filter unique products by ID to avoid duplicates if any
            const uniqueProducts = Array.from(new Map(allProducts.map(item => [item.id, item])).values());

            const filtered = uniqueProducts.filter(p =>
                p.name.toLowerCase().includes(query) ||
                (p.description && p.description.toLowerCase().includes(query))
            );
            setProducts(filtered);
            // Optionally, we could unset activeCategory to indicate global result, 
            // but keeping it active might be less confusing visually unless we want to dim tabs.
            // Let's reset activeSubCategory since it might not apply to global results
            setActiveSubCategory(null);
        }
    };

    // No need for separate subcategory effect anymore as it is handled in handleCategoryChange


    const addToCart = (product) => {
        contextAddToCart(product);
        showAlert('success', 'Producto agregado', `${product.name} se agregó a tu carrito.`);
    };

    const openProductDetail = (product) => {
        setSelectedProduct(product);
        setCurrentImageIndex(0);
        setSelectedSizeId('');
        setSelectedColorId('');
        // If there is only one size/color overall, we could auto-select, but empty is safe.
    };
    const closeProductDetail = () => setSelectedProduct(null);

    const isOutOfStock = (product) => {
        if (!product.track_stock) return false;

        // Si tiene variantes, verificamos si todas están agotadas
        if (product.variants && product.variants.length > 0) {
            return product.variants.every(v => v.stock_quantity <= 0);
        }

        return product.stock_quantity <= 0;
    };

    return (
        <div className="boutique-container">
            <BarraNavegacion />

            {/* BOTÓN FLOTANTE DE CARRITO */}
            {cart.length > 0 && (
                <div className="cart-floating-btn" onClick={toggleCart}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    <span className="cart-badge">{cart.reduce((a, b) => a + b.quantity, 0)}</span>
                </div>
            )}

            {/* HERO SECTION */}
            <section className="page-hero-section">
                <div className="page-hero-card">
                    <p className="page-hero-subtitle">Explora Nuestra</p>
                    <h1 className="page-hero-title">Colección Completa</h1>
                    <p className="page-hero-desc">
                        Descubre todos nuestros productos organizados por categoría
                    </p>
                </div>
            </section>

            {/* SECCIÓN DE COLECCIÓN CON FILTRO DE CATEGORÍAS */}
            <section className="collection-section coleccion-main-section">
                <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                    <div className="section-header">
                        <h2 className="section-title">Nuestra Colección</h2>
                        <div className="divider-line"></div>

                        {/* Search Bar */}
                        <div style={{ maxWidth: '400px', margin: '20px auto 10px', position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="Buscar productos..."
                                value={searchQuery}
                                onChange={handleSearch}
                                style={{
                                    width: '100%',
                                    padding: '12px 20px',
                                    paddingRight: '40px',
                                    borderRadius: '30px',
                                    border: '1px solid #E4D8CB',
                                    fontSize: '16px',
                                    outline: 'none',
                                    backgroundColor: '#fff',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                                    transition: 'all 0.3s'
                                }}
                            />
                            <div style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', color: '#999' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* TABS DE CATEGORÍAS */}
                    {/* TABS DE CATEGORÍAS - Hide if searching? Maybe just keep them but disable active state visual if searching globally */}
                    {!searchQuery && (
                        <div className="tabs-container">
                            <div className="tabs-scroll">
                                {categoriesData.map(cat => (
                                    <button
                                        key={cat.id}
                                        className={`tab-btn ${activeCategory === cat.id ? 'active' : ''}`}
                                        onClick={() => handleCategoryChange(cat.id)}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TABS DE SUBCATEGORÍAS - ESTILO PILL */}
                    {/* TABS DE SUBCATEGORÍAS - Hide if searching */}
                    {!searchQuery && subCategories.length > 0 && (
                        <div className="subtabs-container" style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '10px',
                            marginBottom: '30px',
                            flexWrap: 'wrap'
                        }}>
                            <button
                                className={`subtab-btn ${activeSubCategory === null ? 'active' : ''}`}
                                onClick={() => { setActiveSubCategory(null); setCurrentPage(1); }}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    border: '1px solid #E4D8CB',
                                    background: activeSubCategory === null ? '#E4D8CB' : 'transparent',
                                    color: activeSubCategory === null ? 'white' : '#666',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Todo
                            </button>
                            {subCategories.map(sub => (
                                <button
                                    key={sub.id}
                                    onClick={() => { setActiveSubCategory(sub.id); setCurrentPage(1); }}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '20px',
                                        border: '1px solid #E4D8CB',
                                        background: activeSubCategory === sub.id ? '#E4D8CB' : 'transparent',
                                        color: activeSubCategory === sub.id ? 'white' : '#666',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {sub.name}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* GRID DE PRODUCTOS */}
                    <div className="product-grid">
                        {products.length > 0 ? (
                            (() => {
                                const filtered = products.filter(p => {
                                    if (searchQuery) return true; // Already filtered by handleSearch logic

                                    // Products are already filtered by Category (via hierarchy)
                                    // Just need to filter by SubCategory if active

                                    const prodSubId = (typeof p.subcategory === 'object') ? p.subcategory?.id : (p.subcategory || null);
                                    const matchesSubCategory = !activeSubCategory || prodSubId === activeSubCategory;

                                    return matchesSubCategory;
                                });

                                if (filtered.length === 0) {
                                    return (
                                        <div className="no-products">
                                            {searchQuery
                                                ? `No se encontraron productos para "${searchQuery}"`
                                                : "No hay productos disponibles en esta categoría actualmente."
                                            }
                                        </div>
                                    );
                                }

                                // Pagination Logic
                                const indexOfLastItem = currentPage * itemsPerPage;
                                const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                                const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
                                const totalPages = Math.ceil(filtered.length / itemsPerPage);

                                return (
                                    <>
                                        {currentItems.map(product => {
                                            const outOfStock = isOutOfStock(product);
                                            return (
                                                <div key={product.id} className="product-card">
                                                    {outOfStock && (
                                                        <div className="ribbon-badge">AGOTADO</div>
                                                    )}
                                                    <div className="product-image-container" onClick={() => openProductDetail(product)} style={{ cursor: 'pointer' }}>
                                                        {product.image ? (
                                                            <img src={product.image} alt={product.name} className="product-image" />
                                                        ) : (
                                                            <div className="placeholder-image">{product.name.charAt(0)}</div>
                                                        )}
                                                        {!outOfStock && (
                                                            <div className="quick-add-btn" onClick={(e) => { e.stopPropagation(); addToCart(product); }}>+</div>
                                                        )}
                                                    </div>
                                                    <div className="product-info">
                                                        {product.brand && <p style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>{product.brand}</p>}
                                                        <h3 className="product-name" style={{ margin: product.brand ? '0 0 5px 0' : '' }}>{product.name}</h3>
                                                        {product.available_sizes && <p style={{ fontSize: '0.8rem', color: '#666', margin: '0 0 8px 0' }}>Tallas: <span style={{ fontWeight: '500' }}>{product.available_sizes}</span></p>}
                                                        <p className="product-price">
                                                            ${parseFloat(product.price).toFixed(2)}
                                                            {product.tax_rate > 0 && <span style={{ fontSize: '0.75rem', color: '#888', marginLeft: '5px' }}>(incluido el IVA)</span>}
                                                        </p>
                                                        {product.track_stock && (
                                                            <p className={`product-stock ${outOfStock ? 'out-of-stock' : ''}`}>
                                                                {outOfStock ? 'Sin stock' : `Stock: ${product.stock_quantity} unidades`}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Pagination Controls */}
                                        {totalPages > 1 && (
                                            <div style={{
                                                gridColumn: '1 / -1',
                                                display: 'flex',
                                                justifyContent: 'center',
                                                gap: '10px',
                                                marginTop: '40px'
                                            }}>
                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                    disabled={currentPage === 1}
                                                    style={{
                                                        padding: '10px 20px',
                                                        border: '1px solid #E4D8CB',
                                                        background: currentPage === 1 ? '#f5f5f5' : 'white',
                                                        color: currentPage === 1 ? '#ccc' : '#2C2C2C',
                                                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                                        borderRadius: '8px'
                                                    }}
                                                >
                                                    &laquo; Anterior
                                                </button>

                                                {[...Array(totalPages)].map((_, i) => (
                                                    <button
                                                        key={i + 1}
                                                        onClick={() => setCurrentPage(i + 1)}
                                                        style={{
                                                            width: '40px',
                                                            height: '40px',
                                                            border: '1px solid #E4D8CB',
                                                            background: currentPage === i + 1 ? '#2C2C2C' : 'white',
                                                            color: currentPage === i + 1 ? 'white' : '#2C2C2C',
                                                            cursor: 'pointer',
                                                            borderRadius: '8px'
                                                        }}
                                                    >
                                                        {i + 1}
                                                    </button>
                                                ))}

                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                    disabled={currentPage === totalPages}
                                                    style={{
                                                        padding: '10px 20px',
                                                        border: '1px solid #E4D8CB',
                                                        background: currentPage === totalPages ? '#f5f5f5' : 'white',
                                                        color: currentPage === totalPages ? '#ccc' : '#2C2C2C',
                                                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                                        borderRadius: '8px'
                                                    }}
                                                >
                                                    Siguiente &raquo;
                                                </button>
                                            </div>
                                        )}
                                    </>
                                );
                            })()
                        ) : (
                            <div className="no-products">
                                Cargando colección...
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* PRODUCT DETAIL MODAL */}
            {selectedProduct && (
                <div className="product-modal-overlay" onClick={closeProductDetail}>
                    <div className="product-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={closeProductDetail}>×</button>
                        <div className="modal-content-grid">
                            <div className="modal-image-section" style={{ position: 'relative' }}>
                                {(() => {
                                    const images = [selectedProduct.image, ...(selectedProduct.images ? selectedProduct.images.map(img => img.image) : [])].filter(Boolean);
                                    if (images.length === 0) {
                                        return <div className="modal-placeholder-image">{selectedProduct.name.charAt(0)}</div>;
                                    }
                                    const currentSrc = images[currentImageIndex];
                                    const finalSrc = currentSrc.startsWith('http') ? currentSrc : `${process.env.REACT_APP_LUXE_SERVICE || ''}${currentSrc}`;

                                    return (
                                        <>
                                            <img src={finalSrc} alt={selectedProduct.name} className="modal-product-image" />

                                            {images.length > 1 && (
                                                <>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
                                                        style={{
                                                            position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                                                            background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }}
                                                    >
                                                        ❮
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
                                                        style={{
                                                            position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                                                            background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }}
                                                    >
                                                        ❯
                                                    </button>

                                                    <div style={{ position: 'absolute', bottom: '10px', left: '0', right: '0', display: 'flex', justifyContent: 'center', gap: '5px' }}>
                                                        {images.map((_, idx) => (
                                                            <div
                                                                key={idx}
                                                                style={{
                                                                    width: '8px', height: '8px', borderRadius: '50%',
                                                                    background: idx === currentImageIndex ? '#2C2C2C' : 'rgba(255,255,255,0.6)',
                                                                    cursor: 'pointer'
                                                                }}
                                                                onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx); }}
                                                            />
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                            <div className="modal-info-section">
                                {selectedProduct.brand && <p style={{ fontSize: '0.9rem', color: '#888', textTransform: 'uppercase', marginBottom: '5px', letterSpacing: '1px' }}>{selectedProduct.brand}</p>}
                                <h2 className="modal-product-name" style={{ margin: selectedProduct.brand ? '0 0 15px 0' : '' }}>{selectedProduct.name}</h2>
                                {(() => {
                                    // Determinar precio base o el de la variante seleccionada
                                    let displayPrice = parseFloat(selectedProduct.price);
                                    let activeVariant = null;

                                    if (selectedProduct.variants && selectedProduct.variants.length > 0) {
                                        activeVariant = selectedProduct.variants.find(v =>
                                            (!selectedSizeId || v.size?.id === selectedSizeId) &&
                                            (!selectedColorId || v.color?.id === selectedColorId)
                                        );
                                        // If an exact variant is matched and has a specific price
                                        if (activeVariant && activeVariant.price) {
                                            displayPrice = parseFloat(activeVariant.price);
                                        }
                                    }

                                    return (
                                        <p className="modal-product-price">
                                            ${displayPrice.toFixed(2)}
                                            {selectedProduct.tax_rate > 0 && <span style={{ fontSize: '0.9rem', color: '#888', marginLeft: '10px' }}>(incluido el IVA)</span>}
                                        </p>
                                    );
                                })()}

                                <p className="modal-product-description">{selectedProduct.description || 'Producto de alta calidad seleccionado especialmente para ti.'}</p>

                                {/* Tallas estáticas (si no hay variantes avanzadas) */}
                                {selectedProduct.available_sizes && (!selectedProduct.variants || selectedProduct.variants.length === 0) && (
                                    <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '15px' }}><strong style={{ color: '#333' }}>Tallas Disponibles:</strong> {selectedProduct.available_sizes}</p>
                                )}

                                {/* Selector de Variante (Color y Talla) */}
                                {selectedProduct.variants && selectedProduct.variants.length > 0 && (() => {
                                    const sizeMap = new Map();
                                    const colorMap = new Map();
                                    selectedProduct.variants.forEach(v => {
                                        if (v.size && !sizeMap.has(v.size.id)) sizeMap.set(v.size.id, v.size);
                                        if (v.color && !colorMap.has(v.color.id)) colorMap.set(v.color.id, v.color);
                                    });
                                    const availableSizes = Array.from(sizeMap.values());
                                    const availableColors = Array.from(colorMap.values());

                                    return (
                                        <div style={{ marginBottom: '20px' }}>
                                            {/* Selector de Colores */}
                                            {availableColors.length > 0 && (
                                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', gap: '20px' }}>
                                                    <span style={{ fontWeight: 'bold', fontSize: '1.05rem', width: '60px', color: '#1a1a1a' }}>Color</span>
                                                    <select
                                                        value={selectedColorId}
                                                        onChange={(e) => setSelectedColorId(e.target.value)}
                                                        style={{
                                                            flex: 1,
                                                            padding: '12px 15px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #d1d5db',
                                                            backgroundColor: '#f3f4f6',
                                                            fontSize: '0.95rem',
                                                            color: '#374151',
                                                            outline: 'none',
                                                            cursor: 'pointer',
                                                            appearance: 'none',
                                                            backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23374151%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                                                            backgroundRepeat: 'no-repeat',
                                                            backgroundPosition: 'right .7em top 50%',
                                                            backgroundSize: '.65em auto',
                                                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                                        }}
                                                    >
                                                        <option value="">Elige una opción</option>
                                                        {availableColors.map(color => (
                                                            <option key={color.id} value={color.id}>{color.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            {/* Selector de Tallas */}
                                            {availableSizes.length > 0 && (
                                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', gap: '20px' }}>
                                                    <span style={{ fontWeight: 'bold', fontSize: '1.05rem', width: '60px', color: '#1a1a1a' }}>Talla</span>
                                                    <select
                                                        value={selectedSizeId}
                                                        onChange={(e) => setSelectedSizeId(e.target.value)}
                                                        style={{
                                                            flex: 1,
                                                            padding: '12px 15px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #d1d5db',
                                                            backgroundColor: '#f3f4f6',
                                                            fontSize: '0.95rem',
                                                            color: '#374151',
                                                            outline: 'none',
                                                            cursor: 'pointer',
                                                            appearance: 'none',
                                                            backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23374151%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                                                            backgroundRepeat: 'no-repeat',
                                                            backgroundPosition: 'right .7em top 50%',
                                                            backgroundSize: '.65em auto',
                                                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                                        }}
                                                    >
                                                        <option value="">Elige una opción</option>
                                                        {availableSizes.map(size => (
                                                            <option key={size.id} value={size.id}>{size.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {(() => {
                                    let stockMessage = '';
                                    let disableButton = false;
                                    let buttonText = 'Agregar al Carrito';

                                    if (selectedProduct.variants && selectedProduct.variants.length > 0) {
                                        // Detectar qué se requiere
                                        const needsSize = selectedProduct.variants.some(v => v.size);
                                        const needsColor = selectedProduct.variants.some(v => v.color);

                                        if ((needsSize && !selectedSizeId) || (needsColor && !selectedColorId)) {
                                            disableButton = true;
                                            buttonText = 'Selecciona opciones';
                                            stockMessage = 'Por favor selecciona ' + [needsSize && !selectedSizeId ? 'una talla' : '', needsColor && !selectedColorId ? 'un color' : ''].filter(Boolean).join(' y ');
                                        } else {
                                            // Encontrar la variante exacta
                                            const exactVariant = selectedProduct.variants.find(v =>
                                                (!needsSize || v.size?.id === selectedSizeId) &&
                                                (!needsColor || v.color?.id === selectedColorId)
                                            );

                                            if (!exactVariant) {
                                                disableButton = true;
                                                buttonText = 'Agotado';
                                                stockMessage = '✕ Stock agotado';
                                            } else if (exactVariant.stock_quantity <= 0) {
                                                disableButton = true;
                                                buttonText = 'Agotado';
                                                stockMessage = '✕ Combinación agotada';
                                            } else {
                                                stockMessage = `✓ En stock: ${exactVariant.stock_quantity} unidades`;
                                            }
                                        }
                                    } else {
                                        // Lógica normal
                                        if (isOutOfStock(selectedProduct)) {
                                            disableButton = true;
                                            buttonText = 'Agotado';
                                            stockMessage = '✕ Sin stock disponible';
                                        } else if (selectedProduct.track_stock) {
                                            stockMessage = `✓ En stock: ${selectedProduct.stock_quantity} unidades`;
                                        }
                                    }

                                    return (
                                        <>
                                            {stockMessage && (
                                                <p className={`modal-stock-info ${disableButton && buttonText === 'Agotado' ? 'out-of-stock' : ''}`} style={{ marginTop: '10px' }}>
                                                    {stockMessage}
                                                </p>
                                            )}

                                            <button
                                                className="modal-add-to-cart-btn"
                                                onClick={() => {
                                                    if (!disableButton) {
                                                        // Clonar el producto para el carrito inyectando la info de la variante
                                                        const productToAdd = { ...selectedProduct };

                                                        if (selectedProduct.variants && selectedProduct.variants.length > 0) {
                                                            const exactVariant = selectedProduct.variants.find(v =>
                                                                (!selectedSizeId || v.size?.id === selectedSizeId) &&
                                                                (!selectedColorId || v.color?.id === selectedColorId)
                                                            );
                                                            if (exactVariant) {
                                                                productToAdd.variant_id = exactVariant.id;
                                                                productToAdd.size_id = exactVariant.size?.id;
                                                                productToAdd.color_id = exactVariant.color?.id;
                                                                productToAdd.cart_name_suffix = [exactVariant.size?.name, exactVariant.color?.name].filter(Boolean).join(' | ');
                                                                if (exactVariant.price) productToAdd.price = exactVariant.price;

                                                                // Para que React considere combinaciones únicas en el carrito, se le puede alterar el ID, pero el CartContext normalmente usa product.id. 
                                                                // Por ahora lo pasamos así y dependemos de que CartContext lo maneje o actualizamos CartContext.
                                                            }
                                                        }

                                                        addToCart(productToAdd);
                                                        closeProductDetail();
                                                    }
                                                }}
                                                disabled={disableButton}
                                                style={{
                                                    opacity: disableButton ? 0.5 : 1,
                                                    cursor: disableButton ? 'not-allowed' : 'pointer',
                                                    marginTop: '20px'
                                                }}
                                            >
                                                {buttonText}
                                            </button>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CHECKOUT FLOW */}
            <CheckoutFlow isOpen={isCartOpen} onClose={toggleCart} />

            {/* CUSTOM ALERT MODAL */}
            {alertModal.show && (
                <div className="alert-modal-overlay" onClick={closeAlert} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, animation: 'fadeIn 0.2s ease-out' }}>
                    <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '0', maxWidth: '400px', width: '90%', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', animation: 'slideUp 0.3s ease-out', overflow: 'hidden' }}>
                        <div style={{ padding: '25px 25px 20px', background: alertModal.type === 'success' ? 'linear-gradient(135deg, #CFB3A9 0%, #e8d4cf 100%)' : alertModal.type === 'error' ? 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)' : alertModal.type === 'warning' ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' : 'linear-gradient(135deg, #2C2C2C 0%, #4a4a4a 100%)', textAlign: 'center' }}>
                            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', fontSize: '28px', color: 'white' }}>
                                {alertModal.type === 'success' && '✓'}
                                {alertModal.type === 'error' && '✕'}
                                {alertModal.type === 'warning' && '!'}
                                {alertModal.type === 'info' && 'i'}
                            </div>
                            <h3 style={{ margin: 0, color: 'white', fontSize: '20px', fontFamily: 'serif', fontWeight: '600' }}>{alertModal.title}</h3>
                        </div>
                        <div style={{ padding: '25px', textAlign: 'center' }}>
                            <p style={{ margin: '0 0 25px', color: '#666', fontSize: '15px', lineHeight: '1.6' }}>{alertModal.message}</p>
                            <button onClick={closeAlert} style={{ padding: '14px 50px', backgroundColor: alertModal.type === 'error' ? '#ef4444' : '#2C2C2C', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '1px', transition: 'transform 0.2s, box-shadow 0.2s' }}>ACEPTAR</button>
                        </div>
                    </div>
                </div>
            )}

            <PiePagina />
        </div>
    );
};

export default Coleccion;


