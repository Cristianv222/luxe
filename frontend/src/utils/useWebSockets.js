import { useEffect, useState, useRef } from 'react';

/**
 * Custom hook to manage WebSocket connection for real-time notifications.
 */
const useWebSockets = (onMessageReceived) => {
    const [socket, setSocket] = useState(null);
    const callbackRef = useRef(onMessageReceived);

    // Update ref when callback changes (without triggering useEffect)
    useEffect(() => {
        callbackRef.current = onMessageReceived;
    }, [onMessageReceived]);

    useEffect(() => {
        // Construct WebSocket URL
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        
        // Determinar host: prioridad a localhost:8000 si estamos en desarrollo local
        let host = window.location.host;
        if (process.env.NODE_ENV === 'development' || host.includes('localhost')) {
            host = 'localhost:8000';
        } else if (process.env.REACT_APP_API_BASE_URL) {
            host = process.env.REACT_APP_API_BASE_URL.replace(/^https?:\/\//, '');
        }
        
        const wsUrl = `${protocol}//${host}/ws/notifications/`;

        console.log("Connecting to WebSocket:", wsUrl);
        const newSocket = new WebSocket(wsUrl);

        newSocket.onopen = () => {
            console.log('WebSocket Connected');
        };

        newSocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data && callbackRef.current) {
                    callbackRef.current(data);
                }
            } catch (e) {
                console.error("Error parsing WS message:", e);
            }
        };

        newSocket.onclose = () => {
            console.log('WebSocket Disconnected. Attempting to reconnect...');
            // Optional: implement reconnection logic here
        };

        newSocket.onerror = (error) => {
            console.error('WebSocket Error:', error);
        };

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, []); // Empty dependency array means this connects once on mount

    const jsonParseSafe = (str) => {
        try {
            return JSON.parse(str);
        } catch (e) {
            return null;
        }
    };

    return socket;
};

export default useWebSockets;
