// electron.js - Punto de entrada de Electron
const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;
let printWindow = null; // Instancia temporal para la ventana de impresión

// Forzar una única instancia
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Recepción de Órdenes de Impresión Térmica
// ─────────────────────────────────────────────────────────────────────────────
ipcMain.on('print-receipt', (event, htmlContent) => {
    if (printWindow) printWindow.close();

    // Crear una ventana oculta para renderizar el ticket
    printWindow = new BrowserWindow({
        show: false,
        webPreferences: { nodeIntegration: false }
    });

    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
              @page { margin: 0; } 
              body { font-family: monospace; margin: 0; padding: 10px; width: 80mm; font-size: 12px; }
          </style>
        </head>
        <body>${htmlContent}</body>
      </html>
    `;

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(printHTML)}`);

    printWindow.webContents.on('did-finish-load', () => {
        // Enviar silenciosamente a la impresora predeterminada (Ej: Impresora de recibos USB)
        printWindow.webContents.print({
            silent: true,
            printBackground: true,
            margins: { marginType: 'none' }
        }, (success, failureReason) => {
            if (success) {
                event.reply('print-success', 'Impresión térmica exitosa');
            } else {
                event.reply('print-failure', failureReason || 'Error desconocido al imprimir');
            }
            if (printWindow) {
                printWindow.close();
                printWindow = null;
            }
        });
    });
});

// Obtener la ruta correcta según si está empaquetado o no
function getResourcePath(relativePath) {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, relativePath);
    }
    return path.join(__dirname, '..', relativePath);
}

// Iniciar el backend del servidor
function startBackend() {
    try {
        console.log("Iniciando sistema backend integrado...");
        // Requerir el archivo inicia directamente el servidor Express dentro del proceso de Electron, 
        // lo que asegura que funcione sin Node.js externo y tiene acceso total de lectura al ASAR.
        require('./src/index.js');
    } catch (err) {
        console.error('Error fatal al iniciar backend integrado:', err);
    }
}

// Crear la ventana principal
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js') // ← ¡Puente de comunicación habilitado!
        },
        title: 'Yeni Trapiche - Sistema de Gestión'
    });

    // En producción, carga desde la carpeta frontend-dist
    // Buscar en múltiples ubicaciones para mayor compatibilidad
    let frontendPath;
    if (app.isPackaged) {
        // En Electron empaquetado
        frontendPath = path.join(__dirname, 'frontend-dist', 'index.html');
    } else {
        // En desarrollo, primero intenta cargar desde la carpeta local
        const devPath = path.join(__dirname, '..', '..', 'frontend', 'dist', 'index.html');
        const fallbackPath = path.join(__dirname, 'frontend-dist', 'index.html');

        try {
            require('fs').accessSync(devPath);
            frontendPath = devPath;
        } catch {
            frontendPath = fallbackPath;
        }
    }

    console.log('Cargando:', frontendPath);
    mainWindow.loadFile(frontendPath);

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    startBackend();

    setTimeout(() => {
        createWindow();
    }, 2000);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    // Iniciar búsqueda silenciosa de actualizaciones (Auto-Updater)
    try {
        const { autoUpdater } = require('electron-updater');
        // Configuración básica (se lee desde el "publish" de package.json)
        autoUpdater.checkForUpdatesAndNotify();

        autoUpdater.on('update-downloaded', (info) => {
            console.log('Update downloaded', info);
            // Opcional: mostrar un mensaje usando Dialog de electron
        });
    } catch (e) {
        console.error('AutoUpdater Error:', e);
    }
});

app.on('window-all-closed', () => {
    if (backendProcess) {
        backendProcess.kill();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    if (backendProcess) {
        backendProcess.kill();
    }
});
