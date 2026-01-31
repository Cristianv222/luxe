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

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await api.get('/api/menu/products/', { baseURL: process.env.REACT_APP_LUXE_SERVICE });
                const data = response.data.results || response.data || [];
                // Only products with code
                setProducts(data.filter(p => p.code));
            } catch (error) {
                console.error("Error loading products:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handlePrint = () => {
        window.print();
    };

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
        setSelectedProducts([...filteredProducts]);
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
        return (
            <div className="luxe-layout" style={{ padding: '4rem', textAlign: 'center', backgroundColor: 'var(--color-froth)', minHeight: '100vh' }}>
                <i className="bi bi-arrow-repeat" style={{ fontSize: '2rem', color: 'var(--color-cinna)', animation: 'spin 1s linear infinite' }}></i>
                <p style={{ color: 'var(--color-latte)', marginTop: '1rem' }}>Cargando productos para etiquetado...</p>
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
                    <button onClick={handlePrint} className="ff-button ff-button-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <i className="bi bi-printer"></i> Imprimir Página
                    </button>
                </div>
            </div>

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
                        Seleccionar Todos ({filteredProducts.length})
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
                {filteredProducts.map(product => {
                    const isSelected = selectedProducts.find(p => p.id === product.id);
                    return (
                        <div
                            key={product.id}
                            onClick={() => toggleSelectProduct(product)}
                            className="ff-card"
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
            {filteredProducts.length === 0 && (
                <div className="ff-card" style={{ textAlign: 'center', padding: '4rem' }}>
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

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    .ff-card { 
                        box-shadow: none !important; 
                        border: 1px solid #ddd !important;
                        break-inside: avoid;
                    }
                    .ff-card-grid {
                        gap: 0.5rem !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default Etiquetas;


