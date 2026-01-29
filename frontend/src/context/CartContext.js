import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Cargar carrito del localStorage al iniciar
    useEffect(() => {
        const savedCart = localStorage.getItem('luxe_cart');
        if (savedCart) {
            try {
                setCart(JSON.parse(savedCart));
            } catch (error) {
                console.error("Error parsing cart from localStorage:", error);
                localStorage.removeItem('luxe_cart');
            }
        }
    }, []);

    // Guardar carrito en localStorage cuando cambie
    useEffect(() => {
        localStorage.setItem('luxe_cart', JSON.stringify(cart));
    }, [cart]);

    const addToCart = (product, quantity = 1, selectedSize = null, selectedExtras = []) => {
        setCart(prevCart => {
            // Generar un ID único para el item en el carrito basado en sus propiedades
            // Esto permite tener el mismo producto con diferentes tallas/extras como items separados
            const tempId = `${product.id}-${selectedSize ? selectedSize.id : 'std'}-${selectedExtras.map(e => e.id).sort().join('-')}`;

            const existingItemIndex = prevCart.findIndex(item => item.tempId === tempId);

            if (existingItemIndex > -1) {
                const newCart = [...prevCart];
                newCart[existingItemIndex].quantity += quantity;
                return newCart;
            } else {
                return [...prevCart, {
                    ...product,
                    tempId,
                    quantity,
                    selectedSize,
                    selectedExtras
                }];
            }
        });
        // setIsCartOpen(true); // Ya no abrimos automáticamente, feedback visual será en el componente
    };

    const removeFromCart = (tempId) => {
        setCart(prevCart => prevCart.filter(item => item.tempId !== tempId));
    };

    const updateQuantity = (tempId, newQuantity) => {
        if (newQuantity < 1) return;
        setCart(prevCart => prevCart.map(item =>
            item.tempId === tempId ? { ...item, quantity: newQuantity } : item
        ));
    };

    const clearCart = () => {
        setCart([]);
    };

    const toggleCart = () => {
        setIsCartOpen(!isCartOpen);
    };

    // Calcular totales
    const getCartTotal = () => {
        return cart.reduce((total, item) => {
            let price = parseFloat(item.price);
            if (item.selectedSize) {
                price = parseFloat(item.selectedSize.price); // Asumiendo que replace precio base
                // O si es adicional: price += parseFloat(item.selectedSize.additional_price)
                // Depende de la lógica de negocio. En BoutiqueLanding parecía usar item.price
                // Revisaremos la lógica original de BoutiqueLanding para consistencia.
            }

            // Sumar extras
            const extrasTotal = item.selectedExtras ?
                item.selectedExtras.reduce((sum, extra) => sum + parseFloat(extra.price), 0) : 0;

            return total + ((price + extrasTotal) * item.quantity);
        }, 0);
    };

    const getCartCount = () => {
        return cart.reduce((count, item) => count + item.quantity, 0);
    };

    return (
        <CartContext.Provider value={{
            cart,
            isCartOpen,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            toggleCart,
            setIsCartOpen,
            getCartTotal,
            getCartCount
        }}>
            {children}
        </CartContext.Provider>
    );
};


