import { useEffect, useRef } from 'react';

export const useGlobalScanner = (onScan) => {
    const scannerBuffer = useRef('');
    const lastKeyTime = useRef(0);

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignorar si el usuario está escribiendo en el buscador de productos o en otro input de texto
            // Esto evita que un teclado humano interfiera con la lógica rápida del láser.
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return;
            }

            const now = Date.now();
            
            // Las pistolas lectoras insertan teclas a una velocidad de microsegundos.
            // Si pasan más de 50ms, probablemente sea un humano escribiendo. Reiniciamos.
            if (now - lastKeyTime.current > 50) {
                scannerBuffer.current = '';
            }
            lastKeyTime.current = now;

            if (e.key === 'Enter') {
                if (scannerBuffer.current.length > 3) { 
                    // Un código válido
                    e.preventDefault();
                    onScan(scannerBuffer.current.trim());
                }
                scannerBuffer.current = '';
                return;
            }

            // Acumular caracteres alfanuméricos
            if (e.key.length === 1 && /[a-zA-Z0-9\-]/.test(e.key)) {
                scannerBuffer.current += e.key;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onScan]);
};
