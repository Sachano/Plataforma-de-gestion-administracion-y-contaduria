import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, CameraOff, ScanBarcode, Keyboard, X } from 'lucide-react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';

/**
 * Componente reutilizable para escanear códigos de barras
 * Soporta:
 * - Escaneo desde cámara del dispositivo
 * - Escáneres externos (que funcionan como teclado)
 * 
 * @param {string} value - Valor actual del código
 * @param {function} onScan - Callback cuando se detecta un código
 * @param {string} placeholder - Placeholder para el input
 * @param {boolean} autoFocus - Si el input debe tener focus automático
 */
const BarcodeScanner = ({
    value = '',
    onScan,
    placeholder = 'Escanee o escriba el código...',
    autoFocus = false
}) => {
    const [isScanning, setIsScanning] = useState(false);
    const [hasCamera, setHasCamera] = useState(true);
    const [error, setError] = useState(null);
    const [inputValue, setInputValue] = useState(value);
    const videoRef = useRef(null);
    const readerRef = useRef(null);
    const inputRef = useRef(null);
    const lastKeyTime = useRef(0);
    const buffer = useRef('');

    // Sincronizar valor externo
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    // Cleanup al desmontar
    useEffect(() => {
        return () => {
            stopScanning();
        };
    }, []);

    const stopScanning = useCallback(() => {
        if (readerRef.current) {
            readerRef.current.reset();
            readerRef.current = null;
        }
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsScanning(false);
    }, []);

    const startScanning = useCallback(async () => {
        setError(null);

        try {
            const hints = new Map();
            hints.set(DecodeHintType.POSSIBLE_FORMATS, [
                BarcodeFormat.EAN_13,
                BarcodeFormat.EAN_8,
                BarcodeFormat.UPC_A,
                BarcodeFormat.UPC_E,
                BarcodeFormat.CODE_128,
                BarcodeFormat.CODE_39,
                BarcodeFormat.CODE_93,
                BarcodeFormat.QR_CODE,
                BarcodeFormat.DATA_MATRIX,
                BarcodeFormat.ITF
            ]);

            const reader = new BrowserMultiFormatReader(hints);
            readerRef.current = reader;

            const devices = await reader.listVideoInputDevices();

            if (devices.length === 0) {
                setHasCamera(false);
                setError('No se detectó cámara en el dispositivo');
                return;
            }

            // Preferir cámara trasera en móviles
            const backCamera = devices.find(d =>
                d.label.toLowerCase().includes('back') ||
                d.label.toLowerCase().includes('trasera') ||
                d.label.toLowerCase().includes('rear')
            );
            const selectedDeviceId = backCamera ? backCamera.deviceId : devices[0].deviceId;

            await reader.decodeFromVideoDevice(
                selectedDeviceId,
                videoRef.current,
                (result, err) => {
                    if (result) {
                        const code = result.getText();
                        setInputValue(code);
                        onScan?.(code);
                        stopScanning();
                    }
                }
            );

            setIsScanning(true);
        } catch (err) {
            console.error('Error al iniciar escaneo:', err);
            setError('Error al acceder a la cámara');
            setHasCamera(false);
        }
    }, [onScan, stopScanning]);

    // Manejar input de escáneres externos (que funcionan como teclado)
    const handleKeyDown = useCallback((e) => {
        const now = Date.now();

        // Si hay una pausa larga (>50ms) entre teclas, resetear el buffer
        // Esto ayuda a distinguir entre escáner y escritura manual
        if (now - lastKeyTime.current > 50) {
            buffer.current = '';
        }
        lastKeyTime.current = now;

        // Si es Enter, procesar el buffer
        if (e.key === 'Enter') {
            if (buffer.current.length > 0) {
                const code = buffer.current.trim();
                setInputValue(code);
                onScan?.(code);
                buffer.current = '';
            }
            e.preventDefault();
            return;
        }

        // Agregar caracteres al buffer (solo dígitos y letras)
        if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
            buffer.current += e.key;
        }
    }, [onScan]);

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        buffer.current = newValue;
    };

    const handleInputBlur = () => {
        // Cuando el input pierde foco, verificar si hay un código válido
        if (inputValue.trim() && inputValue !== value) {
            onScan?.(inputValue.trim());
        }
    };

    const toggleScanner = () => {
        if (isScanning) {
            stopScanning();
        } else {
            startScanning();
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            {/* Input principal */}
            <div style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center'
            }}>
                <div style={{
                    flex: 1,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center'
                }}>
                    <ScanBarcode
                        size={20}
                        style={{
                            position: 'absolute',
                            left: '12px',
                            color: 'var(--text-muted)',
                            zIndex: 1
                        }}
                    />
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onBlur={handleInputBlur}
                        placeholder={placeholder}
                        autoFocus={autoFocus}
                        style={{
                            width: '100%',
                            padding: '10px 12px 10px 40px',
                            fontSize: '14px',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                        }}
                    />
                </div>

                {/* Botón de cámara */}
                {hasCamera && (
                    <button
                        type="button"
                        onClick={toggleScanner}
                        title={isScanning ? 'Cerrar cámara' : 'Escanear con cámara'}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '42px',
                            height: '42px',
                            border: isScanning ? '2px solid #e74c3c' : '1px solid #ddd',
                            borderRadius: '8px',
                            background: isScanning ? '#fef2f2' : 'var(--white)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            flexShrink: 0
                        }}
                    >
                        {isScanning ? (
                            <CameraOff size={20} color="#e74c3c" />
                        ) : (
                            <Camera size={20} color="var(--divider-blue)" />
                        )}
                    </button>
                )}
            </div>

            {/* Vista de cámara */}
            {isScanning && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '8px',
                    background: '#000',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    zIndex: 100,
                    boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 15px',
                        background: 'rgba(0,0,0,0.8)',
                        color: 'white'
                    }}>
                        <span style={{ fontSize: '13px', fontWeight: 500 }}>
                            🎯 Apunte la cámara al código de barras
                        </span>
                        <button
                            type="button"
                            onClick={stopScanning}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                padding: '4px'
                            }}
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <video
                        ref={videoRef}
                        style={{
                            width: '100%',
                            height: '250px',
                            objectFit: 'cover'
                        }}
                        playsInline
                        muted
                    />
                    {/* Indicador de escaneo */}
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '70%',
                        height: '2px',
                        background: 'linear-gradient(90deg, transparent, #4ade80, transparent)',
                        animation: 'scan 2s ease-in-out infinite'
                    }} />
                </div>
            )}

            {/* Error */}
            {error && (
                <div style={{
                    marginTop: '8px',
                    padding: '10px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    color: '#dc2626',
                    fontSize: '13px'
                }}>
                    {error}
                </div>
            )}

            {/* Hint para escáneres externos */}
            <div style={{
                marginTop: '6px',
                fontSize: '11px',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
            }}>
                <Keyboard size={12} />
                <span>Los escáneres de mano funcionan automáticamente</span>
            </div>

            <style>{`
                @keyframes scan {
                    0%, 100% { top: 30%; }
                    50% { top: 70%; }
                }
            `}</style>
        </div>
    );
};

export default BarcodeScanner;
