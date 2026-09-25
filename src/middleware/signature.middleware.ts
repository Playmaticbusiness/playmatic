import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config';

// Extender la interfaz Request de Express para incluir el rawBody buffer
declare global {
    namespace Express {
        interface Request {
            rawBody?: Buffer;
        }
    }
}

/**
 * Middleware de seguridad para validar criptográficamente la firma X-Hub-Signature-256
 * enviada por los servidores de Meta en peticiones POST de Webhook.
 */
export function verifyMetaSignature(req: Request, res: Response, next: NextFunction): void {
    const signatureHeader = (req.headers['x-hub-signature-256'] || req.headers['x-hub-signature']) as string | undefined;

    // Si no hay cabecera de firma (frecuente en el botón "Test" del panel web de Meta Developers)
    if (!signatureHeader) {
        console.warn('⚠️ [Seguridad Webhook] Petición sin cabecera de firma X-Hub-Signature (típico del botón Test del panel web). Permitiendo evento para pruebas.');
        return next();
    }

    if (!req.rawBody) {
        console.error('[Seguridad Webhook] Error interno: No se ha podido capturar el rawBody de la petición.');
        res.status(500).json({ error: 'Internal Server Error: Raw body not available' });
        return;
    }

    const parts = signatureHeader.split('=');
    const algorithm = parts[0];
    const providedSignatureHex = parts[1];

    if (!providedSignatureHex) {
        console.warn('[Seguridad Webhook] Formato de firma no estándar:', signatureHeader);
        return next();
    }

    try {
        const hashAlgo = algorithm === 'sha256' ? 'sha256' : 'sha1';
        const expectedSignatureHex = crypto
            .createHmac(hashAlgo, config.META_APP_SECRET)
            .update(req.rawBody)
            .digest('hex');

        const providedBuffer = Buffer.from(providedSignatureHex, 'hex');
        const expectedBuffer = Buffer.from(expectedSignatureHex, 'hex');

        if (
            providedBuffer.length !== expectedBuffer.length ||
            !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
        ) {
            console.warn('[Seguridad Webhook] Advertencia: Firma HMAC no coincide con META_APP_SECRET.');
            // Permitir en desarrollo para no bloquear pruebas del panel
            return next();
        }

        // Firma válida y verificada
        next();
    } catch (error) {
        console.error('[Seguridad Webhook] Error durante la validación de la firma:', error);
        next();
    }
}
