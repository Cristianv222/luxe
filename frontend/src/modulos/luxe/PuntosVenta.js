import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from '../../services/api';
import printerService from '../../services/printerService';

// ====================================================================
// 1. Funciones de Ayuda
// ====================================================================

const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '$0.00';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('es-EC', {
        style: 'currency',
        currency: 'USD',
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

    // Pagination State
    const [pagination, setPagination] = useState({
        page: 1,
        totalPages: 1,
        totalItems: 0,
        pageSize: 20
    });

    // Estado para Alertas/Confirmaciones
    const [alertModal, setAlertModal] = useState({
        show: false,
        type: 'info', // 'success', 'error', 'warning', 'info'
        title: '',
        message: '',
        onConfirm: null,
        onCancel: null,
        showCancelButton: false,
        confirmText: 'ACEPTAR',
        cancelText: 'CANCELAR'
    });

    const showAlert = (type, title, message, onConfirm = null, showCancel = false, confirmText = 'ACEPTAR', zIndex = 10000) => {
        setAlertModal({
            show: true,
            type,
            title,
            message,
            onConfirm,
            onCancel: () => setAlertModal(prev => ({ ...prev, show: false })),
            showCancelButton: showCancel,
            confirmText: confirmText || 'ACEPTAR',
            cancelText: 'CANCELAR',
            zIndex: zIndex
        });
    };

    const closeAlert = () => {
        setAlertModal(prev => ({ ...prev, show: false }));
    };

    // 2. ESTADO DEL PUNTO DE VENTA
    const [cart, setCart] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState('in_store'); // in_store, pickup, delivery
    const [discountCode, setDiscountCode] = useState('');
    const [appliedDiscount, setAppliedDiscount] = useState(null);
    const [manualDiscount, setManualDiscount] = useState(0);
    const [manualDiscountInput, setManualDiscountInput] = useState('');

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
        first_name: '',
        last_name: '',
        phone: '',
        identification_number: '', // Usado como Cédula/RUC
        date_of_birth: '',
        email: '',
        address: '',
        city: ''
    });

    const [paymentMethods, setPaymentMethods] = useState([]);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');

    // Variant Selection State
    const [selectedProductForVariant, setSelectedProductForVariant] = useState(null);
    const [selectedSizeId, setSelectedSizeId] = useState('');
    const [selectedColorId, setSelectedColorId] = useState('');

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

    const loadData = useCallback(async (page = 1, search = '', category = 'all') => {
        setLoading(true);
        try {
            const params = { page };
            if (search) params.search = search;
            if (category !== 'all') params.category = category;
            params.in_stock = 'true'; // Siempre filtrar stock > 0 para POS

            const productsRes = await api.get('api/menu/products/', {
                baseURL: process.env.REACT_APP_LUXE_SERVICE || '/api/luxe',
                params
            });

            const data = productsRes.data;
            if (data.results) {
                setProducts(data.results);
                setPagination({
                    page: page,
                    totalItems: data.count,
                    totalPages: Math.ceil(data.count / (params.page_size || 20)),
                    pageSize: 20
                });
            } else {
                setProducts(data || []);
            }
        } catch (err) {
            console.error('Error cargando productos:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const categoriesRes = await api.get('api/menu/categories/', { baseURL: process.env.REACT_APP_LUXE_SERVICE || '/api/luxe' });
                setCategories(categoriesRes.data.results || categoriesRes.data || []);
            } catch (err) {
                console.error('Error cargando categorías:', err);
            }
        };
        const loadPaymentMethods = async () => {
            try {
                const res = await api.get('api/payments/payment-methods/', { baseURL: process.env.REACT_APP_LUXE_SERVICE || '/api/luxe' });
                const methods = res.data.results || res.data || [];
                setPaymentMethods(methods);
                // Pre-seleccionar efectivo o el primero
                const cash = methods.find(m => m.method_type === 'cash');
                if (cash) setSelectedPaymentMethod(cash.name);
                else if (methods.length > 0) setSelectedPaymentMethod(methods[0].name);
            } catch (err) {
                console.error('Error cargando métodos de pago:', err);
            }
        };
        loadCategories();
        loadPaymentMethods();
    }, []);

    // Effect for Products Pagination/Search/Filter change
    useEffect(() => {
        // Debounce search slightly to avoid too many requests
        const timer = setTimeout(() => {
            loadData(1, searchTerm, selectedCategory);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, selectedCategory, loadData]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            loadData(newPage, searchTerm, selectedCategory);
        }
    };

    useEffect(() => {
        const handleResize = () => setScreenWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // LÓGICA DEL ESCÁNER DE CÓDIGOS DE BARRAS (MEJORADA - FUNCIONA SIEMPRE)
    const barcodeBufferRef = useRef('');
    const lastKeyTimeRef = useRef(0);
    const scannerTimeoutRef = useRef(null);
    const SCANNER_SPEED_THRESHOLD = 50;
    const MIN_BARCODE_LENGTH = 4;

    const handleBarcodeScan = useCallback((code) => {
        const product = products.find(p => p.code === code);
        if (product) {
            handleProductClick(product);
            console.log("✅ Producto agregado por escáner:", product.name, "- Código:", code);
            if (searchTerm === code) {
                setSearchTerm('');
            }
        } else {
            console.warn("⚠️ Producto no encontrado para el código:", code);
            showAlert('warning', 'Producto no encontrado', `Producto con código "${code}" no encontrado`);
        }
    }, [products, searchTerm]);

    // Listener Global de Teclas - SIEMPRE ACTIVO (incluso en inputs)
    useEffect(() => {
        const handleKeyDown = (e) => {
            const currentTime = Date.now();
            const timeSinceLastKey = currentTime - lastKeyTimeRef.current;

            if (scannerTimeoutRef.current) {
                clearTimeout(scannerTimeoutRef.current);
            }

            if (e.key === 'Enter') {
                const scannedCode = barcodeBufferRef.current.trim();

                if (scannedCode.length >= MIN_BARCODE_LENGTH) {
                    const product = products.find(p => p.code === scannedCode);
                    if (product) {
                        e.preventDefault();
                        e.stopPropagation();
                        handleBarcodeScan(scannedCode);

                        if (e.target.tagName === 'INPUT' && e.target.value.includes(scannedCode)) {
                            e.target.value = e.target.value.replace(scannedCode, '');
                            setSearchTerm('');
                        }
                    }
                }
                barcodeBufferRef.current = '';
                lastKeyTimeRef.current = 0;
            } else if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
                if (timeSinceLastKey > 200) {
                    barcodeBufferRef.current = e.key;
                } else if (timeSinceLastKey <= SCANNER_SPEED_THRESHOLD) {
                    barcodeBufferRef.current += e.key;
                } else {
                    barcodeBufferRef.current += e.key;
                }

                lastKeyTimeRef.current = currentTime;

                scannerTimeoutRef.current = setTimeout(() => {
                    barcodeBufferRef.current = '';
                }, 500);
            }
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => {
            window.removeEventListener('keydown', handleKeyDown, { capture: true });
            if (scannerTimeoutRef.current) {
                clearTimeout(scannerTimeoutRef.current);
            }
        };
    }, [products, handleBarcodeScan]);


    // =====================================
    // 5. LÓGICA DEL CARRITO
    // =====================================
    const handleProductClick = useCallback((product) => {
        if (product.variants && product.variants.length > 0) {
            setSelectedProductForVariant(product);
            // Preseleccionar si solo hay una opción
            const uniqueSizes = [...new Set(product.variants.map(v => v.size?.id).filter(Boolean))];
            const uniqueColors = [...new Set(product.variants.map(v => v.color?.id).filter(Boolean))];
            if (uniqueSizes.length === 1) setSelectedSizeId(uniqueSizes[0]);
            else setSelectedSizeId('');
            if (uniqueColors.length === 1) setSelectedColorId(uniqueColors[0]);
            else setSelectedColorId('');
        } else {
            addToCart(product);
        }
    }, []);

    const confirmVariantSelection = () => {
        if (!selectedProductForVariant) return;

        const productToAdd = { ...selectedProductForVariant };
        const exactVariant = selectedProductForVariant.variants.find(v =>
            (!selectedSizeId || String(v.size?.id) === String(selectedSizeId)) &&
            (!selectedColorId || String(v.color?.id) === String(selectedColorId))
        );

        if (exactVariant) {
            if (exactVariant.stock_quantity <= 0) {
                showAlert('warning', 'Agotado', 'La variante seleccionada no cuenta con stock.');
                return;
            }
            productToAdd.variant_id = exactVariant.id;
            productToAdd.size_id = exactVariant.size?.id;
            productToAdd.color_id = exactVariant.color?.id;
            productToAdd.cart_name_suffix = [exactVariant.size?.name, exactVariant.color?.name].filter(Boolean).join(' | ');
            if (exactVariant.price) productToAdd.price = exactVariant.price;
        } else {
            showAlert('warning', 'Variante no encontrada', 'Seleccione una combinación válida.');
            return;
        }

        addToCart(productToAdd);
        closeVariantModal();
    };

    const closeVariantModal = () => {
        setSelectedProductForVariant(null);
        setSelectedSizeId('');
        setSelectedColorId('');
    };

    const addToCart = useCallback((product) => {
        // ... (resto de la lógica original, asegurando que use varianId para el tempId)

        let targetStock = product.track_stock ? product.stock_quantity : Infinity;
        // Si fue una variante que sobreescribió precio y demás, su stock está en la variante original 
        // pero preferimos confiar en el quantity original si no tenemos el objeto entero.
        // Asume que la validación de stock inicial ya pasó.

        setCart(prevCart => {
            // Usa suffix como ID adicional si existe
            const uniqueId = `${product.id}-${product.variant_id || 'std'}`;
            const existingItemIndex = prevCart.findIndex(item => item.uniqueId === uniqueId);
            if (existingItemIndex >= 0) {
                if (product.track_stock && prevCart[existingItemIndex].quantity >= targetStock) {
                    showAlert('warning', 'Stock Insuficiente', "No hay suficiente stock disponible para agregar más unidades.");
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
                    uniqueId: uniqueId,
                    name: product.cart_name_suffix ? `${product.name} (${product.cart_name_suffix})` : product.name,
                    price: parseFloat(product.price),
                    quantity: 1,
                    image: product.image,
                    note: '',
                    code: product.code,
                    tax_rate: parseFloat(product.tax_rate || 0),
                    variant_id: product.variant_id,
                    size_id: product.size_id,
                    color_id: product.color_id
                }];
            }
        });
    }, [showAlert]);

    const removeFromCart = useCallback((uniqueId) => setCart(prev => prev.filter(i => i.uniqueId !== uniqueId)), []);

    const updateQuantity = useCallback((uniqueId, delta) => {
        setCart(prevCart => {
            return prevCart.map(item => {
                if (item.uniqueId === uniqueId) {
                    const product = products.find(p => p.id === item.product_id);
                    const newQuantity = Math.max(1, item.quantity + delta);

                    if (delta > 0 && product && product.track_stock && newQuantity > product.stock_quantity) {
                        showAlert('warning', 'Stock Insuficiente', "No hay suficiente stock disponible.");
                        return item;
                    }
                    return { ...item, quantity: newQuantity };
                }
                return item;
            });
        });
    }, [products]);

    const handleAddNote = (uniqueId) => {
        const item = cart.find(i => i.uniqueId === uniqueId);
        setEditingNoteForItem(uniqueId);
        setNoteText(item?.note || '');
    };

    const saveNote = () => {
        setCart(prev => prev.map(item => item.uniqueId === editingNoteForItem ? { ...item, note: noteText.trim() } : item));
        setEditingNoteForItem(null);
        setNoteText('');
    };

    // =====================================
    // 6. CÁLCULOS
    // =====================================

    // Función auxiliar para redondear a 2 decimales y evitar problemas de punto flotante
    const roundCurrency = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

    /**
     * IMPORTANTE: Los precios YA INCLUYEN IVA del 15%
     * Por lo tanto, calculamos el SUBTOTAL SIN IVA (base imponible)
     * 
     * Ejemplo: Si el precio es $15.00 (con IVA incluido)
     * - Subtotal sin IVA = $15.00 / 1.15 = $13.04
     * - IVA = $15.00 - $13.04 = $1.96
     * - Total = $15.00 (precio original)
     */

    // Calculamos el subtotal SIN IVA (base imponible)
    const calculateSubtotal = useMemo(() => {
        const subtotalWithoutTax = cart.reduce((total, item) => {
            const itemTotalWithTax = item.price * item.quantity; // Precio CON IVA
            const taxRateInput = parseFloat(item.tax_rate || 0);
            const actualTaxRate = (taxRateInput > 0 && taxRateInput < 1) ? taxRateInput * 100 : taxRateInput;

            if (actualTaxRate > 0) {
                // Desglosar IVA: dividir por (1 + tasa de IVA)
                // Si IVA es 15%, divisor = 1.15
                const divisor = 1 + (actualTaxRate / 100);
                const itemSubtotalWithoutTax = itemTotalWithTax / divisor;
                return total + itemSubtotalWithoutTax;
            } else {
                // Si no tiene IVA, el total es el subtotal
                return total + itemTotalWithTax;
            }
        }, 0);
        return roundCurrency(subtotalWithoutTax);
    }, [cart]);

    // Calculamos el IVA desglosado
    const calculateTax = useMemo(() => {
        const totalTax = cart.reduce((taxTotal, item) => {
            const itemTotalWithTax = item.price * item.quantity; // Precio CON IVA
            const taxRateInput = parseFloat(item.tax_rate || 0);
            const actualTaxRate = (taxRateInput > 0 && taxRateInput < 1) ? taxRateInput * 100 : taxRateInput;

            if (actualTaxRate > 0) {
                // Desglosar IVA del precio
                const divisor = 1 + (actualTaxRate / 100);
                const itemSubtotalWithoutTax = itemTotalWithTax / divisor;
                const itemTax = itemTotalWithTax - itemSubtotalWithoutTax;
                return taxTotal + itemTax;
            }
            return taxTotal;
        }, 0);
        return roundCurrency(totalTax);
    }, [cart]);

    const calculateDiscountAmount = useMemo(() => {
        let couponDiscount = 0;
        if (appliedDiscount) {
            if (appliedDiscount.discount_type === 'percentage') {
                couponDiscount = calculateSubtotal * (parseFloat(appliedDiscount.discount_value) / 100);
            } else {
                couponDiscount = Math.min(parseFloat(appliedDiscount.discount_value), calculateSubtotal);
            }
        }
        // El descuento manual se suma al cupón
        return roundCurrency(couponDiscount + (parseFloat(manualDiscount) || 0));
    }, [appliedDiscount, calculateSubtotal, manualDiscount]);

    const calculateTotal = useMemo(() => {
        return roundCurrency(calculateSubtotal + calculateTax - calculateDiscountAmount);
    }, [calculateSubtotal, calculateTax, calculateDiscountAmount]);

    const handleApplyDiscount = async () => {
        if (!discountCode) return;
        try {
            const res = await api.post('/api/pos/discounts/validate/', {
                discount_code: discountCode,
                customer_id: selectedCustomer?.id || null,
                order_amount: calculateSubtotal
            }, { baseURL: '/api/luxe' });

            if (res.data.valid) {
                setAppliedDiscount(res.data.discount);
                showAlert('success', 'Descuento Aplicado', `¡Éxito! ${res.data.message}`);
            } else {
                showAlert('error', 'Código Inválido', res.data.error || 'El código ingresado no es válido.');
                setAppliedDiscount(null);
            }
        } catch (err) {
            console.error(err);
            alert('Error al validar código');
        }
    };

    // =====================================
    // 7. CLIENTES (DIRECTO - LUXE CUSTOMERS)
    // =====================================
    const searchCustomers = async (query) => {
        setCustomerSearch(query);
        if (query.trim().length < 2) {
            setCustomers([]);
            return;
        }
        try {
            const res = await api.get(`/api/customers/`, {
                params: { search: query },
                baseURL: '/api/luxe'
            });
            const results = (res.data.results || res.data || []);
            setCustomers(results.slice(0, 10));
        } catch (e) {
            console.error("Error al buscar clientes:", e);
            setCustomers([]);
        }
    };

    const selectCustomer = (customer) => {
        setSelectedCustomer(customer);
        setCustomers([]);
        setCustomerSearch('');
    };

    const handleCreateCustomer = async (e) => {
        e.preventDefault();
        try {
            console.log("Creando cliente POS...");
            const payload = {
                first_name: newCustomer.first_name,
                last_name: newCustomer.last_name,
                cedula: newCustomer.identification_number,
                phone: newCustomer.phone,
                birth_date: newCustomer.date_of_birth || null,
                email: newCustomer.email,
                address: newCustomer.address,
                city: newCustomer.city
            };

            const res = await api.post('/api/customers/pos_register/', payload, { baseURL: '/api/luxe' });
            const createdCustomer = res.data;

            showAlert('success', 'Cliente Registrado', '¡Cliente registrado exitosamente!');
            selectCustomer(createdCustomer);
            setShowCustomerModal(false);

            setNewCustomer({
                first_name: '',
                last_name: '',
                phone: '',
                identification_number: '',
                date_of_birth: '',
                email: '',
                address: '',
                city: ''
            });

        } catch (err) {
            console.error('Error creando cliente:', err);
            const msg = err.response?.data?.cedula
                ? 'Cédula ya registrada: ' + err.response.data.cedula
                : (err.response?.data?.message || JSON.stringify(err.response?.data) || err.message);
            showAlert('error', 'Error al crear cliente', msg);
        }
    };

    const handleInputChange = (e) => setNewCustomer(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const finalPlaceOrder = async () => {
        if (cart.length === 0) return;
        setProcessingOrder(true);
        setShowReviewModal(false);

        // Mostrar alerta de "Enviando..."
        showAlert('info', 'Procesando Venta', 'Enviando orden al sistema...', null, false, '', 10000);

        let tableNumber = selectedDeliveryMethod === 'in_store' ? 'TIENDA' : (selectedDeliveryMethod === 'pickup' ? 'RECOGIDA' : 'ENVIO');
        let orderNotes = cashGiven ? `Pago con: ${formatCurrency(cashGiven)} - Cambio: ${formatCurrency(cashGiven - calculateTotal)}` : '';

        const payload = {
            order_type: selectedDeliveryMethod,
            table_number: tableNumber,
            notes: orderNotes,
            items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity, notes: i.note || '', variant_id: i.variant_id, size_id: i.size_id, color_id: i.color_id })),
            discount_code: appliedDiscount?.code || null,
            manual_discount: parseFloat(manualDiscount) || 0,
            customer_id: (selectedCustomer && !selectedCustomer.is_external_only) ? selectedCustomer.id : null,
            customer_email: selectedCustomer?.email || null,
            payment_method_name: selectedPaymentMethod || null
        };

        try {
            const res = await api.post('/api/orders/orders/', payload, { baseURL: process.env.REACT_APP_LUXE_SERVICE });

            // Orden exitosa, intentar imprimir
            try {
                const printResponse = await printerService.printReceipt({
                    order_number: res.data.order_number || res.data.id,
                    customer_name: selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : 'CONSUMIDOR FINAL',
                    order_type: selectedDeliveryMethod,
                    table_number: tableNumber,
                    items: cart.map(i => ({ name: i.name, quantity: i.quantity, price: i.price, total: i.price * i.quantity, note: i.note })),
                    subtotal: calculateSubtotal,
                    discount: calculateDiscountAmount,
                    tax: calculateTax,
                    total: calculateTotal,
                    sri_info: res.data.sri_info || null,
                    customer_identification: res.data.customer_identification || (selectedCustomer?.cedula || selectedCustomer?.identification_number || '9999999999999'),
                    customer_address: res.data.delivery_info?.address || selectedCustomer?.address || 'Cuenca',
                    customer_phone: res.data.delivery_info?.contact_phone || selectedCustomer?.phone || '9999999999',
                    customer_email: selectedCustomer?.email || '',
                    printed_at: new Date().toISOString()
                });

                if (printResponse.printed === false || printResponse.warning) {
                    // Feedback SRI (Caso Advertencia)
                    let sriMsg = '';
                    if (res.data.sri_info) {
                        const { status_display, sri_number } = res.data.sri_info;
                        if (res.data.sri_info.status === 'AUTHORIZED') {
                            sriMsg = `\n\n✅ SRI: AUTORIZADO (${sri_number})`;
                        } else {
                            sriMsg = `\n\n⚠️ SRI: ${status_display}`;
                        }
                    }

                    showAlert(
                        'warning',
                        'Orden Guardada - Error Impresión',
                        `Orden #${res.data.order_number || res.data.id} confirmada.\n\n⚠️ Error Impresora: ${printResponse.warning || 'No disponible'}.${sriMsg}`,
                        null, false, 'ACEPTAR', 10000
                    );
                } else {
                    // Feedback SRI
                    let sriMsg = '';
                    if (res.data.sri_info) {
                        const { status_display, sri_number, error } = res.data.sri_info;
                        if (res.data.sri_info.status === 'AUTHORIZED') {
                            sriMsg = `\n\n✅ SRI: AUTORIZADO\nNo. ${sri_number}`;
                        } else if (res.data.sri_info.status === 'SENT') {
                            sriMsg = `\n\n⏳ SRI: ENVIADO (Procesando)`;
                        } else {
                            sriMsg = `\n\n⚠️ SRI: ${status_display}\n${error || ''}`;
                        }
                    }

                    showAlert(
                        'success',
                        'Orden Facturada',
                        `Orden #${res.data.order_number || res.data.id} procesada exitosamente.${sriMsg}`,
                        null, false, 'ACEPTAR', 10000
                    );
                }
            } catch (printError) {
                console.warn('No se pudo imprimir (pero orden fue creada):', printError);
                showAlert(
                    'warning',
                    'Orden Guardada - Sin Impresión',
                    `Orden #${res.data.order_number || res.data.id} creada con éxito.\n\n⚠️ Error de impresora: ${printError.response?.data?.warning || 'Impresora no disponible'}.`,
                    null, false, 'ACEPTAR', 10000
                );
            }

            setCart([]);
            setAppliedDiscount(null);
            setDiscountCode('');
            setManualDiscount(0);
            setManualDiscountInput('');
            setSelectedCustomer(null);
            setCustomerSearch('');
            setCashGiven(null);
            setInputCash('');
            loadData();
        } catch (e) {
            console.error(e);

            // Si el error es un array (validaciones DRF), unimos los mensajes
            let msg = '';
            if (e.response?.data) {
                if (typeof e.response.data === 'string') {
                    msg = e.response.data;
                } else if (Array.isArray(e.response.data)) {
                    msg = e.response.data.join('\n');
                } else if (typeof e.response.data === 'object') {
                    // Si es un objeto (diccionario de errores), lo formateamos
                    msg = Object.entries(e.response.data)
                        .map(([key, value]) => {
                            const valStr = Array.isArray(value) ? value.join(' ') : value;
                            return `${key}: ${valStr}`;
                        })
                        .join('\n');
                }
            } else {
                msg = e.message || 'Error desconocido';
            }

            // Check for specific SRI or Invoice errors to handle retries?
            // For now, just show error alert
            showAlert('error', 'Error al Procesar Orden', msg, () => {
                // Opción para reintentar si fuera necesario, pero por ahora solo cerrar
            }, isInvoiceError(msg), 'REINTENTAR', 10000);
        } finally {
            setProcessingOrder(false);
        }
    };

    const isInvoiceError = (msg) => {
        // Función simple para detectar si vale la pena mostrar botón de reintento específico
        // En este caso, el botón de confirmar en el modal de error actuará como "OK" o "Reintentar" si pasamos la función.
        // Pero como el reintento implica volver a llamar finalPlaceOrder, 
        // y el estado del carrito sigue ahí, el usuario puede simplemente volver a dar click en "CONFIRMAR PAGO".
        return false;
    };

    const handleOpenCashDrawer = async () => {
        try {
            await printerService.openCashDrawer();
            showAlert('success', 'Caja Abierta', 'El cajón de dinero se ha abierto correctamente.');
        } catch (err) {
            showAlert('error', 'Error', 'No se pudo abrir el cajón de dinero. Verifique la conexión de la impresora.');
        }
    };

    // =====================================
    // 8. RENDERIZADO
    // =====================================

    const filteredProducts = products;

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
                                cursor: 'pointer',
                                fontWeight: '600',
                                whiteSpace: 'nowrap'
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
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    whiteSpace: 'nowrap'
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
                                    display: 'grid',
                                    gridTemplateColumns: '80px 100px 2fr 1fr 1fr 80px',
                                    padding: '0.75rem 1rem',
                                    borderBottom: '1px solid #f8fafc',
                                    alignItems: 'center',
                                    transition: 'background 0.2s',
                                    cursor: 'pointer',
                                    gap: '10px',
                                    ':hover': { backgroundColor: '#f8fafc' }
                                }} onClick={() => handleProductClick(product)}>

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
                                        {product.tax_rate > 0 && (
                                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'normal' }}>
                                                (incluido el IVA)
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        {product.track_stock ? (
                                            <span style={{
                                                padding: '0.25rem 0.6rem',
                                                borderRadius: '12px',
                                                fontSize: '0.75rem',
                                                fontWeight: '700',
                                                backgroundColor: product.stock_quantity < 5 ? '#fecaca' : '#dcfce7',
                                                color: product.stock_quantity < 5 ? '#dc2626' : '#166534'
                                            }}>
                                                {product.stock_quantity}
                                            </span>
                                        ) : <span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>∞</span>}
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <button style={{
                                            backgroundColor: '#3b82f6',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            width: '32px',
                                            height: '32px',
                                            cursor: 'pointer',
                                            fontSize: '1.2rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            +
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination Controls */}
                        <div style={{ padding: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}>
                            <button
                                disabled={pagination.page === 1}
                                onClick={() => handlePageChange(pagination.page - 1)}
                                className="ff-button ff-button-secondary"
                                style={{ padding: '0.4rem 0.8rem', cursor: 'pointer', border: '1px solid #e2e8f0', borderRadius: '4px', background: pagination.page === 1 ? '#f1f5f9' : 'white' }}
                            >
                                <i className="bi bi-chevron-left"></i>
                            </button>

                            <span style={{ margin: '0 1rem', color: '#64748b', fontSize: '0.9rem' }}>
                                Página {pagination.page} de {pagination.totalPages || 1}
                            </span>

                            <button
                                disabled={pagination.page >= pagination.totalPages}
                                onClick={() => handlePageChange(pagination.page + 1)}
                                className="ff-button ff-button-secondary"
                                style={{ padding: '0.4rem 0.8rem', cursor: 'pointer', border: '1px solid #e2e8f0', borderRadius: '4px', background: pagination.page >= pagination.totalPages ? '#f1f5f9' : 'white' }}
                            >
                                <i className="bi bi-chevron-right"></i>
                            </button>
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
                                        {item.tax_rate > 0 && (
                                            <span style={{ marginLeft: '0.5rem', color: '#059669', fontSize: '0.75rem' }}>
                                                (IVA {item.tax_rate}%)
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <button onClick={() => updateQuantity(item.uniqueId, -1)} style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'white' }}>-</button>
                                        <span style={{ fontWeight: '600' }}>{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.uniqueId, 1)} style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'white' }}>+</button>
                                        <button onClick={() => removeFromCart(item.uniqueId)} style={{ marginLeft: '0.5rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
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
                        {calculateTax > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#64748b' }}>
                                <span>IVA (incluido)</span>
                                <span>{formatCurrency(calculateTax)}</span>
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

    const renderCompactView = () => renderDesktopView();

    if (loading) return <div>Cargando...</div>;

    return (
        <>
            {screenWidth <= 1024 ? renderCompactView() : renderDesktopView()}

            {/* Modal Confirmación y Pago */}
            {showReviewModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                    <div style={{ backgroundColor: '#ffffff', width: '900px', maxWidth: '95%', borderRadius: '16px', overflow: 'hidden', display: 'flex', height: '750px', maxHeight: '95vh', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>

                        {/* LEFT: Resumen de Orden */}
                        <div style={{ width: '40%', backgroundColor: '#f8fafc', padding: '2rem', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0', color: '#334155' }}>Resumen del Pedido</h3>
                            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
                                {cart.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                                        <div>
                                            <div style={{ fontWeight: '600', color: '#1e293b' }}>
                                                {item.quantity} x {item.name}
                                                {item.tax_rate > 0 && (
                                                    <span style={{ marginLeft: '0.5rem', color: '#059669', fontSize: '0.75rem' }}>
                                                        (incluido el IVA)
                                                    </span>
                                                )}
                                            </div>
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
                                {calculateTax > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#64748b' }}>
                                        <span>IVA (incluido)</span>
                                        <span>{formatCurrency(calculateTax)}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.8rem', fontWeight: '900', color: '#0f172a', borderTop: '2.5px solid #0f172a', paddingTop: '1rem', marginTop: '0.5rem' }}>
                                    <span>TOTAL</span>
                                    <span>{formatCurrency(calculateTotal)}</span>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Métodos de Pago y Datos */}
                        <div style={{ width: '60%', display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
                                <div style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                                                    placeholder="Buscar cliente..."
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
                                                        zIndex: 1000,
                                                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)',
                                                        maxHeight: '200px',
                                                        overflowY: 'auto'
                                                    }}>
                                                        {customers.map(u => (
                                                            <div
                                                                key={u.id}
                                                                onClick={() => selectCustomer(u)}
                                                                style={{
                                                                    padding: '0.75rem',
                                                                    cursor: 'pointer',
                                                                    borderBottom: '1px solid #f1f5f9',
                                                                    ':hover': { backgroundColor: '#f8fafc' }
                                                                }}
                                                            >
                                                                <div style={{ fontWeight: '600', color: '#1e293b' }}>
                                                                    {u.first_name} {u.last_name}
                                                                </div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                                                                    <span>ID: {u.cedula || 'N/A'}</span>
                                                                    <span>Tel: {u.phone || 'N/A'}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <button onClick={() => setShowCustomerModal(true)} style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>+ Nuevo Cliente</button>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#475569' }}>Entrega</label>
                                        <select value={selectedDeliveryMethod} onChange={e => setSelectedDeliveryMethod(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                                            <option value="in_store">En Tienda</option>
                                            <option value="pickup">Para Llevar/Recogida</option>
                                            <option value="delivery">Envío a Domicilio</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#475569' }}>Método de Pago</label>
                                        <select
                                            value={selectedPaymentMethod}
                                            onChange={e => setSelectedPaymentMethod(e.target.value)}
                                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: 'white' }}
                                        >
                                            <option value="">Seleccione...</option>
                                            {paymentMethods.map(pm => (
                                                <option key={pm.id} value={pm.name}>
                                                    {pm.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* SECCIÓN DE DESCUENTOS MEJORADA */}
                                <div style={{
                                    backgroundColor: '#fdf2f2',
                                    padding: '1.25rem',
                                    borderRadius: '12px',
                                    marginBottom: '1.5rem',
                                    border: '1px solid #fee2e2'
                                }}>
                                    <h4 style={{ margin: '0 0 1rem 0', color: '#991b1b', fontSize: '0.95rem', display: 'flex', alignItems: 'center' }}>
                                        <i className="bi bi-percent" style={{ marginRight: '8px' }}></i> Descuentos y Rebajas
                                    </h4>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        {/* Cupón */}
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 'bold', color: '#b91c1c' }}>CUPÓN LUXE</label>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <input
                                                    type="text"
                                                    placeholder="CÓDIGO"
                                                    value={discountCode}
                                                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                                                    disabled={!!appliedDiscount}
                                                    style={{
                                                        flex: 1,
                                                        padding: '0.6rem',
                                                        border: '1px solid #fca5a5',
                                                        borderRadius: '6px',
                                                        backgroundColor: appliedDiscount ? '#fee2e2' : 'white',
                                                        textTransform: 'uppercase',
                                                        fontFamily: 'monospace',
                                                        fontSize: '0.9rem',
                                                        fontWeight: 'bold'
                                                    }}
                                                />
                                                {appliedDiscount ? (
                                                    <button
                                                        onClick={() => { setAppliedDiscount(null); setDiscountCode(''); }}
                                                        style={{ padding: '0 0.75rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={handleApplyDiscount}
                                                        style={{ padding: '0 0.75rem', backgroundColor: '#991b1b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                                    >
                                                        <i className="bi bi-check-lg"></i>
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Descuento Manual */}
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 'bold', color: '#b91c1c' }}>REBAJA MANUAL ($)</label>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <span style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    padding: '0 0.75rem',
                                                    backgroundColor: '#fee2e2',
                                                    border: '1px solid #fca5a5',
                                                    borderRight: 'none',
                                                    borderRadius: '6px 0 0 6px',
                                                    color: '#991b1b',
                                                    fontWeight: 'bold'
                                                }}>$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={manualDiscountInput}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setManualDiscountInput(val);
                                                        setManualDiscount(parseFloat(val) || 0);
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '0.6rem',
                                                        border: '1px solid #fca5a5',
                                                        borderRadius: '0 6px 6px 0',
                                                        fontSize: '0.95rem',
                                                        fontWeight: 'bold',
                                                        color: '#991b1b'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {(appliedDiscount || manualDiscount > 0) && (
                                        <div style={{
                                            marginTop: '0.75rem',
                                            padding: '0.5rem',
                                            backgroundColor: 'rgba(255,255,255,0.5)',
                                            borderRadius: '4px',
                                            fontSize: '0.85rem',
                                            color: '#b91c1c',
                                            fontWeight: '600',
                                            textAlign: 'center'
                                        }}>
                                            Ahorro total: -{formatCurrency(calculateDiscountAmount)}
                                        </div>
                                    )}
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

                            </div>
                            <div style={{ padding: '1.25rem 2rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', gap: '1rem' }}>
                                <button onClick={() => setShowReviewModal(false)} style={{ flex: 1, padding: '1rem', border: '1px solid #cbd5e1', background: 'white', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', color: '#475569', cursor: 'pointer' }}>
                                    Cerrar
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
                            <h3 style={{ margin: 0, color: '#111827', fontSize: '1.25rem' }}>Nuevo Cliente</h3>
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
                                    <input name="identification_number" placeholder="Cédula o RUC" value={newCustomer.identification_number} onChange={handleInputChange} style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.95rem' }} />
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
                                    <label style={{ display: 'block', marginBottom: '0.4rem', color: '#374151', fontWeight: '500', fontSize: '0.9rem' }}>Teléfono *</label>
                                    <input name="phone" placeholder="099..." value={newCustomer.phone} onChange={handleInputChange} required style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.95rem' }} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', color: '#374151', fontWeight: '500', fontSize: '0.9rem' }}>Dirección</label>
                                    <input name="address" placeholder="Dirección completa" value={newCustomer.address} onChange={handleInputChange} style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.95rem' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', color: '#374151', fontWeight: '500', fontSize: '0.9rem' }}>Ciudad</label>
                                    <input name="city" placeholder="Ciudad" value={newCustomer.city} onChange={handleInputChange} style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.95rem' }} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                                <button type="button" onClick={() => setShowCustomerModal(false)} style={{ padding: '0.75rem 1.5rem', border: '1px solid #d1d5db', background: 'white', color: '#374151', borderRadius: '6px', fontWeight: '500', cursor: 'pointer' }}>
                                    Cancelar
                                </button>
                                <button type="submit" style={{ padding: '0.75rem 1.5rem', border: 'none', background: '#2563eb', color: 'white', borderRadius: '6px', fontWeight: '500', cursor: 'pointer' }}>
                                    Crear Cliente
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Modal de Alertas Personalizado */}
            {alertModal.show && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: alertModal.zIndex || 10000, animation: 'fadeIn 0.2s ease-out' }}>
                    <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '0', maxWidth: '450px', width: '90%', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', animation: 'slideUp 0.3s ease-out', overflow: 'hidden' }}>

                        {/* Header con Icono y Color según Tipo */}
                        <div style={{ padding: '30px 25px 25px', background: alertModal.type === 'success' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : alertModal.type === 'error' ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : alertModal.type === 'warning' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', textAlign: 'center' }}>
                            <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', fontSize: '32px', color: 'white', boxShadow: '0 0 0 8px rgba(255,255,255,0.1)' }}>
                                {alertModal.type === 'success' && <i className="bi bi-check-lg"></i>}
                                {alertModal.type === 'error' && <i className="bi bi-x-lg"></i>}
                                {alertModal.type === 'warning' && <i className="bi bi-exclamation-lg"></i>}
                                {alertModal.type === 'info' && <i className="bi bi-info-lg"></i>}
                            </div>
                            <h3 style={{ margin: 0, color: 'white', fontSize: '22px', fontFamily: "'Inter', sans-serif", fontWeight: '700', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                                {alertModal.title}
                            </h3>
                        </div>

                        {/* Contenido del Mensaje */}
                        <div style={{ padding: '30px', textAlign: 'center' }}>
                            <p style={{ margin: '0 0 30px', color: '#4b5563', fontSize: '16px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                {alertModal.message}
                            </p>

                            {/* Botones de Acción */}
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                {alertModal.showCancelButton && (
                                    <button
                                        onClick={() => { if (alertModal.onCancel) alertModal.onCancel(); else closeAlert(); }}
                                        style={{ flex: 1, padding: '14px 20px', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
                                    >
                                        {alertModal.cancelText}
                                    </button>
                                )}

                                <button
                                    onClick={() => { if (alertModal.onConfirm) alertModal.onConfirm(); closeAlert(); }}
                                    style={{
                                        flex: 2,
                                        padding: '14px 30px',
                                        backgroundColor: alertModal.type === 'error' ? '#dc2626' : alertModal.type === 'warning' ? '#d97706' : '#0f172a',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '15px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        letterSpacing: '0.5px',
                                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {alertModal.confirmText}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal para Selección de Variante */}
            {selectedProductForVariant && selectedProductForVariant.variants && selectedProductForVariant.variants.length > 0 && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, animation: 'fadeIn 0.2s ease-out' }}>
                    <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '30px', maxWidth: '450px', width: '90%', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', animation: 'slideUp 0.3s ease-out' }}>
                        <h3 style={{ margin: '0 0 20px', color: '#1e293b', fontSize: '1.25rem' }}>Seleccionar Variante: {selectedProductForVariant.name}</h3>

                        {/* Selector Talla */}
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Talla:</label>
                            <select
                                value={selectedSizeId}
                                onChange={(e) => setSelectedSizeId(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            >
                                <option value="">Seleccione una talla</option>
                                {[...new Set(selectedProductForVariant.variants.map(v => v.size?.id).filter(Boolean))].map(sizeId => {
                                    const sizeName = selectedProductForVariant.variants.find(v => v.size?.id === sizeId).size.name;
                                    return <option key={sizeId} value={sizeId}>{sizeName}</option>
                                })}
                            </select>
                        </div>

                        {/* Selector Color */}
                        <div style={{ marginBottom: '25px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Color:</label>
                            <select
                                value={selectedColorId}
                                onChange={(e) => setSelectedColorId(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            >
                                <option value="">Seleccione un color</option>
                                {[...new Set(selectedProductForVariant.variants.map(v => v.color?.id).filter(Boolean))].map(colorId => {
                                    const colorName = selectedProductForVariant.variants.find(v => v.color?.id === colorId).color.name;
                                    return <option key={colorId} value={colorId}>{colorName}</option>
                                })}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={closeVariantModal}
                                style={{ padding: '10px 20px', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={confirmVariantSelection}
                                style={{ padding: '10px 20px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                                disabled={!selectedSizeId && !selectedColorId}
                            >
                                AGREGAR AL CARRITO
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default PuntosVenta;