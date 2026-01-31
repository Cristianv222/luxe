import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Barcode from 'react-barcode';
import printerService from '../../services/printerService';
import './Luxe.css';

const Etiquetas = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [copies, setCopies] = useState(1);
    const [printing, setPrinting] = useState(false);

    const [pagination, setPagination] = useState({
        page: 1,
        totalPages: 1,
        totalItems: 0,
        pageSize: 20
    });

    const fetchProducts = async (query = '', page = 1) => {
        setLoading(true);
        try {
            const params = { page };
            if (query) params.search = query;

            const response = await api.get('/api/menu/products/', {
                baseURL: process.env.REACT_APP_LUXE_SERVICE,
                params
            });

            const data = response.data.results || response.data || [];
            // Filter products with code/barcode only if backend doesn't filter perfectly
            const validProducts = data.filter(p => p.code);

            setProducts(validProducts);

            if (response.data.results) {
                setPagination({
                    page: page,
                    totalItems: response.data.count,
                    totalPages: Math.ceil(response.data.count / 20), // Asumiendo page_size 20 del backend
                    pageSize: 20
                });
            } else {
                setPagination({
                    page: 1,
                    totalItems: validProducts.length,
                    totalPages: 1,
                    pageSize: validProducts.length
                });
            }

        } catch (error) {
            console.error("Error loading products:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    // Debounce search
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchProducts(searchTerm, 1);
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const handlePageChange = (newPage) => {
        if (newPage < 1 || newPage > pagination.totalPages) return;
        fetchProducts(searchTerm, newPage);
    };

    const renderPagination = () => {
        const { page, totalPages } = pagination;
        if (totalPages <= 1) return null;

        let pages = [];
        pages.push(1);
        let start = Math.max(2, page - 2);
        let end = Math.min(totalPages - 1, page + 2);

        if (start > 2) pages.push('...');
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        if (end < totalPages - 1) pages.push('...');
        if (totalPages > 1) pages.push(totalPages);

        return (
            <div className="no-print" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', marginTop: '2rem', paddingBottom: '2rem' }}>
                <button
                    disabled={page === 1}
                    onClick={() => handlePageChange(page - 1)}
                    className="ff-button ff-button-secondary"
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
                            onClick={() => handlePageChange(p)}
                            className={`ff-button ${p === page ? 'ff-button-primary' : 'ff-button-secondary'}`}
                            style={{
                                padding: '0.4rem 0.8rem',
                                minWidth: '35px',
                                background: p === page ? 'var(--color-cinna)' : 'transparent',
                                color: p === page ? 'white' : 'var(--color-cinna)',
                                borderColor: 'var(--color-cinna)'
                            }}
                        >
                            {p}
                        </button>
                    )
                ))}

                <button
                    disabled={page === totalPages}
                    onClick={() => handlePageChange(page + 1)}
                    className="ff-button ff-button-secondary"
                    style={{ padding: '0.4rem 0.8rem' }}
                >
                    <i className="bi bi-chevron-right"></i>
                </button>

                <div style={{ marginLeft: '1rem', color: '#666', fontSize: '0.9rem' }}>
                    Página {page} de {totalPages}
                </div>
            </div>
        );
    };

    const fetchAllForPrint = async () => {
        if (!window.confirm('¿Desea cargar TODOS los productos para imprimir? Esto puede tardar unos segundos.')) return;

        setLoading(true);
        try {
            // Fetch all products (high limit)
            const response = await api.get('/api/menu/products/', {
                baseURL: process.env.REACT_APP_LUXE_SERVICE,
                params: {
                    search: searchTerm,
                    page_size: 1000 // Request a large number to get all
                }
            });

            const data = response.data.results || response.data || [];
            const validProducts = data.filter(p => p.code);

            // Temporarily update state to show all products
            setProducts(validProducts);

            // Wait for render then print (increased timeout for large lists)
            setTimeout(() => {
                console.log("Abriendo diálogo de impresión para", validProducts.length, "items...");
                window.print();
                // Optional: Reload original page after print to restore pagination
                // fetchProducts(searchTerm, pagination.page); 
            }, 2500);

        } catch (error) {
            console.error("Error loading all products:", error);
            alert("Error cargando productos para impresión");
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        // If there are many pages, ask user if they want to print ALL or just current page
        if (pagination.totalPages > 1) {
            fetchAllForPrint();
        } else {
            window.print();
        }
    };

    // ... (existing helper functions) ...

    const toggleSelectProduct = (product) => {
        setSelectedProducts(prev => {
            const isSelected = prev.find(p => p.id === product.id);
            if (isSelected) {
                return prev.filter(p => p.id !== product.id);
            } else {
                return [...prev, product];
            }
        });
    };

    const selectAll = () => {
        // Select all currently visible products
        setSelectedProducts([...products]);
    };

    const clearSelection = () => {
        setSelectedProducts([]);
    };

    const handlePrintLabels = async () => {
        if (selectedProducts.length === 0) {
            alert('Selecciona al menos un producto para imprimir');
            return;
        }

        setPrinting(true);
        try {
            const productsToSend = selectedProducts.map(p => {
                const taxRate = p.tax_rate ? parseFloat(p.tax_rate) : 0;
                const finalPrice = parseFloat(p.price) * (1 + taxRate / 100);
                return {
                    name: p.name,
                    code: p.code,
                    price: finalPrice.toFixed(2)
                };
            });

            const result = await printerService.printLabels(productsToSend, copies);

            if (result.status === 'success') {
                alert(`✅ ${selectedProducts.length} etiqueta(s) enviada(s) al Bot!\nJob: ${result.job_number}`);
                setSelectedProducts([]);
            } else {
                alert(`Error: ${result.message || 'Error desconocido'}`);
            }
        } catch (error) {
            console.error('Error printing labels:', error);
            alert(`Error al enviar etiquetas: ${error.response?.data?.error || error.message}`);
        } finally {
            setPrinting(false);
        }
    };

    if (loading) {
        // ... (existing loading state) ...
        return (
            <div className="luxe-layout" style={{ padding: '4rem', textAlign: 'center', backgroundColor: 'var(--color-froth)', minHeight: '100vh' }}>
                <i className="bi bi-arrow-repeat" style={{ fontSize: '2rem', color: 'var(--color-cinna)', animation: 'spin 1s linear infinite' }}></i>
                <p style={{ color: 'var(--color-latte)', marginTop: '1rem' }}>Cargando productos...</p>
            </div>
        );
    }

    return (
        <div className="luxe-layout" style={{ padding: '2rem', backgroundColor: 'var(--color-froth)', minHeight: '100vh' }}>
            {/* Header */}
            <div className="ff-welcome-header no-print" style={{ marginBottom: '1.5rem', padding: '1.5rem 2rem', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--color-dark)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <i className="bi bi-tags" style={{ color: 'var(--color-cinna)' }}></i>
                        Generador de Etiquetas
                    </h1>
                    <p style={{ color: 'var(--color-latte)', fontSize: '0.95rem' }}>
                        Imprime códigos de barra para tus productos (57x27mm)
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="Buscar producto..."
                        className="ff-search-input"
                        style={{ width: '220px' }}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />

                    {/* Botón Imprimir Todo (Solo si hay más de 1 página) */}
                    {pagination.totalPages > 1 && (
                        <button
                            onClick={fetchAllForPrint}
                            className="ff-button ff-button-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}
                            title="Carga e imprime todo el catálogo en una sola lista"
                        >
                            <i className="bi bi-collection-fill"></i> Todo ({pagination.totalItems})
                        </button>
                    )}

                    {/* Botón Imprimir Página Actual */}
                    <button
                        onClick={() => window.print()}
                        className="ff-button ff-button-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}
                        title="Imprime solo los productos visibles en esta página"
                    >
                        <i className="bi bi-printer"></i> Página Actual
                    </button>
                </div>
            </div>

            {/* ... (Selection bar and Grid remain same structure but verify no-print classes) ... */}

            {/* Barra de selección y botón Bot */}
            <div className="ff-card no-print" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-dark)', fontWeight: '500' }}>
                        Seleccionados: <span style={{ color: 'var(--color-cinna)', fontWeight: '700', fontSize: '1.1rem' }}>{selectedProducts.length}</span>
                    </span>
                    <button
                        onClick={selectAll}
                        style={{ color: 'var(--color-cinna)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}
                    >
                        Seleccionar Página
                    </button>
                    <button
                        onClick={clearSelection}
                        style={{ color: 'var(--color-latte)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}
                    >
                        Limpiar
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <label style={{ color: 'var(--color-dark)', fontSize: '0.9rem', fontWeight: '500' }}>Copias:</label>
                    <input
                        type="number"
                        min="1"
                        max="10"
                        value={copies}
                        onChange={e => setCopies(parseInt(e.target.value) || 1)}
                        className="ff-search-input"
                        style={{ width: '60px', textAlign: 'center', padding: '0.5rem' }}
                    />
                    <button
                        onClick={handlePrintLabels}
                        disabled={printing || selectedProducts.length === 0}
                        className="ff-button ff-button-primary"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            opacity: (printing || selectedProducts.length === 0) ? 0.5 : 1,
                            cursor: (printing || selectedProducts.length === 0) ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <i className="bi bi-tags"></i>
                        {printing ? 'Enviando...' : `Imprimir en Bot (${selectedProducts.length})`}
                    </button>
                </div>
            </div>

            {/* Grid de productos */}
            <div className="ff-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                {products.map(product => {
                    const isSelected = selectedProducts.find(p => p.id === product.id);
                    return (
                        <div
                            key={product.id}
                            onClick={() => toggleSelectProduct(product)}
                            className="ff-card product-card-print"
                            style={{
                                padding: '1.25rem',
                                cursor: 'pointer',
                                position: 'relative',
                                border: isSelected ? '2px solid var(--color-cinna)' : '1px solid var(--color-froth)',
                                boxShadow: isSelected ? '0 0 0 3px rgba(207, 179, 169, 0.2)' : 'var(--shadow-soft)',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            {/* Checkbox visual */}
                            <div className="no-print" style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
                                <div style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '4px',
                                    border: isSelected ? '2px solid var(--color-cinna)' : '2px solid var(--color-chai)',
                                    backgroundColor: isSelected ? 'var(--color-cinna)' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}>
                                    {isSelected && <i className="bi bi-check" style={{ color: 'white', fontSize: '0.9rem' }}></i>}
                                </div>
                            </div>

                            {/* Nombre centrado arriba */}
                            <div style={{
                                fontFamily: 'var(--font-serif)',
                                fontWeight: '600',
                                color: 'var(--color-dark)',
                                fontSize: '0.95rem',
                                textAlign: 'center',
                                marginBottom: '0.75rem',
                                lineHeight: '1.3',
                                minHeight: '2.6em',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }} title={product.name}>
                                {product.name}
                            </div>

                            {/* Código de barras centrado */}
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                                <Barcode
                                    value={product.code}
                                    width={1.3}
                                    height={45}
                                    fontSize={11}
                                    margin={0}
                                    displayValue={true}
                                />
                            </div>

                            {/* Precio con IVA */}
                            <div style={{
                                textAlign: 'center',
                                fontWeight: '700',
                                fontSize: '1.25rem',
                                color: 'var(--color-cinna)',
                                marginTop: '0.5rem'
                            }}>
                                ${(() => {
                                    const tax = product.tax_rate ? parseFloat(product.tax_rate) : 0;
                                    const final = parseFloat(product.price) * (1 + tax / 100);
                                    return final.toFixed(2);
                                })()}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Mensaje si no hay productos */}
            {products.length === 0 && (
                <div className="ff-card no-print" style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="ff-card-icon-wrapper" style={{ margin: '0 auto 1.5rem', width: '80px', height: '80px' }}>
                        <i className="bi bi-inbox" style={{ fontSize: '2.5rem', color: 'var(--color-latte)' }}></i>
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--color-dark)', marginBottom: '0.5rem' }}>
                        No se encontraron productos
                    </h3>
                    <p style={{ color: 'var(--color-latte)' }}>
                        {searchTerm ? 'Intenta con otro término de búsqueda' : 'No hay productos con código de barras configurado'}
                    </p>
                </div>
            )}

            {/* Pagination Controls */}
            {renderPagination()}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @media print {
                    /* Ocultar elementos de UI */
                    .no-print, 
                    .barra-lateral, 
                    .sidebar, 
                    .header, 
                    .navbar,
                    button { 
                        display: none !important; 
                    }

                    /* Configuración de la página */
                    @page { 
                        margin: 1cm; 
                        size: A4;
                    }

                    /* Resetear contenedores para permitir paginación masiva */
                    html, body {
                        height: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: visible !important;
                    }

                    #root, .App {
                        display: block !important;
                        height: auto !important;
                        min-height: auto !important;
                        overflow: visible !important;
                        position: static !important;
                    }

                    /* Hacer visible solo el contenedor de etiquetas y liberar restricciones */
                    .luxe-layout {
                        background: white !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        height: auto !important;
                        min-height: 100% !important;
                        overflow: visible !important;
                        visibility: visible;
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        display: block !important;
                        z-index: 9999;
                    }

                    .ff-card-grid {
                        display: grid !important;
                        grid-template-columns: repeat(4, 1fr) !important; /* 4 columnas para A4 */
                        gap: 10px !important;
                        visibility: visible;
                        height: auto !important;
                        overflow: visible !important;
                    }

                    .product-card-print {
                        break-inside: avoid;
                        page-break-inside: avoid;
                        border: 1px solid #ccc !important;
                        box-shadow: none !important;
                        padding: 5px !important;
                        margin-bottom: 5px;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        background: white !important;
                    }

                    /* Ajustes de texto para impresión compacto */
                    .product-card-print div {
                        font-size: 9pt !important;
                        margin-bottom: 2px !important;
                    }

                    
                    /* Asegurar que el código de barras se vea bien */
                    svg {
                        max-width: 100%;
                        height: 35px !important; /* Reducir altura para ahorrar espacio */
                    }
                }
            `}</style>
        </div>
    );
};

export default Etiquetas;


