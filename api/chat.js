// api/chat.js
// Versión final ULTRA-COMPATIBLE para Netlify — Motor: Groq (Llama 3.3)

export const handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { message } = body;
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Falta la variable GROQ_API_KEY en Netlify' })
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

        // Llamamos a la API de Groq (Llama 3.3 70B)
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message }
                ],
                temperature: 0.7
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

        if (data.choices && data.choices[0].message.content) {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ response: data.choices[0].message.content })
            };
        } else {
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Respuesta inesperada de Groq', details: JSON.stringify(data) })
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
