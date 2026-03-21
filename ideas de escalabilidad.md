# Ideas de Escalabilidad - Sistema de Autenticación

## Estado Actual

El sistema de autenticación fue **temporalmente deshabilitado** para permitir uso single-user inmediato. El código fue preservado para futura implementación.

---

## Arquitectura Propuesta para Autenticación Multi-Usuario

### 1. Roles de Usuario

```javascript
// Roles sugeridos
const ROLES = {
    ADMIN: 'admin',        // Acceso total
    MANAGER: 'manager',    // Gestiona inventario y facturas
    CASHIER: 'cashier',   // Solo ventas y facturación
    VIEWER: 'viewer'       // Solo lectura
};
```

### 2. Permisos por Módulo

| Módulo | Admin | Manager | Cashier | Viewer |
|--------|-------|---------|---------|--------|
| Inventario | CRUD | CRUD | Lectura | Lectura |
| Facturas | CRUD | CRUD | CRUD | Lectura |
| Deudas | CRUD | CRUD | CRUD | Ninguno |
| Contabilidad | CRUD | Lectura | Ninguno | Ninguno |
| Usuarios | CRUD | Ninguno | Ninguno | Ninguno |

### 3. Archivos a Modificar

#### Backend

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `backend/src/routes/auth.js` | Descomentar | Habilitar endpoints de login/register |
| `backend/src/middleware/auth.js` | Mejorar | Agregar verificación de roles |
| `backend/src/routes/inventory.js` | Modificar | Agregar `[auth, checkRole(['admin', 'manager'])]` |
| `backend/src/routes/invoices.js` | Modificar | Agregar `[auth, checkRole(['admin', 'manager', 'cashier'])]` |
| `backend/src/routes/debts.js` | Modificar | Agregar `[auth, checkRole(['admin', 'manager', 'cashier'])]` |
| `backend/src/db/schema.sql` | Modificar | Agregar columna `role` a tabla users |

#### Frontend

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `frontend/src/main.jsx` | Descomentar | Habilitar AuthProvider |
| `frontend/src/App.jsx` | Descomentar | Habilitar check de autenticación |
| `frontend/src/components/MainLayout.jsx` | Descomentar | Mostrar botón logout |

### 4. Middleware de Roles Propuesto

```javascript
// backend/src/middleware/checkRole.js
const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'No autorizado' });
        }
        
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Sin permisos suficientes' });
        }
        
        next();
    };
};

module.exports = checkRole;
```

### 5. Variables de Entorno Requeridas

```env
# .env
JWT_SECRET=tu_secreto_seguro_aqui
REGISTRATION_KEY=clave_secreta_para_registro
SESSION_TIMEOUT=8h
```

### 6. Tabla de Usuarios (schema.sql)

```sql
-- Modificar tabla users existente
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'cashier';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
```

### 7. Pasos para Re-habilitar

1. **Ejecutar migración de roles:**
   ```bash
   cd backend
   node run-migration.js
   ```

2. **Crear usuario admin inicial:**
   ```bash
   node create-admin.js
   # O usar el endpoint POST /api/auth/register con header x-registration-key
   ```

3. **Descomentar código en frontend y backend** (archivos listados arriba)

4. **Probar flujo completo:**
   - Login de admin
   - Verificar permisos
   - Crear usuarios adicionales

---

## Mejoras Sugeridas Adicionales

### Rate Limiting
```javascript
// Prevenir ataques de fuerza bruta
const rateLimit = require('express-rate-limit');
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5 // 5 intentos por ventana
});
router.post('/login', loginLimiter, authController.login);
```

### Tokens de Refresco
```javascript
// Access token (corto) + Refresh token (largo)
const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
```

### Auditoría Activa
```javascript
// Habilitar logging de acciones (ya está el código, solo quitar comentarios)
await logAction(req.user.id, 'ACTION', 'entity', id, details);
```

---

## Documentación de API

### Endpoints de Auth

| Método | Ruta | Descripción | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/auth/login` | Iniciar sesión | No |
| POST | `/api/auth/register` | Crear usuario | Clave de registro |
| POST | `/api/auth/logout` | Cerrar sesión | Sí |
| GET | `/api/auth/me` | Obtener usuario actual | Sí |

---

*Documento generado para planificación futura del sistema.*

4. **Sugerencias futuras:**
   - Implementar sistema de autenticación completo
   - Agregar logs de auditoría activos
   - Implementar rate limiting
   - Agregar tests unitarios
   - Configurar HTTPS para producción
