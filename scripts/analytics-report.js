const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const { google } = require('googleapis');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// --- CONFIGURACIÓN ---
const PROPERTY_ID = '529708391'; 
const SPREADSHEET_ID = '1fU0JLLcORGhQmJRwGeHY_efUZZEnwlQhqEFWxNzI24g'; // Google Sheet del usuario
const KEY_FILE_PATH = path.join(__dirname, 'credentials.json');

const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: [
        'https://www.googleapis.com/auth/analytics.readonly',
        'https://www.googleapis.com/auth/spreadsheets'
    ],
});

const analyticsDataClient = new BetaAnalyticsDataClient({
    auth: auth,
});

async function runReport() {
    console.log('🚀 Iniciando proceso de automatización (GA4 -> Google Sheets)...');

    if (!fs.existsSync(KEY_FILE_PATH)) {
        console.error('❌ Error: No se encuentra el archivo credentials.json');
        return;
    }

    try {
        // 1. Obtener datos de Google Analytics
        const [response] = await analyticsDataClient.runReport({
            property: `properties/${PROPERTY_ID}`,
            dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
            dimensions: [
                { name: 'date' },
                { name: 'pagePath' },
                { name: 'sessionSource' },
                { name: 'deviceCategory' },
                { name: 'city' }
            ],
            metrics: [
                { name: 'activeUsers' },
                { name: 'newUsers' },
                { name: 'sessions' },
                { name: 'screenPageViews' },
                { name: 'engagementRate' },
                { name: 'averageSessionDuration' }
            ],
        });

        console.log('✅ Datos obtenidos de Analytics (incluyendo visitas y engagement).');

        // 2. Sincronizar con Google Sheets
        await syncToGoogleSheets(response);

        // 3. Generar Excel local de respaldo
        await generateExcel(response);

    } catch (error) {
        console.error('❌ Error en el proceso:', error.message);
    }
}

async function syncToGoogleSheets(reportData) {
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Preparar filas para Google Sheets
    const header = ['Fecha', 'Ruta de la Página', 'Origen del Tráfico', 'Dispositivo', 'Ciudad', 'Usuarios Activos', 'Nuevos Usuarios', 'Visitas (Sesiones)', 'Vistas de Página', 'Engagement (%)', 'Tiempo Medio (s)'];
    const rows = reportData.rows.map(row => [
        row.dimensionValues[0].value, // date
        row.dimensionValues[1].value, // pagePath
        row.dimensionValues[2].value, // sessionSource
        row.dimensionValues[3].value, // deviceCategory
        row.dimensionValues[4].value, // city
        row.metricValues[0].value,    // activeUsers
        row.metricValues[1].value,    // newUsers
        row.metricValues[2].value,    // sessions
        row.metricValues[3].value,    // screenPageViews
        (parseFloat(row.metricValues[4].value) * 100).toFixed(2) + '%', // engagementRate
        parseFloat(row.metricValues[5].value).toFixed(2) // averageSessionDuration
    ]);

    try {
        // Limpiar hoja y escribir datos
        await sheets.spreadsheets.values.clear({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Hoja 1!A1:Z1000',
        });

        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Hoja 1!A1',
            valueInputOption: 'RAW',
            requestBody: {
                values: [header, ...rows],
            },
        });

        console.log('✨ ¡Nube actualizada! Google Sheet sincronizada con éxito para Looker Studio.');
    } catch (error) {
        console.error('⚠️ Error al actualizar Google Sheets:', error.message);
        console.log('¿Has compartido la hoja con el email del credentials.json?');
    }
}

async function generateExcel(reportData) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('backup_reporte');
    
    // Columnas adaptadas para Looker Studio
    worksheet.columns = [
        { header: 'Fecha', key: 'date', width: 12 },
        { header: 'Ruta de la Página', key: 'page', width: 30 },
        { header: 'Origen del Tráfico', key: 'source', width: 20 },
        { header: 'Dispositivo', key: 'device', width: 15 },
        { header: 'Ciudad', key: 'city', width: 15 },
        { header: 'Usuarios Activos', key: 'activeUsers', width: 15 },
        { header: 'Nuevos Usuarios', key: 'newUsers', width: 15 },
        { header: 'Visitas (Sesiones)', key: 'sessions', width: 18 },
        { header: 'Vistas de Página', key: 'pageViews', width: 18 },
        { header: 'Engagement (%)', key: 'engagement', width: 15 },
        { header: 'Tiempo Medio (s)', key: 'duration', width: 18 }
    ];

    reportData.rows.forEach(row => {
        worksheet.addRow({
            date: row.dimensionValues[0].value,
            page: row.dimensionValues[1].value,
            source: row.dimensionValues[2].value,
            device: row.dimensionValues[3].value,
            city: row.dimensionValues[4].value,
            activeUsers: row.metricValues[0].value,
            newUsers: row.metricValues[1].value,
            sessions: row.metricValues[2].value,
            pageViews: row.metricValues[3].value,
            engagement: (parseFloat(row.metricValues[4].value) * 100).toFixed(2) + '%',
            duration: parseFloat(row.metricValues[5].value).toFixed(2)
        });
    });

    const reportsDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir);
    
    const filePath = path.join(reportsDir, `backup_${new Date().toISOString().split('T')[0]}.xlsx`);
    await workbook.xlsx.writeFile(filePath);
    console.log(`💾 Backup local guardado en: ${filePath}`);
}

runReport();
