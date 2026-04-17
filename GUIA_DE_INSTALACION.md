# Instalación completa del sistema Bodega Yeni Trapiche
# ======================================================

# PASO 1: Instalar Node.js (REQUIERIDO)
# - Descargar desde: https://nodejs.org/es/download/
# - Instalar la versión LTS (Recomendada para la mayoría de usuarios)
# - Aceptar todas las opciones por defecto

# PASO 2: Verificar instalación
# Abrir PowerShell o CMD y ejecutar:
node --version
npm --version
# ✅ Deberías ver algo como: v20.x.x y 10.x.x

# PASO 3: Instalar dependencias del BACKEND
cd backend
npm install

# PASO 4: Iniciar el servidor backend (API + Base de datos)
npm run dev

# ✅ El servidor se iniciará en: http://localhost:3001
# ✅ La base de datos SQLite se creará automáticamente
# ✅ Usuarios por defecto:
#    - Admin: usuario = admin, contraseña = admin
#    - Vendedor: usuario = user, contraseña = user123

# PASO 5: En NUEVA ventana de terminal, instalar FRONTEND
cd frontend
npm install

# PASO 6: Iniciar la aplicación web
npm run dev

# ✅ La plataforma se abrirá en: http://localhost:5173

# =============================================================================
# FUNCIONALIDADES OFFLINE ACTIVADAS
# =============================================================================
# ✅ Todas las operaciones se guardan localmente si no hay internet
# ✅ Cola de peticiones que se sincroniza automáticamente
# ✅ Datos se cachean en IndexedDB para uso offline
# ✅ Sincronización automática cada 5 segundos cuando vuelve la conexión
# ✅ Funciona en computadora y teléfono sin internet

# =============================================================================
# COMANDOS ÚTILES
# =============================================================================
# Para parar el servidor: Ctrl + C
# Para reiniciar el backend: npm run dev
# Para reiniciar el frontend: npm run dev

# =============================================================================
# BASE DE DATOS
# =============================================================================
# - No necesitas instalar PostgreSQL!
# - Todo funciona con SQLite (archivo database.sqlite)
# - El traductor mágico convierte automáticamente queries de PostgreSQL a SQLite
# - La base de datos se actualiza automáticamente cuando agregues productos