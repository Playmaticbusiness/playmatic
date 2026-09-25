/**
 * Tipos de datos para la API de Meta Graph y Webhooks de Instagram Messaging
 */

export interface InstagramWebhookPayload {
    object: 'instagram' | 'page';
    entry: InstagramEntry[];
}

export interface InstagramEntry {
    id: string;
    time: number;
    messaging?: InstagramMessagingEvent[];
}

export interface InstagramMessagingEvent {
    sender: {
        id: string; // Instagram-Scoped ID (IGSID) del usuario
    };
    recipient: {
        id: string; // ID de la cuenta profesional / página de Playmatic
    };
    timestamp: number;
    message?: InstagramMessage;
    read?: {
        watermark: number;
        mid: string;
    };
    delivery?: {
        mids: string[];
        watermark: number;
    };
}

export interface InstagramMessage {
    mid: string;
    text?: string;
    is_echo?: boolean; // True si el mensaje fue enviado por la propia página/bot
    quick_reply?: {
        payload: string;
    };
    attachments?: Array<{
        type: string;
        payload: {
            url: string;
        };
    }>;
}

export interface SendMessagePayload {
    recipient: {
        id: string;
    };
    message: {
        text: string;
    };
}

export interface SendMessageResponse {
    recipient_id: string;
    message_id: string;
}

export interface MetaApiError {
    error: {
        message: string;
        type: string;
        code: number;
        error_subcode?: number;
        fbtrace_id: string;
    };
}
