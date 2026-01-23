/**
 * LUXE WhatsApp Service - Baileys
 * Servidor ultra-ligero para automatización de WhatsApp
 * Sin Chromium - Conexión directa a WhatsApp
 */

// Polyfill para crypto (necesario para Baileys en algunos entornos)
if (!global.crypto) {
    try {
        global.crypto = require('crypto').webcrypto;
    } catch (e) {
        console.error('No se pudo cargar webcrypto:', e);
    }
}

const express = require('express');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    delay,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// Estado global
let sock = null;
let qrCode = null;
let qrCodeData = null;
let isConnected = false;
let connectionStatus = 'disconnected';
let lastError = null;
let messagesSent = 0;
let messagesQueue = [];

const AUTH_DIR = './auth_info';
const SECRET_KEY = process.env.SECRET_KEY || 'luxe_wpp_secret';

// Logger silencioso para producción
const logger = pino({ level: 'silent' });

// ==================== CONEXIÓN WHATSAPP ====================

async function connectToWhatsApp() {
    try {
        // Asegurar que existe el directorio de autenticación
        if (!fs.existsSync(AUTH_DIR)) {
            fs.mkdirSync(AUTH_DIR, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
        const { version } = await fetchLatestBaileysVersion();

        console.log(`📱 Conectando con Baileys v${version.join('.')}`);

        sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            logger,
            browser: ["Ubuntu", "Chrome", "120.0.0.0"], // Versión estable y compatible
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 25000,
            maxIdleTimeMs: 60000,
            emitOwnEvents: true,
            defaultQueryTimeoutMs: 60000,
            markOnlineOnConnect: false,
            generateHighQualityLinkPreview: false,
            retryRequestDelayMs: 10000,
            patchMessageBeforeSending: (message) => {
                const requiresPatch = !!(
                    message.buttonsMessage ||
                    message.templateMessage ||
                    message.listMessage
                );
                if (requiresPatch) {
                    message = {
                        viewOnceMessage: {
                            message: {
                                messageContextInfo: {
                                    deviceListMetadataVersion: 2,
                                    deviceListMetadata: {},
                                },
                                ...message,
                            },
                        },
                    };
                }
                return message;
            },
            getMessage: async (key) => {
                // Implementacion dummy necesaria para estabilidad
                return {
                    conversation: 'hello'
                };
            },
            syncFullHistory: false
        });

        // Guardar credenciales cuando se actualicen
        sock.ev.on('creds.update', saveCreds);

        // Manejar actualizaciones de conexión
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log('✅ QR recibido de WhatsApp');
                try {
                    // Generar QR en formato Base64 para la API
                    qrCodeData = qr;
                    qrCode = await QRCode.toDataURL(qr);
                    connectionStatus = 'waiting_qr';
                    console.log('✅ QR convertido a Base64 exitosamente');

                    // Mostrar QR en terminal también
                    console.log('\n📱 Escanea este código QR con WhatsApp:\n');
                    qrcodeTerminal.generate(qr, { small: true });
                    console.log('\n');
                } catch (err) {
                    console.error('❌ Error generando QR Base64:', err);
                }
            }

            if (connection === 'close') {
                console.log('inspect error:', JSON.stringify(lastDisconnect?.error, null, 2));
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                console.log(`❌ Conexión cerrada. Código: ${statusCode}, Error: ${lastDisconnect?.error?.message}`);
                isConnected = false;
                connectionStatus = 'disconnected';
                lastError = lastDisconnect?.error?.message || 'Conexión cerrada';

                if (shouldReconnect) {
                    console.log('🔄 Reconectando en 5 segundos...');
                    await delay(5000);
                    connectToWhatsApp();
                } else {
                    console.log('🚪 Sesión cerrada por el usuario. Se requiere nuevo escaneo de QR.');
                    // Limpiar credenciales para nuevo login
                    try {
                        if (fs.existsSync(AUTH_DIR)) {
                            // Intentar borrar solo contenido interno primero para evitar EBUSY en la carpeta raiz
                            const files = fs.readdirSync(AUTH_DIR);
                            for (const file of files) {
                                try { fs.unlinkSync(path.join(AUTH_DIR, file)); } catch (e) { }
                            }
                        }
                    } catch (err) {
                        console.error('⚠️ No se pudo limpiar auth_info (ignorable):', err.message);
                    }
                }
            } else if (connection === 'open') {
                isConnected = true;
                connectionStatus = 'connected';
                qrCode = null;
                qrCodeData = null;
                lastError = null;
                console.log('✅ ¡Conectado a WhatsApp exitosamente!');
            }
        });

        // Log de mensajes recibidos (opcional, para debugging)
        sock.ev.on('messages.upsert', async ({ messages }) => {
            // Solo log, no procesamos mensajes entrantes
            if (messages[0]?.key?.fromMe === false) {
                console.log(`📨 Mensaje recibido de: ${messages[0]?.key?.remoteJid}`);
            }
        });

    } catch (error) {
        console.error('❌ Error conectando a WhatsApp:', error);
        lastError = error.message;
        connectionStatus = 'error';

        // Reintentar en 10 segundos
        await delay(10000);
        connectToWhatsApp();
    }
}

// ==================== UTILIDADES ====================

function formatPhoneNumber(phone) {
    if (!phone) return null;

    // Limpiar caracteres no numéricos
    let clean = phone.replace(/\D/g, '');

    // Formato Ecuador: 09XXXXXXXX -> 593XXXXXXXXX
    if (clean.startsWith('09') && clean.length === 10) {
        clean = '593' + clean.substring(1);
    }
    // Si empieza con 0 pero no es 09
    else if (clean.startsWith('0')) {
        clean = '593' + clean.substring(1);
    }
    // Si no tiene código de país
    else if (!clean.startsWith('593') && clean.length === 9) {
        clean = '593' + clean;
    }

    return clean + '@s.whatsapp.net';
}

function validateSecretKey(req, res, next) {
    const authHeader = req.headers.authorization;
    const providedKey = authHeader?.replace('Bearer ', '') || req.query.key;

    if (providedKey !== SECRET_KEY) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or missing secret key'
        });
    }
    next();
}

// ==================== API ENDPOINTS ====================

// Health check (público)
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'luxe-whatsapp-baileys',
        connected: isConnected,
        uptime: process.uptime()
    });
});

// Estado de la sesión
app.get('/api/status', (req, res) => {
    res.json({
        status: connectionStatus,
        connected: isConnected,
        hasQR: !!qrCode,
        messagesSent,
        lastError,
        uptime: process.uptime()
    });
});

// Compatibilidad con WPPConnect: /api/:session/status-session
app.get('/api/:session/status-session', (req, res) => {
    res.json({
        status: isConnected ? 'CONNECTED' : connectionStatus.toUpperCase(),
        session: req.params.session,
        connected: isConnected
    });
});

// Obtener QR Code
app.get('/api/qr', (req, res) => {
    if (qrCode) {
        res.json({
            qr: qrCode,
            status: 'waiting_scan'
        });
    } else if (isConnected) {
        res.json({
            message: 'Ya conectado, no se necesita QR',
            status: 'connected'
        });
    } else {
        res.status(404).json({
            error: 'QR no disponible aún',
            status: connectionStatus
        });
    }
});

// Compatibilidad con WPPConnect: Obtener QR
app.get('/api/:session/qrcode-session', (req, res) => {
    if (qrCode) {
        // Devolvemos JSON con el QR en base64 como espera WPPConnect 'qrcode' o 'base64'
        res.json({
            qrcode: qrCode,
            status: 'waiting_scan',
            urlCode: qrCode
        });
    } else if (isConnected) {
        res.status(404).json({
            status: 'connected',
            message: 'Already connected'
        });
    } else {
        res.status(404).json({
            status: 'waiting',
            message: 'QR not generated yet'
        });
    }
});

// Página HTML para escanear QR (conveniente)
app.get('/api/qr/page', (req, res) => {
    if (isConnected) {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>Luxe WhatsApp - Conectado</title></head>
            <body style="font-family: Arial; text-align: center; padding: 50px; background: #1a1a2e; color: white;">
                <h1>✅ WhatsApp Conectado</h1>
                <p>La sesión de WhatsApp está activa y lista para enviar mensajes.</p>
                <p>Mensajes enviados: <strong>${messagesSent}</strong></p>
            </body>
            </html>
        `);
    } else if (qrCode) {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Luxe WhatsApp - Escanear QR</title>
                <meta http-equiv="refresh" content="5">
            </head>
            <body style="font-family: Arial; text-align: center; padding: 50px; background: #1a1a2e; color: white;">
                <h1>📱 Escanea el Código QR</h1>
                <p>Abre WhatsApp > Configuración > Dispositivos vinculados > Vincular dispositivo</p>
                <img src="${qrCode}" style="max-width: 300px; border-radius: 10px; margin: 20px;">
                <p style="color: #888;">Esta página se actualiza automáticamente...</p>
            </body>
            </html>
        `);
    } else {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Luxe WhatsApp - Cargando</title>
                <meta http-equiv="refresh" content="3">
            </head>
            <body style="font-family: Arial; text-align: center; padding: 50px; background: #1a1a2e; color: white;">
                <h1>⏳ Generando QR...</h1>
                <p>Por favor espera, el código QR se generará pronto.</p>
                <p style="color: #888;">Estado: ${connectionStatus}</p>
            </body>
            </html>
        `);
    }
});

// Generar token (compatibilidad con WPPConnect)
app.post('/api/:session/:secret/generate-token', (req, res) => {
    const { secret } = req.params;
    if (secret === SECRET_KEY) {
        res.json({
            status: 'success',
            token: SECRET_KEY,
            message: 'Token generado (Baileys usa autenticación simplificada)'
        });
    } else {
        res.status(401).json({ error: 'Invalid secret key' });
    }
});

// Iniciar sesión (compatibilidad con WPPConnect)
app.post('/api/:session/start-session', async (req, res) => {
    if (isConnected) {
        return res.json({
            status: 'CONNECTED',
            message: 'Sesión ya activa'
        });
    }

    // Si no hay socket, reconectar
    if (!sock) {
        await connectToWhatsApp();
    }

    res.json({
        status: connectionStatus,
        message: 'Sesión iniciándose. Espera el QR.',
        qrPage: '/api/qr/page'
    });
});

// ==================== ENVÍO DE MENSAJES ====================

// Enviar mensaje de texto
app.post('/api/send-message', validateSecretKey, async (req, res) => {
    try {
        const { phone, message } = req.body;

        if (!phone || !message) {
            return res.status(400).json({
                error: 'Se requiere phone y message'
            });
        }

        if (!isConnected) {
            return res.status(503).json({
                error: 'WhatsApp no conectado',
                status: connectionStatus
            });
        }

        const jid = formatPhoneNumber(phone);
        if (!jid) {
            return res.status(400).json({ error: 'Número de teléfono inválido' });
        }

        // Enviar mensaje
        await sock.sendMessage(jid, { text: message });
        messagesSent++;

        console.log(`✅ Mensaje enviado a ${phone}`);

        res.status(201).json({
            status: 'success',
            message: 'Mensaje enviado correctamente',
            to: phone
        });

    } catch (error) {
        console.error('❌ Error enviando mensaje:', error);
        res.status(500).json({
            error: 'Error enviando mensaje',
            details: error.message
        });
    }
});

// Compatibilidad con WPPConnect: /api/:session/send-message
app.post('/api/:session/send-message', validateSecretKey, async (req, res) => {
    try {
        const { phone, message, isGroup } = req.body;

        if (!phone || !message) {
            return res.status(400).json({ error: 'Se requiere phone y message' });
        }

        if (!isConnected) {
            return res.status(503).json({
                error: 'WhatsApp no conectado',
                status: connectionStatus
            });
        }

        const jid = isGroup ? phone : formatPhoneNumber(phone);

        await sock.sendMessage(jid, { text: message });
        messagesSent++;

        console.log(`✅ Mensaje enviado a ${phone} (session: ${req.params.session})`);

        res.status(201).json({
            status: 'success',
            response: { messageId: Date.now().toString() }
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Enviar imagen
app.post('/api/send-image', validateSecretKey, async (req, res) => {
    try {
        const { phone, imageUrl, caption } = req.body;

        if (!phone || !imageUrl) {
            return res.status(400).json({ error: 'Se requiere phone e imageUrl' });
        }

        if (!isConnected) {
            return res.status(503).json({ error: 'WhatsApp no conectado' });
        }

        const jid = formatPhoneNumber(phone);

        await sock.sendMessage(jid, {
            image: { url: imageUrl },
            caption: caption || ''
        });
        messagesSent++;

        res.status(201).json({ status: 'success' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cerrar sesión
app.post('/api/logout', validateSecretKey, async (req, res) => {
    await handleLogout(res);
});

// Compatibilidad WPPConnect: Logout
app.post('/api/:session/logout-session', validateSecretKey, async (req, res) => {
    await handleLogout(res);
});

async function handleLogout(res) {
    try {
        if (sock) {
            await sock.logout();
        }

        // Limpiar credenciales
        try {
            if (fs.existsSync(AUTH_DIR)) {
                const files = fs.readdirSync(AUTH_DIR);
                for (const file of files) {
                    try { fs.unlinkSync(path.join(AUTH_DIR, file)); } catch (e) { }
                }
            }
        } catch (e) { console.error('Error limpando auth:', e.message); }

        isConnected = false;
        connectionStatus = 'disconnected';
        qrCode = null;

        res.json({ status: 'success', message: 'Sesión cerrada' });

        // Reconectar para nuevo QR después de un momento
        setTimeout(() => connectToWhatsApp(), 2000);

    } catch (error) {
        console.error('Error en logout:', error);
        // Aun si falla logout de sock, borramos archivos para forzar
        try {
            if (fs.existsSync(AUTH_DIR)) {
                fs.rmSync(AUTH_DIR, { recursive: true, force: true });
            }
        } catch (e) { }

        isConnected = false;
        connectionStatus = 'disconnected';
        qrCode = null;

        res.status(200).json({ status: 'success', message: 'Sesión cerrada forzadamente' });
        setTimeout(() => connectToWhatsApp(), 2000);
    }
}

// ==================== INICIAR SERVIDOR ====================

const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║     🛍️  LUXE WhatsApp - Baileys          ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║  🚀 Servidor corriendo en puerto ${PORT}    ║`);
    console.log('║  📱 QR Page: /api/qr/page                ║');
    console.log('║  📊 Status:  /api/status                 ║');
    console.log('║  ❤️  Health:  /health                     ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('');

    // Iniciar conexión a WhatsApp
    connectToWhatsApp();
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando servidor...');
    if (sock) {
        await sock.end();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Recibido SIGTERM...');
    if (sock) {
        await sock.end();
    }
    process.exit(0);
});
