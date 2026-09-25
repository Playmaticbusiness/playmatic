import express, { Request, Response } from 'express';
import { config } from './config';
import { verifyMetaSignature } from './middleware/signature.middleware';
import { processInstagramWebhook } from './services/instagram.service';
import { InstagramWebhookPayload } from './types/instagram';

const app = express();

// Capturar el cuerpo crudo (rawBody) en Buffer para la validación de la firma criptográfica
app.use(
    express.json({
        verify: (req: Request, _res: Response, buf: Buffer) => {
            req.rawBody = buf;
        }
    })
);

// Endpoint de comprobación de salud del servidor
app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'online',
        service: 'Playmatic Instagram Webhook Service',
        timestamp: new Date().toISOString()
    });
});

/**
 * 2. ENDPOINT GET /webhook:
 * Verificación del Webhook por parte de los servidores de Meta.
 */
app.get('/webhook', (req: Request, res: Response) => {
    const mode = req.query['hub.mode'] as string | undefined;
    const token = req.query['hub.verify_token'] as string | undefined;
    const challenge = req.query['hub.challenge'] as string | undefined;

    console.log(`[Webhook Verification] Solicitud entrante: mode=${mode}, token=${token}`);

    if (mode === 'subscribe' && token === config.META_VERIFY_TOKEN) {
        console.log('[Webhook Verification] ¡Verificación exitosa! Respondiendo con hub.challenge a Meta.');
        // Meta requiere devolver estrictamente el valor de hub.challenge como texto plano y código 200
        res.status(200).send(challenge);
        return;
    }

    console.warn('[Webhook Verification] Verificación fallida: Token incorrecto o modo inválido.');
    res.status(403).send('Forbidden: Token mismatch');
});

/**
 * 3. ENDPOINT POST /webhook:
 * Recepción de eventos de mensajes directos (DMs) de Instagram.
 * Protegido con validación criptográfica X-Hub-Signature-256.
 */
app.post(
    '/webhook',
    (req: Request, _res: Response, next) => {
        console.log(`\n📬 [POST /webhook] Petición entrante de Meta recibida.`);
        next();
    },
    verifyMetaSignature,
    (req: Request, res: Response) => {
        // 1. Responder INMEDIATAMENTE con HTTP 200 OK a Meta para evitar reintentos y timeouts (< 5s)
        res.status(200).send('EVENT_RECEIVED');

        console.log(`📋 [Payload de Meta recibido]:`);
        console.log(JSON.stringify(req.body, null, 2));

        // 2. Procesar asíncronamente el payload sin bloquear la respuesta HTTP
        const payload = req.body as InstagramWebhookPayload;
        processInstagramWebhook(payload).catch((err) => {
            console.error('[Webhook Async Error] Error no controlado al procesar evento:', err);
        });
    }
);

// Inicializar el servidor HTTP
const server = app.listen(config.PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 [Playmatic] Servidor Webhook de Instagram Activo`);
    console.log(`📡 Puerto: http://localhost:${config.PORT}`);
    console.log(`🔗 Ruta Webhook: http://localhost:${config.PORT}/webhook`);
    console.log(`🔑 Verify Token: ${config.META_VERIFY_TOKEN}`);
    console.log(`======================================================\n`);
});

// Manejo de apagado elegante (Graceful Shutdown)
const handleShutdown = (signal: string) => {
    console.log(`\n[Servidor] Señal ${signal} recibida. Cerrando servidor de forma segura...`);
    server.close(() => {
        console.log('[Servidor] Conexiones cerradas. Proceso finalizado.');
        process.exit(0);
    });
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

export default app;
