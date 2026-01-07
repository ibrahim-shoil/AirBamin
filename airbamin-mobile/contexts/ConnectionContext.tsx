import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ConnectionContextType {
    isConnected: boolean;
    connectedIP: string;
    connect: (ip: string) => Promise<void>;
    disconnect: () => void;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

export const ConnectionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [connectedIP, setConnectedIP] = useState('');

    const connect = async (ip: string) => {
        try {
            // Clean and format IP
            let cleanIP = ip.replace(/^https?:\/\//, '').trim(); // Remove protocol
            cleanIP = cleanIP.replace(/\/+$/, ''); // Remove trailing slashes

            // Add default port if not present
            if (!cleanIP.includes(':')) {
                cleanIP = cleanIP + ':9090';
            }

            // Test connection by pinging the server
            const pingUrl = `http://${cleanIP}/ping`;
            console.log('Connecting to:', pingUrl);

            const response = await fetch(pingUrl, {
                method: 'GET',
                headers: { 'Accept': 'text/plain' },
            });

            if (!response.ok) {
                throw new Error(`Server responded with status ${response.status}`);
            }

            const text = await response.text();
            console.log('Ping response:', text);

            // Connection successful
            setIsConnected(true);
            setConnectedIP(cleanIP);
            console.log('Connected successfully to:', cleanIP);
        } catch (error) {
            console.error('Connection failed:', error);
            throw error; // Re-throw so the UI can show the error
        }
    };

    const disconnect = async () => {
        if (connectedIP) {
            try {
                // Notify desktop that phone disconnected
                await fetch(`http://${connectedIP}/disconnect`, { method: 'POST' });
                console.log('[DISCONNECT] Notified desktop');
            } catch (error) {
                console.error('[DISCONNECT] Failed to notify desktop:', error);
            }
        }
        setIsConnected(false);
        setConnectedIP('');
    };

    return (
        <ConnectionContext.Provider value={{ isConnected, connectedIP, connect, disconnect }}>
            {children}
        </ConnectionContext.Provider>
    );
};

export const useConnection = () => {
    const context = useContext(ConnectionContext);
    if (context === undefined) {
        throw new Error('useConnection must be used within a ConnectionProvider');
    }
    return context;
};
