import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';
import printerService from '../../services/printerService';

// ====================================================================
// 1. Funciones de Ayuda
// ====================================================================

const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '$0.00';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num || 0);
};

// Constantes para áreas táctiles (mínimo 44x44px)
const TOUCH_MIN_SIZE = '44px';

const PuntosVenta = () => {
    // =====================================
    // 1. ESTADO DE DATOS Y CARGA
    // =====================================
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [processingOrder, setProcessingOrder] = useState(false);
    const [screenWidth, setScreenWidth] = useState(window.innerWidth);
    const [showOrderDetails, setShowOrderDetails] = useState(false);
    const [editingNoteForItem, setEditingNoteForItem] = useState(null);
    const [noteText, setNoteText] = useState('');

    // 2. ESTADO DEL PUNTO DE VENTA
    const [cart, setCart] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState('in_store'); // in_store, pickup, delivery
    const [discountCode, setDiscountCode] = useState('');
    const [appliedDiscount, setAppliedDiscount] = useState(null);

    // 2.5 ESTADO ESCÁNER / CÓDIGO
    const [barcodeBuffer, setBarcodeBuffer] = useState('');
    const [lastScanTime, setLastScanTime] = useState(0);

    // 3.5 ESTADO DE CALCULADORA DE VUELTO
    const [cashGiven, setCashGiven] = useState(null);
    const [inputCash, setInputCash] = useState('');

    const [showReviewModal, setShowReviewModal] = useState(false);

    // 3. ESTADO DE CLIENTES
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [newCustomer, setNewCustomer] = useState({
        email: '',
        username: '',
        password: 'Password123!',
        password_confirm: 'Password123!',
        first_name: '',
        last_name: '',
        phone: '',
        address: '',
        city: '',
        identification_number: '',
        date_of_birth: ''
    });

    // =====================================
    // 4. EFECTOS - CARGA INICIAL Y ESCÁNER
    // =====================================

    // Custom Scrollbar
    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
            ::-webkit-scrollbar { width: 8px; height: 8px; }
            ::-webkit-scrollbar-track { background: #f1f1f1; }
            ::-webkit-scrollbar-thumb { background: #c7d2fe; border-radius: 4px; }
            ::-webkit-scrollbar-thumb:hover { background: #a5b4fc; }
            .ff-search-input-lg {
                width: 100%;
                padding: 1rem;
                font-size: 1.25rem;
                border: 2px solid var(--color-chai);
                border-radius: 8px;
                box-shadow: var(--shadow-sm);
                transition: all 0.2s;
            }
            .ff-search-input-lg:focus {
                border-color: var(--color-cinna);
                box-shadow: 0 0 0 4px rgba(217, 119, 6, 0.1);
                outline: none;
            }
        `;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, []);

    const loadData = useCallback(async () => {
        try {
            const productsRes = await api.get('api/menu/products/', { baseURL: '/api/luxe' });
            setProducts(productsRes.data.results || productsRes.data || []);
        } catch (err) { console.error('Error cargando productos:', err); }

        try {
            const categoriesRes = await api.get('api/menu/categories/', { baseURL: '/api/luxe' });
            setCategories(categoriesRes.data.results || categoriesRes.data || []);
        } catch (err) { console.error('Error cargando categorías:', err); }

        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    useEffect(() => {
        const handleResize = () => setScreenWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // LÓGICA DEL ESCÁNER DE CÓDIGOS DE BARRAS
    const handleBarcodeScan = useCallback((code) => {
        // Buscar producto por código EXACTO
        const product = products.find(p => p.code === code || p.slug === code); // Fallback slug if code empty
        if (product) {
            addToCart(product);
            console.log("Producto agregado por escáner:", product.name);
        } else {
            console.warn("Producto no encontrado para el código:", code);
        }
    }, [products]); // addToCart es estable, pero products cambia

    // Listener Global de Teclas
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignorar si el foco está en un input (para permitir escribir normal)
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const currentTime = Date.now();

            if (e.key === 'Enter') {
                if (barcodeBuffer.length > 0) {
                    handleBarcodeScan(barcodeBuffer);
                    setBarcodeBuffer('');
                }
            } else if (e.key.length === 1) { // Caracteres imprimibles
                // Si ha pasado mucho tiempo desde la última tecla, reiniciar buffer (diferenciar typing manual lento vs escáner rápido)
                if (currentTime - lastScanTime > 100) {
                    setBarcodeBuffer(e.key);
                } else {
                    setBarcodeBuffer(prev => prev + e.key);
                }
                setLastScanTime(currentTime);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [barcodeBuffer, lastScanTime, handleBarcodeScan]);


    // =====================================
    // 5. LÓGICA DEL CARRITO
    // =====================================
    const addToCart = useCallback((product) => {
        // Verificar stock si aplica
        if (product.track_stock && product.stock_quantity <= 0) {
            alert("Producto agotado");
            return;
        }

        setCart(prevCart => {
            const existingItemIndex = prevCart.findIndex(item => item.product_id === product.id);
            if (existingItemIndex >= 0) {
                // Verificar si al agregar excede stock
                if (product.track_stock && prevCart[existingItemIndex].quantity >= product.stock_quantity) {
                    alert("No hay suficiente stock disponible");
                    return prevCart;
                }
                const newCart = [...prevCart];
                newCart[existingItemIndex] = {
                    ...newCart[existingItemIndex],
                    quantity: newCart[existingItemIndex].quantity + 1
                };
                return newCart;
            } else {
                return [...prevCart, {
                    product_id: product.id,
                    name: product.name,
                    price: parseFloat(product.price),
                    quantity: 1,
                    image: product.image,
                    note: '',
                    code: product.code
                }];
            }
        });
    }, []);

    const removeFromCart = useCallback((productId) => setCart(prev => prev.filter(i => i.product_id !== productId)), []);

    const updateQuantity = useCallback((productId, delta) => {
        setCart(prevCart => {
            return prevCart.map(item => {
                if (item.product_id === productId) {
                    const product = products.find(p => p.id === productId);
                    const newQuantity = Math.max(1, item.quantity + delta);

                    if (delta > 0 && product && product.track_stock && newQuantity > product.stock_quantity) {
                        alert("No hay suficiente stock disponible");
                        return item;
                    }
                    return { ...item, quantity: newQuantity };
                }
                return item;
            });
        });
    }, [products]);

    const handleAddNote = (productId) => {
        const item = cart.find(i => i.product_id === productId);
        setEditingNoteForItem(productId);
        setNoteText(item?.note || '');
    };
    const saveNote = () => {
        setCart(prev => prev.map(item => item.product_id === editingNoteForItem ? { ...item, note: noteText.trim() } : item));
        setEditingNoteForItem(null); setNoteText('');
    };

    // =====================================
    // 6. CÁLCULOS
    // =====================================
    const calculateSubtotal = useMemo(() => cart.reduce((t, i) => t + (i.price * i.quantity), 0), [cart]);
    const calculateDiscountAmount = useMemo(() => {
        if (!appliedDiscount) return 0;
        if (appliedDiscount.discount_type === 'percentage') return calculateSubtotal * (parseFloat(appliedDiscount.discount_value) / 100);
        return Math.min(parseFloat(appliedDiscount.discount_value), calculateSubtotal);
    }, [appliedDiscount, calculateSubtotal]);
    const calculateTotal = useMemo(() => calculateSubtotal - calculateDiscountAmount, [calculateSubtotal, calculateDiscountAmount]);

    const handleApplyDiscount = async () => {
        if (!discountCode) return;
        try {
            const res = await api.post('/api/pos/discounts/validate/', { code: discountCode }, { baseURL: process.env.REACT_APP_LUXE_SERVICE });
            if (res.data.valid) { setAppliedDiscount(res.data.discount); alert('Descuento aplicado'); }
            else { alert(res.data.message || 'Inválido'); setAppliedDiscount(null); }
        } catch { alert('Error validando descuento'); }
    };

    // =====================================
    // 7. CLIENTES Y USUARIOS (UNIFICADOS - AUTH SERVICE)
    // =====================================
    const searchCustomers = async (query) => {
        setCustomerSearch(query);
        if (query.length < 3) { setCustomers([]); return; }
        try {
            // AHORA BUSCAMOS EN AUTH SERVICE (USUARIOS)
            const res = await api.get(`/api/users/?search=${query}`);
            const userData = res.data.results || res.data || [];
            setCustomers(userData);
        } catch (e) { console.error("Error al buscar usuarios:", e); }
    };

    const syncAndSelectUser = async (user) => {
        try {
            console.log("Iniciando sincronización atómica para:", user.email);

            const customerPayload = {
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                phone: user.phone || null,
                cedula: user.identification_number || null,
                identification_number: user.identification_number || null,
                address: user.address || '',
                city: user.city || ''
            };

            // USAMOS EL ENDPOINT ATÓMICO: Sincroniza (Busca o Crea) en una sola petición
            const res = await api.post('api/customers/admin/sync/', customerPayload, { baseURL: '/api/luxe' });
            const syncedCustomer = res.data.data;

            if (syncedCustomer) {
                console.log("Cliente vinculado correctamente:", syncedCustomer.id);
                setSelectedCustomer(syncedCustomer);
                setCustomers([]);
                setCustomerSearch(''); // Limpiamos búsqueda
                return syncedCustomer;
            }
        } catch (err) {
            console.warn("Fallo en sincronización atómica, usando selección local:", err.message);
            // Fallback: selección local para no bloquear la operación
            setSelectedCustomer({ ...user, is_external_only: true });
            setCustomers([]);
            setCustomerSearch('');
            return null;
        }
    };

    const handleCreateCustomer = async (e) => {
        e.preventDefault();
        try {
            // 1. Prepare payload for AUTH SERVICE (Identity)
            console.log("Creando cuenta de usuario web (Ucelis)...");
            const authPayload = {
                first_name: newCustomer.first_name,
                last_name: newCustomer.last_name,
                identification_number: newCustomer.identification_number,
                date_of_birth: newCustomer.date_of_birth,
                email: newCustomer.email,
                phone: newCustomer.phone,
                username: newCustomer.username || newCustomer.email,
                password: newCustomer.password,
                password_confirm: newCustomer.password_confirm
            };

            const authRes = await api.post('/api/authentication/register/', authPayload);
            const createdUser = authRes.data.user;

            // 2. Sync with LUXE SERVICE (Optional background sync)
            await syncAndSelectUser(createdUser);

            // 3. Success Feedback & Reset
            alert('¡Usuario creado exitosamente!');

            setShowCustomerModal(false);

            setNewCustomer({
                email: '',
                username: '',
                password: 'Password123!',
                password_confirm: 'Password123!',
                first_name: '',
                last_name: '',
                phone: '',
                address: '',
                city: '',
                identification_number: '',
                date_of_birth: ''
            });

        } catch (err) {
            console.error('Error principal:', err);
            const msg = err.response?.data?.message || JSON.stringify(err.response?.data) || err.message;
            alert('Error al crear usuario: ' + msg);
        }
    };
    const handleInputChange = (e) => setNewCustomer(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const finalPlaceOrder = async () => {
        if (cart.length === 0) return;
        setProcessingOrder(true); setShowReviewModal(false);

        let tableNumber = selectedDeliveryMethod === 'in_store' ? 'TIENDA' : (selectedDeliveryMethod === 'pickup' ? 'RECOGIDA' : 'ENVIO');
        let orderNotes = cashGiven ? `Pago con: ${formatCurrency(cashGiven)} - Cambio: ${formatCurrency(cashGiven - calculateTotal)}` : '';

        const payload = {
            order_type: selectedDeliveryMethod,
            table_number: tableNumber,
            notes: orderNotes,
            items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity, notes: i.note || '' })),
            discount_code: appliedDiscount?.code || null,
            // IMPORTANTE: Enviamos ID si lo tenemos, y siempre el email para respaldo
            customer_id: (selectedCustomer && !selectedCustomer.is_external_only) ? selectedCustomer.id : null,
            customer_email: selectedCustomer?.email || null
        };

        try {
            const res = await api.post('/api/orders/orders/', payload, { baseURL: process.env.REACT_APP_LUXE_SERVICE });
            // Imprimir
            await printerService.printReceipt({
                order_number: res.data.order_number || res.data.id,
                customer_name: selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : 'CONSUMIDOR FINAL',
                order_type: selectedDeliveryMethod, // ENVIAR order_type para el backend nuevo
                table_number: tableNumber, // Legacy
                items: cart.map(i => ({ name: i.name, quantity: i.quantity, price: i.price, total: i.price * i.quantity, note: i.note })),
                subtotal: calculateSubtotal, discount: calculateDiscountAmount, tax: calculateSubtotal * 0.12, total: calculateTotal,
                printed_at: new Date().toISOString()
            });
            alert('Orden confirmada e impresa');
            // Reset
            setCart([]); setAppliedDiscount(null); setDiscountCode(''); setSelectedCustomer(null); setCustomerSearch(''); setCashGiven(null); setInputCash(''); loadData();
        } catch (e) {
            console.error(e);
            const msg = e.response?.data?.detail || JSON.stringify(e.response?.data) || e.message;
            alert('Error al procesar orden: ' + msg);
        } finally { setProcessingOrder(false); }
    };

    const handleOpenCashDrawer = async () => {
        try { await printerService.openCashDrawer(); alert('Caja abierta'); }
        catch { alert('Error al abrir caja'); }
    };

    // =====================================
    // 8. RENDERIZADO
    // =====================================

    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
            const term = searchTerm.toLowerCase();
            const matchesSearch = product.name.toLowerCase().includes(term) ||
                (product.code && product.code.toLowerCase().includes(term));

            const isAvailable = product.is_active && product.is_available;
            const hasStock = !product.track_stock || product.stock_quantity > 0;
            return matchesCategory && matchesSearch && isAvailable && hasStock;
        });
    }, [products, selectedCategory, searchTerm]);

    const renderDesktopView = () => (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#f8fafc' }}>
            {/* Header Moderno */}
            <div style={{ backgroundColor: '#ffffff', padding: '1rem 2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                    BOUTIQUE POS
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                        {cart.length} productos en carrito
                    </span>
                </div>
            </div>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* IZQUIERDA: Catálogo y Búsqueda */}
                <div style={{ flex: '1 1 65%', display: 'flex', flexDirection: 'column', padding: '1.5rem', gap: '1.5rem' }}>

                    {/* Barra de Búsqueda Grande */}
                    <div>
                        <input
                            type="text"
                            className="ff-search-input-lg"
                            placeholder="Buscar por nombre o Escanear código..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                        <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                            <i className="bi bi-lightbulb-fill" style={{ color: '#fbbf24', marginRight: '5px' }}></i>
                            Tip: Puedes usar el lector de código de barras en cualquier momento.
                        </div>
                    </div>

                    {/* Filtros Categoría (Pils) */}
                    <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                        <button
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '20px',
                                border: '1px solid #e2e8f0',
                                backgroundColor: selectedCategory === 'all' ? '#0f172a' : 'white',
                                color: selectedCategory === 'all' ? 'white' : '#475569',
                                cursor: 'pointer', fontWeight: '600', whitespace: 'nowrap'
                            }}
                            onClick={() => setSelectedCategory('all')}
                        >
                            Todo
                        </button>
                        {categories.map(cat => (
                            <button key={cat.id}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '20px',
                                    border: '1px solid #e2e8f0',
                                    backgroundColor: selectedCategory === cat.id ? '#0f172a' : 'white',
                                    color: selectedCategory === cat.id ? 'white' : '#475569',
                                    cursor: 'pointer', fontWeight: '600', whitespace: 'nowrap'
                                }}
                                onClick={() => setSelectedCategory(cat.id)}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* TABLA DE RESULTADOS (LIST VIEW) */}
                    <div style={{ flex: 1, backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', display: 'grid', gridTemplateColumns: '80px 100px 2fr 1fr 1fr 80px', fontWeight: '700', color: '#64748b', fontSize: '0.85rem', gap: '10px' }}>
                            <div>FOTO</div>
                            <div>CÓDIGO</div>
                            <div>PRODUCTO</div>
                            <div style={{ textAlign: 'right' }}>PRECIO</div>
                            <div style={{ textAlign: 'center' }}>STOCK</div>
                            <div style={{ textAlign: 'center' }}>ACCIÓN</div>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {filteredProducts.map(product => (
                                <div key={product.id} style={{
                                    display: 'grid', gridTemplateColumns: '80px 100px 2fr 1fr 1fr 80px',
                                    padding: '0.75rem 1rem', borderBottom: '1px solid #f8fafc', alignItems: 'center',
                                    transition: 'background 0.2s', cursor: 'pointer', gap: '10px'
                                }} className="hover:bg-slate-50" onClick={() => addToCart(product)}>

                                    {/* COLUMNA FOTO */}
                                    <div style={{ width: '60px', height: '60px', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {product.image ? (
                                            <img
                                                src={product.image.startsWith('http') ? product.image : `${process.env.REACT_APP_LUXE_SERVICE}${product.image}`}
                                                alt={product.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>N/A</span>
                                        )}
                                    </div>

                                    {/* COLUMNA CÓDIGO */}
                                    <div style={{ fontFamily: 'monospace', fontWeight: '600', color: '#64748b', fontSize: '0.9rem' }}>
                                        {product.code || '-'}
                                    </div>

                                    {/* COLUMNA PRODUCTO */}
                                    <div>
                                        <div style={{ fontWeight: '600', color: '#1e293b' }}>{product.name}</div>
                                        {product.category_name && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{product.category_name}</div>}
                                    </div>

                                    <div style={{ textAlign: 'right', fontWeight: '700', color: '#059669' }}>
                                        {formatCurrency(product.price)}
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        {product.track_stock ? (
                                            <span style={{
                                                padding: '0.25rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700',
                                                backgroundColor: product.stock_quantity < 5 ? '#fecaca' : '#dcfce7',
                                                color: product.stock_quantity < 5 ? '#dc2626' : '#166534'
                                            }}>
                                                {product.stock_quantity}
                                            </span>
                                        ) : <span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>∞</span>}
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <button style={{
                                            backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px',
                                            width: '32px', height: '32px', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            +
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* DERECHA: Carrito y Totales */}
                <div style={{ flex: '0 0 400px', backgroundColor: 'white', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                        <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#334155' }}>Resumen de Venta</h2>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {cart.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '3rem' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}><i className="bi bi-cart-x"></i></div>
                                <p>Carrito vacío</p>
                            </div>
                        ) : cart.map((item, idx) => (
                            <div key={idx} style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: 'white' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{item.name}</div>
                                    <div style={{ fontWeight: '700' }}>{formatCurrency(item.price * item.quantity)}</div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                        {item.code && <span style={{ marginRight: '0.5rem', fontFamily: 'monospace' }}>[{item.code}]</span>}
                                        {formatCurrency(item.price)} x {item.quantity}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <button onClick={() => updateQuantity(item.product_id, -1)} style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'white' }}>-</button>
                                        <span style={{ fontWeight: '600' }}>{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.product_id, 1)} style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'white' }}>+</button>
                                        <button onClick={() => removeFromCart(item.product_id)} style={{ marginLeft: '0.5rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ padding: '1.5rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#64748b' }}>
                            <span>Subtotal</span>
                            <span>{formatCurrency(calculateSubtotal)}</span>
                        </div>
                        {appliedDiscount && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#10b981' }}>
                                <span>Descuento</span>
                                <span>- {formatCurrency(calculateDiscountAmount)}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>
                            <span>Total</span>
                            <span>{formatCurrency(calculateTotal)}</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <button onClick={() => setShowReviewModal(true)} disabled={cart.length === 0} style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontWeight: '600', cursor: 'pointer' }}>
                                Opciones
                            </button>
                            <button onClick={() => setShowReviewModal(true)} disabled={cart.length === 0 || processingOrder} style={{ padding: '1rem', borderRadius: '8px', border: 'none', background: '#0f172a', color: 'white', fontWeight: '700', cursor: 'pointer' }}>
                                COBRAR
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderCompactView = () => renderDesktopView(); // Por ahora usaremos la misma vista pero responsive por CSS flex

    if (loading) return <div>Cargando...</div>;

    return (
        <>
            {screenWidth <= 1024 ? renderCompactView() : renderDesktopView()}

            {/* Modal Confirmación y Pago */}
            {showReviewModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                    <div style={{ backgroundColor: '#ffffff', width: '900px', maxWidth: '95%', borderRadius: '16px', overflow: 'hidden', display: 'flex', height: '600px', maxHeight: '90vh', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>

                        {/* LEFT: Resumen de Orden */}
                        <div style={{ width: '40%', backgroundColor: '#f8fafc', padding: '2rem', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0', color: '#334155' }}>Resumen del Pedido</h3>
                            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
                                {cart.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                                        <div>
                                            <div style={{ fontWeight: '600', color: '#1e293b' }}>{item.quantity} x {item.name}</div>
                                            {item.note && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.note}</div>}
                                        </div>
                                        <div style={{ fontWeight: '600' }}>{formatCurrency(item.price * item.quantity)}</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '1rem', marginTop: 'auto' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ color: '#64748b' }}>Subtotal</span>
                                    <span>{formatCurrency(calculateSubtotal)}</span>
                                </div>
                                {appliedDiscount && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#10b981' }}>
                                        <span>Descuento</span>
                                        <span>- {formatCurrency(calculateDiscountAmount)}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>
                                    <span>Total a Pagar</span>
                                    <span>{formatCurrency(calculateTotal)}</span>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Métodos de Pago y Datos */}
                        <div style={{ width: '60%', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#475569' }}>Cliente</label>

                                    {selectedCustomer ? (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '0.75rem',
                                            backgroundColor: '#f0fdf4',
                                            border: '1px solid #bbf7d0',
                                            borderRadius: '8px',
                                            marginBottom: '0.5rem'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: '700', color: '#166534' }}>
                                                    {selectedCustomer.first_name} {selectedCustomer.last_name}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#15803d' }}>
                                                    {selectedCustomer.email}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setSelectedCustomer(null)}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer' }}
                                            >
                                                Desvincular
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="text"
                                                placeholder="Buscar usuario (Ucelis)..."
                                                value={customerSearch}
                                                onChange={e => searchCustomers(e.target.value)}
                                                style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                                            />
                                            {customers.length > 0 && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '100%',
                                                    left: 0,
                                                    backgroundColor: 'white',
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: '8px',
                                                    width: '100%',
                                                    zIndex: 100,
                                                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                                                }}>
                                                    {customers.map(u => (
                                                        <div
                                                            key={u.id}
                                                            onClick={() => syncAndSelectUser(u)}
                                                            style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                                                        >
                                                            <div style={{ fontWeight: '600' }}>{u.first_name} {u.last_name}</div>
                                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{u.email}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <button onClick={() => setShowCustomerModal(true)} style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>+ Nuevo Usuario (Ucelis)</button>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#475569' }}>Entrega</label>
                                    <select value={selectedDeliveryMethod} onChange={e => setSelectedDeliveryMethod(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                                        <option value="in_store">En Tienda</option>
                                        <option value="pickup">Para Llevar/Recogida</option>
                                        <option value="delivery">Envío a Domicilio</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ backgroundColor: '#f0f9ff', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
                                <h4 style={{ margin: '0 0 1rem 0', color: '#0369a1' }}><i className="bi bi-cash-coin" style={{ marginRight: '8px' }}></i>Calculadora de Vuelto</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#0369a1' }}>Efectivo Recibido</label>
                                        <input
                                            type="number"
                                            value={inputCash}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setInputCash(val);
                                                setCashGiven(parseFloat(val));
                                            }}
                                            style={{ width: '100%', padding: '0.75rem', fontSize: '1.2rem', border: '2px solid #bae6fd', borderRadius: '8px', color: '#0c4a6e', fontWeight: 'bold' }}
                                            placeholder="0.00"
                                        />
                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                            {[5, 10, 20, 50].map(amt => (
                                                <button key={amt} onClick={() => { setInputCash(amt.toString()); setCashGiven(amt); }} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', backgroundColor: 'white', border: '1px solid #bae6fd', borderRadius: '4px', cursor: 'pointer', color: '#0ea5e9' }}>
                                                    ${amt}
                                                </button>
                                            ))}
                                            <button onClick={() => { setInputCash(calculateTotal.toFixed(2)); setCashGiven(calculateTotal); }} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', backgroundColor: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '4px', cursor: 'pointer', color: '#0369a1', fontWeight: 'bold' }}>Exacto</button>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#0369a1' }}>Su Cambio</label>
                                        <div style={{
                                            fontSize: '2rem',
                                            fontWeight: '800',
                                            color: (cashGiven && cashGiven >= calculateTotal) ? '#16a34a' : '#64748b'
                                        }}>
                                            {formatCurrency((cashGiven || 0) - calculateTotal > 0 ? (cashGiven || 0) - calculateTotal : 0)}
                                        </div>
                                        {(cashGiven && cashGiven < calculateTotal) && (
                                            <div style={{ color: '#ef4444', fontSize: '0.9rem', fontWeight: 'bold' }}>Faltan {formatCurrency(calculateTotal - cashGiven)}</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginTop: 'auto', display: 'flex', gap: '1rem' }}>
                                <button onClick={() => setShowReviewModal(false)} style={{ flex: 1, padding: '1rem', border: '1px solid #cbd5e1', background: 'white', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', color: '#475569', cursor: 'pointer' }}>
                                    Seguir Comprando
                                </button>
                                <button
                                    onClick={finalPlaceOrder}
                                    disabled={processingOrder}
                                    style={{
                                        flex: 2,
                                        padding: '1rem',
                                        border: 'none',
                                        background: 'linear-gradient(to right, #0f172a, #334155)',
                                        color: 'white',
                                        borderRadius: '8px',
                                        fontSize: '1.2rem',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    {processingOrder ? 'Procesando...' : 'CONFIRMAR PAGO'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Cliente y Notas (Mejorado) */}
            {showCustomerModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', padding: '0', borderRadius: '12px', width: '600px', maxWidth: '90%', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, color: '#111827', fontSize: '1.25rem' }}>Nuevo Usuario (Ucelis)</h3>
                            <button onClick={() => setShowCustomerModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>×</button>
                        </div>

                        <form onSubmit={handleCreateCustomer} style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', color: '#374151', fontWeight: '500', fontSize: '0.9rem' }}>Nombre *</label>
                                    <input name="first_name" placeholder="Ej. Juan" value={newCustomer.first_name} onChange={handleInputChange} required style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.95rem' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', color: '#374151', fontWeight: '500', fontSize: '0.9rem' }}>Apellido *</label>
                                    <input name="last_name" placeholder="Ej. Pérez" value={newCustomer.last_name} onChange={handleInputChange} required style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.95rem' }} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', color: '#374151', fontWeight: '500', fontSize: '0.9rem' }}>Cédula / RUC</label>
                                    <input name="identification_number" placeholder="Identificación" value={newCustomer.identification_number} onChange={handleInputChange} style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.95rem' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', color: '#374151', fontWeight: '500', fontSize: '0.9rem' }}>Fecha Nacimiento</label>
                                    <input type="date" name="date_of_birth" value={newCustomer.date_of_birth} onChange={handleInputChange} style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.95rem' }} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', color: '#374151', fontWeight: '500', fontSize: '0.9rem' }}>Email *</label>
                                    <input type="email" name="email" placeholder="cliente@email.com" value={newCustomer.email} onChange={handleInputChange} required style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.95rem' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', color: '#374151', fontWeight: '500', fontSize: '0.9rem' }}>Usuario (Web) *</label>
                                    <input name="username" placeholder="Nombre de usuario" value={newCustomer.username} onChange={handleInputChange} required style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.95rem' }} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', color: '#374151', fontWeight: '500', fontSize: '0.9rem' }}>Teléfono *</label>
                                    <input name="phone" placeholder="099..." value={newCustomer.phone} onChange={handleInputChange} required style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.95rem' }} />
                                </div>
                                <div style={{ visibility: 'hidden' }}> {/* Spacer */} </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', color: '#374151', fontWeight: '500', fontSize: '0.9rem' }}>Contraseña Web</label>
                                    <input type="password" name="password" placeholder="Crear contraseña" value={newCustomer.password} onChange={handleInputChange} style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.95rem' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', color: '#374151', fontWeight: '500', fontSize: '0.9rem' }}>Confirmar Contraseña</label>
                                    <input type="password" name="password_confirm" placeholder="Repetir contraseña" value={newCustomer.password_confirm} onChange={handleInputChange} style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.95rem' }} />
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.4rem', color: '#374151', fontWeight: '500', fontSize: '0.9rem' }}>Dirección</label>
                                <input name="address" placeholder="Dirección completa" value={newCustomer.address} onChange={handleInputChange} style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.95rem' }} />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                                <button type="button" onClick={() => setShowCustomerModal(false)} style={{ padding: '0.75rem 1.5rem', border: '1px solid #d1d5db', background: 'white', color: '#374151', borderRadius: '6px', fontWeight: '500', cursor: 'pointer' }}>
                                    Cancelar
                                </button>
                                <button type="submit" style={{ padding: '0.75rem 1.5rem', border: 'none', background: '#2563eb', color: 'white', borderRadius: '6px', fontWeight: '500', cursor: 'pointer' }}>
                                    Crear Cuenta
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default PuntosVenta;