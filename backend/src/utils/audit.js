// ============================================================================
// audit.js — Utilidad para registrar acciones en la base de datos
// ============================================================================
// Esta función registra quién hizo qué y cuándo en una tabla de auditoría.
// Es útil para saber quién creó una factura, quién eliminó un producto, etc.
//
// Actualmente DESHABILITADA en todas las rutas porque la autenticación
// está en modo un solo usuario. Se puede reactivar cuando se necesite.
//
// Para reactivar:
//   1. Crear la tabla 'audit_logs' en la base de datos
//   2. Descomentar las llamadas a logAction en los archivos de rutas
// ============================================================================

const pool = require('../db');

/**
 * Registra una acción en la tabla de auditoría.
 *
 * @param {number} userId - ID del usuario que realizó la acción
 * @param {string} action - Tipo de acción (ej: 'CREATE_INVOICE', 'DELETE_PRODUCT')
 * @param {string} entityType - Tipo de entidad afectada (ej: 'invoice', 'product')
 * @param {string|number} entityId - ID de la entidad afectada
 * @param {object} details - Detalles adicionales de la acción (se guarda como JSON)
 */
const logAction = async (userId, action, entityType, entityId, details = {}) => {
    try {
        await pool.query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, action, entityType, entityId, JSON.stringify(details)]
        );
    } catch (err) {
        // Si falla el registro de auditoría, solo mostramos el error en consola
        // pero NO detenemos la operación principal (no queremos que falle una venta
        // solo porque no se pudo registrar en auditoría)
        console.error('Error registrando acción de auditoría:', err);
    }
};

module.exports = { logAction };
