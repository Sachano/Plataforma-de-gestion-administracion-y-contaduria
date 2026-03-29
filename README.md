# 🏢 Sistema de Gestión Empresarial - Yeni Trapiche

Sistema integral diseñado para la gestión eficiente de inventario, ventas, deudas y contabilidad, con integración en tiempo real de tasas de cambio.

## 🚀 Características Principales

- 📦 **Gestión de Inventario**: Control total de productos, presentaciones y existencias con historial de movimientos.
- 🛒 **Punto de Venta (POS)**: Carrito de compras intuitivo con búsqueda por nombre o **código de barras**.
- 📷 **Escaneo de Códigos**: Escanea códigos de barras desde la cámara del celular o usando un escáner externo.
- 💱 **Equivalencias Monetarias**: Tasas en tiempo real (BCV y Binance P2P) con cálculo automático de promedio.
- 🧾 **Facturación**: Generación de facturas digitales (PDF/JPG) y registro histórico de ventas.
- 💳 **Control de Deudas**: Gestión de cuentas por cobrar (deudores) y pagar (proveedores) con historial de abonos.
- 📊 **Contabilidad**: Análisis visual de ventas mensuales y anuales.

---

## 📥 Descargas Directas

### 🪟 Aplicación de Escritorio (Windows)

**Versión: 1.0.0 (Actualizable Vía Nube)**

| Archivo | Descripción | Directorio Local |
|---------|-------------|--------|
| `yeni-trapiche-gestion Setup 1.x.x.exe` | Instalador Inteligente NSIS (Autoupdate) | `backend/dist-v2/` |

> **Nuevo**: El sistema ahora cuenta con un actualizador automático integrado.

### 📱 Aplicación Móvil (Android)

**Versión: 1.0.0**

| Archivo | Descripción | Enlace |
|---------|-------------|--------|
| `app-debug.apk` | APK para Android | [Descargar](./frontend/android/app/build/outputs/apk/debug/) |

> **Nota**: Para instalar el APK en Android, debes habilitar "Instalar de fuentes desconocidas" en la configuración de tu dispositivo.

---

## 🛠️ Instalación y Configuración (Desarrollo)

### Opción 1: Modo Desarrollo (con Node.js)

#### 1. Requisitos Previos

- **Node.js** instalado (versión 18 o superior).
- **npm** como gestor de paquetes.

#### 2. Instalación

```bash
# Instalar dependencias del Backend
cd backend
npm install

# Instalar dependencias del Frontend
cd ../frontend
npm install
```

#### 3. Ejecutar el Sistema

**IMPORTANTE**: Debes ejecutar el backend y el frontend en **terminales separadas**.

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
El backend se ejecutará en: `http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
El frontend se ejecutará en: `http://localhost:5173`

---

### Opción 2: Generar Ejecutables

#### Para Windows (EXE)

```bash
cd backend
npm run electron:build
```
El archivo EXE se generará en: `backend/dist-v2/`

#### Para Android (APK)

```bash
cd frontend
npm run build
npx cap sync android
npx cap open android
```
Luego en Android Studio, selecciona **Build > Build Bundle(s) / APK(s) > Build APK(s)**

---

## 💾 Base de Datos

La aplicación utiliza **SQLite** para almacenar datos localmente. Ya no necesitas instalar PostgreSQL.

- **Ubicación de la base de datos**: `backend/database.sqlite`
- **Los datos se guardan automáticamente** al cerrar la aplicación
- **Puedes hacer respaldo** copiando el archivo `database.sqlite`

---

## 📋 Comandos Rápidos

| Comando | Descripción |
|---------|-------------|
| `cd backend && npm run dev` | Iniciar el servidor backend |
| `cd frontend && npm run dev` | Iniciar el servidor frontend |
| `cd backend && npm install` | Instalar dependencias del backend |
| `cd frontend && npm install` | Instalar dependencias del frontend |
| `cd frontend && npm run build` | Compilar el frontend |
| `npm run release` | Generar Setup Final de Windows y subir automáticamente al reporitorio |

---

## 🔧 Solución de Problemas

### Pantalla en blanco
1. Verifica que el **backend esté corriendo** en el puerto 3001
2. Verifica que el **frontend esté corriendo** en el puerto 5173
3. Limpia la **caché del navegador** (Ctrl+Shift+Delete)
4. Presiona **F5** para refrescar la página

### Error al iniciar sesión en el Ejecutable
Asegúrate de haber instalado la herramienta correctamente mediante el `Setup.exe` que se encuentra en `dist-v2`. La plataforma incorpora fallbacks de contraseñas seguros por defecto.

### La base de datos no funciona
1. Elimina el archivo `backend/database.sqlite`
2. Reinicia el backend: `cd backend && npm run dev`

---

## 👤 Usuarios del Sistema

Para realizar testeos y pruebas en computadoras nuevas de forma rápida, se proveen las siguientes credenciales iniciales. *(Se recomienda borrarlas o cambiarlas para producción).*

| Acción / Rol | User / Función | Password / Clave | 
|-----|---------|------------|
| **Login de Prueba** | `admin` | `admin` |
| **Login de Prueba** | `user` | `user123` |
| **Registro** | Crear nuevo usuario | **Clave Máestra:** `admin123` |

---

## 📁 Estructura del Proyecto

```
├── backend/
│   ├── src/
│   │   ├── db.js           # Conexión SQLite
│   │   ├── index.js        # Servidor Express
│   │   ├── routes/         # Rutas API
│   │   └── middleware/    # Middlewares
│   ├── database.sqlite    # Base de datos local
│   ├── electron.js        # Entry de Electron
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Componente principal
│   │   ├── components/    # Componentes (BarcodeScanner)
│   │   ├── modules/       # Módulos de la app
│   │   └── context/       # Contextos de React
│   ├── android/           # Proyecto Android
│   └── package.json
├── build-app.js          # Script de build
└── README.md
```

---

> **Nota**: Las equivalencias monetarias automáticas están habilitadas por defecto. Solo el usuario **Admin** puede desactivar esta función.

---

*Desarrollado con ❤️ para Yeni Trapiche - Todos los derechos reservados.*
