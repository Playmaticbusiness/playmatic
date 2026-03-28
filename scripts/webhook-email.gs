function doPost(e) {
  try {
    // Para admitir CORS (necesario si la web está en GitHub Pages, Netlify, etc.)
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (!e || !e.postData) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "No data received" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const data = JSON.parse(e.postData.contents);
    const email = data.email;
    const canal = data.q1_canal || "Instagram";
    const tiempo = data.q2_tiempo || "Más de 10 min";
    const repetitivas = data.q3_repetitivas || "El 50%";
    const seguidores = data.q4_seguidores || "1k - 5k";

    // 1. Calcular Nivel de Eficiencia basado en las respuestas
    let score = 100;
    if (tiempo === "Varias horas") score -= 30;
    if (tiempo === "Al día siguiente") score -= 50;
    if (tiempo === "A veces se me pasa") score -= 70;
    if (repetitivas === "El 50%") score -= 20;
    if (repetitivas === "¡Casi todos!") score -= 40;
    
    // Evitar puntuaciones negativas
    if (score < 0) score = 0;

    // 2. Generar el Asunto del Correo (Sin emojis)
    const subject = `Tu Diagnóstico de Automatización de Playmatic (Nivel: ${score}/100)`;

    // 3. Generar el Cuerpo HTML del correo (El Informe - Dark Mode Fuerte)
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="margin:0; padding:0; background-color: #0d0d10;">
        <!-- Envoltorio completo en tabla para forzar fondo oscuro en Gmail y Outlook -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0d0d10; width: 100%;">
          <tr>
            <td align="center" style="padding: 30px 10px;">
              <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; color: #ffffff; max-width: 600px; margin: 0 auto; text-align: left;">
                
                <div style="text-align: center; margin-bottom: 25px;">
                  <p style="color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 2px; margin:0;">PLAYMATIC</p>
                </div>

                <div style="background-color: #1a1a24; border: 1px solid #333344; padding: 30px; border-radius: 12px;">
                  <h2 style="color: #ffffff; font-size: 22px; margin-top:0; text-align:center;">Informe de Eficiencia</h2>
                  <p style="font-size: 15px; color: #b3b3b3;">¡Hola!</p>
                  <p style="font-size: 15px; color: #b3b3b3;">Aquí tienes los resultados de tu diagnóstico gratuito con <strong>Playmatic</strong>.</p>
                  
                  <div style="background-color: #222230; border: 1px solid #333344; padding: 25px; border-radius: 10px; margin: 25px 0; text-align: center;">
                    <h1 style="color: ${score < 50 ? '#ff4757' : (score < 80 ? '#ffa502' : '#2ed573')}; font-size: 52px; margin: 0; font-weight: 800;">${score}/100</h1>
                    <p style="font-size: 14px; color: #888; margin-top: 5px;">Tu puntuación de eficiencia actual</p>
                  </div>

                  <h3 style="color: #4facfe; font-size: 18px; border-bottom: 1px solid #333344; padding-bottom: 10px;">Análisis de tus respuestas</h3>
                  <ul style="font-size: 14px; color: #cccccc; line-height: 1.7; padding-left: 20px;">
                    <li style="margin-bottom: 10px;"><strong>Canal principal (${canal}):</strong> Es vital tener este canal 100% automatizado para no perder leads que vengan de contenido viral.</li>
                    <li style="margin-bottom: 10px;"><strong>Tiempo de respuesta (${tiempo}):</strong> ${tiempo.includes("10") ? "<span style='color: #2ed573;'>¡Excelente!</span> Mantener este tiempo es ideal, pero no tienes por qué hacerlo manualmente." : "<strong style='color: #ff4757;'>Alerta:</strong> Responder tarde significa leads fríos. Si respondes al día siguiente, el 60% de los clientes ya habrán preguntado a tu competencia en Málaga."}</li>
                    <li><strong>Preguntas repetitivas (${repetitivas}):</strong> Si el volumen es ${repetitivas}, estás invirtiendo horas de tu tiempo (y dinero) en algo que un Chatbot IA de Playmatic resolvería en 2 segundos a cualquier hora de la madrugada.</li>
                  </ul>

                  <div style="background-color: #142a42; padding: 20px; border-left: 4px solid #4facfe; margin: 30px 0; border-radius: 0 8px 8px 0;">
                    <h4 style="margin-top: 0; color: #ffffff; font-size: 16px;">La Solución Playmatic</h4>
                    <p style="margin-bottom: 0; font-size: 14px; color: #b3b3b3;">Automatizando tu cuenta, tu negocio atenderá a clientes 24/7, programará citas automáticamente y filtrará curiosos de compradores reales. Tu puntuación pasaría automáticamente al <strong style="color: #ffffff;">100/100</strong>.</p>
                  </div>

                  <div style="text-align: center; margin-top: 40px;">
                    <a href="https://calendly.com/playmaticbusiness/30min" style="display: inline-block; background-color: #4facfe; color: #000000; text-decoration: none; padding: 14px 32px; border-radius: 30px; font-weight: bold; font-size: 16px;">Agenda una Llamada Gratuita</a>
                    <p style="font-size: 12px; color: #666; margin-top: 20px;">Sin compromisos. Veremos qué embudo se ajusta mejor a tu negocio local.</p>
                  </div>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                  <p style="font-size: 12px; color: #555;">Este es un mensaje enviado automáticamente. Por favor, <strong>no respondas</strong> a este correo, ya que este buzón no está monitorizado.</p>
                </div>
                
              </div>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // 4. Enviar el correo usando GmailApp (Tu cuenta de correo)
    GmailApp.sendEmail(email, subject, "Activa HTML para ver este diseño.", {
      htmlBody: htmlBody,
      name: "Playmatic Team",
      noReply: true, // Fuerza cuenta "noreply" si se dispone de Google Workspace
      replyTo: "no-reply@playmatic.es" // Dirige cualquier "Responder" a un buzón ciego
    });

    return ContentService.createTextOutput(JSON.stringify({ status: "success", score: score }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Opcional: Función para responder al método OPTIONS (CORS)
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}
