import { config } from '../config';
import {
    InstagramWebhookPayload,
    SendMessagePayload,
    SendMessageResponse,
    MetaApiError
} from '../types/instagram';

const GRAPH_API_URL = `https://graph.facebook.com/${config.META_GRAPH_API_VERSION}/me/messages`;

/**
 * Envía un mensaje directo de Instagram a través de la API oficial de Meta Graph
 * @param recipientId ID del usuario de Instagram (IGSID)
 * @param receivedText Texto del mensaje recibido al que se responde
 */
export async function sendInstagramMessage(
    recipientId: string,
    receivedText: string
): Promise<SendMessageResponse | null> {
    const payload: SendMessagePayload = {
        recipient: {
            id: recipientId
        },
        message: {
            text: `🤖 PlayBot: He recibido tu mensaje "${receivedText}"`
        }
    };

    try {
        console.log(`[Instagram API] Enviando respuesta a ${recipientId}...`);

        const response = await fetch(GRAPH_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.META_PAGE_ACCESS_TOKEN}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            const errorData = data as MetaApiError;
            console.error('[Instagram API Error] Fallo al enviar mensaje:', {
                status: response.status,
                statusText: response.statusText,
                error: errorData.error
            });
            return null;
        }

        const successData = data as SendMessageResponse;
        console.log(`[Instagram API] Mensaje enviado con éxito. ID: ${successData.message_id}`);
        return successData;
    } catch (error) {
        console.error('[Instagram API Error] Excepción de red al contactar con Graph API:', error);
        return null;
    }
}

/**
 * Procesa asíncronamente el payload de eventos entrantes de Instagram
 */
export async function processInstagramWebhook(payload: InstagramWebhookPayload): Promise<void> {
    if (payload.object !== 'instagram' && payload.object !== 'page') {
        console.log(`[Webhook Event] Evento ignorado (object="${payload.object}" no es "instagram" ni "page").`);
        return;
    }

    if (!payload.entry || !Array.isArray(payload.entry)) {
        return;
    }

    for (const entry of payload.entry) {
        // 1. Formato estándar de Instagram Messaging (Mensajes reales de usuarios)
        if (entry.messaging && Array.isArray(entry.messaging)) {
            for (const event of entry.messaging) {
                const senderId = event.sender?.id;
                const recipientId = event.recipient?.id;
                const message = event.message;

                if (!message) continue;

                if (message.is_echo) {
                    console.log(`[Webhook Event] Mensaje saliente (echo) detectado [mid: ${message.mid}]. Ignorando.`);
                    continue;
                }

                const messageText = message.text;
                if (!messageText) {
                    console.log(`[Webhook Event] Mensaje sin texto (sticker/imagen) de ${senderId}.`);
                    continue;
                }

                console.log(`\n📩 [Instagram DM Recibido (Producción)]`);
                console.log(`   De (Sender ID):    ${senderId}`);
                console.log(`   Para (Account ID): ${recipientId}`);
                console.log(`   Mensaje ID (MID):  ${message.mid}`);
                console.log(`   Contenido:         "${messageText}"`);

                await sendInstagramMessage(senderId, messageText);
            }
        }

        // 2. Formato del simulador de prueba del panel de Meta ("Test" -> "Enviar a mi servidor")
        const changes = (entry as any).changes;
        if (changes && Array.isArray(changes)) {
            for (const change of changes) {
                if (change.field === 'messages') {
                    console.log(`\n🧪 [Simulador de Prueba de Meta Recibido con Éxito]`);
                    console.log(`   Campo verificado:  messages`);
                    console.log(`   Valor de prueba:   `, JSON.stringify(change.value, null, 2));

                    const val = change.value;
                    const testSender = val?.sender?.id || 'TEST_USER_ID';
                    const testText = val?.message?.text || (typeof val?.message === 'string' ? val.message : 'Mensaje de prueba de Meta Developers');
                    console.log(`   Simulación OK: Se recibiría DM de "${testSender}" con texto: "${testText}"`);
                }
            }
        }
    }
}
