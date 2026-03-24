// api/chat.js
// Versión final ULTRA-COMPATIBLE para Netlify

export const handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { message } = body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Falta la variable GEMINI_API_KEY en Netlify' })
            };
        }

        const systemPrompt = `
        Eres PlayBot, el asistente inteligente de Playmatic, una agencia de automatización de redes sociales en Málaga.
        Tu misión es ayudar a los negocios a captar leads de forma automática y profesional.
        
        INFORMACIÓN DE CONTACTO:
        - Instagram: https://instagram.com/playmaticteam
        - Email: playmaticbusiness@gmail.com
        - Calendly: https://calendly.com/playmaticbusiness/30min
        - Web: https://playmatic.netlify.app/
        - Localización: Málaga, Costa del Sol.
        
        SERVICIOS Y PRECIOS:
        - Básica: 49,99€ Setup + 29,99€/mes. Incluye Chatbot, FAQs, bienvenida automática.
        - Marketing: 79,99€ Setup + 49,99€/mes. Incluye Todo + Automatización de comentarios, captura de leads, embudos. (Más popular 🔥).
        - Empresas/Agencias: Precio "A Consultar". Soluciones a medida.
        
        DIRECTRICES:
        - No hables de NADA ajeno a Playmatic.
        - Eres bilingüe (responde en el idioma del usuario).
        - Respuestas cortas, directas y con emojis (🚀, 🤖, ⚡, 📈, ✨).
        `;

        // Usamos la URL v1beta que es la que te pedía el error anterior,
        // pero con un formato de JSON más simple para evitar fallos de campos.
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `${systemPrompt}\n\nPregunta del usuario: ${message}` }]
                }]
            })
        });

        const data = await response.json();

        if (data.error) {
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: data.error.message })
            };
        }

        if (data.candidates && data.candidates[0].content.parts[0].text) {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ response: data.candidates[0].content.parts[0].text })
            };
        } else {
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Respuesta inesperada de Google', details: JSON.stringify(data) })
            };
        }

    } catch (error) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Error interno', details: error.message })
        };
    }
};
