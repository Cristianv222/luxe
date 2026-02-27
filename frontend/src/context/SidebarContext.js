import React, { createContext, useContext, useState } from 'react';

const SidebarContext = createContext(null);

export const SidebarProvider = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const openSidebar = () => setIsSidebarOpen(true);
    const closeSidebar = () => setIsSidebarOpen(false);
    const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
    return (
        <SidebarContext.Provider value={{ isSidebarOpen, openSidebar, closeSidebar, toggleSidebar }}>
            {children}
        </SidebarContext.Provider>
    );
};

// Safe fallback so useSidebar() never crashes when called outside SidebarProvider
export const useSidebar = () => {
    const ctx = useContext(SidebarContext);
    if (!ctx) {
        return {
            isSidebarOpen: false,
            openSidebar: () => { },
            closeSidebar: () => { },
            toggleSidebar: () => { }
        };
    }
    return ctx;
};
