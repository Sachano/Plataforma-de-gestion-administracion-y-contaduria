// ============================================================================
// Script de construcción para generar EXE y APK
// ============================================================================
// Este script compila la aplicación y genera los ejecutables para Windows y Android
// 
// Usage:
//   node build-app.js        - Compila todo
//   node build-app.js exe    - Solo genera EXE
//   node build-app.js apk    - Solo genera APK
// ============================================================================

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const target = args[0] || 'all';

const rootDir = __dirname;
const frontendDir = path.join(rootDir, 'frontend');
const backendDir = path.join(rootDir, 'backend');

function run(command, dir) {
    console.log(`\n📦 Ejecutando: ${command}`);
    console.log(`   Directorio: ${dir}`);
    try {
        execSync(command, { cwd: dir, stdio: 'inherit' });
        return true;
    } catch (err) {
        console.error(`❌ Error en: ${command}`);
        return false;
    }
}

console.log('===========================================');
console.log('🚀 Construyendo Yeni Trapiche - Gestión');
console.log('===========================================');

// Paso 1: Compilar el frontend
console.log('\n📱 Compilando Frontend (Vite)...');
if (!run('npm run build', frontendDir)) {
    process.exit(1);
}

// Generar EXE
if (target === 'all' || target === 'exe') {
    console.log('\n🪟 Generando EXE para Windows...');
    if (!run('npm run electron:build', backendDir)) {
        console.error('❌ Error generando EXE');
    } else {
        console.log('✅ EXE generado en: backend/dist/');
    }
}

// Generar APK
if (target === 'all' || target === 'apk') {
    console.log('\n🤖 Generando APK para Android...');

    // Sincronizar con Android
    if (!run('npx cap sync android', frontendDir)) {
        console.error('❌ Error sincronizando con Android');
    } else {
        // Compilar APK
        console.log('📱 Compilando APK...');
        const androidDir = path.join(frontendDir, 'android');
        if (fs.existsSync(androidDir)) {
            if (!run('./gradlew assembleDebug', androidDir)) {
                console.error('❌ Error compilando APK');
            } else {
                const apkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug');
                if (fs.existsSync(apkPath)) {
                    console.log('✅ APK generado en:', apkPath);
                }
            }
        }
    }
}

console.log('\n===========================================');
console.log('🎉 Construcción completada!');
console.log('===========================================');
